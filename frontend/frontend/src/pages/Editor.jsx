import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as fabric from 'fabric';
import api from '../api/axios';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Save, Download, Trash2, Type, Square, Circle,
  Minus, Image as ImageIcon, Move, MousePointer, Triangle,
  Bold, Italic, AlignLeft, AlignCenter, AlignRight,
  ZoomIn, ZoomOut, RotateCcw, Layers, Lock, Copy,
  ChevronUp, ChevronDown, Pencil
} from 'lucide-react';

const COLORS = [
  '#ffffff','#000000','#ef4444','#f97316','#eab308',
  '#22c55e','#3b82f6','#8b5cf6','#ec4899','#14b8a6',
  '#f1f5f9','#94a3b8','#64748b','#334155','#0f172a',
];

const Editor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const fabricRef = useRef(null);
  const [design, setDesign] = useState(null);
  const [activeTool, setActiveTool] = useState('select');
  const [activeObj, setActiveObj] = useState(null);
  const [saving, setSaving] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [fillColor, setFillColor] = useState('#6366f1');
  const [strokeColor, setStrokeColor] = useState('#ffffff');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [fontSize, setFontSize] = useState(24);
  const [fontWeight, setFontWeight] = useState('normal');
  const [isDrawing, setIsDrawing] = useState(false);
  const titleRef = useRef(null);
  const [title, setTitle] = useState('Untitled Design');
  const [sidePanel, setSidePanel] = useState('properties'); // 'properties' | 'layers'
  const autoSaveTimer = useRef(null);
//ykn
  // Load design and init canvas
  useEffect(() => {
    console.log('Editor loaded with id:', id);
    loadDesign();
    return () => {
      if (fabricRef.current) fabricRef.current.dispose();
      clearTimeout(autoSaveTimer.current);
    };
  }, [id]);

  const loadDesign = async () => {
    console.log('Loading design, user authenticated:', !!localStorage.getItem('df_token'));
    try {
      const { data } = await api.get(`/designs/${id}`);
      console.log('Design data received:', data);
      setDesign(data.design);
      setTitle(data.design.title);
      initCanvas(data.design);
    } catch (error) {
      console.error('Load design error:', error);
      toast.error('Failed to load design');
      navigate('/dashboard');
    }
  };

  const initCanvas = (d) => {
    if (!canvasRef.current) {
      console.error('Canvas ref not set');
      return;
    }
    if (fabricRef.current) fabricRef.current.dispose();

    const baseWidth = d.width || 1280;
    const baseHeight = d.height || 720;
    console.log('Initializing canvas with dimensions:', baseWidth, baseHeight);
    const canvas = new fabric.Canvas(canvasRef.current, {
      width: baseWidth,
      height: baseHeight,
      backgroundColor: '#1a1a1a',
      selection: true,
      preserveObjectStacking: true,
    });

    fabricRef.current = canvas;

    // Load saved state
    if (d.canvasData && d.canvasData !== '{}') {
      try {
        canvas.loadFromJSON(d.canvasData, () => canvas.renderAll());
      } catch (error) {
        console.error('Failed to load canvas data:', error);
        // fresh canvas
      }
    }

    // Event listeners
    canvas.on('selection:created', e => setActiveObj(e.selected?.[0] || null));
    canvas.on('selection:updated', e => setActiveObj(e.selected?.[0] || null));
    canvas.on('selection:cleared', () => setActiveObj(null));
    canvas.on('object:modified', scheduleAutoSave);
    canvas.on('object:added', scheduleAutoSave);

    // Scale canvas to fit viewport
    fitCanvas(canvas, baseWidth, baseHeight);
  };

  const applyCanvasSize = (canvas, width, height) => {
    if (!canvas || !Number.isFinite(width) || !Number.isFinite(height)) return;

    if (typeof canvas.setDimensions === 'function') {
      try {
        canvas.setDimensions({ width, height });
        return;
      } catch (error) {
        // Some Fabric bundles mix APIs where setDimensions internally calls setWidth/setHeight.
        if (!(error instanceof TypeError && /setWidth|setHeight/.test(error.message))) {
          throw error;
        }
      }
    }

    // Fallback path for legacy/mixed Fabric runtime behavior.
    canvas.width = width;
    canvas.height = height;

    [canvas.lowerCanvasEl, canvas.upperCanvasEl].forEach((el) => {
      if (!el) return;
      el.width = width;
      el.height = height;
      el.style.width = `${width}px`;
      el.style.height = `${height}px`;
    });

    if (typeof canvas.calcOffset === 'function') canvas.calcOffset();
  };

  const fitCanvas = (canvas, w, h) => {
    const wrapper = document.getElementById('canvas-wrapper');
    if (!wrapper) return;
    const scaleX = (wrapper.clientWidth - 80) / w;
    const scaleY = (wrapper.clientHeight - 80) / h;
    const scale = Math.min(scaleX, scaleY, 1);
    const pct = Math.round(scale * 100);
    setZoom(pct);
    canvas.setZoom(scale);
    applyCanvasSize(canvas, w * scale, h * scale);
    canvas.renderAll();
  };

  const scheduleAutoSave = () => {
    clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => saveDesign(true), 3000);
  };

  const saveDesign = async (auto = true) => {
    if (!fabricRef.current || !id) return;
    setSaving(true);
    try {
      const canvasData = JSON.stringify(fabricRef.current.toJSON());
      const thumbnail = fabricRef.current.toDataURL({ format: 'jpeg', quality: 0.5, multiplier: 0.5 });
      await api.put(`/designs/${id}`, { title, canvasData, thumbnail });
      if (!auto) toast.success('Design saved!');
    } catch (error) {
      console.error('Save design error:', error);
      if (!auto) toast.error('Save failed');
    } finally {
      setSaving(false);
    }
  };

  const exportPNG = () => {
    if (!fabricRef.current) return;
    const url = fabricRef.current.toDataURL({ format: 'png', multiplier: 2 });
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title}.png`;
    a.click();
    toast.success('Exported as PNG!');
  };

  // Tool actions
  const addText = () => {
    if (!fabricRef.current) return;
    const text = new fabric.IText('Double-click to edit', {
      left: 200, top: 200,
      fill: '#ffffff',
      fontSize: fontSize,
      fontWeight: fontWeight,
      fontFamily: 'Inter, sans-serif',
      editable: true,
    });
    fabricRef.current.add(text);
    fabricRef.current.setActiveObject(text);
    setActiveTool('select');
  };

  const addRect = () => {
    if (!fabricRef.current) return;
    const rect = new fabric.Rect({
      left: 150, top: 150, width: 200, height: 120,
      fill: fillColor, stroke: strokeColor, strokeWidth,
      rx: 8, ry: 8,
    });
    fabricRef.current.add(rect);
    fabricRef.current.setActiveObject(rect);
    setActiveTool('select');
  };

  const addCircle = () => {
    if (!fabricRef.current) return;
    const circle = new fabric.Circle({
      left: 200, top: 150, radius: 70,
      fill: fillColor, stroke: strokeColor, strokeWidth,
    });
    fabricRef.current.add(circle);
    fabricRef.current.setActiveObject(circle);
    setActiveTool('select');
  };

  const addTriangle = () => {
    if (!fabricRef.current) return;
    const tri = new fabric.Triangle({
      left: 200, top: 150, width: 150, height: 130,
      fill: fillColor, stroke: strokeColor, strokeWidth,
    });
    fabricRef.current.add(tri);
    fabricRef.current.setActiveObject(tri);
    setActiveTool('select');
  };

  const addLine = () => {
    if (!fabricRef.current) return;
    const line = new fabric.Line([100, 200, 400, 200], {
      stroke: strokeColor, strokeWidth: strokeWidth || 3,
    });
    fabricRef.current.add(line);
    fabricRef.current.setActiveObject(line);
    setActiveTool('select');
  };

  const addImage = () => {
    const url = prompt('Enter image URL:');
    if (!url) return;
    fabric.Image.fromURL(url, (img) => {
      img.scaleToWidth(200);
      img.set({ left: 100, top: 100 });
      fabricRef.current.add(img);
      fabricRef.current.setActiveObject(img);
    }, { crossOrigin: 'anonymous' });
  };

  const enableDrawing = () => {
    if (!fabricRef.current) return;
    const on = !fabricRef.current.isDrawingMode;
    fabricRef.current.isDrawingMode = on;
    fabricRef.current.freeDrawingBrush.color = fillColor;
    fabricRef.current.freeDrawingBrush.width = strokeWidth || 3;
    setIsDrawing(on);
    setActiveTool(on ? 'draw' : 'select');
  };

  const deleteSelected = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObjects();
    active.forEach(obj => canvas.remove(obj));
    canvas.discardActiveObject();
    canvas.renderAll();
  };

  const duplicateSelected = () => {
    const canvas = fabricRef.current;
    const obj = canvas?.getActiveObject();
    if (!obj) return;
    obj.clone((clone) => {
      clone.set({ left: obj.left + 20, top: obj.top + 20 });
      canvas.add(clone);
      canvas.setActiveObject(clone);
    });
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

  const handleZoom = (delta) => {
    const canvas = fabricRef.current;
    if (!canvas || !design) return;
    const newPct = Math.min(200, Math.max(25, zoom + delta));
    const scale = newPct / 100;
    setZoom(newPct);
    canvas.setZoom(scale);
    applyCanvasSize(canvas, design.width * scale, design.height * scale);
    canvas.renderAll();
  };

  const tools = [
    { id: 'select', icon: <MousePointer size={18} />, label: 'Select', action: () => { fabricRef.current && (fabricRef.current.isDrawingMode = false); setActiveTool('select'); } },
    { id: 'text', icon: <Type size={18} />, label: 'Text', action: addText },
    { id: 'rect', icon: <Square size={18} />, label: 'Rect', action: addRect },
    { id: 'circle', icon: <Circle size={18} />, label: 'Circle', action: addCircle },
    { id: 'triangle', icon: <Triangle size={18} />, label: 'Triangle', action: addTriangle },
    { id: 'line', icon: <Minus size={18} />, label: 'Line', action: addLine },
    { id: 'draw', icon: <Pencil size={18} />, label: 'Draw', action: enableDrawing },
    { id: 'image', icon: <ImageIcon size={18} />, label: 'Image', action: addImage },
  ];

  const layers = fabricRef.current?.getObjects() || [];

  return (
    <div className="h-screen bg-dark-950 flex flex-col overflow-hidden">
      {/* Top Bar */}
      <header className="h-12 bg-dark-800 border-b border-dark-600 flex items-center px-3 gap-3 shrink-0 z-50">
        <button onClick={() => navigate('/dashboard')} className="tool-btn">
          <ArrowLeft size={16} />
        </button>

        <div className="w-px h-6 bg-dark-600" />

        {/* Title */}
        <input
          ref={titleRef}
          value={title}
          onChange={e => setTitle(e.target.value)}
          onBlur={() => saveDesign(true)}
          className="bg-transparent text-sm font-medium text-white focus:outline-none border-b border-transparent focus:border-accent px-1 py-0.5 max-w-48"
        />

        <div className="flex-1" />

        {/* Zoom */}
        <div className="flex items-center gap-1 bg-dark-700 rounded-lg px-2 py-1">
          <button onClick={() => handleZoom(-10)} className="text-gray-400 hover:text-white p-0.5"><ZoomOut size={14} /></button>
          <span className="text-xs font-mono text-gray-300 w-10 text-center">{zoom}%</span>
          <button onClick={() => handleZoom(10)} className="text-gray-400 hover:text-white p-0.5"><ZoomIn size={14} /></button>
        </div>

        <button onClick={() => saveDesign()} disabled={saving} className="btn-secondary text-sm px-3 py-1.5 h-8">
          {saving ? <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" /> : <Save size={14} />}
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button onClick={exportPNG} className="btn-primary text-sm px-3 py-1.5 h-8">
          <Download size={14} /> Export
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Toolbar */}
        <aside className="w-14 bg-dark-800 border-r border-dark-600 flex flex-col items-center py-3 gap-1 shrink-0">
          {tools.map(t => (
            <button
              key={t.id}
              onClick={() => { t.action(); if (t.id !== 'draw') setActiveTool(t.id); }}
              title={t.label}
              className={`tool-btn ${activeTool === t.id ? 'active' : ''}`}
            >
              {t.icon}
              <span className="text-[9px] leading-none">{t.label}</span>
            </button>
          ))}

          <div className="w-8 h-px bg-dark-600 my-2" />

          <button onClick={deleteSelected} title="Delete" className="tool-btn text-red-400 hover:text-red-300 hover:bg-red-900/20">
            <Trash2 size={16} />
          </button>
          <button onClick={duplicateSelected} title="Duplicate" className="tool-btn">
            <Copy size={16} />
          </button>
          <button onClick={bringForward} title="Bring Forward" className="tool-btn">
            <ChevronUp size={16} />
          </button>
          <button onClick={sendBackward} title="Send Backward" className="tool-btn">
            <ChevronDown size={16} />
          </button>
        </aside>

        {/* Canvas Area */}
        <main id="canvas-wrapper" className="flex-1 overflow-auto bg-dark-950 flex items-center justify-center"
          style={{ backgroundImage: 'radial-gradient(#222 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
          <div className="shadow-2xl shadow-black">
            <canvas ref={canvasRef} />
          </div>
        </main>

        {/* Right Panel */}
        <aside className="w-64 bg-dark-800 border-l border-dark-600 flex flex-col shrink-0 overflow-hidden">
          {/* Panel Tabs */}
          <div className="flex border-b border-dark-600">
            {['properties', 'layers'].map(p => (
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
                        className={`w-8 h-8 rounded-lg border-2 transition-all ${fillColor === c ? 'border-accent scale-110' : 'border-transparent'}`}
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
                        className={`w-8 h-8 rounded-lg border-2 transition-all ${strokeColor === c ? 'border-accent scale-110' : 'border-transparent'}`}
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
                        onChange={e => { const v = +e.target.value; setStrokeWidth(v); updateObjProp('strokeWidth', v); }}
                        className="w-full accent-indigo-500" />
                    </div>
                  </div>
                </div>

                {/* Typography (if text selected) */}
                {activeObj?.type === 'i-text' && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Typography</p>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Font Size: {fontSize}px</label>
                        <input type="range" min="8" max="120" value={fontSize}
                          onChange={e => { setFontSize(+e.target.value); updateObjProp('fontSize', +e.target.value); }}
                          className="w-full accent-indigo-500" />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => { setFontWeight(fontWeight === 'bold' ? 'normal' : 'bold'); updateObjProp('fontWeight', fontWeight === 'bold' ? 'normal' : 'bold'); }}
                          className={`flex-1 py-1.5 rounded text-xs font-bold transition-colors ${fontWeight === 'bold' ? 'bg-accent text-white' : 'bg-dark-600 text-gray-300'}`}>B</button>
                        <button onClick={() => updateObjProp('fontStyle', activeObj.fontStyle === 'italic' ? 'normal' : 'italic')}
                          className="flex-1 py-1.5 rounded text-xs italic transition-colors bg-dark-600 text-gray-300 hover:bg-dark-500">I</button>
                        <button onClick={() => updateObjProp('underline', !activeObj.underline)}
                          className="flex-1 py-1.5 rounded text-xs underline transition-colors bg-dark-600 text-gray-300 hover:bg-dark-500">U</button>
                      </div>
                      <div className="flex gap-1">
                        {['left','center','right'].map(a => (
                          <button key={a} onClick={() => updateObjProp('textAlign', a)}
                            className={`flex-1 py-1.5 rounded text-xs transition-colors ${activeObj.textAlign === a ? 'bg-accent text-white' : 'bg-dark-600 text-gray-300'}`}>
                            {a === 'left' ? <AlignLeft size={12} className="mx-auto" /> : a === 'center' ? <AlignCenter size={12} className="mx-auto" /> : <AlignRight size={12} className="mx-auto" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Opacity */}
                {activeObj && (
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Opacity: {Math.round((activeObj.opacity ?? 1) * 100)}%</label>
                    <input type="range" min="0" max="100" value={Math.round((activeObj.opacity ?? 1) * 100)}
                      onChange={e => updateObjProp('opacity', +e.target.value / 100)}
                      className="w-full accent-indigo-500" />
                  </div>
                )}

                {/* Canvas BG */}
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Canvas Background</p>
                  <input type="color" defaultValue="#1a1a1a"
                    onChange={e => { fabricRef.current.backgroundColor = e.target.value; fabricRef.current.renderAll(); }}
                    className="w-full h-9 rounded-lg cursor-pointer bg-dark-700 border border-dark-500 p-1" />
                </div>
              </>
            ) : (
              /* Layers Panel */
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  Layers ({layers.length})
                </p>
                {layers.length === 0 ? (
                  <p className="text-xs text-gray-600 text-center py-8">No objects yet</p>
                ) : (
                  <div className="space-y-1">
                    {[...layers].reverse().map((obj, i) => (
                      <div key={i}
                        onClick={() => { fabricRef.current.setActiveObject(obj); fabricRef.current.renderAll(); setActiveObj(obj); }}
                        className="flex items-center gap-2 p-2 rounded-lg hover:bg-dark-600 cursor-pointer transition-colors text-xs">
                        <span className="text-gray-500">
                          {obj.type === 'i-text' ? <Type size={12} /> : obj.type === 'rect' ? <Square size={12} /> : obj.type === 'circle' ? <Circle size={12} /> : <Layers size={12} />}
                        </span>
                        <span className="flex-1 truncate text-gray-300">
                          {obj.type === 'i-text' ? (obj.text?.substring(0, 20) || 'Text') : `${obj.type} ${layers.length - i}`}
                        </span>
                        <div className="w-4 h-4 rounded border border-dark-400" style={{ backgroundColor: obj.fill || '#fff' }} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Editor;