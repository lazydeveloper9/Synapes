import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Loader2, ArrowRight, Sparkles } from 'lucide-react';

// ─── Quick Questions ──────────────────────────────────────────────────────────
const QUICK_QUESTIONS = [
  { label: '✨ What is Synapse?',          message: 'What is Synapse and what can I do with it?', redirect: null },
  { label: '🎨 How does the editor work?', message: 'How does the Synapse canvas editor work?',   redirect: null },
  { label: '📤 How do I export designs?',  message: 'How do I export my designs?',               redirect: null },
  { label: '🚀 Get started free →',        message: null,                                         redirect: '/register' },
  { label: '🔐 Sign in →',                 message: null,                                         redirect: '/login' },
];

const SYSTEM_PROMPT = `You are the helpful AI assistant for Synapse — a modern, free, browser-based design canvas tool. 
Synapse lets users create beautiful designs with a vector canvas, real-time auto-save, layers, shapes, typography, and one-click PNG export. It's completely free.
Key features: Vector Canvas, Auto Save, PNG Export, Templates (Presentation, Social Post, Banner, Poster), Layer Control, Typography tools.
Keep answers concise (2-4 sentences). Be enthusiastic about design. If asked about pricing, it's always free. 
For technical questions about the app, explain clearly. Always end with an encouraging call to action.`;

// ─── Message Bubble ───────────────────────────────────────────────────────────
const MessageBubble = ({ msg }) => (
  <motion.div
    initial={{ opacity: 0, y: 10, scale: 0.97 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ duration: 0.25, ease: 'easeOut' }}
    style={{
      display: 'flex',
      justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
      marginBottom: '10px',
    }}
  >
    {msg.role === 'assistant' && (
      <div style={{
        width: '28px', height: '28px', borderRadius: '50%',
        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, marginRight: '8px', alignSelf: 'flex-end',
        fontSize: '12px',
      }}>
        ✦
      </div>
    )}
    <div style={{
      maxWidth: '80%',
      padding: '10px 14px',
      borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
      background: msg.role === 'user'
        ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
        : 'rgba(255,255,255,0.05)',
      border: msg.role === 'assistant' ? '1px solid rgba(255,255,255,0.08)' : 'none',
      color: '#fff',
      fontSize: '13px',
      lineHeight: '1.6',
    }}>
      {msg.content}
    </div>
  </motion.div>
);

// ─── Typing indicator ─────────────────────────────────────────────────────────
const TypingIndicator = () => (
  <motion.div
    initial={{ opacity: 0, y: 6 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: 6 }}
    style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}
  >
    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>
      ✦
    </div>
    <div style={{ display: 'flex', gap: '4px', padding: '10px 14px', background: 'rgba(255,255,255,0.05)', borderRadius: '18px 18px 18px 4px', border: '1px solid rgba(255,255,255,0.08)' }}>
      {[0, 1, 2].map(i => (
        <motion.div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#6366f1' }}
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </div>
  </motion.div>
);

// ─── ChatBot ──────────────────────────────────────────────────────────────────
const ChatBot = () => {
  const [open,     setOpen]     = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi! 👋 I\'m the Synapse AI assistant. Ask me anything about the platform, or use the quick options below!' }
  ]);
  const [input,    setInput]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [hasNew,   setHasNew]   = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef       = useRef(null);
  const navigate       = useNavigate();

  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => inputRef.current?.focus(), 100);
      setHasNew(false);
    }
  }, [open, messages]);

  // Auto-greet after 4s if not opened yet
  useEffect(() => {
    const t = setTimeout(() => { if (!open) setHasNew(true); }, 4000);
    return () => clearTimeout(t);
  }, []);

  const sendMessage = async (text) => {
    if (!text.trim() || loading) return;
    const userMsg = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // Build conversation history (exclude system message objects)
      const history = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history, system: SYSTEM_PROMPT }),
      });

      if (!response.ok) throw new Error('Chat request failed');
      const data = await response.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (err) {
      // Fallback smart responses when backend isn't configured
      const fallbacks = {
        default: "Synapse is a free, powerful design canvas tool with real-time saving, layers, shapes, and one-click PNG export. Sign up free and start creating in seconds! 🎨",
        export:  "You can export your designs as high-quality PNG files directly from the editor toolbar. Just click the 'Export' button! More formats like PDF and ZIP are available too.",
        editor:  "The Synapse editor gives you a full canvas with vector shapes, text tools, image upload, layer management, and auto-save. It's intuitive and powerful! ✨",
        free:    "Synapse is completely free, forever! No credit card needed. Just create an account and start designing right away. 🚀",
      };
      const lower = text.toLowerCase();
      const reply = lower.includes('export') || lower.includes('download') ? fallbacks.export
        : lower.includes('editor') || lower.includes('canvas') || lower.includes('how') ? fallbacks.editor
        : lower.includes('free') || lower.includes('cost') || lower.includes('price') ? fallbacks.free
        : fallbacks.default;
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuick = (q) => {
    if (q.redirect) {
      navigate(q.redirect);
      return;
    }
    if (q.message) sendMessage(q.message);
  };

  return (
    <>
      {/* ── Floating Button ── */}
      <motion.div
        style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999 }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1, type: 'spring', stiffness: 300 }}
      >
        <motion.button
          onClick={() => setOpen(o => !o)}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          style={{
            width: '56px', height: '56px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            border: 'none', cursor: 'pointer', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 24px rgba(99,102,241,0.5)',
          }}
        >
          <AnimatePresence mode="wait">
            {open
              ? <motion.div key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}><X size={22} /></motion.div>
              : <motion.div key="chat" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}><MessageCircle size={22} /></motion.div>
            }
          </AnimatePresence>
        </motion.button>

        {/* Notification dot */}
        <AnimatePresence>
          {!open && hasNew && (
            <motion.div
              initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
              style={{
                position: 'absolute', top: '-2px', right: '-2px',
                width: '16px', height: '16px', borderRadius: '50%',
                background: '#ec4899', border: '2px solid #050505',
                fontSize: '9px', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700',
              }}
            >
              1
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Chat Window ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20, originX: 1, originY: 1 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
            style={{
              position: 'fixed', bottom: '92px', right: '24px', zIndex: 9998,
              width: '360px', height: '520px',
              background: '#0d0d0d',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '20px',
              display: 'flex', flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(99,102,241,0.1)',
            }}
          >
            {/* Header */}
            <div style={{ padding: '16px 18px', borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(99,102,241,0.06)', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <motion.div
                  style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 3, repeat: Infinity }}
                >
                  ✦
                </motion.div>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: '600', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    Synapse AI
                    <span style={{ fontSize: '10px', background: 'rgba(99,102,241,0.2)', color: '#a5b4fc', padding: '2px 6px', borderRadius: '6px' }}>
                      <Sparkles size={8} style={{ display: 'inline', marginRight: '2px' }} />Beta
                    </span>
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <motion.div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e' }} animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />
                    <span style={{ fontSize: '11px', color: '#666' }}>Online</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px', scrollBehavior: 'smooth' }}
              className="chatbot-messages"
            >
              {messages.map((msg, i) => <MessageBubble key={i} msg={msg} />)}
              <AnimatePresence>{loading && <TypingIndicator />}</AnimatePresence>
              <div ref={messagesEndRef} />
            </div>

            {/* Quick questions */}
            {messages.length <= 2 && !loading && (
              <motion.div
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                style={{ padding: '0 16px 12px', display: 'flex', flexDirection: 'column', gap: '6px' }}
              >
                <p style={{ fontSize: '11px', color: '#444', marginBottom: '2px' }}>Quick options</p>
                {QUICK_QUESTIONS.map((q, i) => (
                  <motion.button
                    key={i}
                    onClick={() => handleQuick(q)}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}
                    whileHover={{ scale: 1.01, background: 'rgba(99,102,241,0.12)' }}
                    whileTap={{ scale: 0.98 }}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '8px 12px', background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px',
                      color: '#ccc', fontSize: '12px', cursor: 'pointer', textAlign: 'left',
                    }}
                  >
                    {q.label}
                    {q.redirect && <ArrowRight size={12} style={{ color: '#6366f1', flexShrink: 0 }} />}
                  </motion.button>
                ))}
              </motion.div>
            )}

            {/* Input */}
            <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
                  placeholder="Ask anything about Synapse..."
                  disabled={loading}
                  style={{
                    flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px', padding: '10px 14px', color: '#fff', fontSize: '13px',
                    outline: 'none', fontFamily: 'inherit',
                  }}
                  onFocus={e => { e.target.style.borderColor = 'rgba(99,102,241,0.5)'; e.target.style.boxShadow = '0 0 0 2px rgba(99,102,241,0.1)'; }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; }}
                />
                <motion.button
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || loading}
                  whileHover={input.trim() && !loading ? { scale: 1.05 } : {}}
                  whileTap={input.trim() && !loading ? { scale: 0.95 } : {}}
                  style={{
                    width: '40px', height: '40px', borderRadius: '12px',
                    background: input.trim() && !loading ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : '#1a1a1a',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: input.trim() && !loading ? '#fff' : '#555',
                    cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={16} />}
                </motion.button>
              </div>
              <p style={{ fontSize: '10px', color: '#333', marginTop: '6px', textAlign: 'center' }}>
                Powered by Claude AI
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .chatbot-messages::-webkit-scrollbar { width: 4px; }
        .chatbot-messages::-webkit-scrollbar-track { background: transparent; }
        .chatbot-messages::-webkit-scrollbar-thumb { background: #222; border-radius: 2px; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
};

export default ChatBot;
