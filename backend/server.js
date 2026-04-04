const express = require('express');
const cors = require('cors');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const authRoutes   = require('./routes/auth');
const designRoutes = require('./routes/designs');
const chatRoutes   = require('./routes/chat');
<<<<<<< HEAD
=======
const aiRoutes     = require('./routes/ai');        // ← AI Vision + Generation
>>>>>>> b76ec217ca13dba3414992b21aa0db071dadc9db

const app = express();
const prisma = new PrismaClient(); // Initialize Prisma
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));
app.use(express.json()); 

// 3. YOUR ROUTES GO AFTER
app.use('/api/auth', authRoutes);
app.use('/api/designs', designRoutes);
<<<<<<< HEAD
app.use('/api/chat', chatRoutes);
=======
app.use('/api/chat',    chatRoutes);
app.use('/api/ai',      aiRoutes);                 // ← AI Vision + Generation
>>>>>>> b76ec217ca13dba3414992b21aa0db071dadc9db

app.get('/api/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`; // Test DB connection
    res.json({ status: 'OK', message: 'Synapse API running & connected to DB' });
  } catch (error) {
    res.status(500).json({ status: 'ERROR', message: 'DB connection failed' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

// In your server.js
const dashboardRoutes = require('./routes/dashboarsd');
const authenticateToken = require('./middleware/authenticate');

// Every route inside dashboardRoutes now requires a valid JWT
app.use('/api/dashboard', authenticateToken, dashboardRoutes);