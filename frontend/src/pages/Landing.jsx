import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const TwitterIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

const InstagramIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
);

// Reusable pink glow button
const PinkGlowButton = ({ children, onClick, large }) => {
  const [hover, setHover] = useState(false);
  const [active, setActive] = useState(false);
  const on = hover || active;
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setActive(false); }}
      onMouseDown={() => setActive(true)}
      onMouseUp={() => setActive(false)}
      style={{
        background: on ? 'rgba(255,59,255,0.1)' : 'transparent',
        color: on ? '#FF3BFF' : 'rgba(255,255,255,0.85)',
        border: `1.5px solid ${on ? '#FF3BFF' : 'rgba(255,255,255,0.18)'}`,
        borderRadius: '12px',
        padding: large ? '16px 40px' : '13px 28px',
        fontSize: large ? '17px' : '15px',
        fontWeight: '500',
        fontFamily: "'Cabinet Grotesk', sans-serif",
        cursor: 'pointer',
        transition: 'all 0.25s ease',
        boxShadow: on
          ? '0 0 20px rgba(255,59,255,0.5), 0 0 50px rgba(255,59,255,0.2), inset 0 0 16px rgba(255,59,255,0.05)'
          : 'none',
        transform: hover ? 'translateY(-2px)' : active ? 'translateY(1px)' : 'translateY(0)',
        letterSpacing: '0.01em',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </button>
  );
};

const Landing = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    if (user) navigate('/dashboard');
  }, [user]);

  // Particle animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);

    const particles = Array.from({ length: 120 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      size: Math.random() * 1.5 + 0.3,
      opacity: Math.random() * 0.5 + 0.1,
    }));

    let mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const handleMouse = (e) => { mouse = { x: e.clientX, y: e.clientY }; };
    window.addEventListener('mousemove', handleMouse);

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 200) { p.vx += (dx / dist) * 0.01; p.vy += (dy / dist) * 0.01; }
        p.vx *= 0.99; p.vy *= 0.99;
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(99,102,241,${p.opacity})`;
        ctx.fill();
      });
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 100) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(99,102,241,${0.15 * (1 - dist / 100)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      animRef.current = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouse);
    };
  }, []);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const features = [
    { icon: '⬡', title: 'Vector Canvas', desc: 'Professional-grade design tools with shapes, text, and freehand drawing.' },
    { icon: '⟳', title: 'Auto Save', desc: 'Your designs are saved automatically every few seconds. Never lose work.' },
    { icon: '↓', title: 'Export Anywhere', desc: 'Export your creations as high-quality PNG files instantly.' },
    { icon: '◫', title: 'Templates', desc: 'Start with presentation, social post, banner, or poster templates.' },
    { icon: '⊞', title: 'Layer Control', desc: 'Full layer management with ordering, opacity, and visibility controls.' },
    { icon: '⌨', title: 'Typography', desc: 'Rich text editing with font size, weight, alignment and color options.' },
  ];

  const stats = [
    { value: '10K+', label: 'Designs Created' },
    { value: '5K+', label: 'Active Users' },
    { value: '99.9%', label: 'Uptime' },
    { value: 'Free', label: 'Forever Plan' },
  ];

  return (
    <div style={{ background: '#050505', minHeight: '100vh', overflowX: 'hidden' }}>

      <style>{`
        @import url('https://api.fontshare.com/v2/css?f[]=chillax@200,300,400,500,600,700&f[]=clash-grotesk@200,300,400,500,600,700&f[]=cabinet-grotesk@100,200,300,400,500,700,800,900&display=swap');

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .social-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.1);
          cursor: pointer;
          transition: all 0.2s ease;
          text-decoration: none;
          flex-shrink: 0;
        }
        .social-btn:hover {
          background: rgba(255,255,255,0.1);
          border-color: rgba(255,255,255,0.3);
          transform: translateY(-2px);
        }

        .feature-card {
          background: #0a0a0a;
          padding: 36px 32px;
          transition: background 0.3s;
          cursor: default;
        }
        .feature-card:hover { background: #111; }

        .footer-link {
          color: rgba(255,255,255,0.25);
          font-size: 13px;
          text-decoration: none;
          transition: color 0.2s;
          font-family: 'Cabinet Grotesk', sans-serif;
        }
        .footer-link:hover { color: rgba(255,255,255,0.6); }

        .nav-link {
          color: rgba(255,255,255,0.5);
          font-size: 14px;
          font-weight: 500;
          font-family: 'Cabinet Grotesk', sans-serif;
          text-decoration: none;
          transition: color 0.2s;
        }
        .nav-link:hover { color: #fff; }
      `}</style>

      {/* Particle canvas */}
      <canvas ref={canvasRef} style={{
        position: 'fixed', top: 0, left: 0,
        width: '100%', height: '100%',
        pointerEvents: 'none', zIndex: 0,
      }} />

      {/* Radial purple glow */}
      <div style={{
        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
        background: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(99,102,241,0.12) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      {/* ── NAVBAR ── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: scrollY > 40 ? 'rgba(5,5,5,0.92)' : 'transparent',
        backdropFilter: scrollY > 40 ? 'blur(20px)' : 'none',
        borderBottom: scrollY > 40 ? '1px solid rgba(255,255,255,0.06)' : '1px solid transparent',
        transition: 'all 0.4s ease',
        padding: '0 5%',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: '64px',
      }}>

        {/* Logo — Synapse in Chillax, white, NO icon box */}
        <span style={{
          fontSize: '26px',
          fontWeight: '600',
          fontFamily: "'Chillax', sans-serif",
          color: '#ffffff',
          letterSpacing: '-0.3px',
          userSelect: 'none',
        }}>
          Synapse
        </span>

        {/* Nav links — Features, Templates only (no Pricing) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
          <a href="#features" className="nav-link">Features</a>
          <a href="#templates" className="nav-link">Templates</a>
        </div>

        {/* Social icons — Instagram + Twitter/X */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="social-btn" title="Instagram">
            <InstagramIcon />
          </a>
          <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="social-btn" title="X / Twitter">
            <TwitterIcon />
          </a>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{
        position: 'relative', zIndex: 1,
        minHeight: '100vh',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        textAlign: 'center',
        padding: '120px 5% 80px',
      }}>

        {/* Badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          background: 'rgba(99,102,241,0.12)',
          border: '1px solid rgba(99,102,241,0.3)',
          borderRadius: '100px', padding: '6px 16px',
          fontSize: '13px', color: '#a5b4fc',
          fontFamily: "'Cabinet Grotesk', sans-serif",
          marginBottom: '32px',
          animation: 'fadeUp 0.6s ease forwards',
        }}>
          <span style={{ width: '6px', height: '6px', background: '#6366f1', borderRadius: '50%', display: 'inline-block' }} />
          Design. Create. Collaborate.
        </div>

        {/* Headline — Clash Grotesk + custom 4-color gradient */}
        <h1 style={{
          fontFamily: "'Clash Grotesk', sans-serif",
          fontSize: 'clamp(44px, 7.5vw, 92px)',
          fontWeight: '700',
          lineHeight: '1.04',
          letterSpacing: '-2.5px',
          maxWidth: '920px',
          marginBottom: '24px',
          animation: 'fadeUp 0.7s 0.1s ease both',
          background: 'linear-gradient(135deg, #FF3BFF 0%, #ECBFBF 32%, #C24FFF 62%, #D94FD5 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}>
          design without<br />boundaries
        </h1>

        {/* Subtitle — Cabinet Grotesk */}
        <p style={{
          fontFamily: "'Cabinet Grotesk', sans-serif",
          fontSize: 'clamp(16px, 2vw, 20px)',
          fontWeight: '400',
          color: 'rgba(255,255,255,0.45)',
          maxWidth: '560px',
          lineHeight: '1.7',
          marginBottom: '48px',
          animation: 'fadeUp 0.7s 0.2s ease both',
        }}>
          A powerful design canvas with real-time saving, layers, shapes,
          typography, and one-click export. Free forever.
        </p>

        {/* CTA Buttons — pink glow border on hover/click */}
        <div style={{
          display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center',
          animation: 'fadeUp 0.7s 0.3s ease both',
        }}>
          <PinkGlowButton onClick={() => navigate('/register')}>
            Start designing — it&apos;s free
          </PinkGlowButton>
          <PinkGlowButton onClick={() => navigate('/login')}>
            Sign in to workspace
          </PinkGlowButton>
        </div>

        {/* Hero — mock editor preview */}
        <div style={{
          marginTop: '80px',
          width: '100%', maxWidth: '900px',
          background: 'rgba(17,17,17,0.8)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 40px 120px rgba(0,0,0,0.8), 0 0 0 1px rgba(99,102,241,0.1)',
          animation: 'fadeUp 0.8s 0.4s ease both',
        }}>
          {/* Fake window titlebar */}
          <div style={{
            background: 'rgba(10,10,10,0.9)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            padding: '10px 16px',
            display: 'flex', alignItems: 'center', gap: '12px',
          }}>
            <div style={{ display: 'flex', gap: '6px' }}>
              {['#ff5f57','#ffbd2e','#28c840'].map((c,i) => (
                <div key={i} style={{ width: '12px', height: '12px', borderRadius: '50%', background: c }} />
              ))}
            </div>
            <div style={{
              flex: 1, background: 'rgba(255,255,255,0.05)', borderRadius: '6px',
              padding: '4px 12px', fontSize: '12px', color: 'rgba(255,255,255,0.3)',
              textAlign: 'center', fontFamily: "'Cabinet Grotesk', sans-serif",
            }}>
              My First Design — Synapse Editor
            </div>
          </div>
          {/* Editor layout */}
          <div style={{ display: 'flex', height: '380px' }}>
            {/* Toolbar */}
            <div style={{
              width: '48px', background: 'rgba(8,8,8,0.9)',
              borderRight: '1px solid rgba(255,255,255,0.06)',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              padding: '12px 0', gap: '8px',
            }}>
              {['⬚','T','○','╱','✏','⤓'].map((icon,i) => (
                <div key={i} style={{
                  width: '32px', height: '32px', borderRadius: '8px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: i === 0 ? 'rgba(99,102,241,0.3)' : 'transparent',
                  color: i === 0 ? '#a5b4fc' : 'rgba(255,255,255,0.3)',
                  fontSize: '14px',
                }}>{icon}</div>
              ))}
            </div>
            {/* Canvas */}
            <div style={{
              flex: 1,
              background: 'repeating-conic-gradient(rgba(255,255,255,0.02) 0% 25%, transparent 0% 50%) 0 0 / 20px 20px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative',
            }}>
              <div style={{
                width: '300px', height: '200px',
                background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.1))',
                border: '1px solid rgba(99,102,241,0.4)', borderRadius: '12px',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: '12px',
              }}>
                <div style={{ width: '120px', height: '12px', background: 'rgba(255,255,255,0.15)', borderRadius: '6px' }} />
                <div style={{ width: '80px', height: '8px', background: 'rgba(99,102,241,0.4)', borderRadius: '4px' }} />
                <div style={{ width: '80px', height: '28px', background: '#6366f1', borderRadius: '8px' }} />
              </div>
              {[[-1,-1],[1,-1],[-1,1],[1,1]].map(([x,y],i) => (
                <div key={i} style={{
                  position: 'absolute',
                  left: `calc(50% + ${x*150}px - 4px)`,
                  top: `calc(50% + ${y*100}px - 4px)`,
                  width: '8px', height: '8px',
                  background: '#fff', border: '2px solid #6366f1', borderRadius: '2px',
                }} />
              ))}
            </div>
            {/* Properties panel */}
            <div style={{
              width: '200px', background: 'rgba(8,8,8,0.9)',
              borderLeft: '1px solid rgba(255,255,255,0.06)', padding: '12px',
            }}>
              <div style={{
                fontSize: '10px', color: 'rgba(255,255,255,0.3)',
                marginBottom: '12px', letterSpacing: '1px', textTransform: 'uppercase',
                fontFamily: "'Cabinet Grotesk', sans-serif",
              }}>Properties</div>
              {['Fill','Stroke','Opacity','Radius'].map((prop,i) => (
                <div key={i} style={{ marginBottom: '10px' }}>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginBottom: '4px', fontFamily: "'Cabinet Grotesk', sans-serif" }}>{prop}</div>
                  <div style={{
                    height: '28px', background: 'rgba(255,255,255,0.05)',
                    borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)',
                    display: 'flex', alignItems: 'center', padding: '0 8px',
                  }}>
                    {prop === 'Fill' && <div style={{ width: '14px', height: '14px', background: '#6366f1', borderRadius: '3px', marginRight: '6px' }} />}
                    <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', flex: 1 }}>
                      {prop === 'Opacity' && <div style={{ width: '70%', height: '100%', background: '#6366f1', borderRadius: '3px' }} />}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section style={{
        position: 'relative', zIndex: 1, padding: '60px 5%',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}>
        <div style={{
          maxWidth: '900px', margin: '0 auto',
          display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '32px', textAlign: 'center',
        }}>
          {stats.map((s,i) => (
            <div key={i}>
              <div style={{ fontSize: '36px', fontWeight: '700', color: '#fff', letterSpacing: '-1px', fontFamily: "'Clash Grotesk', sans-serif" }}>{s.value}</div>
              <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.35)', marginTop: '4px', fontFamily: "'Cabinet Grotesk', sans-serif" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" style={{
        position: 'relative', zIndex: 1, padding: '100px 5%',
        maxWidth: '1100px', margin: '0 auto',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '64px' }}>
          <div style={{
            display: 'inline-block', fontSize: '12px', fontWeight: '600', letterSpacing: '2px',
            color: '#6366f1', textTransform: 'uppercase', marginBottom: '16px',
            fontFamily: "'Cabinet Grotesk', sans-serif",
          }}>Hassle Free Work</div>
          <h2 style={{
            fontSize: 'clamp(28px,4vw,48px)', fontWeight: '700', color: '#fff',
            letterSpacing: '-1px', lineHeight: '1.1', fontFamily: "'Clash Grotesk', sans-serif",
          }}>Open Collaboration Platform</h2>
          <p style={{
            color: 'rgba(255,255,255,0.4)', fontSize: '18px',
            marginTop: '16px', maxWidth: '500px', margin: '16px auto 0',
            fontFamily: "'Cabinet Grotesk', sans-serif",
          }}>All the tools you need in one beautiful, fast workspace.</p>
        </div>

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px,1fr))',
          gap: '1px', background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', overflow: 'hidden',
        }}>
          {features.map((f,i) => (
            <div key={i} className="feature-card">
              <div style={{
                width: '44px', height: '44px', background: 'rgba(99,102,241,0.12)',
                border: '1px solid rgba(99,102,241,0.2)', borderRadius: '10px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '20px', marginBottom: '20px', color: '#a5b4fc',
              }}>{f.icon}</div>
              <h3 style={{ fontSize: '17px', fontWeight: '600', color: '#fff', marginBottom: '10px', fontFamily: "'Clash Grotesk', sans-serif" }}>{f.title}</h3>
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', lineHeight: '1.7', fontFamily: "'Cabinet Grotesk', sans-serif" }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ position: 'relative', zIndex: 1, padding: '100px 5%', textAlign: 'center' }}>
        <div style={{
          maxWidth: '700px', margin: '0 auto',
          background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)',
          borderRadius: '24px', padding: '80px 5%', position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: '-50%', left: '50%', transform: 'translateX(-50%)',
            width: '300px', height: '300px',
            background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />
          <h2 style={{
            fontSize: 'clamp(28px,4vw,48px)', fontWeight: '700', color: '#fff',
            letterSpacing: '-1px', marginBottom: '16px', fontFamily: "'Clash Grotesk', sans-serif",
          }}>Ready To Create !</h2>
          <p style={{
            color: 'rgba(255,255,255,0.4)', fontSize: '18px', marginBottom: '40px',
            fontFamily: "'Cabinet Grotesk', sans-serif",
          }}>AN OPEN COLLABORATIVE PLATFORM</p>
          <PinkGlowButton onClick={() => navigate('/register')} large>
            Sign Up Now
          </PinkGlowButton>
          <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '13px', marginTop: '16px', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
            TRUELY MADE IN INDIA 🇮🇳
          </p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{
        position: 'relative', zIndex: 1,
        borderTop: '1px solid rgba(255,255,255,0.06)',
        padding: '32px 5%',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: '16px',
      }}>
        <span style={{ fontSize: '20px', fontWeight: '600', color: '#fff', fontFamily: "'Chillax', sans-serif", letterSpacing: '-0.3px' }}>
          UTKARSH
        </span>
        <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '13px', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
          2026 synapse made with ❤️
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {[''].map(l => (
            <a key={l} href="#" className="footer-link">{l}</a>
          ))}
          
        </div>
      </footer>

    </div>
  );
};

export default Landing;