import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Layers, Check } from 'lucide-react';

const Register = () => {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) {
      return toast.error('Password must be at least 6 characters');
    }
    setLoading(true);
    try {
      await register(form.name, form.email, form.password);
      toast.success('Account created! Welcome to DesignForge!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const perks = ['Unlimited designs', 'Canvas editor', 'Export PNG/SVG', 'Cloud save'];

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 opacity-[0.03]"
        style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '50px 50px' }} />

      <div className="relative w-full max-w-md fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center">
              <Layers size={20} />
            </div>
            <span className="text-2xl font-bold tracking-tight">DesignForge</span>
          </div>
          <h1 className="text-3xl font-bold mb-2">Start designing</h1>
          <p className="text-gray-400">Free forever. No credit card needed.</p>
        </div>

        {/* Perks */}
        <div className="flex flex-wrap gap-2 justify-center mb-6">
          {perks.map(p => (
            <div key={p} className="flex items-center gap-1.5 text-xs text-gray-400 bg-dark-700 px-3 py-1.5 rounded-full">
              <Check size={12} className="text-accent" /> {p}
            </div>
          ))}
        </div>

        <div className="panel p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Full Name</label>
              <input type="text" name="name" value={form.name} onChange={handleChange}
                className="input-field" placeholder="John Doe" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
              <input type="email" name="email" value={form.email} onChange={handleChange}
                className="input-field" placeholder="you@example.com" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} name="password" value={form.password}
                  onChange={handleChange} className="input-field pr-12" placeholder="Min. 6 characters" required />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="btn-primary w-full justify-center py-3 text-base disabled:opacity-60 disabled:cursor-not-allowed mt-2">
              {loading ? (
                <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Creating account...</>
              ) : 'Create Free Account'}
            </button>
          </form>
          <p className="text-center text-gray-400 text-sm mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-accent hover:text-accent-light font-medium transition-colors">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;