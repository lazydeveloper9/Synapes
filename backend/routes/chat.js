const express = require('express');
const router = express.Router();

// GET all chat messages (placeholder)
router.get('/', (req, res) => {
  res.json({ messages: [] });
});

// POST new chat message (placeholder)
router.post('/', (req, res) => {
  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ message: 'Text is required' });
  }
  res.json({ message: 'Chat message received', text });
});

module.exports = router;
