import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { LogOut } from 'lucide-react';
import { NotificationBell } from '../components/NotificationSystem';

/* ─── Workspace SVG Icons ────────────────────────────────────────────────── */
const IconDesign = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
    <rect x="3" y="3" width="22" height="22" rx="5" fill="#6366f1" opacity="0.15"/>
    <path d="M8 20L12 10L16 16L19 12L22 20H8Z" fill="#6366f1" opacity="0.4"/>
    <circle cx="19" cy="9" r="3" fill="#6366f1"/>
    <path d="M6 22H22" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const IconDocs = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
    <rect x="5" y="2" width="16" height="22" rx="3" fill="#3b82f6" opacity="0.15" stroke="#3b82f6" strokeWidth="1.2"/>
    <path d="M9 9H19M9 13H19M9 17H15" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M18 2L23 7" stroke="#3b82f6" strokeWidth="1.2" strokeLinecap="round"/>
    <path d="M18 2V7H23" fill="#3b82f6" opacity="0.2"/>
  </svg>
);

const IconSheets = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
    <rect x="3" y="3" width="22" height="22" rx="4" fill="#22c55e" opacity="0.12" stroke="#22c55e" strokeWidth="1.2"/>
    <line x1="3" y1="10" x2="25" y2="10" stroke="#22c55e" strokeWidth="1"/>
    <line x1="3" y1="17" x2="25" y2="17" stroke="#22c55e" strokeWidth="1"/>
    <line x1="11" y1="3" x2="11" y2="25" stroke="#22c55e" strokeWidth="1"/>
    <line x1="19" y1="3" x2="19" y2="25" stroke="#22c55e" strokeWidth="1"/>
    <rect x="11" y="10" width="8" height="7" fill="#22c55e" opacity="0.25"/>
  </svg>
);

const IconSlides = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
    <rect x="3" y="6" width="22" height="16" rx="3" fill="#f97316" opacity="0.15" stroke="#f97316" strokeWidth="1.2"/>
    <rect x="7" y="9" width="14" height="8" rx="1.5" fill="#f97316" opacity="0.25"/>
    <path d="M11 23H17" stroke="#f97316" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M14 21V23" stroke="#f97316" strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="14" cy="13" r="2.5" fill="#f97316" opacity="0.6"/>
    <path d="M12.5 13L16.5 13M14 11.5L14 14.5" stroke="#f97316" strokeWidth="1"/>
  </svg>
);

const IconCode = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
    <rect x="3" y="4" width="22" height="20" rx="4" fill="#ec4899" opacity="0.12" stroke="#ec4899" strokeWidth="1.2"/>
    <circle cx="8" cy="9" r="1.2" fill="#ef4444"/>
    <circle cx="12" cy="9" r="1.2" fill="#f97316"/>
    <circle cx="16" cy="9" r="1.2" fill="#22c55e"/>
    <line x1="5" y1="12" x2="23" y2="12" stroke="#ec4899" strokeWidth="0.8" opacity="0.4"/>
    <path d="M9 17L7 15L9 13" stroke="#ec4899" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M13 17L15 15L13 13" stroke="#ec4899" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M10.5 18L12.5 12" stroke="#ec4899" strokeWidth="1.2" strokeLinecap="round" opacity="0.7"/>
  </svg>
);

const WORKSPACES = [
  { id: 'design', title: 'Design Studio', desc: 'Vector canvas with shapes, text, layers and one-click export to PNG, PDF, DOC, ZIP.', Icon: IconDesign, color: '#6366f1', href: '/dashboard', tags: ['Canvas', 'Layers', 'Export'] },
  { id: 'docs',   title: 'Docs',          desc: 'Rich-text document editor with formatting toolbar, word count, and DOC/TXT export.', Icon: IconDocs,   color: '#3b82f6', href: '/docs',      tags: ['Rich Text', 'Headings', 'Export'] },
  { id: 'sheets', title: 'Sheets',        desc: 'Spreadsheet editor with cells, SUM/AVG formulas, and CSV export.',                   Icon: IconSheets, color: '#22c55e', href: '/sheets',    tags: ['Cells', 'Formulas', 'CSV'] },
  { id: 'slides', title: 'Slides',        desc: 'Presentation builder with slide strip, themes, shapes, present mode and PNG export.', Icon: IconSlides, color: '#f97316', href: '/slides',    tags: ['Slides', 'Present', 'Themes'] },
  { id: 'code',   title: 'Code Space',    desc: 'Code editor with syntax highlight for 8 languages, JS runner and file download.',    Icon: IconCode,   color: '#ec4899', href: '/code',      tags: ['8 Languages', 'Run JS', 'Download'] },
];

const card = {
  initial: { opacity: 0, y: 28, scale: 0.96 },
  animate: (i) => ({ opacity: 1, y: 0, scale: 1, transition: { delay: 0.08 + i * 0.07, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } }),
};

export default function WorkspaceHub() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-dark-900" style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Background ambient */}
      <div style={{ position:'fixed', top:'-15%', left:'20%', width:700, height:700, background:'radial-gradient(circle, rgba(99,102,241,0.05) 0%, transparent 70%)', pointerEvents:'none', zIndex:0 }} />
      <div style={{ position:'fixed', bottom:'-10%', right:'10%', width:400, height:400, background:'radial-gradient(circle, rgba(236,72,153,0.04) 0%, transparent 70%)', pointerEvents:'none', zIndex:0 }} />

      {/* Nav */}
      <nav className="bg-dark-800 border-b border-dark-600 px-6 py-3 flex items-center justify-between sticky top-0 z-50" style={{ backdropFilter:'blur(20px)' }}>
        {/* Logo */}
        <motion.div
          className="flex items-center gap-3"
          initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }}
        >
          <div style={{ width:34, height:34, borderRadius:10, background:'linear-gradient(135deg,#6366f1,#8b5cf6)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle cx="9" cy="9" r="3" fill="#fff"/>
              <circle cx="9" cy="3" r="1.5" fill="#fff" opacity="0.6"/>
              <circle cx="9" cy="15" r="1.5" fill="#fff" opacity="0.6"/>
              <circle cx="3" cy="9" r="1.5" fill="#fff" opacity="0.6"/>
              <circle cx="15" cy="9" r="1.5" fill="#fff" opacity="0.6"/>
            </svg>
          </div>
          <span className="font-bold text-lg tracking-tight">Synapse</span>
        </motion.div>

        {/* User + actions */}
        <motion.div
          className="flex items-center gap-3"
          initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }}
        >
          <NotificationBell />
          <div className="flex items-center gap-2 bg-dark-700 px-3 py-2 rounded-lg">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-medium leading-none">{user?.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">{user?.email}</p>
            </div>
          </div>
          <button onClick={logout} className="btn-secondary text-sm px-3 py-2 text-red-400 hover:text-red-300">
            <LogOut size={15} /> Sign out
          </button>
        </motion.div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-14" style={{ position:'relative', zIndex:1 }}>

        {/* Header */}
        <motion.div
          initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.5 }}
          className="mb-14"
        >
          <p className="text-xs font-semibold tracking-widest text-accent uppercase mb-3">Welcome back, {user?.name?.split(' ')[0]} 👋</p>
          <h1 className="text-4xl font-bold text-white mb-4" style={{ letterSpacing:'-1.5px' }}>
            Choose your workspace
          </h1>
          <p className="text-gray-500 text-base max-w-lg">
            Each tool is purpose-built for its job. Create, write, compute, present, or code — all in one platform.
          </p>
        </motion.div>

        {/* Workspace grid */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(290px, 1fr))', gap:18 }}>
          {WORKSPACES.map((ws, i) => (
            <motion.div
              key={ws.id}
              custom={i}
              variants={card}
              initial="initial"
              animate="animate"
              onClick={() => navigate(ws.href)}
              whileHover={{ scale: 1.025, y: -3 }}
              whileTap={{ scale: 0.98 }}
              style={{
                background:'#0f0f0f', border:'1px solid #1e1e1e', borderRadius:20,
                padding:28, cursor:'pointer', position:'relative', overflow:'hidden',
                transition:'border-color .2s, box-shadow .2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = ws.color + '55'; e.currentTarget.style.boxShadow = `0 8px 32px ${ws.color}18`; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#1e1e1e'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              {/* Glow blob top-right */}
              <div style={{ position:'absolute', top:-30, right:-30, width:100, height:100, borderRadius:'50%', background:`radial-gradient(circle, ${ws.color}20 0%, transparent 70%)`, pointerEvents:'none' }} />

              {/* Icon box */}
              <div style={{ width:56, height:56, borderRadius:16, background:ws.color+'16', border:`1px solid ${ws.color}30`, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:20 }}>
                <ws.Icon />
              </div>

              <h3 style={{ fontSize:18, fontWeight:700, color:'#fff', marginBottom:8, letterSpacing:'-0.3px' }}>{ws.title}</h3>
              <p style={{ fontSize:13, color:'#666', lineHeight:1.65, marginBottom:18 }}>{ws.desc}</p>

              {/* Tags */}
              <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:20 }}>
                {ws.tags.map(tag => (
                  <span key={tag} style={{ fontSize:11, padding:'3px 9px', borderRadius:6, background:ws.color+'14', color:ws.color, border:`1px solid ${ws.color}30` }}>
                    {tag}
                  </span>
                ))}
              </div>

              {/* Open button */}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <span style={{ fontSize:12, color:'#444' }}>Click to open</span>
                <div style={{ width:32, height:32, borderRadius:10, background:ws.color+'18', border:`1px solid ${ws.color}30`, display:'flex', alignItems:'center', justifyContent:'center', color:ws.color, fontSize:16 }}>
                  →
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Footer */}
        <motion.p
          initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.6 }}
          style={{ textAlign:'center', color:'#2a2a2a', fontSize:12, marginTop:48 }}
        >
          Synapse · Made with ❤️ in India 🇮🇳
        </motion.p>
      </div>
    </div>
  );
}
