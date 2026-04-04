import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, Sparkles } from 'lucide-react';

const STEPS = [
  {
    icon: '✦',
    title: 'Welcome to Synapse',
    desc: 'Your all-in-one creative workspace. Design, write, compute, present and code — all in one beautiful platform.',
    cta: null,
    color: '#6366f1',
    visual: (
      <div style={{ display:'flex', gap:10, flexWrap:'wrap', justifyContent:'center' }}>
        {['🎨 Design','📝 Docs','📊 Sheets','🖥️ Slides','💻 Code'].map(w => (
          <span key={w} style={{ fontSize:12, padding:'6px 12px', borderRadius:8, background:'rgba(99,102,241,0.15)', border:'1px solid rgba(99,102,241,0.3)', color:'#a5b4fc' }}>{w}</span>
        ))}
      </div>
    ),
  },
  {
    icon: '🎨',
    title: 'Create stunning designs',
    desc: 'Use the vector canvas to design graphics, social posts, banners and presentations with shapes, text, layers, and one-click PNG export.',
    cta: null,
    color: '#8b5cf6',
    visual: (
      <div style={{ width:200, height:130, background:'rgba(99,102,241,0.08)', border:'1px solid rgba(99,102,241,0.2)', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:8, margin:'0 auto' }}>
        <div style={{ width:80, height:8, background:'rgba(255,255,255,0.1)', borderRadius:4 }}/>
        <div style={{ display:'flex', gap:8 }}>
          <div style={{ width:48, height:48, borderRadius:8, background:'#6366f1' }}/>
          <div style={{ width:48, height:48, borderRadius:'50%', background:'#8b5cf6' }}/>
          <div style={{ width:0, height:0, borderTop:'24px solid transparent', borderBottom:'24px solid transparent', borderLeft:'42px solid #ec4899' }}/>
        </div>
      </div>
    ),
  },
  {
    icon: '📝',
    title: 'Write documents & more',
    desc: 'Rich text editor for Docs, powerful spreadsheet for Sheets, polished slides in Presentations, and a full code editor with run support.',
    cta: null,
    color: '#3b82f6',
    visual: (
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, maxWidth:220, margin:'0 auto' }}>
        {[['📝','Docs','#3b82f6'],['📊','Sheets','#22c55e'],['🖥️','Slides','#f97316'],['💻','Code','#ec4899']].map(([icon,label,color]) => (
          <div key={label} style={{ background:`${color}12`, border:`1px solid ${color}30`, borderRadius:10, padding:'10px 8px', textAlign:'center' }}>
            <div style={{ fontSize:20 }}>{icon}</div>
            <p style={{ fontSize:11, color:'#ccc', marginTop:4 }}>{label}</p>
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: '🚀',
    title: 'Ready to get started?',
    desc: 'Create your free account in seconds — no credit card required. Everything is saved automatically in the cloud.',
    cta: { label: 'Create free account', href: '/register' },
    altCta: { label: 'Sign in', href: '/login' },
    color: '#22c55e',
    visual: (
      <div style={{ textAlign:'center' }}>
        <div style={{ width:64, height:64, borderRadius:'50%', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, margin:'0 auto 12px' }}>✦</div>
        <p style={{ fontSize:12, color:'#22c55e', fontWeight:600 }}>Free forever · No credit card</p>
      </div>
    ),
  },
];

export default function OnboardingWizard() {
  const navigate = useNavigate();
  const [show,  setShow]  = useState(false);
  const [step,  setStep]  = useState(0);

  useEffect(() => {
    const seen = localStorage.getItem('synapse_wizard_seen');
    if (!seen) { setTimeout(() => setShow(true), 1200); }
  }, []);

  const dismiss = () => {
    setShow(false);
    localStorage.setItem('synapse_wizard_seen', '1');
  };

  const next = () => { if (step < STEPS.length - 1) setStep(s => s + 1); else dismiss(); };
  const prev = () => { if (step > 0) setStep(s => s - 1); };

  const current = STEPS[step];

  return (
    <AnimatePresence>
      {show && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={dismiss}
            style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', backdropFilter:'blur(4px)', zIndex:10000 }}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity:0, scale:0.88, y:32 }}
            animate={{ opacity:1, scale:1, y:0 }}
            exit={{ opacity:0, scale:0.92, y:20 }}
            transition={{ duration:0.35, ease:[0.25,0.46,0.45,0.94] }}
            style={{
              position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)',
              zIndex:10001, width:440, maxWidth:'90vw',
              background:'#0f0f0f', border:'1px solid #1e1e1e',
              borderRadius:24, overflow:'hidden',
              boxShadow:'0 40px 120px rgba(0,0,0,0.8), 0 0 0 1px rgba(99,102,241,0.1)',
            }}
          >
            {/* Progress bar */}
            <div style={{ height:3, background:'#1a1a1a' }}>
              <motion.div
                style={{ height:'100%', background:`linear-gradient(90deg, ${current.color}, ${current.color}99)` }}
                animate={{ width: `${((step+1)/STEPS.length)*100}%` }}
                transition={{ duration:0.4, ease:'easeOut' }}
              />
            </div>

            {/* Header */}
            <div style={{ padding:'20px 24px 0', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <Sparkles size={16} style={{ color: current.color }} />
                <span style={{ fontSize:12, color:'#666', fontWeight:500 }}>
                  Step {step+1} of {STEPS.length}
                </span>
              </div>
              <button onClick={dismiss}
                style={{ background:'#1a1a1a', border:'1px solid #2a2a2a', borderRadius:8, padding:6, color:'#666', cursor:'pointer', display:'flex' }}
                onMouseEnter={e=>{ e.currentTarget.style.color='#fff'; e.currentTarget.style.background='#2a2a2a'; }}
                onMouseLeave={e=>{ e.currentTarget.style.color='#666'; e.currentTarget.style.background='#1a1a1a'; }}
              >
                <X size={14}/>
              </button>
            </div>

            {/* Content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity:0, x:30 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-30 }}
                transition={{ duration:0.25 }}
                style={{ padding:'24px 28px' }}
              >
                {/* Icon */}
                <motion.div
                  initial={{ scale:0.6, opacity:0 }} animate={{ scale:1, opacity:1 }}
                  transition={{ delay:0.1, type:'spring', stiffness:400 }}
                  style={{
                    width:56, height:56, borderRadius:16,
                    background:`${current.color}18`, border:`1px solid ${current.color}33`,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:26, marginBottom:16,
                  }}
                >
                  {current.icon}
                </motion.div>

                <h2 style={{ fontSize:22, fontWeight:700, color:'#fff', marginBottom:10, lineHeight:1.2 }}>
                  {current.title}
                </h2>
                <p style={{ fontSize:14, color:'#888', lineHeight:1.7, marginBottom:24 }}>
                  {current.desc}
                </p>

                {/* Visual */}
                <div style={{ marginBottom:28 }}>{current.visual}</div>

                {/* CTA buttons */}
                {current.cta && (
                  <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:16 }}>
                    <button
                      onClick={() => { dismiss(); navigate(current.cta.href); }}
                      style={{ padding:'13px 20px', background:`linear-gradient(135deg, #6366f1, #8b5cf6)`, border:'none', borderRadius:12, color:'#fff', fontSize:15, fontWeight:600, cursor:'pointer', boxShadow:'0 4px 20px rgba(99,102,241,0.35)' }}
                    >
                      {current.cta.label} →
                    </button>
                    {current.altCta && (
                      <button
                        onClick={() => { dismiss(); navigate(current.altCta.href); }}
                        style={{ padding:'11px 20px', background:'#1a1a1a', border:'1px solid #2a2a2a', borderRadius:12, color:'#aaa', fontSize:13, cursor:'pointer' }}
                        onMouseEnter={e=>e.currentTarget.style.color='#fff'}
                        onMouseLeave={e=>e.currentTarget.style.color='#aaa'}
                      >
                        {current.altCta.label}
                      </button>
                    )}
                  </div>
                )}

                {/* Nav */}
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <button onClick={prev} disabled={step===0}
                    style={{ display:'flex', alignItems:'center', gap:4, padding:'8px 12px', background:'none', border:'1px solid #2a2a2a', borderRadius:8, color: step===0?'#333':'#888', cursor: step===0?'default':'pointer', fontSize:13 }}
                  >
                    <ChevronLeft size={14}/> Back
                  </button>

                  {/* Dots */}
                  <div style={{ display:'flex', gap:6 }}>
                    {STEPS.map((_,i) => (
                      <motion.div key={i}
                        animate={{ width: i===step?20:8, background: i===step?current.color:'#2a2a2a' }}
                        style={{ height:8, borderRadius:4, cursor:'pointer' }}
                        onClick={()=>setStep(i)}
                      />
                    ))}
                  </div>

                  <button onClick={next}
                    style={{ display:'flex', alignItems:'center', gap:4, padding:'8px 16px', background: current.color, border:'none', borderRadius:8, color:'#fff', cursor:'pointer', fontSize:13, fontWeight:500 }}
                  >
                    {step === STEPS.length-1 ? 'Done' : 'Next'} <ChevronRight size={14}/>
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
