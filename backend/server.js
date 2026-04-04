const express  = require('express');
const mongoose = require('mongoose');
const cors     = require('cors');
const path     = require('path');
const http     = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const authRoutes   = require('./routes/auth');
const designRoutes = require('./routes/designs');
const chatRoutes   = require('./routes/chat');
const codeAIRoutes = require('./routes/codeai');

const app    = express();
const server = http.createServer(app);

// Socket.io for real-time collab
const io = new Server(server, {
  cors: {
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (origin.startsWith('http://localhost:')) return cb(null, true);
      if (origin.startsWith('http://10.')) return cb(null, true);
      cb(null, true); // allow all in dev
    },
    credentials: true,
  },
});

// ─── Collab rooms ──────────────────────────────────────────────────────────
// sheets room: roomId = `sheet-${sheetId}`, data = { cellUsers: {cellKey: [user,...]} }
// code room:   roomId = `code-${fileId}`,   data = { cursors: {userId: {name,color,line}} }

const rooms = new Map(); // roomId → { users: Map<socketId, {name,color,avatar}>, data:{} }

const COLORS = ['#6366f1','#22c55e','#f97316','#ec4899','#14b8a6','#3b82f6','#a855f7','#ef4444','#eab308','#06b6d4','#84cc16','#f43f5e'];

io.on('connection', (socket) => {
  let currentRoom = null;
  let userInfo    = null;

  /* ── Join a room ── */
  socket.on('join-room', ({ roomId, name, avatar }) => {
    if (currentRoom) {
      socket.leave(currentRoom);
      const room = rooms.get(currentRoom);
      if (room) { room.users.delete(socket.id); broadcastUsers(currentRoom); }
    }

    currentRoom = roomId;
    const colorIdx = Math.floor(Math.random() * COLORS.length);
    userInfo = { id: socket.id, name: name || 'Anonymous', color: COLORS[colorIdx], avatar };

    socket.join(roomId);

    if (!rooms.has(roomId)) rooms.set(roomId, { users: new Map(), data: {} });
    rooms.get(roomId).users.set(socket.id, userInfo);

    // Send current room state to new joiner
    socket.emit('room-state', { users: getUserList(roomId), data: rooms.get(roomId).data });
    broadcastUsers(roomId);
  });

  /* ── Sheet: cell focus ── */
  socket.on('cell-focus', ({ cell }) => {
    if (!currentRoom) return;
    socket.to(currentRoom).emit('peer-cell-focus', { userId: socket.id, user: userInfo, cell });
  });

  socket.on('cell-blur', () => {
    if (!currentRoom) return;
    socket.to(currentRoom).emit('peer-cell-blur', { userId: socket.id });
  });

  /* ── Sheet: cell update ── */
  socket.on('cell-update', ({ r, c, value, sheetId }) => {
    if (!currentRoom) return;
    // Store latest value in room data
    const room = rooms.get(currentRoom);
    if (room) {
      if (!room.data.cells) room.data.cells = {};
      room.data.cells[`${r},${c}`] = value;
    }
    socket.to(currentRoom).emit('peer-cell-update', { r, c, value, sheetId, userId: socket.id });
  });

  /* ── Code: cursor/presence ── */
  socket.on('code-cursor', ({ line, col }) => {
    if (!currentRoom) return;
    socket.to(currentRoom).emit('peer-cursor', { userId: socket.id, user: userInfo, line, col });
  });

  socket.on('code-update', ({ code, fileId }) => {
    if (!currentRoom) return;
    const room = rooms.get(currentRoom);
    if (room) { if(!room.data.files) room.data.files={}; room.data.files[fileId]=code; }
    socket.to(currentRoom).emit('peer-code-update', { code, fileId, userId: socket.id });
  });

  /* ── Chat message in room ── */
  socket.on('room-chat', ({ text }) => {
    if (!currentRoom || !userInfo) return;
    io.to(currentRoom).emit('room-chat-msg', { user: userInfo, text, ts: Date.now() });
  });

  /* ── Disconnect ── */
  socket.on('disconnect', () => {
    if (currentRoom) {
      const room = rooms.get(currentRoom);
      if (room) {
        room.users.delete(socket.id);
        broadcastUsers(currentRoom);
        socket.to(currentRoom).emit('peer-cell-blur', { userId: socket.id });
        socket.to(currentRoom).emit('peer-cursor', { userId: socket.id, user: null });
        if (room.users.size === 0) rooms.delete(currentRoom);
      }
    }
  });

  function getUserList(roomId) {
    const room = rooms.get(roomId);
    if (!room) return [];
    return Array.from(room.users.values());
  }

  function broadcastUsers(roomId) {
    io.to(roomId).emit('users-update', { users: getUserList(roomId) });
  }
});

// ─── Express middleware ────────────────────────────────────────────────────
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (origin.startsWith('http://localhost:')) return callback(null, true);
    if (origin.startsWith('http://10.')) return callback(null, true);
    return callback(null, true); // allow all in dev
  },
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth',    authRoutes);
app.use('/api/designs', designRoutes);
app.use('/api/chat',    chatRoutes);
app.use('/api/codeai',  codeAIRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'OK', message: 'Synapse API running', collab: 'Socket.io active' }));

// ─── Start ─────────────────────────────────────────────────────────────────
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`🔌 Socket.io collab active`);
    });
  })
  .catch(err => {
    console.error('❌ MongoDB error:', err);
    process.exit(1);
  });