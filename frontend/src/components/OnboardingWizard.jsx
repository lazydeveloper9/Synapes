/**
 * OnboardingWizard — shows ONLY after a fresh registration.
 * AuthContext sets localStorage.setItem('synapse_show_wizard','1') on register.
 * We read that flag; if present, show the wizard and remove it on dismiss.
 * Landing page still shows it automatically for unauthenticated visitors (first time).
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, Sparkles } from 'lucide-react';

const STEPS = [
  {
    icon: '✦',
    title: 'Welcome to Synapse!',
    desc: "You've just created your account. Here's a quick tour of everything you can do on the platform.",
    cta: null,
    color: '#6366f1',
    visual: (
      <div style={{ display:'flex', gap:10, flexWrap:'wrap', justifyContent:'center' }}>
        {[
          { label:'🎨 Design', color:'#6366f1' },
          { label:'📝 Docs',   color:'#3b82f6' },
          { label:'📊 Sheets', color:'#22c55e' },
          { label:'🖥️ Slides', color:'#f97316' },
          { label:'💻 Code',   color:'#ec4899' },
        ].map(w => (
          <span key={w.label} style={{ fontSize:12, padding:'6px 12px', borderRadius:8, background:w.color+'18', border:`1px solid ${w.color}33`, color:w.color, fontWeight:500 }}>{w.label}</span>
        ))}
      </div>
    ),
  },
  {
    icon: '🎨',
    title: 'Design Studio',
    desc: 'Create stunning visuals with a professional vector canvas. Add shapes, text, and images. Export as PNG, PDF, DOC or ZIP.',
    cta: null,
    color: '#6366f1',
    visual: (
      <div style={{ width:220, height:130, background:'rgba(99,102,241,0.08)', border:'1px solid rgba(99,102,241,0.2)', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', gap:10, margin:'0 auto' }}>
        <div style={{ width:52, height:52, borderRadius:8, background:'#6366f1', opacity:0.7 }}/>
        <div style={{ width:52, height:52, borderRadius:'50%', background:'#8b5cf6', opacity:0.7 }}/>
        <div style={{ width:0, height:0, borderTop:'26px solid transparent', borderBottom:'26px solid transparent', borderLeft:'46px solid #ec4899', opacity:0.7 }}/>
      </div>
    ),
  },
  {
    icon: '🛠️',
    title: 'More Workspaces',
    desc: 'Write documents in Docs, crunch numbers in Sheets, build presentations in Slides, and code in 8+ languages in Code Space.',
    cta: null,
    color: '#3b82f6',
    visual: (
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, maxWidth:230, margin:'0 auto' }}>
        {[['📝','Docs','#3b82f6'],['📊','Sheets','#22c55e'],['🖥️','Slides','#f97316'],['💻','Code','#ec4899']].map(([icon,label,color]) => (
          <div key={label} style={{ background:`${color}12`, border:`1px solid ${color}30`, borderRadius:12, padding:'12px 8px', textAlign:'center' }}>
            <div style={{ fontSize:22 }}>{icon}</div>
            <p style={{ fontSize:11, color:'#bbb', marginTop:4 }}>{label}</p>
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: '🚀',
    title: "You're all set!",
    desc: "Everything auto-saves. Your designs are stored in the cloud. Docs, Sheets, Slides and Code are stored locally. Let's build something great!",
    cta: { label: 'Go to Workspaces', href: '/hub' },
    color: '#22c55e',
    visual: (
      <div style={{ textAlign:'center' }}>
        <motion.div
          animate={{ scale:[1,1.08,1] }} transition={{ duration:2, repeat:Infinity }}
          style={{ width:64, height:64, borderRadius:'50%', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:30, margin:'0 auto 12px' }}
        >
          ✦
        </motion.div>
        <p style={{ fontSize:12, color:'#22c55e', fontWeight:600 }}>Free forever · Auto-saves · No credit card</p>
      </div>
    ),
  },
];

export default function OnboardingWizard() {
  const navigate = useNavigate();
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    // Show if: freshly registered (flag set by AuthContext.register())
    // OR first-ever visit to landing page (no flag at all)
    const shouldShow = localStorage.getItem('synapse_show_wizard') === '1';
    // Also show on landing page for brand-new visitors (no 'seen' key)
    const neverSeen  = !localStorage.getItem('synapse_wizard_ever_seen');

    if (shouldShow || neverSeen) {
      setTimeout(() => setShow(true), 800);
    }
  }, []);

  const dismiss = () => {
    setShow(false);
    setStep(0);
    // Remove the "show" flag (set by register)
    localStorage.removeItem('synapse_show_wizard');
    // Mark as ever seen (for landing page first-visit logic)
    localStorage.setItem('synapse_wizard_ever_seen', '1');
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
            initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            onClick={dismiss}
            style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.72)', backdropFilter:'blur(5px)', zIndex:10000 }}
          />

          {/* Centering shell — flexbox keeps modal vertically centered & above footer */}
          <div
            style={{ position:'fixed', inset:0, zIndex:10001, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px 16px', pointerEvents:'none' }}
          >
          {/* Modal */}
          <motion.div
            initial={{ opacity:0, scale:0.88, y:32 }}
            animate={{ opacity:1, scale:1, y:0 }}
            exit={{ opacity:0, scale:0.94, y:20 }}
            transition={{ duration:0.35, ease:[0.25,0.46,0.45,0.94] }}
            onClick={e=>e.stopPropagation()}
            style={{
              pointerEvents:'all',
              zIndex:10001, width:'100%', maxWidth:460,
              maxHeight:'calc(90vh - 40px)', overflowY:'auto',
              background:'#0f0f0f', border:'1px solid #1e1e1e',
              borderRadius:24,
              boxShadow:'0 40px 120px rgba(0,0,0,.85), 0 0 0 1px rgba(99,102,241,0.12)',
            }}
          >
            {/* Progress bar */}
            <div style={{ height:3, background:'#1a1a1a', borderRadius:'24px 24px 0 0', overflow:'hidden' }}>
              <motion.div
                style={{ height:'100%', background:`linear-gradient(90deg,${current.color},${current.color}99)` }}
                animate={{ width:`${((step+1)/STEPS.length)*100}%` }}
                transition={{ duration:0.4, ease:'easeOut' }}
              />
            </div>

            {/* Header */}
            <div style={{ padding:'18px 24px 0', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <Sparkles size={15} style={{ color:current.color }} />
                <span style={{ fontSize:11, color:'#555', fontWeight:500 }}>Step {step+1} of {STEPS.length}</span>
              </div>
              <button onClick={dismiss}
                style={{ background:'#1a1a1a', border:'1px solid #2a2a2a', borderRadius:8, padding:6, color:'#555', cursor:'pointer', display:'flex', transition:'all .15s' }}
                onMouseEnter={e=>{ e.currentTarget.style.color='#fff'; e.currentTarget.style.background='#252525'; }}
                onMouseLeave={e=>{ e.currentTarget.style.color='#555'; e.currentTarget.style.background='#1a1a1a'; }}
              >
                <X size={14}/>
              </button>
            </div>

            {/* Content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity:0, x:28 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-28 }}
                transition={{ duration:0.22 }}
                style={{ padding:'22px 28px 24px' }}
              >
                {/* Icon badge */}
                <motion.div
                  initial={{ scale:0.6, opacity:0 }} animate={{ scale:1, opacity:1 }}
                  transition={{ delay:0.05, type:'spring', stiffness:500 }}
                  style={{ width:54, height:54, borderRadius:15, background:current.color+'18', border:`1px solid ${current.color}33`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:26, marginBottom:16 }}
                >
                  {current.icon}
                </motion.div>

                <h2 style={{ fontSize:22, fontWeight:700, color:'#fff', marginBottom:10, lineHeight:1.2, letterSpacing:'-0.3px' }}>
                  {current.title}
                </h2>
                <p style={{ fontSize:13.5, color:'#777', lineHeight:1.75, marginBottom:24 }}>
                  {current.desc}
                </p>

                {/* Visual */}
                <div style={{ marginBottom:28 }}>{current.visual}</div>

                {/* CTA */}
                {current.cta && (
                  <motion.button
                    onClick={() => { dismiss(); navigate(current.cta.href); }}
                    whileHover={{ scale:1.02, boxShadow:'0 4px 24px rgba(99,102,241,0.35)' }}
                    whileTap={{ scale:0.98 }}
                    style={{ width:'100%', padding:'13px 20px', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', border:'none', borderRadius:12, color:'#fff', fontSize:15, fontWeight:600, cursor:'pointer', marginBottom:16 }}
                  >
                    {current.cta.label} →
                  </motion.button>
                )}

                {/* Navigation */}
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:4, paddingBottom:2 }}>
                  <button onClick={prev} disabled={step===0}
                    style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 16px', background:step===0?'transparent':'#1a1a1a', border:`1px solid ${step===0?'#1e1e1e':'#2e2e2e'}`, borderRadius:10, color:step===0?'#2a2a2a':'#888', cursor:step===0?'default':'pointer', fontSize:13, fontWeight:500, transition:'all .15s' }}
                    onMouseEnter={e=>{ if(step>0){ e.currentTarget.style.color='#fff'; e.currentTarget.style.borderColor='#444'; }}}
                    onMouseLeave={e=>{ e.currentTarget.style.color=step===0?'#2a2a2a':'#888'; e.currentTarget.style.borderColor=step===0?'#1e1e1e':'#2e2e2e'; }}
                  >
                    <ChevronLeft size={15}/> Back
                  </button>

                  {/* Dot nav */}
                  <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                    {STEPS.map((_,i) => (
                      <motion.div key={i}
                        animate={{ width:i===step?22:8, background:i===step?current.color:'#2a2a2a' }}
                        style={{ height:8, borderRadius:4, cursor:'pointer' }}
                        onClick={()=>setStep(i)}
                      />
                    ))}
                  </div>

                  <button onClick={next}
                    style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 20px', background:`linear-gradient(135deg,${current.color},${current.color}cc)`, border:'none', borderRadius:10, color:'#fff', cursor:'pointer', fontSize:13, fontWeight:600, boxShadow:`0 4px 16px ${current.color}44`, transition:'all .15s' }}
                    onMouseEnter={e=>{ e.currentTarget.style.opacity='0.88'; e.currentTarget.style.transform='translateY(-1px)'; }}
                    onMouseLeave={e=>{ e.currentTarget.style.opacity='1'; e.currentTarget.style.transform='translateY(0)'; }}
                  >
                    {step===STEPS.length-1?<>Done ✓</>:<>Next <ChevronRight size={15}/></>}
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>
          </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
