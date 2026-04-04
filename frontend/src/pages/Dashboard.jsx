import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import toast from 'react-hot-toast';
import {
  Plus, Layers, LogOut, Trash2, Edit3, Clock, Grid,
  Search, MoreVertical, Image, BarChart2, LayoutGrid
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AnalyticsDashboard from '../components/AnalyticsDashboard';

const TEMPLATES = [
  { name: 'Presentation', w: 1920, h: 1080, icon: '🎞️' },
  { name: 'Social Post',  w: 1080, h: 1080, icon: '📱' },
  { name: 'Banner',       w: 1200, h: 628,  icon: '🖼️' },
  { name: 'Poster',       w: 794,  h: 1123, icon: '📄' },
];

// ─── Animation variants ───────────────────────────────────────────────────────
const pageVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.4 } },
};

const navVariants = {
  initial: { y: -60, opacity: 0 },
  animate: { y: 0, opacity: 1, transition: { duration: 0.4, ease: 'easeOut' } },
};

const sectionVariants = {
  initial: { opacity: 0, y: 24 },
  animate: (delay = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.45, delay, ease: [0.25, 0.46, 0.45, 0.94] } }),
};

const gridVariants = {
  animate: { transition: { staggerChildren: 0.055 } },
};

const cardVariants = {
  initial: { opacity: 0, y: 20, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.35, ease: 'easeOut' } },
  exit:    { opacity: 0, scale: 0.9, transition: { duration: 0.2 } },
};

const templateVariants = {
  initial: { opacity: 0, scale: 0.9 },
  animate: (i) => ({ opacity: 1, scale: 1, transition: { delay: 0.1 + i * 0.05, duration: 0.3, ease: 'backOut' } }),
};

// ─── Dashboard ────────────────────────────────────────────────────────────────
const Dashboard = () => {
  const [designs,  setDesigns]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [creating, setCreating] = useState(false);
  const [analyticsDesign, setAnalyticsDesign] = useState(null); // which design to show analytics for
  const [openMenu, setOpenMenu] = useState(null); // design._id with open context menu

  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { fetchDesigns(); }, []);

  // Close menu on outside click
  useEffect(() => {
    const handler = () => setOpenMenu(null);
    if (openMenu) document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [openMenu]);

  const fetchDesigns = async () => {
    try {
      const { data } = await api.get('/designs');
      setDesigns(data.designs);
    } catch {
      toast.error('Failed to load designs');
    } finally {
      setLoading(false);
    }
  };

  const createDesign = async (template = null) => {
    setCreating(true);
    try {
      const payload = template
        ? { title: `${template.name} Design`, width: template.w, height: template.h }
        : { title: 'Untitled Design', width: 1280, height: 720 };
      const { data } = await api.post('/designs', payload);
      navigate(`/editor/${data.design._id}`);
    } catch {
      toast.error('Failed to create design');
    } finally {
      setCreating(false);
    }
  };

  const deleteDesign = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Delete this design?')) return;
    try {
      await api.delete(`/designs/${id}`);
      setDesigns(d => d.filter(x => x._id !== id));
      toast.success('Design deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  const filtered = designs.filter(d =>
    d.title.toLowerCase().includes(search.toLowerCase())
  );

  const timeAgo = (date) => {
    const diff = Date.now() - new Date(date);
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" className="min-h-screen bg-dark-900">

      {/* ── Top Nav ── */}
      <motion.nav
        variants={navVariants}
        initial="initial"
        animate="animate"
        className="bg-dark-800 border-b border-dark-600 px-6 py-3 flex items-center justify-between sticky top-0 z-50"
        style={{ backdropFilter: 'blur(16px)' }}
      >
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

        <div className="flex-1 max-w-md mx-8">
          <motion.div className="relative" whileFocus={{ scale: 1.01 }}>
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-dark-700 border border-dark-500 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent"
              placeholder="Search designs..."
            />
          </motion.div>
        </div>

        <div className="flex items-center gap-3">
          <motion.div
            className="flex items-center gap-2 bg-dark-700 px-3 py-2 rounded-lg"
            whileHover={{ background: '#2a2a2a' }}
          >
            <motion.div
              className="w-6 h-6 bg-accent rounded-full flex items-center justify-center text-xs font-bold"
              whileHover={{ scale: 1.1 }}
            >
              {user?.name?.[0]?.toUpperCase()}
            </motion.div>
            <span className="text-sm font-medium">{user?.name}</span>
          </motion.div>
          <motion.button
            onClick={() => navigate('/hub')}
            className="btn-secondary text-sm px-3 py-2"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            title="All Workspaces"
          >
            <LayoutGrid size={16} /> Workspaces
          </motion.button>
          <motion.button
            onClick={logout}
            className="btn-secondary text-sm px-3 py-2 text-red-400 hover:text-red-300"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <LogOut size={16} /> Sign out
          </motion.button>
        </div>
      </motion.nav>

      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* ── Create Section ── */}
        <motion.div
          className="mb-10"
          custom={0}
          variants={sectionVariants}
          initial="initial"
          animate="animate"
        >
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-4">
            Start Creating
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {/* Blank canvas */}
            <motion.button
              onClick={() => createDesign()} disabled={creating}
              className="panel p-4 flex flex-col items-center gap-3 hover:border-accent transition-all duration-200 cursor-pointer group disabled:opacity-60"
              custom={0} variants={templateVariants} initial="initial" animate="animate"
              whileHover={{ scale: 1.03, boxShadow: '0 0 20px rgba(99,102,241,0.15)' }}
              whileTap={{ scale: 0.97 }}
            >
              <div className="w-12 h-12 bg-accent/20 group-hover:bg-accent/30 rounded-xl flex items-center justify-center transition-colors">
                <Plus size={24} className="text-accent" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold">Blank Canvas</p>
                <p className="text-xs text-gray-500">1280 × 720</p>
              </div>
            </motion.button>

            {TEMPLATES.map((t, i) => (
              <motion.button
                key={t.name} onClick={() => createDesign(t)} disabled={creating}
                className="panel p-4 flex flex-col items-center gap-3 hover:border-accent transition-all duration-200 cursor-pointer group disabled:opacity-60"
                custom={i + 1} variants={templateVariants} initial="initial" animate="animate"
                whileHover={{ scale: 1.03, boxShadow: '0 0 20px rgba(99,102,241,0.15)' }}
                whileTap={{ scale: 0.97 }}
              >
                <div className="w-12 h-12 bg-dark-600 group-hover:bg-dark-500 rounded-xl flex items-center justify-center text-2xl transition-colors">
                  {t.icon}
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold">{t.name}</p>
                  <p className="text-xs text-gray-500">{t.w} × {t.h}</p>
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* ── Designs Grid ── */}
        <motion.div custom={0.15} variants={sectionVariants} initial="initial" animate="animate">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest">
              My Designs{filtered.length > 0 && <span className="text-gray-600 ml-1">({filtered.length})</span>}
            </h2>
            <Grid size={16} className="text-gray-500" />
          </div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={i}
                  className="panel aspect-video"
                  style={{ background: '#1a1a1a' }}
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.08 }}
                />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-20 text-gray-500"
            >
              <Image size={48} className="mx-auto mb-4 opacity-30" />
              <p className="font-medium">{search ? 'No designs match your search' : 'No designs yet'}</p>
              <p className="text-sm mt-1">Create your first design above</p>
            </motion.div>
          ) : (
            <motion.div
              variants={gridVariants}
              initial="initial"
              animate="animate"
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
            >
              <AnimatePresence>
                {filtered.map(design => (
                  <motion.div
                    key={design._id}
                    variants={cardVariants}
                    layout
                    exit="exit"
                    onClick={() => navigate(`/editor/${design._id}`)}
                    className="panel group cursor-pointer hover:border-accent transition-all duration-200 overflow-hidden"
                    whileHover={{ scale: 1.02, boxShadow: '0 4px 24px rgba(99,102,241,0.12)' }}
                    style={{ position: 'relative' }}
                  >
                    {/* Thumbnail */}
                    <div className="aspect-video bg-dark-700 relative overflow-hidden">
                      {design.thumbnail ? (
                        <img src={design.thumbnail} alt={design.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Edit3 size={24} className="text-dark-500" />
                        </div>
                      )}
                      {/* Hover overlay */}
                      <motion.div
                        className="absolute inset-0 bg-accent/10 flex items-center justify-center"
                        initial={{ opacity: 0 }}
                        whileHover={{ opacity: 1 }}
                      >
                        <span className="bg-accent text-white text-xs font-medium px-3 py-1 rounded-full">
                          Open
                        </span>
                      </motion.div>
                    </div>

                    {/* Info row */}
                    <div className="p-3 flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{design.title}</p>
                        <div className="flex items-center gap-1 text-gray-500 text-xs mt-0.5">
                          <Clock size={10} /> {timeAgo(design.updatedAt)}
                        </div>
                      </div>

                      {/* Context menu trigger */}
                      <div style={{ position: 'relative' }}>
                        <motion.button
                          onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === design._id ? null : design._id); }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-white transition-all rounded"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          <MoreVertical size={14} />
                        </motion.button>

                        {/* Dropdown menu */}
                        <AnimatePresence>
                          {openMenu === design._id && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.9, y: -4 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.9, y: -4 }}
                              transition={{ duration: 0.15, ease: 'easeOut' }}
                              style={{
                                position: 'absolute', right: 0, top: '100%', zIndex: 50,
                                background: '#1a1a1a', border: '1px solid #333',
                                borderRadius: '10px', padding: '6px', minWidth: '160px',
                                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                              }}
                              onClick={e => e.stopPropagation()}
                            >
                              <button
                                onClick={(e) => { e.stopPropagation(); setOpenMenu(null); setAnalyticsDesign(design); }}
                                style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 10px', background: 'none', border: 'none', color: '#a5b4fc', fontSize: '13px', cursor: 'pointer', borderRadius: '7px' }}
                                onMouseEnter={e => e.currentTarget.style.background = '#252525'}
                                onMouseLeave={e => e.currentTarget.style.background = 'none'}
                              >
                                <BarChart2 size={14} /> View Analytics
                              </button>
                              <button
                                onClick={(e) => deleteDesign(design._id, e)}
                                style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 10px', background: 'none', border: 'none', color: '#f87171', fontSize: '13px', cursor: 'pointer', borderRadius: '7px' }}
                                onMouseEnter={e => e.currentTarget.style.background = '#2a1515'}
                                onMouseLeave={e => e.currentTarget.style.background = 'none'}
                              >
                                <Trash2 size={14} /> Delete
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* ── Analytics Modal ── */}
      <AnimatePresence>
        {analyticsDesign && (
          <AnalyticsDashboard
            design={analyticsDesign}
            onClose={() => setAnalyticsDesign(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Dashboard;
