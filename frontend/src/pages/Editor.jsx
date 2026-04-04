import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as fabric from 'fabric';
import api from '../api/axios';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Save, Download, Trash2, Type, Square, Circle,
  Minus, Image as ImageIcon, MousePointer, Triangle,
  AlignLeft, AlignCenter, AlignRight,
  ZoomIn, ZoomOut, Layers, Copy,
  ChevronUp, ChevronDown, Pencil,
} from 'lucide-react';

const COLORS = [
  '#ffffff','#000000','#ef4444','#f97316','#eab308',
  '#22c55e','#3b82f6','#8b5cf6','#ec4899','#14b8a6',
  '#f1f5f9','#94a3b8','#64748b','#334155','#0f172a',
];

/* ─── Export Dropdown ─────────────────────────────────────────────────────── */
const ExportDropdown = ({ onExport }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const options = [
    { id: 'png', label: 'Export as PNG',  sub: 'High-quality image',        icon: '🖼️' },
    { id: 'pdf', label: 'Export as PDF',  sub: 'Portable document',          icon: '📄' },
    { id: 'doc', label: 'Export as DOC',  sub: 'Word document',              icon: '📝' },
    { id: 'zip', label: 'Download ZIP',   sub: 'Canvas data + PNG bundle',   icon: '📦' },
  ];

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="btn-primary text-sm px-3 py-1.5 h-8"
        style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
      >
        <Download size={14} /> Export
        <svg width="10" height="10" viewBox="0 0 10 10" style={{ marginLeft: 2, opacity: 0.7, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}>
          <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 9999,
          background: '#141414', border: '1px solid #2a2a2a', borderRadius: 12,
          padding: 6, minWidth: 220, boxShadow: '0 12px 40px rgba(0,0,0,.6)',
          animation: 'dropIn .15s ease',
        }}>
          {options.map(opt => (
            <button key={opt.id}
              onClick={() => { onExport(opt.id); setOpen(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                width: '100%', padding: '10px 12px', background: 'none',
                border: 'none', borderRadius: 8, color: '#e5e7eb',
                cursor: 'pointer', textAlign: 'left', transition: 'background .12s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#1e1e1e'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <span style={{ fontSize: 18, width: 24, textAlign: 'center' }}>{opt.icon}</span>
              <div>
                <p style={{ fontSize: 13, fontWeight: 500, color: '#fff', lineHeight: 1.2 }}>{opt.label}</p>
                <p style={{ fontSize: 11, color: '#555', marginTop: 2 }}>{opt.sub}</p>
              </div>
            </button>
          ))}
        </div>
      )}
      <style>{`@keyframes dropIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
};

/* ─── Editor ──────────────────────────────────────────────────────────────── */
const Editor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const canvasRef   = useRef(null);
  const fabricRef   = useRef(null);
  const wrapperRef  = useRef(null);            // ← ref for wheel handler
  const designRef   = useRef(null);            // ← persist design dims for zoom
  const autoSaveTimer = useRef(null);

  const [design,      setDesign]      = useState(null);
  const [activeTool,  setActiveTool]  = useState('select');
  const [activeObj,   setActiveObj]   = useState(null);
  const [saving,      setSaving]      = useState(false);
  const [zoom,        setZoom]        = useState(100);
  const [fillColor,   setFillColor]   = useState('#6366f1');
  const [strokeColor, setStrokeColor] = useState('#ffffff');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [fontSize,    setFontSize]    = useState(24);
  const [fontWeight,  setFontWeight]  = useState('normal');
  const [title,       setTitle]       = useState('Untitled Design');
  const [sidePanel,   setSidePanel]   = useState('properties');

  /* ── Prevent browser page-zoom inside the editor ── */
  useEffect(() => {
    const block = (e) => { if (e.ctrlKey || e.metaKey) e.preventDefault(); };
    document.addEventListener('wheel', block, { passive: false });
    return () => document.removeEventListener('wheel', block);
  }, []);

  /* ── Canvas-wrapper wheel → canvas zoom ── */
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const onWheel = (e) => {
      e.preventDefault();
      if (!fabricRef.current || !designRef.current) return;
      applyZoomDelta(e.deltaY < 0 ? 10 : -10);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadDesign();
    return () => {
      if (fabricRef.current) fabricRef.current.dispose();
      clearTimeout(autoSaveTimer.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  /* ── Load & init ── */
  const loadDesign = async () => {
    try {
      const { data } = await api.get(`/designs/${id}`);
      setDesign(data.design);
      designRef.current = data.design;
      setTitle(data.design.title);
      initCanvas(data.design);
    } catch {
      toast.error('Failed to load design');
      navigate('/dashboard');
    }
  };

  const initCanvas = (d) => {
    if (!canvasRef.current) return;
    if (fabricRef.current) fabricRef.current.dispose();

    const bw = d.width  || 1280;
    const bh = d.height || 720;

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: bw, height: bh,
      backgroundColor: '#1a1a1a',
      selection: true, preserveObjectStacking: true,
    });
    fabricRef.current = canvas;

    if (d.canvasData && d.canvasData !== '{}') {
      try { canvas.loadFromJSON(d.canvasData, () => canvas.renderAll()); } catch (_) {}
    }

    canvas.on('selection:created', e => setActiveObj(e.selected?.[0] || null));
    canvas.on('selection:updated', e => setActiveObj(e.selected?.[0] || null));
    canvas.on('selection:cleared',  () => setActiveObj(null));
    canvas.on('object:modified', scheduleAutoSave);
    canvas.on('object:added',    scheduleAutoSave);

    fitCanvas(canvas, bw, bh);
  };

  const applyCanvasSize = (canvas, w, h) => {
    if (!canvas || !Number.isFinite(w) || !Number.isFinite(h)) return;
    if (typeof canvas.setDimensions === 'function') {
      try { canvas.setDimensions({ width: w, height: h }); return; } catch (_) {}
    }
    canvas.width = w; canvas.height = h;
    [canvas.lowerCanvasEl, canvas.upperCanvasEl].forEach(el => {
      if (!el) return;
      el.width = w; el.height = h;
      el.style.width = `${w}px`; el.style.height = `${h}px`;
    });
    if (typeof canvas.calcOffset === 'function') canvas.calcOffset();
  };

  const fitCanvas = (canvas, w, h) => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const scaleX = (wrapper.clientWidth  - 80) / w;
    const scaleY = (wrapper.clientHeight - 80) / h;
    const scale  = Math.min(scaleX, scaleY, 1);
    const pct    = Math.round(scale * 100);
    setZoom(pct);
    canvas.setZoom(scale);
    applyCanvasSize(canvas, w * scale, h * scale);
    canvas.renderAll();
  };

  /* ── Zoom helpers ── */
  const applyZoomDelta = (delta) => {
    const canvas = fabricRef.current;
    const d = designRef.current;
    if (!canvas || !d) return;
    setZoom(prev => {
      const next  = Math.min(200, Math.max(25, prev + delta));
      const scale = next / 100;
      canvas.setZoom(scale);
      applyCanvasSize(canvas, d.width * scale, d.height * scale);
      canvas.renderAll();
      return next;
    });
  };

  const handleZoom = (delta) => applyZoomDelta(delta);

  /* ── Save ── */
  const scheduleAutoSave = () => {
    clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => saveDesign(true), 3000);
  };

  const saveDesign = async (auto = false) => {   // ← FIX: default false so manual save shows toast
    if (!fabricRef.current || !id) return;
    setSaving(true);
    try {
      const canvas     = fabricRef.current;
      const d          = designRef.current;
      // temporarily reset zoom to get full-res thumbnail
      const currentZoom = canvas.getZoom();
      canvas.setZoom(1);
      applyCanvasSize(canvas, d?.width || 1280, d?.height || 720);
      const thumbnail = canvas.toDataURL({ format: 'jpeg', quality: 0.5, multiplier: 0.5 });
      const canvasData = JSON.stringify(canvas.toJSON());
      // restore zoom
      canvas.setZoom(currentZoom);
      applyCanvasSize(canvas, (d?.width || 1280) * currentZoom, (d?.height || 720) * currentZoom);
      canvas.renderAll();

      await api.put(`/designs/${id}`, { title, canvasData, thumbnail, width: d?.width, height: d?.height });
      if (!auto) toast.success('Design saved! ✓');
    } catch (err) {
      console.error(err);
      if (!auto) toast.error('Save failed');
    } finally {
      setSaving(false);
    }
  };

  /* ── Export ── */
  const triggerDownload = (href, name) => {
    const a = document.createElement('a'); a.href = href; a.download = name; a.click();
  };

  const handleExport = (fmt) => {
    if (!fabricRef.current) return;
    const canvas = fabricRef.current;
    const d = designRef.current;

    if (fmt === 'png') {
      // export at real resolution (1× zoom)
      const prev = canvas.getZoom();
      canvas.setZoom(1);
      applyCanvasSize(canvas, d?.width || 1280, d?.height || 720);
      const url = canvas.toDataURL({ format: 'png', multiplier: 2 });
      canvas.setZoom(prev);
      applyCanvasSize(canvas, (d?.width || 1280) * prev, (d?.height || 720) * prev);
      canvas.renderAll();
      triggerDownload(url, `${title}.png`);
      toast.success('Exported as PNG!');
      return;
    }
    if (fmt === 'pdf') { exportPDF(); return; }
    if (fmt === 'doc') { exportDOC(); return; }
    if (fmt === 'zip') { exportZIP(); }
  };

  const exportPDF = () => {
    const canvas  = fabricRef.current;
    const d       = designRef.current;
    const prev    = canvas.getZoom();
    canvas.setZoom(1);
    applyCanvasSize(canvas, d?.width || 1280, d?.height || 720);
    const imgData = canvas.toDataURL({ format: 'jpeg', quality: 0.92, multiplier: 2 });
    const w = d?.width || 1280;
    const h = d?.height || 720;
    canvas.setZoom(prev);
    applyCanvasSize(canvas, w * prev, h * prev);
    canvas.renderAll();

    const doExport = () => {
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ orientation: w >= h ? 'l' : 'p', unit: 'px', format: [w, h] });
      pdf.addImage(imgData, 'JPEG', 0, 0, w, h);
      pdf.save(`${title}.pdf`);
      toast.success('Exported as PDF!');
    };
    if (window.jspdf) { doExport(); return; }
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    s.onload = doExport; document.head.appendChild(s);
  };

  const exportDOC = () => {
    const canvas = fabricRef.current;
    const d      = designRef.current;
    const prev   = canvas.getZoom();
    canvas.setZoom(1);
    applyCanvasSize(canvas, d?.width || 1280, d?.height || 720);
    const imgData = canvas.toDataURL({ format: 'png', multiplier: 1 });
    canvas.setZoom(prev);
    applyCanvasSize(canvas, (d?.width || 1280) * prev, (d?.height || 720) * prev);
    canvas.renderAll();
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${title}</title><style>body{margin:0;padding:40px;font-family:Arial,sans-serif}h1{font-size:24px;margin-bottom:20px}img{max-width:100%}p{color:#555;font-size:13px;margin-top:16px}</style></head><body><h1>${title}</h1><img src="${imgData}" /><p>Created with Synapse — ${new Date().toLocaleDateString()}</p></body></html>`;
    const blob = new Blob([html], { type: 'application/msword' });
    const url  = URL.createObjectURL(blob);
    triggerDownload(url, `${title}.doc`);
    URL.revokeObjectURL(url);
    toast.success('Exported as DOC!');
  };

  const exportZIP = async () => {
    const loadLib = () => new Promise((res, rej) => {
      if (window.JSZip) { res(window.JSZip); return; }
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
      s.onload = () => res(window.JSZip); s.onerror = rej;
      document.head.appendChild(s);
    });
    try {
      const JSZip   = await loadLib();
      const canvas  = fabricRef.current;
      const d       = designRef.current;
      const prev    = canvas.getZoom();
      canvas.setZoom(1);
      applyCanvasSize(canvas, d?.width || 1280, d?.height || 720);
      const pngB64  = canvas.toDataURL({ format: 'png', multiplier: 2 }).split(',')[1];
      const jsonStr = JSON.stringify(canvas.toJSON(), null, 2);
      canvas.setZoom(prev);
      applyCanvasSize(canvas, (d?.width || 1280) * prev, (d?.height || 720) * prev);
      canvas.renderAll();

      const zip    = new JSZip();
      const folder = zip.folder(title.replace(/[^a-z0-9]/gi, '_'));
      folder.file(`${title}.png`, pngB64, { base64: true });
      folder.file('canvas.json', jsonStr);
      folder.file('README.md', `# ${title}\nCreated with Synapse\nDate: ${new Date().toLocaleDateString()}`);
      const blob = await zip.generateAsync({ type: 'blob' });
      const url  = URL.createObjectURL(blob);
      triggerDownload(url, `${title}.zip`);
      URL.revokeObjectURL(url);
      toast.success('Downloaded as ZIP!');
    } catch { toast.error('ZIP export failed'); }
  };

  /* ── Tools ── */
  const addText = () => {
    if (!fabricRef.current) return;
    fabricRef.current.add(new fabric.IText('Double-click to edit', {
      left: 200, top: 200, fill: '#ffffff', fontSize, fontWeight,
      fontFamily: 'Inter, sans-serif', editable: true,
    }));
    setActiveTool('select');
  };
  const addRect = () => {
    if (!fabricRef.current) return;
    fabricRef.current.add(new fabric.Rect({ left:150,top:150,width:200,height:120,fill:fillColor,stroke:strokeColor,strokeWidth,rx:8,ry:8 }));
    setActiveTool('select');
  };
  const addCircle = () => {
    if (!fabricRef.current) return;
    fabricRef.current.add(new fabric.Circle({ left:200,top:150,radius:70,fill:fillColor,stroke:strokeColor,strokeWidth }));
    setActiveTool('select');
  };
  const addTriangle = () => {
    if (!fabricRef.current) return;
    fabricRef.current.add(new fabric.Triangle({ left:200,top:150,width:150,height:130,fill:fillColor,stroke:strokeColor,strokeWidth }));
    setActiveTool('select');
  };
  const addLine = () => {
    if (!fabricRef.current) return;
    fabricRef.current.add(new fabric.Line([100,200,400,200],{ stroke:strokeColor,strokeWidth:strokeWidth||3 }));
    setActiveTool('select');
  };
  const addImage = () => {
    const url = prompt('Enter image URL:');
    if (!url) return;
    fabric.Image.fromURL(url, img => {
      img.scaleToWidth(200); img.set({ left:100,top:100 });
      fabricRef.current.add(img);
    }, { crossOrigin:'anonymous' });
  };
  const enableDrawing = () => {
    if (!fabricRef.current) return;
    const on = !fabricRef.current.isDrawingMode;
    fabricRef.current.isDrawingMode = on;
    fabricRef.current.freeDrawingBrush.color = fillColor;
    fabricRef.current.freeDrawingBrush.width = strokeWidth || 3;
    setActiveTool(on ? 'draw' : 'select');
  };
  const deleteSelected = () => {
    const c = fabricRef.current; if (!c) return;
    c.getActiveObjects().forEach(o => c.remove(o));
    c.discardActiveObject(); c.renderAll();
  };
  const duplicateSelected = () => {
    const c = fabricRef.current; const o = c?.getActiveObject(); if (!o) return;
    o.clone(clone => { clone.set({ left: o.left+20, top: o.top+20 }); c.add(clone); c.setActiveObject(clone); });
  };
  const bringForward = () => { fabricRef.current?.getActiveObject()?.bringForward(); fabricRef.current?.renderAll(); };
  const sendBackward = () => { fabricRef.current?.getActiveObject()?.sendBackward(); fabricRef.current?.renderAll(); };

  const updateObjProp = (prop, value) => {
    const obj = fabricRef.current?.getActiveObject();
    if (!obj) return;
    obj.set(prop, value);
    fabricRef.current.renderAll();
    setActiveObj({ ...obj });
  };

  const tools = [
    { id:'select',   icon:<MousePointer size={18}/>, label:'Select',   action:()=>{ fabricRef.current&&(fabricRef.current.isDrawingMode=false); setActiveTool('select'); } },
    { id:'text',     icon:<Type size={18}/>,         label:'Text',     action:addText },
    { id:'rect',     icon:<Square size={18}/>,       label:'Rect',     action:addRect },
    { id:'circle',   icon:<Circle size={18}/>,       label:'Circle',   action:addCircle },
    { id:'triangle', icon:<Triangle size={18}/>,     label:'Triangle', action:addTriangle },
    { id:'line',     icon:<Minus size={18}/>,        label:'Line',     action:addLine },
    { id:'draw',     icon:<Pencil size={18}/>,       label:'Draw',     action:enableDrawing },
    { id:'image',    icon:<ImageIcon size={18}/>,    label:'Image',    action:addImage },
  ];

  const layers = fabricRef.current?.getObjects() || [];

  return (
    <div className="h-screen bg-dark-950 flex flex-col overflow-hidden">

      {/* ── Top Bar ── */}
      <header className="h-12 bg-dark-800 border-b border-dark-600 flex items-center px-3 gap-3 shrink-0 z-50">
        <button onClick={() => navigate('/dashboard')} className="tool-btn"><ArrowLeft size={16} /></button>
        <div className="w-px h-6 bg-dark-600" />
        <input
          value={title} onChange={e => setTitle(e.target.value)}
          onBlur={() => saveDesign(true)}
          className="bg-transparent text-sm font-medium text-white focus:outline-none border-b border-transparent focus:border-accent px-1 py-0.5 max-w-48"
        />
        <div className="flex-1" />

        {/* Zoom — canvas only */}
        <div className="flex items-center gap-1 bg-dark-700 rounded-lg px-2 py-1">
          <button onClick={() => handleZoom(-10)} className="text-gray-400 hover:text-white p-0.5" title="Zoom out (or Ctrl+Scroll)"><ZoomOut size={14} /></button>
          <span className="text-xs font-mono text-gray-300 w-10 text-center">{zoom}%</span>
          <button onClick={() => handleZoom(10)} className="text-gray-400 hover:text-white p-0.5" title="Zoom in"><ZoomIn size={14} /></button>
        </div>

        {/* Save — FIX: pass false so toast shows */}
        <button onClick={() => saveDesign(false)} disabled={saving} className="btn-secondary text-sm px-3 py-1.5 h-8">
          {saving
            ? <><span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" /> Saving...</>
            : <><Save size={14} /> Save</>}
        </button>

        <ExportDropdown onExport={handleExport} />
      </header>

      <div className="flex flex-1 overflow-hidden">

        {/* ── Left Toolbar ── */}
        <aside className="w-14 bg-dark-800 border-r border-dark-600 flex flex-col items-center py-3 gap-1 shrink-0">
          {tools.map(t => (
            <button key={t.id}
              onClick={() => { t.action(); if (t.id !== 'draw') setActiveTool(t.id); }}
              title={t.label}
              className={`tool-btn ${activeTool === t.id ? 'active' : ''}`}
            >
              {t.icon}
              <span className="text-[9px] leading-none">{t.label}</span>
            </button>
          ))}
          <div className="w-8 h-px bg-dark-600 my-2" />
          <button onClick={deleteSelected}    title="Delete"        className="tool-btn text-red-400 hover:text-red-300 hover:bg-red-900/20"><Trash2 size={16} /></button>
          <button onClick={duplicateSelected} title="Duplicate"     className="tool-btn"><Copy size={16} /></button>
          <button onClick={bringForward}      title="Bring Forward" className="tool-btn"><ChevronUp size={16} /></button>
          <button onClick={sendBackward}      title="Send Backward" className="tool-btn"><ChevronDown size={16} /></button>
        </aside>

        {/* ── Canvas Area ── Ctrl+Scroll captured here, NOT the page ── */}
        <main
          ref={wrapperRef}
          id="canvas-wrapper"
          className="flex-1 overflow-auto bg-dark-950 flex items-center justify-center"
          style={{ backgroundImage: 'radial-gradient(#222 1px, transparent 1px)', backgroundSize: '20px 20px' }}
        >
          <div className="shadow-2xl shadow-black">
            <canvas ref={canvasRef} />
          </div>
        </main>

        {/* ── Right Panel ── */}
        <aside className="w-64 bg-dark-800 border-l border-dark-600 flex flex-col shrink-0 overflow-hidden">
          <div className="flex border-b border-dark-600">
            {['properties','layers'].map(p => (
              <button key={p} onClick={() => setSidePanel(p)}
                className={`flex-1 py-2.5 text-xs font-semibold capitalize transition-colors ${sidePanel === p ? 'text-white border-b-2 border-accent' : 'text-gray-500 hover:text-gray-300'}`}>
                {p}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {sidePanel === 'properties' ? (
              <>
                {/* Fill */}
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Fill Color</p>
                  <div className="grid grid-cols-5 gap-2 mb-3">
                    {COLORS.map(c => (
                      <button key={c} onClick={() => { setFillColor(c); updateObjProp('fill', c); }}
                        className={`w-8 h-8 rounded-lg border-2 transition-all ${fillColor===c?'border-accent scale-110':'border-transparent'}`}
                        style={{ backgroundColor: c }} />
                    ))}
                  </div>
                  <input type="color" value={fillColor}
                    onChange={e => { setFillColor(e.target.value); updateObjProp('fill', e.target.value); }}
                    className="w-full h-9 rounded-lg cursor-pointer bg-dark-700 border border-dark-500 p-1" />
                </div>

                {/* Stroke */}
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Stroke</p>
                  <div className="grid grid-cols-5 gap-2 mb-3">
                    {COLORS.map(c => (
                      <button key={c} onClick={() => { setStrokeColor(c); updateObjProp('stroke', c); }}
                        className={`w-8 h-8 rounded-lg border-2 transition-all ${strokeColor===c?'border-accent scale-110':'border-transparent'}`}
                        style={{ backgroundColor: c }} />
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="color" value={strokeColor}
                      onChange={e => { setStrokeColor(e.target.value); updateObjProp('stroke', e.target.value); }}
                      className="w-16 h-9 rounded-lg cursor-pointer bg-dark-700 border border-dark-500 p-1" />
                    <div className="flex-1">
                      <label className="text-xs text-gray-500 mb-1 block">Width: {strokeWidth}px</label>
                      <input type="range" min="0" max="20" value={strokeWidth}
                        onChange={e => { const v=+e.target.value; setStrokeWidth(v); updateObjProp('strokeWidth',v); }}
                        className="w-full accent-indigo-500" />
                    </div>
                  </div>
                </div>

                {/* Typography */}
                {activeObj?.type === 'i-text' && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Typography</p>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Font Size: {fontSize}px</label>
                        <input type="range" min="8" max="120" value={fontSize}
                          onChange={e => { setFontSize(+e.target.value); updateObjProp('fontSize',+e.target.value); }}
                          className="w-full accent-indigo-500" />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => { const fw=fontWeight==='bold'?'normal':'bold'; setFontWeight(fw); updateObjProp('fontWeight',fw); }}
                          className={`flex-1 py-1.5 rounded text-xs font-bold transition-colors ${fontWeight==='bold'?'bg-accent text-white':'bg-dark-600 text-gray-300'}`}>B</button>
                        <button onClick={() => updateObjProp('fontStyle', activeObj.fontStyle==='italic'?'normal':'italic')}
                          className="flex-1 py-1.5 rounded text-xs italic transition-colors bg-dark-600 text-gray-300 hover:bg-dark-500">I</button>
                        <button onClick={() => updateObjProp('underline', !activeObj.underline)}
                          className="flex-1 py-1.5 rounded text-xs underline transition-colors bg-dark-600 text-gray-300 hover:bg-dark-500">U</button>
                      </div>
                      <div className="flex gap-1">
                        {['left','center','right'].map(a => (
                          <button key={a} onClick={() => updateObjProp('textAlign',a)}
                            className={`flex-1 py-1.5 rounded text-xs transition-colors ${activeObj.textAlign===a?'bg-accent text-white':'bg-dark-600 text-gray-300'}`}>
                            {a==='left'?<AlignLeft size={12} className="mx-auto"/>:a==='center'?<AlignCenter size={12} className="mx-auto"/>:<AlignRight size={12} className="mx-auto"/>}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeObj && (
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Opacity: {Math.round((activeObj.opacity??1)*100)}%</label>
                    <input type="range" min="0" max="100" value={Math.round((activeObj.opacity??1)*100)}
                      onChange={e => updateObjProp('opacity',+e.target.value/100)}
                      className="w-full accent-indigo-500" />
                  </div>
                )}

                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Canvas Background</p>
                  <input type="color" defaultValue="#1a1a1a"
                    onChange={e => { fabricRef.current.backgroundColor=e.target.value; fabricRef.current.renderAll(); }}
                    className="w-full h-9 rounded-lg cursor-pointer bg-dark-700 border border-dark-500 p-1" />
                </div>
              </>
            ) : (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Layers ({layers.length})</p>
                {layers.length === 0
                  ? <p className="text-xs text-gray-600 text-center py-8">No objects yet</p>
                  : <div className="space-y-1">
                    {[...layers].reverse().map((obj,i) => (
                      <div key={i}
                        onClick={() => { fabricRef.current.setActiveObject(obj); fabricRef.current.renderAll(); setActiveObj(obj); }}
                        className="flex items-center gap-2 p-2 rounded-lg hover:bg-dark-600 cursor-pointer transition-colors text-xs">
                        <span className="text-gray-500">
                          {obj.type==='i-text'?<Type size={12}/>:obj.type==='rect'?<Square size={12}/>:obj.type==='circle'?<Circle size={12}/>:<Layers size={12}/>}
                        </span>
                        <span className="flex-1 truncate text-gray-300">
                          {obj.type==='i-text'?(obj.text?.substring(0,20)||'Text'):`${obj.type} ${layers.length-i}`}
                        </span>
                        <div className="w-4 h-4 rounded border border-dark-400" style={{ backgroundColor: obj.fill||'#fff' }} />
                      </div>
                    ))}
                  </div>
                }
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Editor;
