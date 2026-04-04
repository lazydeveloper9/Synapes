import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import * as fabric from 'fabric';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Plus, Trash2, Save, Download, ChevronLeft, ChevronRight,
  Type, Square, Circle, Minus, Play,
} from 'lucide-react';

/* ─── helpers ─────────────────────────────────────────────────────────────── */
const STORAGE_KEY = 'synapse_slides';
const SLIDE_W = 800;
const SLIDE_H = 450;

const THEMES = [
  { name: 'Dark',    bg: '#111111', text: '#ffffff', accent: '#6366f1' },
  { name: 'Light',   bg: '#f8fafc', text: '#0f172a', accent: '#6366f1' },
  { name: 'Ocean',   bg: '#0f2942', text: '#e0f0ff', accent: '#38bdf8' },
  { name: 'Forest',  bg: '#0d2616', text: '#d1fae5', accent: '#22c55e' },
  { name: 'Sunset',  bg: '#1e0a1a', text: '#fde68a', accent: '#f97316' },
];

const newSlide = (themeIdx = 0) => ({
  id: Date.now().toString() + Math.random(),
  canvasData: '',
  bg: THEMES[themeIdx].bg,
  thumbnail: '',
});

const loadPresentations = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; } };
const savePresent = (d) => localStorage.setItem(STORAGE_KEY, JSON.stringify(d));

/* ─── PptEditor ─────────────────────────────────────────────────────────── */
export default function PptEditor() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const canvasRef = useRef(null);
  const fabricRef = useRef(null);
  const autoRef   = useRef(null);

  const [pres,       setPres]       = useState(() => loadPresentations());
  const [activePresId, setActivePresId] = useState(null);
  const [presName,   setPresName]   = useState('');
  const [slides,     setSlides]     = useState([]);
  const [activeSlide, setActiveSlide] = useState(0);
  const [themeIdx,   setThemeIdx]   = useState(0);
  const [presenting, setPresenting] = useState(false);

  const theme = THEMES[themeIdx];

  /* ── Sync pres to state ── */
  useEffect(() => {
    if (!activePresId) return;
    const p = pres.find(p => p.id === activePresId);
    if (!p) return;
    setSlides(p.slides || []);
    setPresName(p.name);
    setThemeIdx(p.themeIdx || 0);
  }, [activePresId, pres]);

  /* ── Init fabric when active slide changes ── */
  useEffect(() => {
    if (!activePresId || slides.length === 0) return;
    const slide = slides[activeSlide];
    if (!slide) return;
    initCanvas(slide);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSlide, activePresId]);

  const initCanvas = (slide) => {
    if (!canvasRef.current) return;
    if (fabricRef.current) fabricRef.current.dispose();

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: SLIDE_W, height: SLIDE_H,
      backgroundColor: slide.bg || theme.bg,
      selection: true, preserveObjectStacking: true,
    });
    fabricRef.current = canvas;

    if (slide.canvasData && slide.canvasData !== '{}') {
      try { canvas.loadFromJSON(slide.canvasData, () => canvas.renderAll()); } catch (_) {}
    }

    canvas.on('object:modified', autoScheduleSave);
    canvas.on('object:added',    autoScheduleSave);
  };

  const autoScheduleSave = () => {
    clearTimeout(autoRef.current);
    autoRef.current = setTimeout(() => persistCurrent(true), 1500);
  };

  const captureThumbnail = () => fabricRef.current?.toDataURL({ format:'jpeg', quality:0.4, multiplier:0.25 }) || '';

  const persistCurrent = (silent = false) => {
    if (!fabricRef.current) return;
    const data = JSON.stringify(fabricRef.current.toJSON());
    const thumb = captureThumbnail();
    setSlides(prev => {
      const updated = prev.map((s, i) => i === activeSlide ? { ...s, canvasData: data, thumbnail: thumb } : s);
      savePres(updated);
      return updated;
    });
    if (!silent) toast.success('Saved! ✓');
  };

  const savePres = (updatedSlides) => {
    const updated = pres.map(p => p.id === activePresId ? { ...p, slides: updatedSlides, name: presName, themeIdx, updatedAt: Date.now() } : p);
    setPres(updated);
    savePresent(updated);
  };

  const createPresentation = () => {
    const firstSlide = newSlide(themeIdx);
    const p = { id: Date.now().toString(), name: 'Untitled Presentation', slides: [firstSlide], themeIdx: 0, updatedAt: Date.now() };
    const updated = [p, ...pres];
    setPres(updated); savePresent(updated);
    setActivePresId(p.id);
    setSlides([firstSlide]);
    setActiveSlide(0);
  };

  const addSlide = () => {
    const s = newSlide(themeIdx);
    const updated = [...slides, s];
    setSlides(updated);
    savePres(updated);
    setActiveSlide(updated.length - 1);
  };

  const deleteSlide = (i) => {
    if (slides.length <= 1) { toast.error('Need at least one slide'); return; }
    const updated = slides.filter((_, idx) => idx !== i);
    setSlides(updated);
    savePres(updated);
    setActiveSlide(Math.min(i, updated.length - 1));
  };

  const addText = () => {
    if (!fabricRef.current) return;
    fabricRef.current.add(new fabric.IText('Click to edit', {
      left:80, top:80, fill: theme.text, fontSize:28, fontFamily:'Inter,sans-serif', editable:true,
    }));
  };

  const addRect = () => {
    if (!fabricRef.current) return;
    fabricRef.current.add(new fabric.Rect({ left:150, top:120, width:200, height:120, fill: theme.accent, rx:8, ry:8 }));
  };

  const addCircle = () => {
    if (!fabricRef.current) return;
    fabricRef.current.add(new fabric.Circle({ left:200, top:100, radius:80, fill: theme.accent }));
  };

  const addLine = () => {
    if (!fabricRef.current) return;
    fabricRef.current.add(new fabric.Line([60, 220, 500, 220], { stroke: theme.accent, strokeWidth:3 }));
  };

  const setBg = (color) => {
    if (!fabricRef.current) return;
    fabricRef.current.backgroundColor = color;
    fabricRef.current.renderAll();
    setSlides(prev => prev.map((s,i) => i===activeSlide ? { ...s, bg: color } : s));
  };

  const exportPNG = () => {
    if (!fabricRef.current) return;
    const url = fabricRef.current.toDataURL({ format: 'png', multiplier: 2 });
    const a = document.createElement('a'); a.href=url; a.download=`${presName}_slide${activeSlide+1}.png`; a.click();
    toast.success('Slide exported!');
  };

  /* ── Presentation mode ── */
  if (presenting && slides.length > 0) {
    const sl = slides[activeSlide];
    return (
      <div style={{ width:'100vw', height:'100vh', background:'#000', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
        <div style={{ position:'relative', width: SLIDE_W, height: SLIDE_H, boxShadow:'0 20px 80px rgba(0,0,0,.8)', background: sl.bg }}>
          {sl.thumbnail && <img src={sl.thumbnail} style={{ width:'100%', height:'100%', objectFit:'contain' }} alt="" />}
          {!sl.thumbnail && <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', color:'#666', fontSize:24 }}>Empty slide</div>}
        </div>
        <div style={{ marginTop:24, display:'flex', gap:12, alignItems:'center' }}>
          <button onClick={()=>setActiveSlide(s=>Math.max(0,s-1))} style={{ background:'#222', border:'1px solid #333', borderRadius:8, padding:'8px 16px', color:'#fff', cursor:'pointer' }}><ChevronLeft size={18}/></button>
          <span style={{ color:'#666', fontSize:13 }}>{activeSlide+1} / {slides.length}</span>
          <button onClick={()=>setActiveSlide(s=>Math.min(slides.length-1,s+1))} style={{ background:'#222', border:'1px solid #333', borderRadius:8, padding:'8px 16px', color:'#fff', cursor:'pointer' }}><ChevronRight size={18}/></button>
          <button onClick={()=>setPresenting(false)} style={{ background:'#ef4444', border:'none', borderRadius:8, padding:'8px 16px', color:'#fff', cursor:'pointer', marginLeft:12 }}>✕ Exit</button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-dark-900 flex flex-col overflow-hidden">

      {/* Nav */}
      <nav className="h-12 bg-dark-800 border-b border-dark-600 flex items-center px-4 gap-3 shrink-0 z-50">
        <button onClick={()=>navigate('/hub')} className="tool-btn"><ArrowLeft size={16}/></button>
        <div className="w-px h-6 bg-dark-600"/>
        {activePresId
          ? <input value={presName} onChange={e=>setPresName(e.target.value)}
              className="bg-transparent text-sm font-medium text-white focus:outline-none border-b border-transparent focus:border-accent px-1"
            />
          : <span className="font-bold text-sm">🖥️ Synapse Slides</span>
        }
        <div className="flex-1"/>
        {activePresId && (
          <>
            <button onClick={()=>setPresenting(true)} className="btn-secondary text-xs px-3 py-1.5 h-8"><Play size={13}/> Present</button>
            <button onClick={exportPNG}               className="btn-secondary text-xs px-3 py-1.5 h-8"><Download size={13}/> PNG</button>
            <button onClick={()=>persistCurrent(false)} className="btn-primary text-xs px-3 py-1.5 h-8"><Save size={13}/> Save</button>
          </>
        )}
        <button onClick={logout} className="text-gray-500 hover:text-red-400 text-xs ml-2">Sign out</button>
      </nav>

      <div className="flex flex-1 overflow-hidden">

        {/* Left: Presentations list */}
        <aside className="w-44 bg-dark-800 border-r border-dark-600 flex flex-col shrink-0">
          <div className="p-3 border-b border-dark-600">
            <button onClick={createPresentation} className="btn-primary text-xs w-full justify-center"><Plus size={13}/> New Deck</button>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {pres.map(p => (
              <div key={p.id} onClick={()=>setActivePresId(p.id)}
                className={`p-2.5 rounded-lg cursor-pointer mb-1 group flex items-center gap-2 transition-colors ${activePresId===p.id?'bg-dark-600 border border-accent/30':'hover:bg-dark-700'}`}>
                <span className="text-base">🖥️</span>
                <span className="text-xs font-medium text-white truncate flex-1">{p.name}</span>
                <button onClick={e=>{ e.stopPropagation(); if(!confirm('Delete?')) return; const u=pres.filter(x=>x.id!==p.id); setPres(u); savePresent(u); if(activePresId===p.id) setActivePresId(null); }}
                  className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400"><Trash2 size={11}/></button>
              </div>
            ))}
            {pres.length===0 && <p className="text-xs text-gray-600 text-center py-8">No presentations</p>}
          </div>
        </aside>

        {/* Slide strip */}
        {activePresId && (
          <aside className="w-36 bg-dark-800 border-r border-dark-600 flex flex-col shrink-0 overflow-hidden">
            <div className="p-2 border-b border-dark-600 flex gap-1">
              <button onClick={addSlide} className="btn-secondary text-xs flex-1 justify-center py-1.5 h-7"><Plus size={12}/> Slide</button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-2">
              {slides.map((s, i) => (
                <div key={s.id} onClick={()=>{ persistCurrent(true); setActiveSlide(i); }}
                  className={`relative group rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${activeSlide===i?'border-accent':'border-transparent hover:border-dark-500'}`}
                  style={{ aspectRatio:'16/9', background: s.bg || '#111' }}
                >
                  {s.thumbnail ? <img src={s.thumbnail} className="w-full h-full object-cover" alt="" /> :
                    <div className="w-full h-full flex items-center justify-center text-gray-700 text-xs">Slide {i+1}</div>}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 transition-opacity">
                    <button onClick={e=>{ e.stopPropagation(); deleteSlide(i); }} className="text-red-400 hover:text-red-300"><Trash2 size={14}/></button>
                  </div>
                  <span className="absolute bottom-1 right-1 text-[9px] text-gray-500">{i+1}</span>
                </div>
              ))}
            </div>
          </aside>
        )}

        {/* Canvas area */}
        {activePresId && slides.length > 0 ? (
          <div className="flex-1 flex flex-col overflow-hidden">

            {/* Tools */}
            <div className="h-10 bg-dark-800 border-b border-dark-600 flex items-center px-4 gap-2 shrink-0">
              <button onClick={addText}   className="tool-btn w-8 h-8" title="Text"><Type size={14}/></button>
              <button onClick={addRect}   className="tool-btn w-8 h-8" title="Rectangle"><Square size={14}/></button>
              <button onClick={addCircle} className="tool-btn w-8 h-8" title="Circle"><Circle size={14}/></button>
              <button onClick={addLine}   className="tool-btn w-8 h-8" title="Line"><Minus size={14}/></button>
              <div className="w-px h-5 bg-dark-600 mx-2"/>
              <span className="text-xs text-gray-500">Theme:</span>
              {THEMES.map((t, i) => (
                <button key={t.name} title={t.name} onClick={()=>{ setThemeIdx(i); setBg(t.bg); }}
                  style={{ width:18, height:18, borderRadius:'50%', background:t.bg, border: i===themeIdx?`2px solid ${t.accent}`:'2px solid #333', cursor:'pointer' }}/>
              ))}
              <div className="w-px h-5 bg-dark-600 mx-2"/>
              <span className="text-xs text-gray-500">BG:</span>
              <input type="color" defaultValue={slides[activeSlide]?.bg||'#111111'}
                onChange={e=>setBg(e.target.value)}
                className="w-7 h-7 rounded cursor-pointer bg-transparent border-0"/>
            </div>

            {/* Canvas */}
            <main className="flex-1 overflow-auto flex items-center justify-center bg-dark-950"
              style={{ backgroundImage:'radial-gradient(#222 1px, transparent 1px)', backgroundSize:'20px 20px' }}>
              <div className="shadow-2xl shadow-black">
                <canvas ref={canvasRef}/>
              </div>
            </main>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-dark-950 text-gray-600 flex-col gap-4">
            <span className="text-5xl">🖥️</span>
            <p className="text-lg font-medium">Select or create a presentation</p>
            <button onClick={createPresentation} className="btn-primary"><Plus size={16}/> New Presentation</button>
          </div>
        )}
      </div>
    </div>
  );
}
