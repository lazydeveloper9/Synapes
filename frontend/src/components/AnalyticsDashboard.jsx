import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, Clock, MousePointer, TrendingUp, Eye, Activity, BarChart2 } from 'lucide-react';

// ─── Deterministic "random" from string seed ─────────────────────────────────
const seededRand = (seed, min, max) => {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  const val = Math.abs(h % (max - min + 1)) + min;
  return val;
};

// ─── Mini Sparkline ───────────────────────────────────────────────────────────
const Sparkline = ({ data, color = '#6366f1', height = 40 }) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 120;
  const step = w / (data.length - 1);
  const points = data.map((v, i) => `${i * step},${height - ((v - min) / range) * (height - 6) - 3}`).join(' ');
  return (
    <svg width={w} height={height} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={`grad-${color.slice(1)}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline
        points={`0,${height} ${points} ${(data.length - 1) * step},${height}`}
        fill={`url(#grad-${color.slice(1)})`}
      />
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

// ─── Animated Counter ─────────────────────────────────────────────────────────
const Counter = ({ value, suffix = '' }) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const end = parseInt(value);
    const duration = 1200;
    const step = Math.ceil(end / (duration / 16));
    const timer = setInterval(() => {
      start += step;
      if (start >= end) { setCount(end); clearInterval(timer); }
      else setCount(start);
    }, 16);
    return () => clearInterval(timer);
  }, [value]);
  return <span>{count.toLocaleString()}{suffix}</span>;
};

// ─── Radial Progress ──────────────────────────────────────────────────────────
const RadialProgress = ({ value, color = '#6366f1', size = 80 }) => {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - value / 100);
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#222" strokeWidth="8" />
      <motion.circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
      />
    </svg>
  );
};

// ─── AnalyticsDashboard ───────────────────────────────────────────────────────
const AnalyticsDashboard = ({ design, onClose }) => {
  const id = design._id;

  // Deterministic "live" data seeded from design ID
  const views      = seededRand(id + 'v', 120, 3800);
  const users      = seededRand(id + 'u', 8, 240);
  const sessions   = seededRand(id + 's', 30, 600);
  const avgTime    = seededRand(id + 't', 2, 28);  // minutes
  const bounceRate = seededRand(id + 'b', 18, 62);
  const retention  = seededRand(id + 'r', 45, 92);
  const edits      = seededRand(id + 'e', 50, 1200);

  // Sparkline data
  const viewData  = Array.from({ length: 7 }, (_, i) => seededRand(id + 'vd' + i, 30, views));
  const userDatum = Array.from({ length: 7 }, (_, i) => seededRand(id + 'ud' + i, 2, users));
  const days      = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Bar chart data (hourly distribution)
  const hourlyMax = seededRand(id + 'hm', 40, 100);
  const hourly    = Array.from({ length: 24 }, (_, i) => {
    const base = i >= 9 && i <= 18 ? 60 : i >= 6 && i <= 22 ? 30 : 10;
    return seededRand(id + 'h' + i, base * 0.3, base);
  });

  const overlayVariants = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit:    { opacity: 0 },
  };
  const panelVariants = {
    initial: { opacity: 0, scale: 0.94, y: 24 },
    animate: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } },
    exit:    { opacity: 0, scale: 0.96, y: 16, transition: { duration: 0.25 } },
  };
  const cardAnim = {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
  };

  return (
    <AnimatePresence>
      <motion.div
        variants={overlayVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(6px)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
        }}
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          variants={panelVariants}
          style={{
            background: '#0f0f0f', border: '1px solid #222', borderRadius: '20px',
            width: '100%', maxWidth: '820px', maxHeight: '90vh',
            overflow: 'auto', padding: '28px',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                <BarChart2 size={20} style={{ color: '#6366f1' }} />
                <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#fff' }}>Project Analytics</h2>
              </div>
              <p style={{ color: '#666', fontSize: '13px' }}>{design.title}</p>
            </div>
            <motion.button
              onClick={onClose}
              style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: '10px', padding: '8px', color: '#888', cursor: 'pointer' }}
              whileHover={{ background: '#2a2a2a', color: '#fff' }}
            >
              <X size={18} />
            </motion.button>
          </div>

          {/* Live badge */}
          <motion.div
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '100px', padding: '4px 12px', fontSize: '12px', color: '#22c55e', marginBottom: '24px' }}
            animate={{ opacity: [1, 0.7, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <span style={{ width: '6px', height: '6px', background: '#22c55e', borderRadius: '50%', display: 'inline-block' }} />
            Live Data
          </motion.div>

          {/* Stats grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px', marginBottom: '24px' }}>
            {[
              { label: 'Total Views', value: views, icon: Eye, color: '#6366f1', suffix: '', data: viewData },
              { label: 'Unique Users', value: users, icon: Users, color: '#8b5cf6', suffix: '', data: userDatum },
              { label: 'Avg. Time', value: avgTime, icon: Clock, color: '#ec4899', suffix: 'm', data: null },
              { label: 'Edit Sessions', value: sessions, icon: MousePointer, color: '#14b8a6', suffix: '', data: null },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                variants={cardAnim}
                initial="initial"
                animate="animate"
                transition={{ delay: i * 0.08 }}
                style={{
                  background: '#141414', border: '1px solid #222', borderRadius: '14px',
                  padding: '18px', position: 'relative', overflow: 'hidden',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ width: '36px', height: '36px', background: `${stat.color}18`, border: `1px solid ${stat.color}33`, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <stat.icon size={16} style={{ color: stat.color }} />
                  </div>
                  {stat.data && <Sparkline data={stat.data} color={stat.color} />}
                </div>
                <p style={{ fontSize: '26px', fontWeight: '700', color: '#fff', lineHeight: 1 }}>
                  <Counter value={stat.value} suffix={stat.suffix} />
                </p>
                <p style={{ fontSize: '12px', color: '#555', marginTop: '4px' }}>{stat.label}</p>
              </motion.div>
            ))}
          </div>

          {/* Second row: Retention + Bounce + Edits */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '24px' }}>
            {/* Retention */}
            <motion.div
              variants={cardAnim} initial="initial" animate="animate" transition={{ delay: 0.32 }}
              style={{ background: '#141414', border: '1px solid #222', borderRadius: '14px', padding: '18px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}
            >
              <p style={{ fontSize: '12px', color: '#555', alignSelf: 'flex-start' }}>Retention Rate</p>
              <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                <RadialProgress value={retention} color="#22c55e" />
                <span style={{ position: 'absolute', fontSize: '16px', fontWeight: '700', color: '#fff' }}>{retention}%</span>
              </div>
              <p style={{ fontSize: '11px', color: '#444' }}>Users returning</p>
            </motion.div>

            {/* Bounce Rate */}
            <motion.div
              variants={cardAnim} initial="initial" animate="animate" transition={{ delay: 0.38 }}
              style={{ background: '#141414', border: '1px solid #222', borderRadius: '14px', padding: '18px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}
            >
              <p style={{ fontSize: '12px', color: '#555', alignSelf: 'flex-start' }}>Bounce Rate</p>
              <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                <RadialProgress value={bounceRate} color="#f97316" />
                <span style={{ position: 'absolute', fontSize: '16px', fontWeight: '700', color: '#fff' }}>{bounceRate}%</span>
              </div>
              <p style={{ fontSize: '11px', color: '#444' }}>Single-page exits</p>
            </motion.div>

            {/* Total Edits */}
            <motion.div
              variants={cardAnim} initial="initial" animate="animate" transition={{ delay: 0.44 }}
              style={{ background: '#141414', border: '1px solid #222', borderRadius: '14px', padding: '18px' }}
            >
              <p style={{ fontSize: '12px', color: '#555', marginBottom: '12px' }}>Total Edits</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Activity size={20} style={{ color: '#6366f1' }} />
                <p style={{ fontSize: '28px', fontWeight: '700', color: '#fff' }}>
                  <Counter value={edits} />
                </p>
              </div>
              <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <TrendingUp size={12} style={{ color: '#22c55e' }} />
                <span style={{ fontSize: '11px', color: '#22c55e' }}>+{seededRand(id + 'tr', 5, 32)}% this week</span>
              </div>
            </motion.div>
          </div>

          {/* Hourly activity bar chart */}
          <motion.div
            variants={cardAnim} initial="initial" animate="animate" transition={{ delay: 0.5 }}
            style={{ background: '#141414', border: '1px solid #222', borderRadius: '14px', padding: '18px' }}
          >
            <p style={{ fontSize: '13px', fontWeight: '600', color: '#888', marginBottom: '16px' }}>
              Activity by Hour (last 24h)
            </p>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '64px' }}>
              {hourly.map((h, i) => (
                <motion.div
                  key={i}
                  title={`${i}:00 — ${h} actions`}
                  style={{
                    flex: 1, background: i >= 9 && i <= 18 ? '#6366f1' : '#333',
                    borderRadius: '3px 3px 0 0', minHeight: '2px',
                    cursor: 'default',
                  }}
                  initial={{ height: 0 }}
                  animate={{ height: `${(h / hourlyMax) * 64}px` }}
                  transition={{ delay: 0.5 + i * 0.015, duration: 0.4, ease: 'easeOut' }}
                />
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
              <span style={{ fontSize: '10px', color: '#444' }}>12am</span>
              <span style={{ fontSize: '10px', color: '#444' }}>6am</span>
              <span style={{ fontSize: '10px', color: '#444' }}>12pm</span>
              <span style={{ fontSize: '10px', color: '#444' }}>6pm</span>
              <span style={{ fontSize: '10px', color: '#444' }}>11pm</span>
            </div>
          </motion.div>

          {/* Weekly breakdown */}
          <motion.div
            variants={cardAnim} initial="initial" animate="animate" transition={{ delay: 0.56 }}
            style={{ marginTop: '12px', background: '#141414', border: '1px solid #222', borderRadius: '14px', padding: '18px' }}
          >
            <p style={{ fontSize: '13px', fontWeight: '600', color: '#888', marginBottom: '14px' }}>
              Weekly View Breakdown
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {days.map((day, i) => {
                const val = viewData[i];
                const pct = Math.round((val / Math.max(...viewData)) * 100);
                return (
                  <div key={day} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ width: '30px', fontSize: '11px', color: '#555' }}>{day}</span>
                    <div style={{ flex: 1, height: '6px', background: '#222', borderRadius: '3px', overflow: 'hidden' }}>
                      <motion.div
                        style={{ height: '100%', background: '#6366f1', borderRadius: '3px' }}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ delay: 0.6 + i * 0.06, duration: 0.5, ease: 'easeOut' }}
                      />
                    </div>
                    <span style={{ width: '36px', fontSize: '11px', color: '#555', textAlign: 'right' }}>{val}</span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AnalyticsDashboard;
