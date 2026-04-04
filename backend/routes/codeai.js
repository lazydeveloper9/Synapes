// backend/routes/codeai.js
// AI-powered code assistant route using Anthropic Claude
const express = require('express');
const router  = express.Router();

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

async function callClaude(messages, system, maxTokens = 600) {
  if (!ANTHROPIC_KEY) {
    return { reply: null, fallback: true };
  }
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type':      'application/json',
      'x-api-key':         ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: maxTokens,
      system,
      messages:   messages.slice(-6),
    }),
  });
  if (!res.ok) return { reply: null, fallback: true };
  const data = await res.json();
  return { reply: data.content?.[0]?.text || '', fallback: false };
}

/**
 * POST /api/codeai/analyze
 * Body: { code, lang, error? }
 * Returns: { issues, hints, fixed }
 */
router.post('/analyze', async (req, res) => {
  const { code, lang, error } = req.body;
  if (!code) return res.json({ issues: [], hints: [], fixed: '' });

  const system = `You are an expert code reviewer and debugger. Analyze code and respond ONLY with valid JSON (no markdown, no backticks).
The JSON schema: { "issues": [{ "line": number|null, "severity": "error"|"warning"|"info", "message": string }], "hints": [string], "fixed": string }
- issues: up to 5 real bugs or problems found in the code
- hints: up to 3 actionable improvement tips
- fixed: the corrected version of the code (full, runnable)
Keep messages concise (under 80 chars). If code is fine, return empty issues array.`;

  const prompt = error
    ? `Language: ${lang}\n\nRuntime error: ${error}\n\nCode:\n${code.slice(0, 3000)}`
    : `Language: ${lang}\n\nAnalyze this code:\n${code.slice(0, 3000)}`;

  const { reply, fallback } = await callClaude([{ role: 'user', content: prompt }], system, 1200);

  if (fallback || !reply) {
    // Graceful fallback when no API key
    return res.json({
      issues: error ? [{ line: null, severity: 'error', message: error.slice(0, 120) }] : [],
      hints:  ['Add error handling for edge cases', 'Consider adding comments for clarity'],
      fixed:  code,
    });
  }

  try {
    const clean = reply.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    return res.json(parsed);
  } catch {
    return res.json({ issues: [], hints: ['AI analysis failed to parse'], fixed: code });
  }
});

/**
 * POST /api/codeai/summary
 * Body: { code, lang, output, error? }
 * Returns: { summary, suggestions }
 */
router.post('/summary', async (req, res) => {
  const { code, lang, output, error } = req.body;

  const system = `You are a friendly coding assistant. After code runs, give a brief run summary. Respond ONLY with JSON (no markdown):
{ "summary": string, "suggestions": [string] }
- summary: 1-2 sentences describing what the code does and whether it ran successfully
- suggestions: up to 3 next steps or improvements
Keep everything concise and practical.`;

  const prompt = `Language: ${lang}
Code:
${code.slice(0, 2000)}

${error ? `Runtime error: ${error}` : `Output: ${output?.slice(0, 500) || '(no output)'}`}`;

  const { reply, fallback } = await callClaude([{ role: 'user', content: prompt }], system, 400);

  if (fallback || !reply) {
    return res.json({
      summary:     error ? `The code threw an error: ${error.slice(0,80)}` : 'Code ran successfully.',
      suggestions: ['Add more test cases', 'Handle edge cases', 'Add documentation'],
    });
  }

  try {
    const clean = reply.replace(/```json|```/g, '').trim();
    return res.json(JSON.parse(clean));
  } catch {
    return res.json({ summary: reply.slice(0, 200), suggestions: [] });
  }
});

/**
 * POST /api/codeai/complete
 * Body: { code, lang, cursor }  (cursor = text before caret)
 * Returns: { suggestion }
 */
router.post('/complete', async (req, res) => {
  const { code, lang, cursor } = req.body;
  if (!cursor || cursor.length < 5) return res.json({ suggestion: '' });

  const system = `You are a code completion AI. Continue the code from the cursor position.
Return ONLY the completion text (no explanation, no markdown, max 3 lines). If nothing helpful, return empty string.`;

  const prompt = `Language: ${lang}\n\nCode up to cursor:\n${cursor.slice(-400)}`;
  const { reply, fallback } = await callClaude([{ role: 'user', content: prompt }], system, 150);

  if (fallback) return res.json({ suggestion: '' });
  return res.json({ suggestion: (reply || '').replace(/```[\w]*/g,'').replace(/```/g,'').trim() });
});

module.exports = router;