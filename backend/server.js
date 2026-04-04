const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const authRoutes   = require('./routes/auth');
const designRoutes = require('./routes/designs');
const chatRoutes   = require('./routes/chat');
const aiRoutes     = require('./routes/ai');        // ← AI Vision + Generation

const app = express();

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (origin.startsWith('http://localhost:')) return callback(null, true);
    if (origin.startsWith('http://10.187.')) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth',    authRoutes);
app.use('/api/designs', designRoutes);
app.use('/api/chat',    chatRoutes);
app.use('/api/ai',      aiRoutes);                 // ← AI Vision + Generation

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'OK', message: 'Synapse API running' }));

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    app.listen(process.env.PORT, () => {
      console.log(`🚀 Server running on http://localhost:${process.env.PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });