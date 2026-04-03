const express = require('express');
const OpenAI = require('openai');
const rateLimit = require('express-rate-limit');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Rate-limit all agent routes (applied before auth to protect DB lookups from abuse too):
// max 20 requests per 15 minutes per IP
const generateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many AI requests. Please try again in a few minutes.' },
});

router.use(generateLimiter);

// All routes protected
router.use(protect);

// POST /api/agent/generate – delegate design generation to cloud AI
router.post('/generate', async (req, res) => {
  const { prompt, canvasWidth = 1280, canvasHeight = 720 } = req.body;

  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({ message: 'prompt is required' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ message: 'AI service is not configured. Set OPENAI_API_KEY.' });
  }

  try {
    const openai = new OpenAI({ apiKey });

    const systemPrompt = `You are a design assistant for a Fabric.js canvas editor (${canvasWidth}x${canvasHeight}px).
Given a user description, return a JSON object with a single key "objects" whose value is an array of Fabric.js object descriptors to add to the canvas.
Each descriptor must include "type" (one of: rect, circle, triangle, i-text, line) plus all required properties for that type:
- rect: left, top, width, height, fill, stroke, strokeWidth, rx, ry
- circle: left, top, radius, fill, stroke, strokeWidth
- triangle: left, top, width, height, fill, stroke, strokeWidth
- i-text: left, top, text, fontSize, fontFamily, fontWeight, fill
- line: x1, y1, x2, y2, stroke, strokeWidth
All coordinates should be within the canvas bounds. Respond with ONLY valid JSON, no markdown or explanation.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt.trim() },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 1024,
    });

    let objects;
    try {
      const content = completion.choices?.[0]?.message?.content;
      if (!content) {
        return res.status(500).json({ message: 'AI returned an empty response' });
      }
      const parsed = JSON.parse(content);
      objects = Array.isArray(parsed) ? parsed : (parsed.objects || []);
    } catch {
      return res.status(500).json({ message: 'AI returned invalid JSON' });
    }

    res.json({ objects });
  } catch (error) {
    console.error('Agent generate error:', error);
    const status = error.status || 500;
    res.status(status).json({ message: error.message || 'AI service error' });
  }
});

module.exports = router;
