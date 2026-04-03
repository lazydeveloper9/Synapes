import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import toast from 'react-hot-toast';
import {
  Plus, Layers, LogOut, Trash2, Edit3, Clock, Grid,
  Search, User, MoreVertical, Image
} from 'lucide-react';

const TEMPLATES = [
  { name: 'Presentation', w: 1920, h: 1080, icon: '🎞️' },
  { name: 'Social Post', w: 1080, h: 1080, icon: '📱' },
  { name: 'Banner', w: 1200, h: 628, icon: '🖼️' },
  { name: 'Poster', w: 794, h: 1123, icon: '📄' },
];

const Dashboard = () => {
  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { fetchDesigns(); }, []);

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
      console.log('Creating design with payload:', payload);
      const { data } = await api.post('/designs', payload);
      console.log('Design created:', data);
      navigate(`/editor/${data.design._id}`);
    } catch (error) {
      console.error('Create design error:', error);
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
    <div className="min-h-screen bg-dark-900">
      {/* Top Nav */}
      <nav className="bg-dark-800 border-b border-dark-600 px-6 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
            <Layers size={16} />
          </div>
          <span className="font-bold text-lg tracking-tight">DesignForge</span>
        </div>

        <div className="flex-1 max-w-md mx-8">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-dark-700 border border-dark-500 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent"
              placeholder="Search designs..."
            />
          </div>
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

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Create Section */}
        <div className="mb-10">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-4">Start Creating</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {/* Blank */}
            <button onClick={() => createDesign()} disabled={creating}
              className="panel p-4 flex flex-col items-center gap-3 hover:border-accent transition-all duration-200 cursor-pointer group disabled:opacity-60">
              <div className="w-12 h-12 bg-accent/20 group-hover:bg-accent/30 rounded-xl flex items-center justify-center transition-colors">
                <Plus size={24} className="text-accent" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold">Blank Canvas</p>
                <p className="text-xs text-gray-500">1280 × 720</p>
              </div>
            </button>

            {/* Templates */}
            {TEMPLATES.map(t => (
              <button key={t.name} onClick={() => createDesign(t)} disabled={creating}
                className="panel p-4 flex flex-col items-center gap-3 hover:border-accent transition-all duration-200 cursor-pointer group disabled:opacity-60">
                <div className="w-12 h-12 bg-dark-600 group-hover:bg-dark-500 rounded-xl flex items-center justify-center text-2xl transition-colors">
                  {t.icon}
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold">{t.name}</p>
                  <p className="text-xs text-gray-500">{t.w} × {t.h}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Designs Grid */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest">
              My Designs {filtered.length > 0 && <span className="text-gray-600">({filtered.length})</span>}
            </h2>
            <Grid size={16} className="text-gray-500" />
          </div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="panel aspect-video animate-pulse bg-dark-700" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-gray-500">
              <Image size={48} className="mx-auto mb-4 opacity-30" />
              <p className="font-medium">{search ? 'No designs match your search' : 'No designs yet'}</p>
              <p className="text-sm mt-1">Create your first design above</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filtered.map(design => (
                <div key={design._id}
                  onClick={() => navigate(`/editor/${design._id}`)}
                  className="panel group cursor-pointer hover:border-accent transition-all duration-200 overflow-hidden">
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
                    <div className="absolute inset-0 bg-accent/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="bg-accent text-white text-xs font-medium px-3 py-1 rounded-full">Open</span>
                    </div>
                  </div>
                  {/* Info */}
                  <div className="p-3 flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{design.title}</p>
                      <div className="flex items-center gap-1 text-gray-500 text-xs mt-0.5">
                        <Clock size={10} /> {timeAgo(design.updatedAt)}
                      </div>
                    </div>
                    <button onClick={(e) => deleteDesign(design._id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 text-gray-500 transition-all">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;