import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Layers, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Animation Variants ───────────────────────────────────────────────────────
const pageVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.4 } },
  exit:    { opacity: 0, transition: { duration: 0.2 } },
};

const containerVariants = {
  initial: {},
  animate: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
};

const itemVariants = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } },
};

const cardVariants = {
  initial: { opacity: 0, y: 32, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } },
};

const perkVariants = {
  initial: { opacity: 0, scale: 0.8, y: 10 },
  animate: (i) => ({
    opacity: 1, scale: 1, y: 0,
    transition: { duration: 0.35, delay: 0.2 + i * 0.06, ease: 'backOut' },
  }),
};

const FloatingOrb = ({ style, delay = 0 }) => (
  <motion.div
    style={{ position: 'absolute', borderRadius: '50%', filter: 'blur(80px)', pointerEvents: 'none', ...style }}
    animate={{ y: [0, -20, 0], scale: [1, 1.05, 1] }}
    transition={{ duration: 6 + delay, repeat: Infinity, ease: 'easeInOut', delay }}
  />
);

const Register = () => {
  const [form, setForm]         = useState({ name: '', email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const { register } = useAuth();
  const navigate     = useNavigate();

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters');
    setLoading(true);
    try {
      await register(form.name, form.email, form.password);
      toast.success('Account created! Welcome to Synapse!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const perks = ['Unlimited designs', 'Canvas editor', 'Export PNG/SVG', 'Cloud save'];

  // Password strength
  const strength = form.password.length === 0 ? 0
    : form.password.length < 4 ? 1
    : form.password.length < 6 ? 2
    : form.password.length < 10 ? 3 : 4;
  const strengthColors = ['transparent', '#ef4444', '#f97316', '#eab308', '#22c55e'];
  const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong'];

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="min-h-screen bg-dark-900 flex items-center justify-center p-4"
      style={{ position: 'relative', overflow: 'hidden' }}
    >
      {/* Grid background */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
          backgroundSize: '50px 50px',
        }}
      />

      {/* Orbs */}
      <FloatingOrb style={{ width: 350, height: 350, background: '#6366f1', opacity: 0.08, top: '-8%', right: '-5%' }} delay={1} />
      <FloatingOrb style={{ width: 250, height: 250, background: '#ec4899', opacity: 0.06, bottom: '5%', left: '-3%' }} delay={3} />

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
          >
            <motion.div
              className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center"
              animate={{ rotate: [0, -5, 5, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Layers size={20} />
            </motion.div>
            <span className="text-2xl font-bold tracking-tight">Synapse</span>
          </motion.div>
          <motion.h1 variants={itemVariants} className="text-3xl font-bold mb-2">
            Start designing
          </motion.h1>
          <motion.p variants={itemVariants} className="text-gray-400">
            Free forever. No credit card needed.
          </motion.p>
        </motion.div>

        {/* Perk badges */}
        <motion.div
          variants={itemVariants}
          className="flex flex-wrap gap-2 justify-center mb-6"
        >
          {perks.map((p, i) => (
            <motion.div
              key={p}
              custom={i}
              variants={perkVariants}
              initial="initial"
              animate="animate"
              className="flex items-center gap-1.5 text-xs text-gray-400 bg-dark-700 px-3 py-1.5 rounded-full"
              whileHover={{ scale: 1.05, color: '#a5b4fc' }}
            >
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3 + i * 0.06, type: 'spring', stiffness: 500 }}
              >
                <Check size={12} className="text-accent" />
              </motion.span>
              {p}
            </motion.div>
          ))}
        </motion.div>

        {/* Card */}
        <motion.div
          variants={cardVariants}
          className="panel p-8"
          style={{ backdropFilter: 'blur(20px)', background: 'rgba(26,26,26,0.8)' }}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <motion.div variants={itemVariants}>
              <label className="block text-sm font-medium text-gray-300 mb-2">Full Name</label>
              <motion.input
                type="text" name="name" value={form.name} onChange={handleChange}
                className="input-field" placeholder="John Doe" required
                whileFocus={{ scale: 1.01 }}
                transition={{ type: 'spring', stiffness: 400 }}
              />
            </motion.div>

            <motion.div variants={itemVariants}>
              <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
              <motion.input
                type="email" name="email" value={form.email} onChange={handleChange}
                className="input-field" placeholder="you@example.com" required
                whileFocus={{ scale: 1.01 }}
                transition={{ type: 'spring', stiffness: 400 }}
              />
            </motion.div>

            <motion.div variants={itemVariants}>
              <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
              <div className="relative">
                <motion.input
                  type={showPass ? 'text' : 'password'} name="password" value={form.password}
                  onChange={handleChange} className="input-field pr-12" placeholder="Min. 6 characters" required
                  whileFocus={{ scale: 1.01 }}
                  transition={{ type: 'spring', stiffness: 400 }}
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {/* Password strength bar */}
              <AnimatePresence>
                {form.password.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-2"
                  >
                    <div className="flex gap-1 mb-1">
                      {[1, 2, 3, 4].map(i => (
                        <motion.div
                          key={i}
                          className="h-1 flex-1 rounded-full"
                          style={{ background: i <= strength ? strengthColors[strength] : '#333' }}
                          animate={{ scaleX: i <= strength ? 1 : 0.3, opacity: i <= strength ? 1 : 0.3 }}
                          transition={{ duration: 0.2, delay: i * 0.04 }}
                        />
                      ))}
                    </div>
                    <p className="text-xs" style={{ color: strengthColors[strength] }}>
                      {strengthLabels[strength]}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            <motion.div variants={itemVariants}>
              <motion.button
                type="submit" disabled={loading}
                className="btn-primary w-full justify-center py-3 text-base disabled:opacity-60 disabled:cursor-not-allowed mt-2"
                whileHover={!loading ? { scale: 1.02, boxShadow: '0 0 20px rgba(99,102,241,0.4)' } : {}}
                whileTap={!loading ? { scale: 0.98 } : {}}
              >
                {loading ? (
                  <motion.span className="flex items-center gap-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <motion.span
                      className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                    />
                    Creating account...
                  </motion.span>
                ) : 'Create Free Account'}
              </motion.button>
            </motion.div>
          </form>

          <motion.p variants={itemVariants} className="text-center text-gray-400 text-sm mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-accent hover:text-accent-light font-medium transition-colors">
              Sign in
            </Link>
          </motion.p>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

export default Register;
