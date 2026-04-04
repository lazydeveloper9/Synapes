import { Server } from '@hocuspocus/server';
import { Redis } from '@hocuspocus/extension-redis';
import pg from 'pg';
import * as Y from 'yjs';
import 'dotenv/config';

const { Pool } = pg;


const pool = new Pool({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'synapse',
  password: process.env.DB_PASSWORD || 'synapse',
  database: process.env.DB_NAME || 'documents',
  port: 5432,
});

pool.on('error', (err) => {
  console.error('[Postgres] Unexpected error on idle client', err);
});


async function initDB() {
  try {
    
    let retries = 5;
    while (retries > 0) {
      try {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS synapse_crdts (
            name TEXT PRIMARY KEY,
            data BYTEA NOT NULL
          );
        `);
        console.log('[Synapse Storage] Postgres Persistence Ledger initialized.');
        break;
      } catch (err) {
        retries--;
        console.log(`[Synapse Storage] Waiting for Postgres to boot... (${retries} attempts left)`);
        await new Promise(res => setTimeout(res, 3000));
      }
    }
  } catch (error) {
    console.error('[Synapse Storage] Fail initializing Postgres:', error);
  }
}


initDB();

const server = Server.configure({
  port: 1234,
  timeout: 30000,
  extensions: [
    new Redis({
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: 6379,
    }),
  ],

  
  async onLoadDocument({ documentName, document }) {
    try {
      const { rows } = await pool.query('SELECT data FROM synapse_crdts WHERE name = $1', [documentName]);
      if (rows.length === 1) {
        console.log(`[Persist] Loading existing CRDT for room: ${documentName}`);
        
        Y.applyUpdate(document, new Uint8Array(rows[0].data));
      } else {
        console.log(`[Persist] Initializing fresh CRDT for room: ${documentName}`);
      }
    } catch (err) {
      console.error(`[Persist] Error loading Document ${documentName}:`, err);
    }
    return document;
  },

  
  async onStoreDocument({ documentName, document }) {
    try {
      
      const state = Buffer.from(Y.encodeStateAsUpdate(document));
      
      
      await pool.query(
        'INSERT INTO synapse_crdts (name, data) VALUES ($1, $2) ON CONFLICT (name) DO UPDATE SET data = EXCLUDED.data',
        [documentName, state]
      );
      console.log(`[Persist] Successfully synced room to Postgres: ${documentName} (${state.length} bytes)`);
    } catch (err) {
      console.error(`[Persist] Failed saving room to Postgres: ${documentName}`, err);
    }
  },

  async onConnect(data) {
    console.log(`[Network Edge] User Connected to room: ${data.documentName}`);
  },
});

const PORT = process.env.PORT || 1234;
server.listen({ port: PORT, host: '0.0.0.0' }).then(({ port }) => {
  console.log(`\n[Synapse Backend] Hocuspocus CRDT engine is running on port ${port}`);
});
