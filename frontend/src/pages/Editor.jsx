import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as fabric from 'fabric';
import api from '../api/axios';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Save, Download, Trash2, Type, Square, Circle,
  Minus, Image as ImageIcon, MousePointer, Triangle,
  AlignLeft, AlignCenter, AlignRight,
  ZoomIn, ZoomOut, Layers, Copy,
  ChevronUp, ChevronDown, Pencil, Star,
  MessageSquarePlus, X, Lock, Unlock, Eye, EyeOff,
  FlipHorizontal, FlipVertical, RotateCcw, Grid,
  MoveUp, MoveDown, ArrowUpToLine, ArrowDownToLine,
  Share2, Check
} from 'lucide-react';
import { HocuspocusProvider } from "@hocuspocus/provider";
import * as Y from "yjs";
import { usePresence } from '../hooks/usePresence';
import PresenceNav from '../components/PresenceNav';
import VoiceChannel from '../components/VoiceChannel';
import { useNotify, NotificationBell } from '../components/NotificationSystem';
import { useAIWorkspace } from '../hooks/useAIWorkspace';
import AIPromptMenu, { AISelectionBubble } from '../components/AIPromptMenu';

const envWsUrl = import.meta.env.VITE_WS_URL || '';
const WS_URL = envWsUrl.includes('localhost')
  ? envWsUrl.replace('localhost', window.location.hostname)
  : (envWsUrl || `ws://${window.location.hostname}:1234`);

const COLORS = ['#ffffff','#000000','#ef4444','#f97316','#eab308','#22c55e','#3b82f6','#8b5cf6','#ec4899','#14b8a6','#f1f5f9','#94a3b8','#64748b','#334155','#0f172a'];
const FONTS  = ['Inter','Arial','Georgia','Times New Roman','Courier New','Verdana','Trebuchet MS','Comic Sans MS','Impact','Palatino'];
const GRADIENTS = [
  { name:'Purple', stops:[{color:'#6366f1',offset:0},{color:'#8b5cf6',offset:1}] },
  { name:'Sunset', stops:[{color:'#f97316',offset:0},{color:'#ec4899',offset:1}] },
  { name:'Ocean',  stops:[{color:'#0ea5e9',offset:0},{color:'#22c55e',offset:1}] },
  { name:'Fire',   stops:[{color:'#ef4444',offset:0},{color:'#f97316',offset:1}] },
  { name:'Gold',   stops:[{color:'#eab308',offset:0},{color:'#f97316',offset:1}] },
  { name:'Mint',   stops:[{color:'#22c55e',offset:0},{color:'#14b8a6',offset:1}] },
];
const EMOJIS = ['🎨','✨','🎯','🔥','💫','⭐','🎭','🌟','💎','🚀','🦋','🌈','🎪','🎠','🎡','🍀','🌸','🦄','💥','🎆'];

/* ─── Emoji Splasher ─────────────────────────────────────────────────────── */
let eid = 0;
function EmojiSplasher() {
  const [bursts,setBursts] = useState([]);
  useEffect(()=>{
    const h=(e)=>{
      if(e.target.closest('header')||e.target.closest('aside')) return;
      const id=++eid; const cnt=8+Math.floor(Math.random()*7);
      const particles=Array.from({length:cnt},(_,i)=>({
        id:i,emoji:EMOJIS[Math.floor(Math.random()*EMOJIS.length)],
        angle:(360/cnt)*i+(Math.random()-0.5)*25,
        dist:70+Math.random()*110,size:16+Math.random()*18,
        dur:550+Math.random()*500,delay:Math.random()*70,
      }));
      setBursts(p=>[...p,{id,x:e.clientX,y:e.clientY,particles}]);
      setTimeout(()=>setBursts(p=>p.filter(b=>b.id!==id)),1600);
    };
    document.addEventListener('dblclick',h);
    return ()=>document.removeEventListener('dblclick',h);
  },[]);
  return (
    <div style={{position:'fixed',inset:0,pointerEvents:'none',zIndex:99999}}>
      {bursts.map(b=>(
        <div key={b.id} style={{position:'absolute',left:b.x,top:b.y}}>
          {b.particles.map(p=>{
            const r=(p.angle*Math.PI)/180;
            return (
              <div key={p.id} style={{position:'absolute',fontSize:p.size,lineHeight:1,transform:'translate(-50%,-50%)',animation:`ePop ${p.dur}ms ${p.delay}ms cubic-bezier(.2,.8,.4,1) forwards`,'--tx':`${Math.cos(r)*p.dist}px`,'--ty':`${Math.sin(r)*p.dist}px`,userSelect:'none'}}>
                {p.emoji}
              </div>
            );
          })}
        </div>
      ))}
      <style>{`@keyframes ePop{0%{transform:translate(-50%,-50%) scale(0) rotate(0deg);opacity:1}40%{transform:translate(calc(-50% + var(--tx)*.6),calc(-50% + var(--ty)*.6)) scale(1.3) rotate(180deg);opacity:1}100%{transform:translate(calc(-50% + var(--tx)),calc(-50% + var(--ty))) scale(0.3) rotate(360deg);opacity:0}}`}</style>
    </div>
  );
}

/* ─── Export Dropdown ──────────────────────────────────────────────────────── */
const ExportDropdown=({onExport})=>{
  const [open,setOpen]=useState(false);const ref=useRef(null);
  useEffect(()=>{const h=(e)=>{if(ref.current&&!ref.current.contains(e.target))setOpen(false)};document.addEventListener('mousedown',h);return()=>document.removeEventListener('mousedown',h)},[]);
  const opts=[{id:'png',label:'Export as PNG',sub:'High-quality image',icon:'🖼️'},{id:'pdf',label:'Export as PDF',sub:'Portable document',icon:'📄'},{id:'doc',label:'Export as DOC',sub:'Word document',icon:'📝'},{id:'zip',label:'Download ZIP',sub:'Canvas + PNG bundle',icon:'📦'}];
  return(
    <div ref={ref} style={{position:'relative'}}>
      <button onClick={()=>setOpen(o=>!o)} className="btn-primary text-sm px-3 py-1.5 h-8" style={{display:'flex',alignItems:'center',gap:6}}>
        <Download size={14}/> Export
        <svg width="10" height="10" viewBox="0 0 10 10" style={{marginLeft:2,opacity:.7,transform:open?'rotate(180deg)':'none',transition:'transform .15s'}}><path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>
      {open&&(<div style={{position:'absolute',top:'calc(100% + 6px)',right:0,zIndex:9999,background:'#141414',border:'1px solid #2a2a2a',borderRadius:12,padding:6,minWidth:220,boxShadow:'0 12px 40px rgba(0,0,0,.6)',animation:'dIn .15s ease'}}>
        {opts.map(o=><button key={o.id} onClick={()=>{onExport(o.id);setOpen(false)}} style={{display:'flex',alignItems:'center',gap:10,width:'100%',padding:'10px 12px',background:'none',border:'none',borderRadius:8,color:'#e5e7eb',cursor:'pointer',textAlign:'left',transition:'background .12s'}} onMouseEnter={e=>e.currentTarget.style.background='#1e1e1e'} onMouseLeave={e=>e.currentTarget.style.background='none'}><span style={{fontSize:18,width:24,textAlign:'center'}}>{o.icon}</span><div><p style={{fontSize:13,fontWeight:500,color:'#fff',lineHeight:1.2}}>{o.label}</p><p style={{fontSize:11,color:'#555',marginTop:2}}>{o.sub}</p></div></button>)}
      </div>)}
      <style>{`@keyframes dIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
};

/* ─── Comment Pin ──────────────────────────────────────────────────────────── */
const CommentPin=({comment,onClick})=>(
  <div onClick={()=>onClick(comment)} title={comment.text} style={{position:'absolute',left:comment.x,top:comment.y,width:26,height:26,borderRadius:'50% 50% 50% 0',background:'#6366f1',border:'2px solid #fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',transform:'rotate(-45deg)',zIndex:100,boxShadow:'0 2px 8px rgba(0,0,0,.5)',transition:'transform .15s',fontSize:10}}
    onMouseEnter={e=>e.currentTarget.style.transform='rotate(-45deg) scale(1.25)'}
    onMouseLeave={e=>e.currentTarget.style.transform='rotate(-45deg) scale(1)'}
  ><span style={{transform:'rotate(45deg)'}}>💬</span></div>
);

/* ─── Editor ───────────────────────────────────────────────────────────────── */
const Editor=()=>{
  const {id}=useParams(); const navigate=useNavigate();
  const canvasRef=useRef(null); const fabricRef=useRef(null);
  const wrapperRef=useRef(null); const designRef=useRef(null);
  const autoSaveTimer=useRef(null); const commentInputRef=useRef(null);

  const [design,setDesign]=useState(null);
  const [activeTool,setActiveTool]=useState('select');
  const [activeObj,setActiveObj]=useState(null);
  const [saving,setSaving]=useState(false);
  const [zoom,setZoom]=useState(100);
  const [fillColor,setFillColor]=useState('#6366f1');
  const [strokeColor,setStrokeColor]=useState('#ffffff');
  const [strokeWidth,setStrokeWidth]=useState(2);
  const [fontSize,setFontSize]=useState(24);
  const [fontWeight,setFontWeight]=useState('normal');
  const [title,setTitle]=useState('Untitled Design');
  const [sidePanel,setSidePanel]=useState('properties');
  const [fontFamily,setFontFamily]=useState('Inter');
  const [shadow,setShadow]=useState(false);
  const [cornerRadius,setCornerRadius]=useState(8);
  const [showGrid,setShowGrid]=useState(false);
  const [history,setHistory]=useState([]);
  const [historyIndex,setHistoryIndex]=useState(-1);
  const [comments,setComments]=useState([]);
  const [commentMode,setCommentMode]=useState(false);
  const [activeComment,setActiveComment]=useState(null);
  const [newCommentPos,setNewCommentPos]=useState(null);
  const [newCommentText,setNewCommentText]=useState('');
  const [layerVis,setLayerVis]=useState({});
  const [layerLocked,setLayerLocked]=useState({});
  const [layerTick,setLayerTick]=useState(0); // force re-render layers
  const [copied, setCopied] = useState(false);
  const { notifyOpen } = useNotify();

  /* ── Collaboration State ── */
  const [status, setStatus] = useState('connecting');
  const ydocRef = useRef(new Y.Doc());
  const isRemoteUpdate = useRef(false);
  const { presence, notifications, provider, localUser } = usePresence(id ? `canvas-${id}` : null);

  const { aiMenuPos, contextText, closeMenu, selectionBubble, openFromBubble, closeBubble } = useAIWorkspace({
    getEditorSelection: () => {
      if (!fabricRef.current) return "";
      const obj = fabricRef.current.getActiveObject();
      if (obj && obj.type === 'i-text') {
        const selectedStr = obj.getSelectedText();
        return selectedStr ? selectedStr : obj.text;
      }
      return "";
    }
  });

  /* ── Yjs Sync ── */
  useEffect(() => {
    const provider = new HocuspocusProvider({
      url: WS_URL,
      name: `canvas-${id}`,
      document: ydocRef.current,
      onStatus: ({ status }) => setStatus(status),
    });
    providerRef.current = provider;

    const ymap = ydocRef.current.getMap('canvas');
    ymap.observe((event) => {
      if (event.keysChanged.has('data')) {
        const newData = ymap.get('data');
        if (newData && fabricRef.current) {
          isRemoteUpdate.current = true;
          try {
            fabricRef.current.loadFromJSON(newData, () => {
              fabricRef.current.renderAll();
              isRemoteUpdate.current = false;
              // update history silently without broadcasting back
              const s = JSON.stringify(fabricRef.current.toJSON());
              setHistory(p => { const t = p.slice(0, historyIndex + 1); return [...t, s].slice(-50) });
              setHistoryIndex(p => Math.min(p + 1, 49));
            });
          } catch(e) {
            isRemoteUpdate.current = false;
          }
        }
      }
    });

    return () => provider.destroy();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const syncState = useCallback(() => {
    if (isRemoteUpdate.current || !fabricRef.current) return;
    const ymap = ydocRef.current.getMap('canvas');
    ymap.set('data', JSON.stringify(fabricRef.current.toJSON()));
  }, []);

  /* page zoom block */
  useEffect(()=>{
    const b=(e)=>{if(e.ctrlKey||e.metaKey)e.preventDefault()};
    document.addEventListener('wheel',b,{passive:false});
    return()=>document.removeEventListener('wheel',b);
  },[]);

  /* canvas wheel zoom */
  useEffect(()=>{
    const el=wrapperRef.current; if(!el) return;
    const h=(e)=>{e.preventDefault();if(!fabricRef.current||!designRef.current)return;applyZoomDelta(e.deltaY<0?10:-10)};
    el.addEventListener('wheel',h,{passive:false});
    return()=>el.removeEventListener('wheel',h);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  /* keyboard shortcuts */
  useEffect(()=>{
    const h=(e)=>{
      if(e.target.tagName==='INPUT'||e.target.contentEditable==='true') return;
      if((e.ctrlKey||e.metaKey)&&e.key==='z'){e.preventDefault();undo();}
      if((e.ctrlKey||e.metaKey)&&e.key==='y'){e.preventDefault();redo();}
      if((e.ctrlKey||e.metaKey)&&e.key==='d'){e.preventDefault();duplicateSelected();}
      if((e.key==='Delete'||e.key==='Backspace')&&fabricRef.current?.getActiveObject()){e.preventDefault();deleteSelected();}
      if(e.key==='Escape'){setCommentMode(false);setNewCommentPos(null);setActiveTool('select');}
    };
    document.addEventListener('keydown',h);
    return()=>document.removeEventListener('keydown',h);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[history,historyIndex]);

  useEffect(()=>{
    loadDesign();
    return()=>{if(fabricRef.current)fabricRef.current.dispose();clearTimeout(autoSaveTimer.current)};
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[id]);

  const pushHistory=useCallback(()=>{
    if(!fabricRef.current) return;
    const s=JSON.stringify(fabricRef.current.toJSON());
    setHistory(p=>{const t=p.slice(0,historyIndex+1);return[...t,s].slice(-50)});
    setHistoryIndex(p=>Math.min(p+1,49));
    syncState();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[historyIndex]);

  const undo=()=>{
    if(historyIndex<=0||!fabricRef.current) return;
    fabricRef.current.loadFromJSON(history[historyIndex-1],()=>{fabricRef.current.renderAll();setHistoryIndex(i=>i-1);setActiveObj(null);setLayerTick(t=>t+1)});
  };
  const redo=()=>{
    if(historyIndex>=history.length-1||!fabricRef.current) return;
    fabricRef.current.loadFromJSON(history[historyIndex+1],()=>{fabricRef.current.renderAll();setHistoryIndex(i=>i+1);setActiveObj(null);setLayerTick(t=>t+1)});
  };

  const loadDesign=async()=>{
    try{
      const{data}=await api.get(`/designs/${id}`);
      setDesign(data.design); designRef.current=data.design;
      setTitle(data.design.title); initCanvas(data.design);
      notifyOpen('editor', data.design.title);
      try{setComments(JSON.parse(localStorage.getItem(`synapse_comments_${id}`)||'[]'))}catch(_){}
    }catch{toast.error('Failed to load design');navigate('/dashboard');}
  };

  const initCanvas=(d)=>{
    if(!canvasRef.current) return;
    if(fabricRef.current) fabricRef.current.dispose();
    const bw=d.width||1280; const bh=d.height||720;
    const canvas=new fabric.Canvas(canvasRef.current,{width:bw,height:bh,backgroundColor:'#1a1a1a',selection:true,preserveObjectStacking:true});
    fabricRef.current=canvas;
    if(d.canvasData&&d.canvasData!=='{}'){
      try{canvas.loadFromJSON(d.canvasData,()=>{canvas.renderAll();pushHistory();setLayerTick(t=>t+1);})}catch(_){}
    } else {pushHistory();}
    canvas.on('selection:created',e=>setActiveObj(e.selected?.[0]||null));
    canvas.on('selection:updated',e=>setActiveObj(e.selected?.[0]||null));
    canvas.on('selection:cleared',()=>setActiveObj(null));
    canvas.on('object:modified',()=>{scheduleAutoSave();pushHistory();setLayerTick(t=>t+1)});
    canvas.on('object:added',()=>{scheduleAutoSave();pushHistory();setLayerTick(t=>t+1)});
    canvas.on('object:removed',()=>{scheduleAutoSave();pushHistory();setLayerTick(t=>t+1)});
    fitCanvas(canvas,bw,bh);
  };

  const applyCanvasSize=(canvas,w,h)=>{
    if(!canvas||!Number.isFinite(w)||!Number.isFinite(h)) return;
    if(typeof canvas.setDimensions==='function'){try{canvas.setDimensions({width:w,height:h});return}catch(_){}}
    canvas.width=w;canvas.height=h;
    [canvas.lowerCanvasEl,canvas.upperCanvasEl].forEach(el=>{if(!el) return;el.width=w;el.height=h;el.style.width=`${w}px`;el.style.height=`${h}px`});
    if(typeof canvas.calcOffset==='function') canvas.calcOffset();
  };

  const fitCanvas=(canvas,w,h)=>{
    const wrapper=wrapperRef.current; if(!wrapper) return;
    const scale=Math.min((wrapper.clientWidth-80)/w,(wrapper.clientHeight-80)/h,1);
    setZoom(Math.round(scale*100));canvas.setZoom(scale);applyCanvasSize(canvas,w*scale,h*scale);canvas.renderAll();
  };

  const applyZoomDelta=(delta)=>{
    const canvas=fabricRef.current;const d=designRef.current;if(!canvas||!d) return;
    setZoom(prev=>{const next=Math.min(200,Math.max(25,prev+delta));const s=next/100;canvas.setZoom(s);applyCanvasSize(canvas,d.width*s,d.height*s);canvas.renderAll();return next});
  };

  const scheduleAutoSave=()=>{clearTimeout(autoSaveTimer.current);autoSaveTimer.current=setTimeout(()=>saveDesign(true),3000)};

  const saveDesign=async(auto=false)=>{
    if(!fabricRef.current||!id) return; setSaving(true);
    try{
      const canvas=fabricRef.current;const d=designRef.current;
      const cz=canvas.getZoom();canvas.setZoom(1);applyCanvasSize(canvas,d?.width||1280,d?.height||720);
      const thumbnail=canvas.toDataURL({format:'jpeg',quality:0.5,multiplier:0.5});
      const canvasData=JSON.stringify(canvas.toJSON());
      canvas.setZoom(cz);applyCanvasSize(canvas,(d?.width||1280)*cz,(d?.height||720)*cz);canvas.renderAll();
      await api.put(`/designs/${id}`,{title,canvasData,thumbnail,width:d?.width,height:d?.height});
      if(!auto) toast.success('Design saved! ✓');
    }catch(err){console.error(err);if(!auto) toast.error('Save failed');}
    finally{setSaving(false);}
  };

  const triggerDownload=(href,name)=>{const a=document.createElement('a');a.href=href;a.download=name;a.click()};

  const handleExport=(fmt)=>{
    if(!fabricRef.current) return;
    const canvas=fabricRef.current;const d=designRef.current;
    if(fmt==='png'){
      const prev=canvas.getZoom();canvas.setZoom(1);applyCanvasSize(canvas,d?.width||1280,d?.height||720);
      const url=canvas.toDataURL({format:'png',multiplier:2});
      canvas.setZoom(prev);applyCanvasSize(canvas,(d?.width||1280)*prev,(d?.height||720)*prev);canvas.renderAll();
      triggerDownload(url,`${title}.png`);toast.success('Exported as PNG!');return;
    }
    if(fmt==='pdf'){exportPDF();return;}if(fmt==='doc'){exportDOC();return;}if(fmt==='zip'){exportZIP();}
  };

  const exportPDF=()=>{
    const c=fabricRef.current;const d=designRef.current;const prev=c.getZoom();
    c.setZoom(1);applyCanvasSize(c,d?.width||1280,d?.height||720);
    const img=c.toDataURL({format:'jpeg',quality:0.92,multiplier:2});const w=d?.width||1280;const h=d?.height||720;
    c.setZoom(prev);applyCanvasSize(c,w*prev,h*prev);c.renderAll();
    const go=()=>{const{jsPDF}=window.jspdf;const pdf=new jsPDF({orientation:w>=h?'l':'p',unit:'px',format:[w,h]});pdf.addImage(img,'JPEG',0,0,w,h);pdf.save(`${title}.pdf`);toast.success('Exported as PDF!')};
    if(window.jspdf){go();return;}const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';s.onload=go;document.head.appendChild(s);
  };

  const exportDOC=()=>{
    const c=fabricRef.current;const d=designRef.current;const prev=c.getZoom();
    c.setZoom(1);applyCanvasSize(c,d?.width||1280,d?.height||720);const img=c.toDataURL({format:'png',multiplier:1});
    c.setZoom(prev);applyCanvasSize(c,(d?.width||1280)*prev,(d?.height||720)*prev);c.renderAll();
    const blob=new Blob([`<!DOCTYPE html><html><body><h1>${title}</h1><img src="${img}"/></body></html>`],{type:'application/msword'});
    const url=URL.createObjectURL(blob);triggerDownload(url,`${title}.doc`);URL.revokeObjectURL(url);toast.success('Exported as DOC!');
  };

  const exportZIP=async()=>{
    const loadLib=()=>new Promise((res,rej)=>{if(window.JSZip){res(window.JSZip);return;}const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';s.onload=()=>res(window.JSZip);s.onerror=rej;document.head.appendChild(s)});
    try{const JSZip=await loadLib();const c=fabricRef.current;const d=designRef.current;const prev=c.getZoom();
      c.setZoom(1);applyCanvasSize(c,d?.width||1280,d?.height||720);
      const png=c.toDataURL({format:'png',multiplier:2}).split(',')[1];const json=JSON.stringify(c.toJSON(),null,2);
      c.setZoom(prev);applyCanvasSize(c,(d?.width||1280)*prev,(d?.height||720)*prev);c.renderAll();
      const zip=new JSZip();const f=zip.folder(title.replace(/[^a-z0-9]/gi,'_'));
      f.file(`${title}.png`,png,{base64:true});f.file('canvas.json',json);f.file('README.md',`# ${title}\nSynapse Design\n${new Date().toLocaleDateString()}`);
      const blob=await zip.generateAsync({type:'blob'});const url=URL.createObjectURL(blob);triggerDownload(url,`${title}.zip`);URL.revokeObjectURL(url);toast.success('Downloaded as ZIP!')
    }catch{toast.error('ZIP export failed');}
  };

  /* ── All original + new tools ── */
  const addText=()=>{if(!fabricRef.current) return;fabricRef.current.add(new fabric.IText('Double-click to edit',{left:200,top:200,fill:'#ffffff',fontSize,fontWeight,fontFamily:'Inter, sans-serif',editable:true}));setActiveTool('select')};
  const addRect=()=>{if(!fabricRef.current) return;fabricRef.current.add(new fabric.Rect({left:150,top:150,width:200,height:120,fill:fillColor,stroke:strokeColor,strokeWidth,rx:cornerRadius,ry:cornerRadius}));setActiveTool('select')};
  const addCircle=()=>{if(!fabricRef.current) return;fabricRef.current.add(new fabric.Circle({left:200,top:150,radius:70,fill:fillColor,stroke:strokeColor,strokeWidth}));setActiveTool('select')};
  const addTriangle=()=>{if(!fabricRef.current) return;fabricRef.current.add(new fabric.Triangle({left:200,top:150,width:150,height:130,fill:fillColor,stroke:strokeColor,strokeWidth}));setActiveTool('select')};
  const addLine=()=>{if(!fabricRef.current) return;fabricRef.current.add(new fabric.Line([100,200,400,200],{stroke:strokeColor,strokeWidth:strokeWidth||3}));setActiveTool('select')};
  const addImage=()=>{const url=prompt('Enter image URL:');if(!url) return;fabric.Image.fromURL(url,img=>{img.scaleToWidth(200);img.set({left:100,top:100});fabricRef.current.add(img)},{crossOrigin:'anonymous'})};
  const enableDrawing=()=>{if(!fabricRef.current) return;const on=!fabricRef.current.isDrawingMode;fabricRef.current.isDrawingMode=on;fabricRef.current.freeDrawingBrush.color=fillColor;fabricRef.current.freeDrawingBrush.width=strokeWidth||3;setActiveTool(on?'draw':'select')};
  const deleteSelected=()=>{const c=fabricRef.current;if(!c) return;c.getActiveObjects().forEach(o=>c.remove(o));c.discardActiveObject();c.renderAll()};
  const duplicateSelected=()=>{const c=fabricRef.current;const o=c?.getActiveObject();if(!o) return;o.clone(cl=>{cl.set({left:o.left+20,top:o.top+20});c.add(cl);c.setActiveObject(cl)})};
  const bringForward=()=>{fabricRef.current?.getActiveObject()?.bringForward();fabricRef.current?.renderAll()};
  const sendBackward=()=>{fabricRef.current?.getActiveObject()?.sendBackward();fabricRef.current?.renderAll()};
  const bringToFront=()=>{fabricRef.current?.getActiveObject()?.bringToFront();fabricRef.current?.renderAll()};
  const sendToBack=()=>{fabricRef.current?.getActiveObject()?.sendToBack();fabricRef.current?.renderAll()};
  const updateObjProp=(prop,value)=>{const obj=fabricRef.current?.getActiveObject();if(!obj) return;obj.set(prop,value);fabricRef.current.renderAll();setActiveObj({...obj})};

  /* NEW tools */
  const addStar=()=>{
    if(!fabricRef.current) return;
    const pts=[];for(let i=0;i<10;i++){const r=i%2===0?80:34;const a=(i*Math.PI)/5-Math.PI/2;pts.push({x:120+r*Math.cos(a),y:120+r*Math.sin(a)});}
    fabricRef.current.add(new fabric.Polygon(pts,{fill:fillColor,stroke:strokeColor,strokeWidth}));setActiveTool('select');
  };
  const addArrow=()=>{
    if(!fabricRef.current) return;
    fabricRef.current.add(new fabric.Path('M 0 0 L 160 0 L 160 -16 L 200 16 L 160 48 L 160 32 L 0 32 Z',{left:100,top:200,fill:fillColor,stroke:strokeColor,strokeWidth}));
    setActiveTool('select');
  };
  const addHeart=()=>{
    if(!fabricRef.current) return;
    fabricRef.current.add(new fabric.Path('M 100 30 A 30 30 0 0 1 160 30 A 30 30 0 0 1 220 30 Q 220 60 160 100 Q 100 60 100 30 Z',{fill:fillColor,stroke:strokeColor,strokeWidth,left:100,top:150}));
    setActiveTool('select');
  };

  const applyGradient=(stops)=>{
    const obj=fabricRef.current?.getActiveObject();if(!obj){toast('Select an object first');return;}
    obj.set('fill',new fabric.Gradient({type:'linear',gradientUnits:'percentage',coords:{x1:0,y1:0,x2:1,y2:1},colorStops:stops.map(s=>({offset:s.offset,color:s.color}))}));
    fabricRef.current.renderAll();
  };
  const toggleShadow=()=>{
    const obj=fabricRef.current?.getActiveObject();if(!obj) return;
    const next=!shadow;setShadow(next);
    if(next){obj.set('shadow',new fabric.Shadow({color:'rgba(0,0,0,0.5)',blur:16,offsetX:4,offsetY:4}));}else{obj.set('shadow',null);}
    fabricRef.current.renderAll();
  };
  const flipH=()=>{const o=fabricRef.current?.getActiveObject();if(!o) return;o.set('flipX',!o.flipX);fabricRef.current.renderAll()};
  const flipV=()=>{const o=fabricRef.current?.getActiveObject();if(!o) return;o.set('flipY',!o.flipY);fabricRef.current.renderAll()};
  const alignToCanvas=(dir)=>{
    const canvas=fabricRef.current;const obj=canvas?.getActiveObject();const d=designRef.current;if(!obj||!d) return;
    if(dir==='left') obj.set('left',0);
    if(dir==='center') obj.set('left',(d.width-obj.getScaledWidth())/2);
    if(dir==='right') obj.set('left',d.width-obj.getScaledWidth());
    if(dir==='top') obj.set('top',0);
    if(dir==='middle') obj.set('top',(d.height-obj.getScaledHeight())/2);
    if(dir==='bottom') obj.set('top',d.height-obj.getScaledHeight());
    canvas.renderAll();
  };

  /* Layer controls */
  const toggleLayerVis=(idx,e)=>{
    e.stopPropagation();const c=fabricRef.current;if(!c) return;
    const objs=c.getObjects();const obj=objs[objs.length-1-idx];if(!obj) return;
    const next=!layerVis[idx];setLayerVis(p=>({...p,[idx]:next}));obj.set('visible',!next);c.renderAll();
  };
  const toggleLayerLock=(idx,e)=>{
    e.stopPropagation();const c=fabricRef.current;if(!c) return;
    const objs=c.getObjects();const obj=objs[objs.length-1-idx];if(!obj) return;
    const next=!layerLocked[idx];setLayerLocked(p=>({...p,[idx]:next}));obj.set({selectable:!next,evented:!next});c.renderAll();
  };
  const moveLayerUp=(idx,e)=>{
    e.stopPropagation();const c=fabricRef.current;if(!c) return;
    const objs=c.getObjects();const obj=objs[objs.length-1-idx];if(!obj) return;
    obj.bringForward();c.renderAll();setLayerTick(t=>t+1);
  };
  const moveLayerDown=(idx,e)=>{
    e.stopPropagation();const c=fabricRef.current;if(!c) return;
    const objs=c.getObjects();const obj=objs[objs.length-1-idx];if(!obj) return;
    obj.sendBackward();c.renderAll();setLayerTick(t=>t+1);
  };

  /* Comments */
  const handleCanvasClick=(e)=>{
    if(!commentMode) return;
    const rect=e.currentTarget.getBoundingClientRect();
    setNewCommentPos({x:e.clientX-rect.left,y:e.clientY-rect.top});
    setNewCommentText('');
    setTimeout(()=>commentInputRef.current?.focus(),80);
  };
  const addComment=()=>{
    if(!newCommentText.trim()||!newCommentPos) return;
    const c={id:Date.now(),x:newCommentPos.x,y:newCommentPos.y,text:newCommentText.trim(),author:'You',time:new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}),resolved:false};
    const updated=[...comments,c];setComments(updated);
    localStorage.setItem(`synapse_comments_${id}`,JSON.stringify(updated));
    setNewCommentPos(null);setNewCommentText('');setCommentMode(false);toast.success('Comment added');
  };
  const resolveComment=(cid)=>{const u=comments.map(c=>c.id===cid?{...c,resolved:true}:c);setComments(u);localStorage.setItem(`synapse_comments_${id}`,JSON.stringify(u));setActiveComment(null)};
  const deleteComment=(cid)=>{const u=comments.filter(c=>c.id!==cid);setComments(u);localStorage.setItem(`synapse_comments_${id}`,JSON.stringify(u));setActiveComment(null)};

  const tools=[
    {id:'select',  icon:<MousePointer size={16}/>,  label:'Select',   action:()=>{fabricRef.current&&(fabricRef.current.isDrawingMode=false);setActiveTool('select')}},
    {id:'text',    icon:<Type size={16}/>,           label:'Text',     action:addText},
    {id:'rect',    icon:<Square size={16}/>,         label:'Rect',     action:addRect},
    {id:'circle',  icon:<Circle size={16}/>,         label:'Circle',   action:addCircle},
    {id:'triangle',icon:<Triangle size={16}/>,       label:'Tri',      action:addTriangle},
    {id:'star',    icon:<Star size={16}/>,           label:'Star',     action:addStar},
    {id:'arrow',   icon:<span style={{fontSize:12,fontWeight:800,lineHeight:1}}>→</span>, label:'Arrow', action:addArrow},
    {id:'heart',   icon:<span style={{fontSize:12}}>♥</span>, label:'Heart', action:addHeart},
    {id:'line',    icon:<Minus size={16}/>,          label:'Line',     action:addLine},
    {id:'draw',    icon:<Pencil size={16}/>,         label:'Draw',     action:enableDrawing},
    {id:'image',   icon:<ImageIcon size={16}/>,      label:'Image',    action:addImage},
  ];

  const layers=fabricRef.current?.getObjects()||[];
  const openComments=comments.filter(c=>!c.resolved);

  return(
    <div className="h-screen bg-dark-950 flex flex-col overflow-hidden">
      <EmojiSplasher/>

      {/* Top bar */}
      <header className="h-12 bg-dark-800 border-b border-dark-600 flex items-center px-3 gap-2 shrink-0 z-50">
        <button onClick={()=>navigate('/dashboard')} className="tool-btn"><ArrowLeft size={16}/></button>
        <div className="w-px h-6 bg-dark-600"/>
        <input value={title} onChange={e=>setTitle(e.target.value)} onBlur={()=>saveDesign(true)}
          className="bg-transparent text-sm font-medium text-white focus:outline-none border-b border-transparent focus:border-accent px-1 py-0.5 max-w-40"/>
        <div className="flex-1"/>
        <button onClick={undo} disabled={historyIndex<=0} className="tool-btn w-8 h-8" title="Undo Ctrl+Z"><RotateCcw size={13}/></button>
        <button onClick={redo} disabled={historyIndex>=history.length-1} className="tool-btn w-8 h-8" title="Redo Ctrl+Y" style={{transform:'scaleX(-1)'}}><RotateCcw size={13}/></button>
        <button onClick={()=>setShowGrid(g=>!g)} className={`tool-btn w-8 h-8 ${showGrid?'active':''}`} title="Grid"><Grid size={13}/></button>
        <div style={{position:'relative'}}>
          <button onClick={()=>{setCommentMode(m=>!m);if(!commentMode) setSidePanel('properties')}} className={`tool-btn w-8 h-8 ${commentMode?'active':''}`} title="Add comment" style={{color:commentMode?'#6366f1':undefined}}><MessageSquarePlus size={14}/></button>
          {openComments.length>0&&<span style={{position:'absolute',top:-4,right:-4,background:'#6366f1',color:'#fff',borderRadius:999,fontSize:9,fontWeight:700,padding:'0 4px',minWidth:14,height:14,display:'flex',alignItems:'center',justifyContent:'center',border:'2px solid #111'}}>{openComments.length}</span>}
        </div>
        <div className="w-px h-6 bg-dark-600"/>
        <PresenceNav presence={presence} notifications={notifications} />
        {provider && localUser && <VoiceChannel provider={provider} localUser={localUser} />}
        <span className="text-xs flex items-center px-2 border-r border-dark-600 mr-2" style={{color: status === "connected" ? "#4ade80" : "#fbbf24"}}>
          {status === "connected" ? "● Connected" : "● Connecting..."}
        </span>
        <button onClick={async () => {
          try {
            if (design && !design.isPublic) {
              await api.put(`/designs/${id}/share`, { isPublic: true });
              setDesign(d => ({ ...d, isPublic: true }));
            }
            const link = `${window.location.origin}/editor/${id}`;
            navigator.clipboard.writeText(link).catch(()=>{});
            setCopied(true); setTimeout(()=>setCopied(false),2000);
            toast.success('Shareable link copied!');
          } catch (e) {
            toast.error('Failed to create public link. Try again.');
          }
        }} className="btn-secondary text-xs px-3 py-1.5 h-8" style={{color:copied?'#22c55e':undefined}}>
          {copied?<Check size={13}/>:<Share2 size={13}/>} {copied?'Copied!':'Share'}
        </button>
        <div className="flex items-center gap-1 bg-dark-700 rounded-lg px-2 py-1">
          <button onClick={()=>applyZoomDelta(-10)} className="text-gray-400 hover:text-white p-0.5"><ZoomOut size={14}/></button>
          <span className="text-xs font-mono text-gray-300 w-10 text-center">{zoom}%</span>
          <button onClick={()=>applyZoomDelta(10)} className="text-gray-400 hover:text-white p-0.5"><ZoomIn size={14}/></button>
        </div>
        <button onClick={()=>saveDesign(false)} disabled={saving} className="btn-secondary text-sm px-3 py-1.5 h-8">
          {saving?<><span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"/> Saving...</>:<><Save size={14}/> Save</>}
        </button>
        <ExportDropdown onExport={handleExport}/>
        <NotificationBell />
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left toolbar */}
        <aside className="w-14 bg-dark-800 border-r border-dark-600 flex flex-col items-center py-2 gap-0.5 shrink-0 overflow-y-auto">
          {tools.map(t=>(
            <button key={t.id} onClick={()=>{t.action();if(t.id!=='draw')setActiveTool(t.id)}} title={t.label} className={`tool-btn ${activeTool===t.id?'active':''}`}>
              {t.icon}<span className="text-[8px] leading-none">{t.label}</span>
            </button>
          ))}
          <div className="w-8 h-px bg-dark-600 my-1"/>
          <button onClick={deleteSelected} title="Delete (Del)" className="tool-btn text-red-400 hover:text-red-300 hover:bg-red-900/20"><Trash2 size={15}/></button>
          <button onClick={duplicateSelected} title="Duplicate Ctrl+D" className="tool-btn"><Copy size={15}/></button>
          <div className="w-8 h-px bg-dark-600 my-0.5"/>
          <button onClick={bringToFront} title="Bring to Front" className="tool-btn"><ArrowUpToLine size={15}/></button>
          <button onClick={bringForward} title="Forward" className="tool-btn"><ChevronUp size={15}/></button>
          <button onClick={sendBackward} title="Backward" className="tool-btn"><ChevronDown size={15}/></button>
          <button onClick={sendToBack} title="Send to Back" className="tool-btn"><ArrowDownToLine size={15}/></button>
          <div className="w-8 h-px bg-dark-600 my-0.5"/>
          <button onClick={flipH} title="Flip H" className="tool-btn"><FlipHorizontal size={15}/></button>
          <button onClick={flipV} title="Flip V" className="tool-btn"><FlipVertical size={15}/></button>
        </aside>

        {/* Canvas */}
        <main ref={wrapperRef} id="canvas-wrapper" className="flex-1 overflow-auto bg-dark-950 flex items-center justify-center"
          style={{backgroundImage:showGrid?'linear-gradient(rgba(99,102,241,0.1) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,0.1) 1px,transparent 1px),radial-gradient(#222 1px,transparent 1px)':'radial-gradient(#222 1px,transparent 1px)',backgroundSize:showGrid?'40px 40px,40px 40px,20px 20px':'20px 20px',cursor:commentMode?'crosshair':'default',position:'relative'}}
          onClick={handleCanvasClick}
        >
          <div className="shadow-2xl shadow-black" style={{position:'relative'}}>
            <canvas ref={canvasRef}/>
            {comments.map(c=>!c.resolved&&<CommentPin key={c.id} comment={c} onClick={setActiveComment}/>)}
            {newCommentPos&&(
              <div style={{position:'absolute',left:newCommentPos.x+10,top:newCommentPos.y+10,background:'#1a1a1a',border:'1px solid #6366f1',borderRadius:12,padding:12,zIndex:200,minWidth:240,boxShadow:'0 8px 32px rgba(0,0,0,.7)'}} onClick={e=>e.stopPropagation()}>
                <p style={{fontSize:11,color:'#888',marginBottom:6}}>Add comment · Enter to post · Esc to cancel</p>
                <textarea ref={commentInputRef} value={newCommentText} onChange={e=>setNewCommentText(e.target.value)}
                  onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();addComment();}if(e.key==='Escape'){setNewCommentPos(null);}}}
                  placeholder="Type your comment..." style={{width:'100%',background:'#111',border:'1px solid #333',borderRadius:8,color:'#fff',fontSize:12,padding:'8px 10px',resize:'none',outline:'none',height:68,fontFamily:'inherit'}}/>
                <div style={{display:'flex',gap:6,marginTop:8}}>
                  <button onClick={addComment} style={{flex:1,background:'#6366f1',border:'none',borderRadius:8,color:'#fff',fontSize:12,padding:'6px',cursor:'pointer',fontWeight:500}}>Post</button>
                  <button onClick={()=>setNewCommentPos(null)} style={{background:'#222',border:'1px solid #333',borderRadius:8,color:'#888',fontSize:12,padding:'6px 10px',cursor:'pointer'}}>Cancel</button>
                </div>
              </div>
            )}
            {activeComment&&(
              <div style={{position:'fixed',left:'50%',top:'50%',transform:'translate(-50%,-50%)',background:'#1a1a1a',border:'1px solid #6366f1',borderRadius:14,padding:20,zIndex:9000,minWidth:280,boxShadow:'0 16px 48px rgba(0,0,0,.8)'}} onClick={e=>e.stopPropagation()}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:10}}>
                  <div><p style={{fontSize:12,fontWeight:600,color:'#fff'}}>{activeComment.author}</p><p style={{fontSize:10,color:'#555'}}>{activeComment.time}</p></div>
                  <button onClick={()=>setActiveComment(null)} style={{background:'none',border:'none',color:'#555',cursor:'pointer'}}><X size={14}/></button>
                </div>
                <p style={{fontSize:13,color:'#d1d5db',lineHeight:1.6,marginBottom:14}}>{activeComment.text}</p>
                <div style={{display:'flex',gap:8}}>
                  <button onClick={()=>resolveComment(activeComment.id)} style={{flex:1,background:'rgba(34,197,94,0.12)',border:'1px solid rgba(34,197,94,0.3)',borderRadius:8,color:'#22c55e',fontSize:12,padding:'6px',cursor:'pointer'}}>✓ Resolve</button>
                  <button onClick={()=>deleteComment(activeComment.id)} style={{background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.3)',borderRadius:8,color:'#f87171',fontSize:12,padding:'6px 10px',cursor:'pointer'}}>Delete</button>
                </div>
              </div>
            )}
          </div>
          {commentMode&&<div style={{position:'absolute',top:12,left:'50%',transform:'translateX(-50%)',background:'rgba(99,102,241,0.9)',color:'#fff',fontSize:12,fontWeight:500,padding:'6px 16px',borderRadius:999,backdropFilter:'blur(8px)',pointerEvents:'none'}}>💬 Click canvas to add comment · Esc to cancel</div>}
          
          <AISelectionBubble bubble={selectionBubble} onOpen={openFromBubble} onClose={closeBubble} />
          <AIPromptMenu 
            position={aiMenuPos} 
            contextText={contextText} 
            onClose={closeMenu} 
            onInsert={(generatedText) => {
              if (!fabricRef.current) return;
              const obj = fabricRef.current.getActiveObject();
              if (obj && obj.type === 'i-text') {
                obj.set('text', generatedText);
              } else {
                const rect = wrapperRef.current?.getBoundingClientRect() || {left:0, top:0};
                const canvasLeft = (aiMenuPos.x - rect.left) / (zoom / 100);
                const canvasTop = (aiMenuPos.y - rect.top) / (zoom / 100);
                fabricRef.current.add(new fabric.IText(generatedText, {
                  left: Math.max(10, canvasLeft),
                  top: Math.max(10, canvasTop),
                  fill: fillColor, 
                  fontSize, 
                  fontWeight,
                  fontFamily: 'Inter, sans-serif'
                }));
              }
              fabricRef.current.renderAll();
              pushHistory();
              setLayerTick(t=>t+1);
            }}
          />
        </main>

        {/* Right panel */}
        <aside className="w-72 bg-dark-800 border-l border-dark-600 flex flex-col shrink-0 overflow-hidden">
          <div className="flex border-b border-dark-600">
            {[{id:'properties',label:'Props'},{id:'effects',label:'Effects'},{id:'layers',label:`Layers`},{id:'comments',label:`Notes${openComments.length>0?` (${openComments.length})`:''}`,}].map(p=>(
              <button key={p.id} onClick={()=>setSidePanel(p.id)} className={`flex-1 py-2 text-[10px] font-semibold capitalize transition-colors ${sidePanel===p.id?'text-white border-b-2 border-accent':'text-gray-500 hover:text-gray-300'}`}>{p.label}</button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">

            {sidePanel==='properties'&&(
              <>
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Fill Color</p>
                  <div className="grid grid-cols-5 gap-1.5 mb-2">{COLORS.map(c=><button key={c} onClick={()=>{setFillColor(c);updateObjProp('fill',c)}} className={`w-8 h-8 rounded-lg border-2 transition-all ${fillColor===c?'border-accent scale-110':'border-transparent'}`} style={{backgroundColor:c}}/>)}</div>
                  <input type="color" value={fillColor} onChange={e=>{setFillColor(e.target.value);updateObjProp('fill',e.target.value)}} className="w-full h-9 rounded-lg cursor-pointer bg-dark-700 border border-dark-500 p-1"/>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Stroke</p>
                  <div className="grid grid-cols-5 gap-1.5 mb-2">{COLORS.map(c=><button key={c} onClick={()=>{setStrokeColor(c);updateObjProp('stroke',c)}} className={`w-8 h-8 rounded-lg border-2 transition-all ${strokeColor===c?'border-accent scale-110':'border-transparent'}`} style={{backgroundColor:c}}/>)}</div>
                  <div className="flex items-center gap-2">
                    <input type="color" value={strokeColor} onChange={e=>{setStrokeColor(e.target.value);updateObjProp('stroke',e.target.value)}} className="w-14 h-9 rounded-lg cursor-pointer bg-dark-700 border border-dark-500 p-1"/>
                    <div className="flex-1"><label className="text-xs text-gray-500 mb-1 block">Width: {strokeWidth}px</label><input type="range" min="0" max="20" value={strokeWidth} onChange={e=>{const v=+e.target.value;setStrokeWidth(v);updateObjProp('strokeWidth',v)}} className="w-full accent-indigo-500"/></div>
                  </div>
                </div>
                <div><label className="text-xs text-gray-500 block mb-1">Corner Radius: {cornerRadius}px</label><input type="range" min="0" max="60" value={cornerRadius} onChange={e=>{setCornerRadius(+e.target.value);updateObjProp('rx',+e.target.value);updateObjProp('ry',+e.target.value)}} className="w-full accent-indigo-500"/></div>
                {activeObj?.type==='i-text'&&(
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Typography</p>
                    <div className="space-y-2">
                      <select value={fontFamily} onChange={e=>{setFontFamily(e.target.value);updateObjProp('fontFamily',e.target.value)}} className="w-full bg-dark-700 border border-dark-500 text-white text-xs rounded-lg px-2 py-2 focus:outline-none focus:border-accent">{FONTS.map(f=><option key={f} value={f}>{f}</option>)}</select>
                      <div><label className="text-xs text-gray-500 mb-1 block">Size: {fontSize}px</label><input type="range" min="8" max="200" value={fontSize} onChange={e=>{setFontSize(+e.target.value);updateObjProp('fontSize',+e.target.value)}} className="w-full accent-indigo-500"/></div>
                      <div className="flex gap-1.5">
                        <button onClick={()=>{const fw=fontWeight==='bold'?'normal':'bold';setFontWeight(fw);updateObjProp('fontWeight',fw)}} className={`flex-1 py-1.5 rounded text-xs font-bold ${fontWeight==='bold'?'bg-accent text-white':'bg-dark-600 text-gray-300'}`}>B</button>
                        <button onClick={()=>updateObjProp('fontStyle',activeObj.fontStyle==='italic'?'normal':'italic')} className="flex-1 py-1.5 rounded text-xs italic bg-dark-600 text-gray-300 hover:bg-dark-500">I</button>
                        <button onClick={()=>updateObjProp('underline',!activeObj.underline)} className="flex-1 py-1.5 rounded text-xs underline bg-dark-600 text-gray-300 hover:bg-dark-500">U</button>
                        <button onClick={()=>updateObjProp('linethrough',!activeObj.linethrough)} className="flex-1 py-1.5 rounded text-xs bg-dark-600 text-gray-300 hover:bg-dark-500 line-through">S</button>
                      </div>
                      <div className="flex gap-1">
                        {['left','center','right'].map(a=><button key={a} onClick={()=>updateObjProp('textAlign',a)} className={`flex-1 py-1.5 rounded text-xs ${activeObj.textAlign===a?'bg-accent text-white':'bg-dark-600 text-gray-300'}`}>{a==='left'?<AlignLeft size={11} className="mx-auto"/>:a==='center'?<AlignCenter size={11} className="mx-auto"/>:<AlignRight size={11} className="mx-auto"/>}</button>)}
                      </div>
                      <div><label className="text-xs text-gray-500 mb-1 block">Letter Spacing</label><input type="range" min="-100" max="500" value={activeObj.charSpacing||0} onChange={e=>updateObjProp('charSpacing',+e.target.value)} className="w-full accent-indigo-500"/></div>
                      <div><label className="text-xs text-gray-500 mb-1 block">Line Height</label><input type="range" min="0.5" max="3" step="0.1" value={activeObj.lineHeight||1.2} onChange={e=>updateObjProp('lineHeight',+e.target.value)} className="w-full accent-indigo-500"/></div>
                    </div>
                  </div>
                )}
                {activeObj&&<div><label className="text-xs text-gray-500 block mb-1">Opacity: {Math.round((activeObj.opacity??1)*100)}%</label><input type="range" min="0" max="100" value={Math.round((activeObj.opacity??1)*100)} onChange={e=>updateObjProp('opacity',+e.target.value/100)} className="w-full accent-indigo-500"/></div>}
                {activeObj&&(
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Position</p>
                    <div className="grid grid-cols-2 gap-2">
                      {[{l:'X',p:'left',v:Math.round(activeObj.left||0)},{l:'Y',p:'top',v:Math.round(activeObj.top||0)},{l:'R°',p:'angle',v:Math.round(activeObj.angle||0)}].map(f=>(
                        <div key={f.l}><label className="text-[10px] text-gray-600 block mb-0.5">{f.l}</label>
                          <input type="number" value={f.v} onChange={e=>updateObjProp(f.p,+e.target.value)} className="w-full bg-dark-700 border border-dark-500 text-white text-xs rounded px-2 py-1.5 focus:outline-none focus:border-accent"/>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {activeObj&&(
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Align to Canvas</p>
                    <div className="grid grid-cols-3 gap-1">
                      {[{l:'←',d:'left'},{l:'↔',d:'center'},{l:'→',d:'right'},{l:'↑',d:'top'},{l:'↕',d:'middle'},{l:'↓',d:'bottom'}].map(a=>(
                        <button key={a.d} onClick={()=>alignToCanvas(a.d)} className="py-1.5 text-sm bg-dark-600 hover:bg-dark-500 rounded transition-colors text-gray-300">{a.l}</button>
                      ))}
                    </div>
                  </div>
                )}
                <div><p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Canvas BG</p><input type="color" defaultValue="#1a1a1a" onChange={e=>{fabricRef.current.backgroundColor=e.target.value;fabricRef.current.renderAll()}} className="w-full h-9 rounded-lg cursor-pointer bg-dark-700 border border-dark-500 p-1"/></div>
              </>
            )}

            {sidePanel==='effects'&&(
              <>
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Gradients</p>
                  <div className="grid grid-cols-3 gap-2">
                    {GRADIENTS.map(g=><button key={g.name} onClick={()=>applyGradient(g.stops)} style={{height:36,borderRadius:8,border:'1px solid #333',cursor:'pointer',background:`linear-gradient(135deg,${g.stops[0].color},${g.stops[1].color})`}} title={g.name}/>)}
                  </div>
                  <p className="text-xs text-gray-600 mt-2">Select an object first</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Shadow</p>
                  <button onClick={toggleShadow} className={`w-full py-2 rounded-lg text-xs font-medium transition-colors ${shadow?'bg-accent text-white':'bg-dark-600 text-gray-300 hover:bg-dark-500'}`}>{shadow?'✓ Shadow On':'Add Drop Shadow'}</button>
                </div>
                {activeObj&&(
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Blend Mode</p>
                    <select onChange={e=>updateObjProp('globalCompositeOperation',e.target.value)} className="w-full bg-dark-700 border border-dark-500 text-white text-xs rounded-lg px-2 py-2 focus:outline-none focus:border-accent">
                      {['source-over','multiply','screen','overlay','darken','lighten','color-dodge','color-burn','difference','exclusion'].map(m=><option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                )}
              </>
            )}

            {sidePanel==='layers'&&(
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Layers ({layers.length})</p>
                </div>
                {layers.length===0
                  ?<p className="text-xs text-gray-600 text-center py-8">No objects yet</p>
                  :<div className="space-y-1">
                    {[...layers].reverse().map((obj,i)=>{
                      const hidden=layerVis[i]; const locked=layerLocked[i];
                      const isAct=fabricRef.current?.getActiveObject()===obj;
                      return(
                        <div key={`${i}-${layerTick}`}
                          onClick={()=>{if(locked) return;fabricRef.current.setActiveObject(obj);fabricRef.current.renderAll();setActiveObj(obj)}}
                          style={{background:isAct?'rgba(99,102,241,0.15)':'transparent',border:`1px solid ${isAct?'rgba(99,102,241,0.4)':'transparent'}`,opacity:hidden?0.4:1}}
                          className="flex items-center gap-1.5 p-2 rounded-lg cursor-pointer transition-all text-xs hover:bg-dark-600 group"
                        >
                          <span className="text-gray-500 shrink-0">
                            {obj.type==='i-text'?<Type size={10}/>:obj.type==='rect'?<Square size={10}/>:obj.type==='circle'?<Circle size={10}/>:obj.type==='triangle'?<Triangle size={10}/>:obj.type==='line'?<Minus size={10}/>:<Layers size={10}/>}
                          </span>
                          <span className="flex-1 truncate text-gray-300">{obj.type==='i-text'?(obj.text?.substring(0,16)||'Text'):`${obj.type} ${layers.length-i}`}</span>
                          <div className="w-3 h-3 rounded-sm border border-dark-400 shrink-0" style={{background:typeof obj.fill==='string'?obj.fill:'#6366f1'}}/>
                          {/* Layer controls - always visible */}
                          <div className="flex items-center gap-0.5">
                            <button onClick={e=>moveLayerUp(i,e)} title="Move up" className="p-0.5 text-gray-600 hover:text-white rounded"><MoveUp size={10}/></button>
                            <button onClick={e=>moveLayerDown(i,e)} title="Move down" className="p-0.5 text-gray-600 hover:text-white rounded"><MoveDown size={10}/></button>
                            <button onClick={e=>toggleLayerVis(i,e)} title={hidden?'Show':'Hide'} className={`p-0.5 rounded ${hidden?'text-gray-700':'text-gray-500 hover:text-white'}`}>{hidden?<EyeOff size={10}/>:<Eye size={10}/>}</button>
                            <button onClick={e=>toggleLayerLock(i,e)} title={locked?'Unlock':'Lock'} className={`p-0.5 rounded ${locked?'text-accent':'text-gray-500 hover:text-white'}`}>{locked?<Lock size={10}/>:<Unlock size={10}/>}</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                }
              </div>
            )}

            {sidePanel==='comments'&&(
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Notes ({openComments.length} open)</p>
                  <button onClick={()=>setCommentMode(true)} className="text-xs text-accent hover:text-accent-light">+ Add</button>
                </div>
                {comments.length===0
                  ?<div className="text-center py-10 text-gray-600"><MessageSquarePlus size={28} className="mx-auto mb-2 opacity-30"/><p className="text-xs">No comments yet</p><p className="text-xs mt-1">Click 💬 toolbar button</p></div>
                  :<div className="space-y-2">
                    {comments.map(c=>(
                      <div key={c.id} style={{background:c.resolved?'#0f0f0f':'rgba(99,102,241,0.06)',border:`1px solid ${c.resolved?'#1a1a1a':'rgba(99,102,241,0.2)'}`,borderRadius:10,padding:10,opacity:c.resolved?.5:1}}>
                        <div className="flex items-center justify-between mb-1.5"><span className="text-xs font-medium text-white">{c.author}</span><span className="text-[10px] text-gray-600">{c.time}</span></div>
                        <p className="text-xs text-gray-400 leading-relaxed mb-2">{c.text}</p>
                        {!c.resolved&&<div className="flex gap-2">
                          <button onClick={()=>setActiveComment(c)} className="text-xs text-accent hover:underline">View</button>
                          <span className="text-gray-700">·</span>
                          <button onClick={()=>resolveComment(c.id)} className="text-xs text-green-500 hover:underline">Resolve</button>
                          <span className="text-gray-700">·</span>
                          <button onClick={()=>deleteComment(c.id)} className="text-xs text-red-500 hover:underline">Delete</button>
                        </div>}
                        {c.resolved&&<p className="text-[10px] text-gray-700">✓ Resolved</p>}
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
