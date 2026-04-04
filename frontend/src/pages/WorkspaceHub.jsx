import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { LogOut, ArrowLeft } from 'lucide-react';

const WORKSPACES = [
  {
    id: 'design',
    title: 'Design Studio',
    desc: 'Vector canvas, shapes, text, layers and one-click export.',
    icon: '🎨',
    color: '#6366f1',
    href: '/dashboard',
    tags: ['Canvas', 'Export', 'Layers'],
  },
  {
    id: 'docs',
    title: 'Docs',
    desc: 'Rich-text document editor with formatting, headings and export.',
    icon: '📝',
    color: '#3b82f6',
    href: '/docs',
    tags: ['Rich Text', 'Headings', 'Export'],
  },
  {
    id: 'excel',
    title: 'Sheets',
    desc: 'Spreadsheet editor with cells, formulas and data formatting.',
    icon: '📊',
    color: '#22c55e',
    href: '/sheets',
    tags: ['Cells', 'Formulas', 'CSV Export'],
  },
  {
    id: 'ppt',
    title: 'Slides',
    desc: 'Presentation builder with multiple slides, themes and shapes.',
    icon: '🖥️',
    color: '#f97316',
    href: '/slides',
    tags: ['Slides', 'Themes', 'Present'],
  },
  {
    id: 'code',
    title: 'Code Space',
    desc: 'Code editor with syntax highlighting, multiple languages and live run.',
    icon: '💻',
    color: '#ec4899',
    href: '/code',
    tags: ['Multi-lang', 'Run JS', 'Export'],
  },
];

const card = {
  initial: { opacity: 0, y: 24, scale: 0.97 },
  animate: (i) => ({ opacity: 1, y: 0, scale: 1, transition: { delay: i * 0.07, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } }),
};

export default function WorkspaceHub() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-dark-900" style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Background glow */}
      <div style={{ position:'fixed', top:'-20%', left:'30%', width:600, height:600, background:'radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%)', pointerEvents:'none' }} />

      {/* Nav */}
      <nav className="bg-dark-800 border-b border-dark-600 px-6 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/dashboard')} className="tool-btn w-8 h-8"><ArrowLeft size={16} /></button>
          <span className="font-bold text-lg tracking-tight">Synapse Workspaces</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-dark-700 px-3 py-2 rounded-lg">
            <div className="w-6 h-6 bg-accent rounded-full flex items-center justify-center text-xs font-bold">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <span className="text-sm font-medium">{user?.name}</span>
          </div>
          <button onClick={logout} className="btn-secondary text-sm px-3 py-2 text-red-400 hover:text-red-300">
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-16">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="text-center mb-14"
        >
          <p className="text-xs font-semibold tracking-widest text-accent uppercase mb-3">All Workspaces</p>
          <h1 className="text-4xl font-bold text-white mb-4" style={{ letterSpacing: '-1px' }}>
            Choose your workspace
          </h1>
          <p className="text-gray-400 text-lg max-w-md mx-auto">
            Each workspace is purpose-built. Pick the right tool for the job.
          </p>
        </motion.div>

        {/* Cards grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
          {WORKSPACES.map((ws, i) => (
            <motion.div
              key={ws.id}
              custom={i}
              variants={card}
              initial="initial"
              animate="animate"
              onClick={() => navigate(ws.href)}
              whileHover={{ scale: 1.02, boxShadow: `0 0 32px ${ws.color}22` }}
              whileTap={{ scale: 0.98 }}
              style={{
                background: '#111', border: '1px solid #222', borderRadius: 18,
                padding: 28, cursor: 'pointer', transition: 'border-color .2s',
                position: 'relative', overflow: 'hidden',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = ws.color + '66'}
              onMouseLeave={e => e.currentTarget.style.borderColor = '#222'}
            >
              {/* Subtle glow blob */}
              <div style={{ position:'absolute', top:-40, right:-40, width:120, height:120, background:`radial-gradient(circle, ${ws.color}18 0%, transparent 70%)`, pointerEvents:'none' }} />

              {/* Icon */}
              <div style={{
                width: 56, height: 56, borderRadius: 14,
                background: ws.color + '18', border: `1px solid ${ws.color}33`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 26, marginBottom: 18,
              }}>
                {ws.icon}
              </div>

              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 8 }}>{ws.title}</h3>
              <p style={{ fontSize: 13, color: '#666', lineHeight: 1.6, marginBottom: 16 }}>{ws.desc}</p>

              {/* Tags */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {ws.tags.map(tag => (
                  <span key={tag} style={{
                    fontSize: 11, padding: '3px 8px', borderRadius: 6,
                    background: ws.color + '14', color: ws.color,
                    border: `1px solid ${ws.color}33`,
                  }}>{tag}</span>
                ))}
              </div>

              {/* Open arrow */}
              <div style={{ position:'absolute', bottom: 24, right: 24, color: ws.color, opacity: 0.6, fontSize: 20 }}>→</div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
