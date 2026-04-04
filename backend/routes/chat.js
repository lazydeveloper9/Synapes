const express = require('express');
const router = express.Router();

/**
 * POST /api/chat
 * Body: { messages: [{role, content}], system: string }
 *
 * Proxies to Anthropic Claude API.
 * Set ANTHROPIC_API_KEY in your .env file.
 */
router.post('/', async (req, res) => {
  try {
    const { messages, system } = req.body;

    if (!process.env.ANTHROPIC_API_KEY) {
      // Graceful fallback — return a canned reply so the UI still works
      return res.json({
        reply: "I'm the Synapse AI assistant! I'm not fully configured yet (API key missing), but I can tell you: Synapse is a free, powerful design canvas tool. Sign up to start creating beautiful designs! 🎨"
      });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':         'application/json',
        'x-api-key':            process.env.ANTHROPIC_API_KEY,
        'anthropic-version':    '2023-06-01',
      },
      body: JSON.stringify({
        model:      'claude-haiku-4-5-20251001',   // fast + cheap for chatbot
        max_tokens: 300,
        system:     system || 'You are a helpful assistant for the Synapse design tool.',
        messages:   messages.slice(-10),           // keep last 10 turns for context
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Anthropic API error:', err);
      return res.status(502).json({ error: 'LLM request failed', reply: 'Sorry, I am having trouble connecting right now. Please try again!' });
    }

    const data  = await response.json();
    const reply = data.content?.[0]?.text || 'Sorry, I could not generate a response.';
    res.json({ reply });
  } catch (err) {
    console.error('Chat route error:', err);
    res.status(500).json({ error: 'Internal server error', reply: 'Something went wrong. Please try again!' });
  }
});

module.exports = router;