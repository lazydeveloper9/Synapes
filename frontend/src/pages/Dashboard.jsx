import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import toast from 'react-hot-toast';
import {
  Plus, LogOut, Trash2, Edit3, Clock, Grid,
  Search, Image, BarChart2, Share2, Check, ArrowLeft, Layers, LayoutGrid
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AnalyticsDashboard from '../components/AnalyticsDashboard';
import { NotificationBell, useNotify } from '../components/NotificationSystem';

const TEMPLATES = [
  { name: 'Presentation', w: 1920, h: 1080, emoji: '🎞️' },
  { name: 'Social Post',  w: 1080, h: 1080, emoji: '📱' },
  { name: 'Banner',       w: 1200, h: 628,  emoji: '🖼️' },
  { name: 'Poster',       w: 794,  h: 1123, emoji: '📄' },
];

const pageV     = { initial:{ opacity:0 }, animate:{ opacity:1, transition:{ duration:0.35 } } };
const gridV     = { animate:{ transition:{ staggerChildren:0.05 } } };
const cardV     = { initial:{ opacity:0, y:18, scale:0.97 }, animate:{ opacity:1, y:0, scale:1, transition:{ duration:0.32, ease:'easeOut' } }, exit:{ opacity:0, scale:0.9, transition:{ duration:0.18 } } };
const templateV = { initial:{ opacity:0, scale:0.9 }, animate:(i)=>({ opacity:1, scale:1, transition:{ delay:0.08+i*0.05, duration:0.28, ease:'backOut' } }) };

/* ─── Share button ────────────────────────────────────────────────────────── */
const ShareBtn = ({ designId, title }) => {
  const [copied, setCopied] = useState(false);

  const handleShare = (e) => {
    e.stopPropagation();
    const url = `${window.location.origin}/editor/${designId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      toast.success('Link copied to clipboard!', { duration: 2000 });
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      // Fallback
      const el = document.createElement('input');
      el.value = url; document.body.appendChild(el); el.select();
      document.execCommand('copy'); document.body.removeChild(el);
      setCopied(true);
      toast.success('Link copied!', { duration: 2000 });
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <motion.button
      onClick={handleShare}
      title="Copy share link"
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      style={{
        width: 28, height: 28, borderRadius: 7, border: 'none',
        background: copied ? 'rgba(34,197,94,0.15)' : 'rgba(99,102,241,0.12)',
        color: copied ? '#22c55e' : '#a5b4fc',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', flexShrink: 0, transition: 'background .2s, color .2s',
      }}
    >
      {copied ? <Check size={13} /> : <Share2 size={13} />}
    </motion.button>
  );
};

/* ─── Dashboard ──────────────────────────────────────────────────────────── */
const Dashboard = () => {
  const [designs,  setDesigns]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [creating, setCreating] = useState(false);
  const [analyticsDesign, setAnalyticsDesign] = useState(null);

  const { user, logout } = useAuth();
  const { notifyOpen }   = useNotify();
  const navigate = useNavigate();

  useEffect(() => { fetchDesigns(); }, []);

  const fetchDesigns = async () => {
    try {
      const { data } = await api.get('/designs');
      setDesigns(data.designs);
    } catch { toast.error('Failed to load designs'); }
    finally  { setLoading(false); }
  };

  const createDesign = async (template = null) => {
    setCreating(true);
    try {
      const payload = template
        ? { title: `${template.name} Design`, width: template.w, height: template.h }
        : { title: 'Untitled Design', width: 1280, height: 720 };
      const { data } = await api.post('/designs', payload);
      navigate(`/editor/${data.design._id}`);
    } catch { toast.error('Failed to create design'); }
    finally  { setCreating(false); }
  };

  const deleteDesign = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Delete this design?')) return;
    try {
      await api.delete(`/designs/${id}`);
      setDesigns(d => d.filter(x => x._id !== id));
      toast.success('Design deleted');
    } catch { toast.error('Failed to delete'); }
  };

  const openDesign = (design) => {
    notifyOpen('design', design.title);
    navigate(`/editor/${design._id}`);
  };

  const filtered = designs.filter(d => d.title.toLowerCase().includes(search.toLowerCase()));

  const timeAgo = (date) => {
    const diff = Date.now() - new Date(date);
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <motion.div variants={pageV} initial="initial" animate="animate" className="min-h-screen bg-dark-900">

      {/* Nav */}
      <nav className="bg-dark-800 border-b border-dark-600 px-6 py-3 flex items-center justify-between sticky top-0 z-50" style={{ backdropFilter:'blur(16px)' }}>
        <motion.div className="flex items-center gap-3" whileHover={{ scale: 1.02 }}>
          <motion.div
            className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center"
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Layers size={16} />
          </motion.div>
          <span className="font-bold text-lg tracking-tight">Synapse</span>
        </motion.div>

        {/* Search */}
        <div className="flex-1 max-w-sm mx-8">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              className="w-full bg-dark-700 border border-dark-500 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent"
              placeholder="Search designs..." />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <NotificationBell />
          <div className="flex items-center gap-2 bg-dark-700 px-3 py-2 rounded-lg">
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background:'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <span className="text-sm font-medium">{user?.name}</span>
          </div>
          <motion.button
            onClick={() => navigate('/hub')}
            className="btn-secondary text-sm px-3 py-2"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            title="All Workspaces"
          >
            <LayoutGrid size={16} /> Workspaces
          </motion.button>
          <button onClick={logout} className="btn-secondary text-sm px-3 py-2 text-red-400 hover:text-red-300">
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* Create section */}
        <motion.div className="mb-10" initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.4 }}>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">Start Creating</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            <motion.button onClick={() => createDesign()} disabled={creating}
              className="panel p-4 flex flex-col items-center gap-3 hover:border-accent transition-all cursor-pointer group disabled:opacity-60"
              custom={0} variants={templateV} initial="initial" animate="animate"
              whileHover={{ scale:1.03, boxShadow:'0 0 20px rgba(99,102,241,0.18)' }} whileTap={{ scale:0.97 }}
            >
              <div className="w-12 h-12 bg-accent/20 group-hover:bg-accent/30 rounded-xl flex items-center justify-center transition-colors">
                <Plus size={22} className="text-accent" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold">Blank Canvas</p>
                <p className="text-xs text-gray-500">1280 × 720</p>
              </div>
            </motion.button>

            {TEMPLATES.map((t, i) => (
              <motion.button key={t.name} onClick={() => createDesign(t)} disabled={creating}
                className="panel p-4 flex flex-col items-center gap-3 hover:border-accent transition-all cursor-pointer group disabled:opacity-60"
                custom={i+1} variants={templateV} initial="initial" animate="animate"
                whileHover={{ scale:1.03, boxShadow:'0 0 20px rgba(99,102,241,0.15)' }} whileTap={{ scale:0.97 }}
              >
                <div className="w-12 h-12 bg-dark-600 group-hover:bg-dark-500 rounded-xl flex items-center justify-center text-2xl transition-colors">
                  {t.emoji}
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold">{t.name}</p>
                  <p className="text-xs text-gray-500">{t.w} × {t.h}</p>
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Designs grid */}
        <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.15 }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
              My Designs {filtered.length > 0 && <span className="text-gray-600 ml-1">({filtered.length})</span>}
            </h2>
            <Grid size={15} className="text-gray-600" />
          </div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {[...Array(8)].map((_, i) => (
                <motion.div key={i} className="panel aspect-video" style={{ background:'#1a1a1a' }}
                  animate={{ opacity:[0.4,0.9,0.4] }} transition={{ duration:1.4, repeat:Infinity, delay:i*0.08 }} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} className="text-center py-20 text-gray-600">
              <Image size={48} className="mx-auto mb-4 opacity-25" />
              <p className="font-medium">{search ? 'No designs match your search' : 'No designs yet'}</p>
              <p className="text-sm mt-1">Create your first design above</p>
            </motion.div>
          ) : (
            <motion.div variants={gridV} initial="initial" animate="animate"
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
            >
              <AnimatePresence>
                {filtered.map(design => (
                  <motion.div key={design._id} variants={cardV} layout exit="exit"
                    onClick={() => openDesign(design)}
                    className="panel cursor-pointer hover:border-accent transition-all duration-200 overflow-visible"
                    whileHover={{ scale:1.025, boxShadow:'0 6px 28px rgba(99,102,241,0.14)' }}
                    style={{ position:'relative' }}
                  >
                    {/* Thumbnail */}
                    <div className="aspect-video bg-dark-700 relative overflow-hidden rounded-t-xl">
                      {design.thumbnail
                        ? <img src={design.thumbnail} alt={design.title} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center"><Edit3 size={22} className="text-dark-500" /></div>
                      }
                      <div className="absolute inset-0 bg-accent/10 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="bg-accent text-white text-xs font-medium px-3 py-1 rounded-full">Open</span>
                      </div>
                    </div>

                    {/* Info row — static buttons, always visible */}
                    <div className="p-3">
                      <p className="text-sm font-medium truncate mb-1">{design.title}</p>
                      <div className="flex items-center gap-1 text-gray-500 text-xs mb-2">
                        <Clock size={9} /> {timeAgo(design.updatedAt)}
                      </div>
                      {/* Action buttons — ALWAYS VISIBLE */}
                      <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                        {/* Analytics */}
                        <motion.button
                          onClick={(e) => { e.stopPropagation(); setAnalyticsDesign(design); }}
                          title="View Analytics"
                          whileHover={{ scale:1.1 }} whileTap={{ scale:0.9 }}
                          style={{ width:28, height:28, borderRadius:7, border:'none', background:'rgba(165,180,252,0.12)', color:'#a5b4fc', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0 }}
                        >
                          <BarChart2 size={13} />
                        </motion.button>

                        {/* Share */}
                        <ShareBtn designId={design._id} title={design.title} />

                        {/* Delete */}
                        <motion.button
                          onClick={(e) => deleteDesign(design._id, e)}
                          title="Delete design"
                          whileHover={{ scale:1.1 }} whileTap={{ scale:0.9 }}
                          style={{ width:28, height:28, borderRadius:7, border:'none', background:'rgba(248,113,113,0.1)', color:'#f87171', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0 }}
                        >
                          <Trash2 size={13} />
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Analytics modal */}
      <AnimatePresence>
        {analyticsDesign && (
          <AnalyticsDashboard design={analyticsDesign} onClose={() => setAnalyticsDesign(null)} />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Dashboard;
