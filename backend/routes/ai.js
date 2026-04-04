const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/auth');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');

const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename:    (_req, file, cb)  => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files allowed'));
  },
});

async function callOllamaVision(prompt, base64Image) {
  const OLLAMA_BASE = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  const MODEL       = process.env.OLLAMA_VISION_MODEL || 'llava:latest';
  const body = {
    model: MODEL,
    prompt,
    images: base64Image ? [base64Image] : undefined,
    stream: false,
    options: { temperature: 0.3, num_predict: 800 },
  };
  const resp = await fetch(`${OLLAMA_BASE}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120_000),
  });
  if (!resp.ok) throw new Error(`Ollama error ${resp.status}: ${await resp.text()}`);
  const data = await resp.json();
  return data.response || '';
}

async function callOllamaText(prompt, systemPrompt) {
  const OLLAMA_BASE = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  const MODEL       = process.env.OLLAMA_TEXT_MODEL || 'llama3.2:latest';
  const body = {
    model: MODEL,
    system: systemPrompt || 'You are a helpful assistant inside Synapse design workspace.',
    prompt,
    stream: false,
    options: { temperature: 0.5, num_predict: 1024 },
  };
  const resp = await fetch(`${OLLAMA_BASE}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120_000),
  });
  if (!resp.ok) throw new Error(`Ollama error ${resp.status}: ${await resp.text()}`);
  const data = await resp.json();
  return data.response || '';
}

async function callAnthropic(messages, system, maxTokens = 1024) {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('No ANTHROPIC_API_KEY set');
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: maxTokens,
      system,
      messages,
    }),
  });
  const data = await resp.json();
  return data.content?.[0]?.text || '';
}

async function generateImage(prompt) {
  const COMFY_BASE = process.env.SD_BASE_URL || 'http://localhost:8188';
  const workflow = {
    "3": { "class_type": "KSampler", "inputs": { "cfg": 7, "denoise": 1, "latent_image": ["5", 0], "model": ["4", 0], "negative": ["7", 0], "positive": ["6", 0], "sampler_name": "dpmpp_2m", "scheduler": "karras", "seed": Math.floor(Math.random() * 999999999), "steps": 20 } },
    "4": { "class_type": "CheckpointLoaderSimple", "inputs": { "ckpt_name": process.env.SD_MODEL || "v1-5-pruned-emaonly.safetensors" } },
    "5": { "class_type": "EmptyLatentImage", "inputs": { "batch_size": 1, "height": 512, "width": 512 } },
    "6": { "class_type": "CLIPTextEncode", "inputs": { "clip": ["4", 1], "text": prompt } },
    "7": { "class_type": "CLIPTextEncode", "inputs": { "clip": ["4", 1], "text": "blurry, low quality, distorted, watermark, ugly" } },
    "8": { "class_type": "VAEDecode", "inputs": { "samples": ["3", 0], "vae": ["4", 2] } },
    "9": { "class_type": "SaveImage", "inputs": { "filename_prefix": "synapse_ai", "images": ["8", 0] } }
  };
  const queueResp = await fetch(`${COMFY_BASE}/prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: workflow }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!queueResp.ok) throw new Error(`ComfyUI error ${queueResp.status}: ${await queueResp.text()}`);
  const { prompt_id } = await queueResp.json();
  if (!prompt_id) throw new Error('ComfyUI did not return prompt_id');
  const startTime = Date.now();
  while (Date.now() - startTime < 180_000) {
    await new Promise(r => setTimeout(r, 2000));
    const histResp = await fetch(`${COMFY_BASE}/history/${prompt_id}`, { signal: AbortSignal.timeout(10_000) });
    if (!histResp.ok) continue;
    const hist = await histResp.json();
    const job  = hist[prompt_id];
    if (!job?.outputs) continue;
    for (const nodeId of Object.keys(job.outputs)) {
      const images = job.outputs[nodeId]?.images;
      if (!images?.length) continue;
      const img = images[0];
      const imgResp = await fetch(`${COMFY_BASE}/view?filename=${encodeURIComponent(img.filename)}&subfolder=${img.subfolder || ''}&type=${img.type || 'output'}`, { signal: AbortSignal.timeout(30_000) });
      if (!imgResp.ok) throw new Error('Could not fetch image from ComfyUI');
      return Buffer.from(await imgResp.arrayBuffer()).toString('base64');
    }
  }
  throw new Error('ComfyUI timed out');
}

router.post('/analyze-image', protect, upload.single('image'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No image uploaded' });
    const base64   = fs.readFileSync(file.path).toString('base64');
    const mimeType = file.mimetype;
    const prompt   = req.body.prompt || 'Analyze this image comprehensively. Provide: 1. Description of what is shown 2. Key Elements: subjects, objects, colors, composition 3. Style and Mood 4. Technical Details 5. Interesting Facts about subjects 6. Design Suggestions for using this in design work. Be detailed and helpful for a designer.';
    let info;
    try {
      info = await callOllamaVision(prompt, base64);
    } catch (e) {
      console.warn('Ollama vision failed:', e.message);
      info = await callAnthropic([{ role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: mimeType, data: base64 } }, { type: 'text', text: prompt }] }], 'You are a helpful image analysis assistant.', 1024);
    }
    fs.unlink(file.path, () => {});
    res.json({ info, model: 'llava/vision' });
  } catch (err) {
    if (req.file) fs.unlink(req.file.path, () => {});
    res.status(500).json({ error: err.message || 'Image analysis failed' });
  }
});

router.post('/analyze-url', protect, async (req, res) => {
  try {
    const { imageUrl, prompt: customPrompt } = req.body;
    if (!imageUrl) return res.status(400).json({ error: 'imageUrl required' });
    const imgResp  = await fetch(imageUrl, { signal: AbortSignal.timeout(30_000) });
    if (!imgResp.ok) throw new Error('Could not fetch image');
    const base64   = Buffer.from(await imgResp.arrayBuffer()).toString('base64');
    const mimeType = imgResp.headers.get('content-type') || 'image/jpeg';
    const prompt   = customPrompt || 'Describe this image in detail including what it shows, key elements, style, mood, colors, and interesting information.';
    let info;
    try {
      info = await callOllamaVision(prompt, base64);
    } catch (e) {
      console.warn('Ollama vision failed:', e.message);
      info = await callAnthropic([{ role: 'user', content: [{ type: 'image', source: { type: 'url', url: imageUrl } }, { type: 'text', text: prompt }] }], 'You are a helpful image analysis assistant.', 800);
    }
    res.json({ info, model: 'llava/vision' });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Image analysis failed' });
  }
});

router.post('/construct-info', protect, async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: 'query required' });
    const system = `You are a knowledgeable assistant inside Synapse design workspace. Provide rich, structured, detailed information formatted in markdown. Be helpful for designers who want to visually represent topics.`;
    const prompt = `Give me comprehensive information about: "${query}"

## Overview
[2-3 sentence summary]

## Key Visual Characteristics
[Colors, shapes, notable visual features]

## Historical / Background Facts
[Important facts and history]

## Design & Creative Notes
[How to represent visually, artistic interpretations]

## Interesting Facts
[3-5 fascinating facts]

## Image Generation Prompt
[Detailed prompt optimized for AI image generation of this subject]`;
    let info;
    try {
      info = await callOllamaText(prompt, system);
    } catch (e) {
      console.warn('Ollama text failed:', e.message);
      info = await callAnthropic([{ role: 'user', content: prompt }], system, 1024);
    }
    res.json({ info, query, model: 'llama3.2/text' });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Info construction failed' });
  }
});

router.post('/generate-image', protect, async (req, res) => {
  try {
    const { prompt, enhancedPrompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'prompt required' });
    const finalPrompt = enhancedPrompt || prompt;
    let base64Image;
    try {
      base64Image = await generateImage(finalPrompt);
    } catch (sdErr) {
      console.warn('ComfyUI failed:', sdErr.message);
      return res.status(503).json({
        error: 'Image generation requires ComfyUI running locally.',
        hint: 'Start ComfyUI: cd ComfyUI && source venv/bin/activate && python main.py --port 8188  — then add SD_BASE_URL=http://localhost:8188 to your .env',
        prompt: finalPrompt,
      });
    }
    if (!base64Image) return res.status(500).json({ error: 'No image returned' });
    res.json({ image: `data:image/png;base64,${base64Image}`, prompt: finalPrompt, model: 'comfyui' });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Image generation failed' });
  }
});

router.post('/hint', protect, async (req, res) => {
  try {
    const { text, context } = req.body;
    if (!text) return res.json({ hints: [] });
    const system = `You are a smart autocomplete hint system for a design canvas. Respond ONLY with a JSON array of exactly 4 objects. Each object: { "label": string, "type": "construct"|"generate"|"info", "description": string }. No markdown, no explanation, just the JSON array.`;
    const prompt = `User typed: "${text}". Context: ${context || 'design canvas'}. Generate 4 relevant hints.`;
    let hintsText;
    try {
      hintsText = await callOllamaText(prompt, system);
    } catch {
      try {
        hintsText = await callAnthropic([{ role: 'user', content: prompt }], system, 400);
      } catch {
        return res.json({ hints: [
          { label: `Construct "${text}"`, type: 'construct', description: `Build visual info for ${text}` },
          { label: `Generate "${text}"`,  type: 'generate',  description: `AI image of ${text}` },
          { label: `Info on "${text}"`,   type: 'info',      description: `Facts about ${text}` },
          { label: `Design "${text}"`,    type: 'construct', description: `Design ideas for ${text}` },
        ]});
      }
    }
    let hints = [];
    try {
      const match = hintsText.match(/\[[\s\S]*\]/);
      hints = match ? JSON.parse(match[0]) : [];
    } catch {
      hints = [
        { label: `Construct "${text}"`, type: 'construct', description: `Build visual content for ${text}` },
        { label: `Generate "${text}"`,  type: 'generate',  description: `Generate AI image of ${text}` },
        { label: `Info on "${text}"`,   type: 'info',      description: `Detailed facts about ${text}` },
        { label: `Design "${text}"`,    type: 'construct', description: `Design inspiration for ${text}` },
      ];
    }
    res.json({ hints: hints.slice(0, 4) });
  } catch (err) {
    res.status(500).json({ hints: [] });
  }
});

router.get('/status', protect, async (req, res) => {
  const OLLAMA_BASE = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  const SD_BASE     = process.env.SD_BASE_URL     || 'http://localhost:8188';
  const [ollamaOk, sdOk] = await Promise.all([
    fetch(`${OLLAMA_BASE}/api/tags`, { signal: AbortSignal.timeout(3000) }).then(r => r.ok).catch(() => false),
    fetch(`${SD_BASE}/queue`, { signal: AbortSignal.timeout(3000) }).then(r => r.ok).catch(() => false),
  ]);
  res.json({ ollama: ollamaOk, sd: sdOk, anthropic: !!process.env.ANTHROPIC_API_KEY, models: { vision: process.env.OLLAMA_VISION_MODEL || 'llava:latest', text: process.env.OLLAMA_TEXT_MODEL || 'llama3.2:latest' } });
});

module.exports = router;
