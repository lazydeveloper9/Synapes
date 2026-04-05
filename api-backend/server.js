const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const { Pool } = require('pg');
const { ExpressPeerServer } = require('peer');

const pool = new Pool({
  host: process.env.DB_HOST || 'postgres',
  user: process.env.DB_USER || 'synapse',
  password: process.env.DB_PASSWORD || 'synapse',
  database: process.env.DB_NAME || 'documents',
  port: 5432,
});

module.exports.pool = pool;


async function initDB() {
  let retries = 10;
  while (retries > 0) {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS designs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          title TEXT NOT NULL DEFAULT 'Untitled Design',
          owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          width INTEGER NOT NULL DEFAULT 1280,
          height INTEGER NOT NULL DEFAULT 720,
          canvas_data TEXT,
          thumbnail TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          is_public BOOLEAN DEFAULT false
        );
        ALTER TABLE designs ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;
      `);
      console.log('[API] PostgreSQL tables ready.');
      break;
    } catch (err) {
      retries--;
      console.log(`[API] Waiting for Postgres... (${retries} retries left). Error: ${err.message}`);
      await new Promise(r => setTimeout(r, 3000));
    }
  }
}

const app = express();

app.use(cors({
  origin: true, // This tells CORS to reflect the requesting origin dynamically, which is perfect for dev
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));


app.use('/api/auth', require('./routes/auth'));
app.use('/api/designs', require('./routes/designs'));
app.get('/api/health', (req, res) => res.json({ status: 'OK', db: 'postgres' }));

const PORT = process.env.PORT || 5000;

initDB().then(() => {
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 API Backend running on http://0.0.0.0:${PORT}`);
  });
  
  const peerServer = ExpressPeerServer(server, {
    debug: true,
    path: '/'
  });
  app.use('/peerjs', peerServer);
  console.log(`🚀 PeerJS Signaling Server running on http://0.0.0.0:${PORT}/peerjs`);
});