import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Layers } from 'lucide-react';
import { motion } from 'framer-motion';

// ─── Animation Variants ───────────────────────────────────────────────────────
const pageVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.4 } },
  exit:    { opacity: 0, transition: { duration: 0.2 } },
};

const containerVariants = {
  initial: {},
  animate: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

const itemVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } },
};

const cardVariants = {
  initial: { opacity: 0, y: 32, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } },
};

// ─── Floating Orbs Background ─────────────────────────────────────────────────
const FloatingOrb = ({ style, delay = 0 }) => (
  <motion.div
    style={{
      position: 'absolute',
      borderRadius: '50%',
      filter: 'blur(80px)',
      pointerEvents: 'none',
      ...style,
    }}
    animate={{
      y: [0, -20, 0],
      scale: [1, 1.05, 1],
      opacity: [style.opacity ?? 0.15, (style.opacity ?? 0.15) + 0.05, style.opacity ?? 0.15],
    }}
    transition={{ duration: 6 + delay, repeat: Infinity, ease: 'easeInOut', delay }}
  />
);

const Login = () => {
  const [form, setForm]       = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const { login }    = useAuth();
  const navigate     = useNavigate();
  const location     = useLocation();

  // Read redirect destination from query string (set by ProtectedRoute)
  const redirectTo = new URLSearchParams(location.search).get('redirect') || '/hub';

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success('Welcome back!');
      navigate(decodeURIComponent(redirectTo));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="min-h-screen bg-dark-900 flex items-center justify-center p-4"
      style={{ position: 'relative', overflow: 'hidden' }}
    >
      {/* Animated grid background */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
          backgroundSize: '50px 50px',
        }}
      />

      {/* Floating orbs */}
      <FloatingOrb style={{ width: 400, height: 400, background: '#6366f1', opacity: 0.08, top: '-10%', left: '-5%' }} delay={0} />
      <FloatingOrb style={{ width: 300, height: 300, background: '#8b5cf6', opacity: 0.06, bottom: '0%', right: '-5%' }} delay={2} />
      <FloatingOrb style={{ width: 200, height: 200, background: '#ec4899', opacity: 0.05, top: '60%', left: '10%' }} delay={4} />

      <motion.div
        variants={containerVariants}
        initial="initial"
        animate="animate"
        className="relative w-full max-w-md"
      >
        {/* Logo */}
        <motion.div variants={itemVariants} className="text-center mb-8">
          <motion.div
            className="inline-flex items-center gap-3 mb-4"
            whileHover={{ scale: 1.03 }}
            transition={{ type: 'spring', stiffness: 400 }}
          >
            <motion.div
              className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center"
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Layers size={20} />
            </motion.div>
            <span className="text-2xl font-bold tracking-tight">Synapse</span>
          </motion.div>
          <motion.h1 variants={itemVariants} className="text-3xl font-bold mb-2">
            Welcome back
          </motion.h1>
          <motion.p variants={itemVariants} className="text-gray-400">
            Sign in to your workspace
          </motion.p>
        </motion.div>

        {/* Card */}
        <motion.div variants={cardVariants} className="panel p-8"
          style={{ backdropFilter: 'blur(20px)', background: 'rgba(26,26,26,0.8)' }}
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email field */}
            <motion.div variants={itemVariants}>
              <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
              <motion.input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                className="input-field"
                placeholder="you@example.com"
                required
                whileFocus={{ scale: 1.01 }}
                transition={{ type: 'spring', stiffness: 400 }}
              />
            </motion.div>

            {/* Password field */}
            <motion.div variants={itemVariants}>
              <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
              <div className="relative">
                <motion.input
                  type={showPass ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  className="input-field pr-12"
                  placeholder="••••••••"
                  required
                  whileFocus={{ scale: 1.01 }}
                  transition={{ type: 'spring', stiffness: 400 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </motion.div>

            {/* Submit button */}
            <motion.div variants={itemVariants}>
              <motion.button
                type="submit"
                disabled={loading}
                className="btn-primary w-full justify-center py-3 text-base disabled:opacity-60 disabled:cursor-not-allowed"
                whileHover={!loading ? { scale: 1.02, boxShadow: '0 0 20px rgba(99,102,241,0.4)' } : {}}
                whileTap={!loading ? { scale: 0.98 } : {}}
                transition={{ type: 'spring', stiffness: 400 }}
              >
                {loading ? (
                  <motion.span
                    className="flex items-center gap-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <motion.span
                      className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                    />
                    Signing in...
                  </motion.span>
                ) : 'Sign In'}
              </motion.button>
            </motion.div>
          </form>

          <motion.p variants={itemVariants} className="text-center text-gray-400 text-sm mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-accent hover:text-accent-light font-medium transition-colors">
              Create one free
            </Link>
          </motion.p>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

export default Login;
