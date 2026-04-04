import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { ArrowLeft, Plus, Trash2, Save, Download, Search, Share2, Check, Users, MessageSquare, Send, ChevronDown, ChevronUp, Lock, Unlock } from 'lucide-react';
import { useNotify, NotificationBell } from '../components/NotificationSystem';
import { io } from 'socket.io-client';

/* ─── Constants ─────────────────────────────────────────────────────────── */
const ROWS = 50;
const COLS = 16;
const COL_LABELS = Array.from({ length: COLS }, (_, i) => {
  if (i < 26) return String.fromCharCode(65 + i);
  return String.fromCharCode(65 + Math.floor(i / 26) - 1) + String.fromCharCode(65 + (i % 26));
});
const STORAGE_KEY   = 'synapse_sheets';
const SOCKET_URL    = 'http://localhost:5000';
const MAX_COLLAB    = 22;

const emptyGrid   = () => Array.from({ length: ROWS }, () => Array(COLS).fill(''));
const newSheet    = (n='Sheet 1') => ({ id: Date.now().toString(), name: n, grid: emptyGrid(), updatedAt: Date.now(), cellColors:{}, cellBold:{}, cellItalic:{}, cellAlign:{}, cellFontSize:{} });
const loadSheets  = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; } };
const saveSheets  = (s) => localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
const timeAgo     = (ts) => { const m=Math.floor((Date.now()-ts)/60000); return m<60?`${m}m ago`:m<1440?`${Math.floor(m/60)}h ago`:`${Math.floor(m/1440)}d ago`; };

/* ─── Formula engine (extended) ─────────────────────────────────────────── */
const parseRange = (a1,a2,grid) => {
  const c1=COL_LABELS.indexOf(a1.replace(/\d/g,''));
  const r1=parseInt(a1.replace(/\D/g,''))-1;
  const c2=COL_LABELS.indexOf(a2.replace(/\d/g,''));
  const r2=parseInt(a2.replace(/\D/g,''))-1;
  const vals=[];
  for(let r=Math.min(r1,r2);r<=Math.max(r1,r2);r++)
    for(let c=Math.min(c1,c2);c<=Math.max(c1,c2);c++)
      vals.push(Number(grid[r]?.[c])||0);
  return vals;
};

const evalFormula = (expr, grid) => {
  try {
    // Named ranges
    const rangeRe=/([A-Z]{1,2}\d+):([A-Z]{1,2}\d+)/g;
    let e=expr;
    // SUM
    e=e.replace(/SUM\(([A-Z]{1,2}\d+):([A-Z]{1,2}\d+)\)/gi,(_,a,b)=>parseRange(a,b,grid).reduce((s,v)=>s+v,0));
    // AVG / AVERAGE
    e=e.replace(/AVG(?:ERAGE)?\(([A-Z]{1,2}\d+):([A-Z]{1,2}\d+)\)/gi,(_,a,b)=>{ const v=parseRange(a,b,grid); return v.length?(v.reduce((s,x)=>s+x,0)/v.length).toFixed(4):0; });
    // MIN / MAX
    e=e.replace(/MIN\(([A-Z]{1,2}\d+):([A-Z]{1,2}\d+)\)/gi,(_,a,b)=>Math.min(...parseRange(a,b,grid)));
    e=e.replace(/MAX\(([A-Z]{1,2}\d+):([A-Z]{1,2}\d+)\)/gi,(_,a,b)=>Math.max(...parseRange(a,b,grid)));
    // COUNT
    e=e.replace(/COUNT\(([A-Z]{1,2}\d+):([A-Z]{1,2}\d+)\)/gi,(_,a,b)=>parseRange(a,b,grid).filter(v=>v!==0||true).length);
    // CONCATENATE / CONCAT
    e=e.replace(/CONCAT(?:ENATE)?\((.+)\)/gi,(_,args)=>args.split(',').map(a=>a.trim().replace(/^"|"$/g,'')).join(''));
    // IF(cond,a,b)
    e=e.replace(/IF\((.+),(.+),(.+)\)/gi,(_,cond,a,b)=>{
      try{ return Function(`"use strict";return (${cond})?${a}:${b}`)(); }catch{return '#ERR';}
    });
    // Cell refs
    e=e.replace(/([A-Z]{1,2})(\d+)/g,(m,c,r)=>{
      const ci=COL_LABELS.indexOf(c), ri=parseInt(r)-1;
      const v=grid[ri]?.[ci]; return isNaN(Number(v))?`"${v||''}"`:Number(v)||0;
    });
    // eslint-disable-next-line no-new-func
    return Function(`"use strict";return (${e})`)();
  } catch { return '#ERR'; }
};

const display = (val, grid) => {
  if (typeof val==='string' && val.startsWith('=')) {
    const r=evalFormula(val.slice(1),grid);
    return typeof r==='number'&&!Number.isInteger(r)?Number(r.toFixed(6)):r;
  }
  return val;
};

/* ─── Cell formatting tooltip ─────────────────────────────────────────────── */
const FmtBtn = ({title, active, onClick, children}) => (
  <button title={title} onClick={onClick}
    style={{ padding:'3px 6px', borderRadius:4, border:'none', cursor:'pointer', fontSize:11, fontWeight:active?700:400,
      background:active?'#6366f1':'#1e1e1e', color:active?'#fff':'#888', transition:'all .15s' }}
    onMouseEnter={e=>{ if(!active) e.currentTarget.style.background='#2a2a2a'; }}
    onMouseLeave={e=>{ if(!active) e.currentTarget.style.background='#1e1e1e'; }}
  >{children}</button>
);

/* ─── ExcelEditor ─────────────────────────────────────────────────────────── */
export default function ExcelEditor() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { notifyOpen } = useNotify();
  const autoRef  = useRef(null);
  const socketRef= useRef(null);

  /* Data */
  const [sheets,    setSheets]    = useState(loadSheets);
  const [activeId,  setActiveId]  = useState(null);
  const [sel,       setSel]       = useState({ r:0, c:0 });
  const [selRange,  setSelRange]  = useState(null);   // {r1,c1,r2,c2}
  const [editing,   setEditing]   = useState(false);
  const [formula,   setFormula]   = useState('');
  const [search,    setSearch]    = useState('');
  const [copied,    setCopied]    = useState(false);
  const [frozenRow, setFrozenRow] = useState(0);       // freeze top N rows
  const [frozenCol, setFrozenCol] = useState(0);

  /* Collab */
  const [peers,      setPeers]      = useState([]);    // [{id,name,color,cell}]
  const [peerCells,  setPeerCells]  = useState({});    // {socketId: {cell,user}}
  const [chatOpen,   setChatOpen]   = useState(false);
  const [chatMsgs,   setChatMsgs]   = useState([]);
  const [chatInput,  setChatInput]  = useState('');
  const [connected,  setConnected]  = useState(false);
  const [collabRoom, setCollabRoom] = useState('');    // room name user typed

  /* UI */
  const [cellColors,   setCellColors]   = useState({});
  const [cellBold,     setCellBold]     = useState({});
  const [cellItalic,   setCellItalic]   = useState({});
  const [cellAlign,    setCellAlign]    = useState({});
  const [cellFontSize, setCellFontSize] = useState({});
  const [lockedCells,  setLockedCells]  = useState({});
  const [showFilter,   setShowFilter]   = useState(false);
  const [filterCol,    setFilterCol]    = useState(null);
  const [filterVal,    setFilterVal]    = useState('');
  const [sortCol,      setSortCol]      = useState(null);
  const [sortAsc,      setSortAsc]      = useState(true);
  const [findMode,     setFindMode]     = useState(false);
  const [findText,     setFindText]     = useState('');
  const [snapHistory,  setSnapHistory]  = useState([]);  // version snapshots
  const [showHistory,  setShowHistory]  = useState(false);

  const sheet = sheets.find(s => s.id === activeId);
  const grid  = sheet?.grid || emptyGrid();

  /* ── Socket.io setup ── */
  useEffect(() => {
    const sock = io(SOCKET_URL, { transports:['websocket','polling'], reconnectionDelay:1000 });
    socketRef.current = sock;

    sock.on('connect',    () => setConnected(true));
    sock.on('disconnect', () => { setConnected(false); setPeers([]); setPeerCells({}); });

    sock.on('users-update', ({ users }) => {
      setPeers(users.filter(u => u.id !== sock.id));
    });

    sock.on('peer-cell-focus', ({ userId, user:u, cell }) => {
      setPeerCells(prev => ({ ...prev, [userId]: { cell, user:u } }));
    });

    sock.on('peer-cell-blur', ({ userId }) => {
      setPeerCells(prev => { const n={...prev}; delete n[userId]; return n; });
    });

    sock.on('peer-cell-update', ({ r, c, value, userId }) => {
      setSheets(prev => prev.map(s => {
        if (s.id !== activeId) return s;
        const g=s.grid.map(row=>[...row]);
        g[r][c]=value;
        return { ...s, grid:g, updatedAt:Date.now() };
      }));
    });

    sock.on('room-chat-msg', (msg) => {
      setChatMsgs(prev => [...prev, msg].slice(-100));
    });

    sock.on('room-state', ({ data }) => {
      // Apply existing cell values from room
      if (data.cells) {
        setSheets(prev => prev.map(s => {
          if (s.id !== activeId) return s;
          const g=s.grid.map(row=>[...row]);
          Object.entries(data.cells).forEach(([key,val]) => {
            const [r,c]=key.split(',').map(Number);
            if(g[r]&&g[r][c]!==undefined) g[r][c]=val;
          });
          return { ...s, grid:g };
        }));
      }
    });

    return () => sock.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Rejoin room when sheet changes
  useEffect(() => {
    if (!socketRef.current || !activeId || !collabRoom) return;
    socketRef.current.emit('join-room', {
      roomId: `sheet-${collabRoom || activeId}`,
      name:   user?.name || 'Anonymous',
      avatar: user?.name?.[0]?.toUpperCase(),
    });
  }, [activeId, collabRoom, user]);

  const joinRoom = (roomName) => {
    if (!socketRef.current || !roomName) return;
    setCollabRoom(roomName);
    socketRef.current.emit('join-room', {
      roomId: `sheet-${roomName}`,
      name:   user?.name || 'Anonymous',
      avatar: user?.name?.[0]?.toUpperCase(),
    });
    toast.success(`Joined room "${roomName}"!`);
  };

  /* ── Persist ── */
  const persist = useCallback((silent=false) => {
    if (!activeId) return;
    setSheets(prev => {
      const updated=prev.map(s => s.id===activeId?{...s,updatedAt:Date.now()}:s);
      saveSheets(updated); return updated;
    });
    if (!silent) toast.success('Saved! ✓');
  }, [activeId]);

  const autoSave = () => { clearTimeout(autoRef.current); autoRef.current=setTimeout(()=>persist(true),2000); };

  /* ── Snapshot (version history) ── */
  const takeSnapshot = () => {
    if (!sheet) return;
    const snap = { ts:Date.now(), grid:sheet.grid.map(r=>[...r]), name:`v${snapHistory.length+1}` };
    setSnapHistory(prev=>[snap,...prev].slice(0,10));
    toast.success('Snapshot saved!');
  };

  const restoreSnapshot = (snap) => {
    setSheets(prev=>prev.map(s=>s.id===activeId?{...s,grid:snap.grid.map(r=>[...r])}:s));
    setShowHistory(false);
    toast.success('Restored!');
  };

  /* ── Sheet CRUD ── */
  const createSheet = () => {
    const s=newSheet(`Sheet ${sheets.length+1}`);
    const updated=[...sheets,s];
    setSheets(updated); saveSheets(updated); setActiveId(s.id);
  };

  const deleteSheet = (id,e) => {
    e.stopPropagation();
    if(!confirm('Delete?')) return;
    const updated=sheets.filter(s=>s.id!==id);
    setSheets(updated); saveSheets(updated);
    if(activeId===id) setActiveId(null);
  };

  /* ── Cell operations ── */
  const setCell = (r, c, val) => {
    if (lockedCells[`${r},${c}`]) { toast.error('Cell is locked!'); return; }
    setSheets(prev => {
      const updated=prev.map(s => {
        if(s.id!==activeId) return s;
        const g=s.grid.map(row=>[...row]);
        g[r][c]=val;
        return { ...s, grid:g, updatedAt:Date.now() };
      });
      saveSheets(updated); return updated;
    });
    // Broadcast to collab peers
    socketRef.current?.emit('cell-update', { r, c, value:val, sheetId:activeId });
    autoSave();
  };

  const onCellFocus = (r, c) => {
    const cell=`${COL_LABELS[c]}${r+1}`;
    socketRef.current?.emit('cell-focus', { cell });
  };
  const onCellBlur = () => socketRef.current?.emit('cell-blur');

  const cellKey = (r,c) => `${r},${c}`;

  /* ── Sort ── */
  const sortByColumn = (c) => {
    if (!sheet) return;
    const asc = sortCol===c ? !sortAsc : true;
    setSortCol(c); setSortAsc(asc);
    const body=[...grid].slice(frozenRow);
    body.sort((a,b)=>{
      const av=display(a[c],grid)||'', bv=display(b[c],grid)||'';
      const na=Number(av), nb=Number(bv);
      if(!isNaN(na)&&!isNaN(nb)) return asc?na-nb:nb-na;
      return asc?String(av).localeCompare(String(bv)):String(bv).localeCompare(String(av));
    });
    const newGrid=[...grid.slice(0,frozenRow),...body];
    setSheets(prev=>prev.map(s=>s.id===activeId?{...s,grid:newGrid}:s));
  };

  /* ── Filter ── */
  const filteredRows = () => {
    if(!showFilter||filterCol===null||!filterVal) return null;
    return grid.map((row,i)=>({ row,i })).filter(({row})=>String(display(row[filterCol],grid)||'').toLowerCase().includes(filterVal.toLowerCase())).map(x=>x.i);
  };
  const visibleRows = filteredRows();

  /* ── Find ── */
  const findCells = () => {
    if(!findText) return new Set();
    const found=new Set();
    grid.forEach((row,r)=>row.forEach((v,c)=>{ if(String(display(v,grid)||'').toLowerCase().includes(findText.toLowerCase())) found.add(cellKey(r,c)); }));
    return found;
  };
  const foundCells = findMode ? findCells() : new Set();

  /* ── Export ── */
  const exportCSV = () => {
    if(!sheet) return;
    const csv=sheet.grid.map(row=>row.map(v=>display(v,grid)).join(',')).join('\n');
    const blob=new Blob([csv],{type:'text/csv'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=url; a.download=`${sheet.name}.csv`; a.click();
    URL.revokeObjectURL(url); toast.success('Exported as CSV!');
  };

  const exportJSON = () => {
    if(!sheet) return;
    const headers=COL_LABELS.slice(0,COLS);
    const rows=grid.slice(1).map(row=>{ const obj={}; headers.forEach((h,i)=>{ if(row[i]) obj[h]=display(row[i],grid); }); return obj; });
    const blob=new Blob([JSON.stringify(rows,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=url; a.download=`${sheet.name}.json`; a.click();
    URL.revokeObjectURL(url); toast.success('Exported as JSON!');
  };

  /* ── Chat ── */
  const sendChat = () => {
    if(!chatInput.trim()) return;
    socketRef.current?.emit('room-chat',{text:chatInput.trim()});
    setChatInput('');
  };

  /* ── UI helpers ── */
  const openSheet = (s) => { notifyOpen('sheets',s.name); setActiveId(s.id); };
  const selCell   = `${COL_LABELS[sel.c]}${sel.r+1}`;
  const selVal    = grid[sel.r]?.[sel.c]??'';

  const handleKey = (e,r,c) => {
    if(e.key==='Enter')  { setEditing(false); setSel({r:Math.min(ROWS-1,r+1),c}); }
    if(e.key==='Tab')    { e.preventDefault(); setEditing(false); setSel({r,c:Math.min(COLS-1,c+1)}); }
    if(e.key==='Escape') { setEditing(false); }
    if(!editing){
      if(e.key==='ArrowUp')    { e.preventDefault(); setSel({r:Math.max(0,r-1),c}); }
      if(e.key==='ArrowDown')  { e.preventDefault(); setSel({r:Math.min(ROWS-1,r+1),c}); }
      if(e.key==='ArrowLeft')  { e.preventDefault(); setSel({r,c:Math.max(0,c-1)}); }
      if(e.key==='ArrowRight') { e.preventDefault(); setSel({r,c:Math.min(COLS-1,c+1)}); }
      if(e.key==='Delete') { setCell(r,c,''); }
    }
  };

  const getPeerForCell = (r,c) => {
    const cell=`${COL_LABELS[c]}${r+1}`;
    return Object.values(peerCells).find(p=>p.cell===cell);
  };

  const filteredSheets = sheets.filter(s=>s.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="h-screen bg-dark-900 flex flex-col overflow-hidden">

      {/* ── Nav ── */}
      <nav className="h-12 bg-dark-800 border-b border-dark-600 flex items-center px-4 gap-2 shrink-0 z-50">
        <button onClick={()=>navigate('/hub')} className="tool-btn"><ArrowLeft size={16}/></button>
        <div className="w-px h-5 bg-dark-600"/>
        <span className="font-bold text-sm">📊 Synapse Sheets</span>

        {/* Collab room join */}
        <div style={{ display:'flex', alignItems:'center', gap:4, background:'#1a1a1a', border:'1px solid #2a2a2a', borderRadius:8, padding:'0 8px', height:28 }}>
          <div style={{ width:7, height:7, borderRadius:'50%', background:connected?'#22c55e':'#555' }}/>
          <input placeholder="Room name to collab…" style={{ background:'none', border:'none', outline:'none', color:'#aaa', fontSize:11, width:120, fontFamily:'Inter,sans-serif' }}
            onKeyDown={e=>{ if(e.key==='Enter') joinRoom(e.target.value); }}
            onChange={e=>setCollabRoom(e.target.value)} value={collabRoom}
          />
          <button onClick={()=>joinRoom(collabRoom)} style={{ background:'#6366f1', border:'none', borderRadius:5, padding:'2px 7px', color:'#fff', fontSize:10, cursor:'pointer' }}>Join</button>
        </div>

        {/* Peer avatars */}
        <div style={{ display:'flex', gap:-4 }}>
          {peers.slice(0,5).map(p=>(
            <div key={p.id} title={p.name} style={{ width:24, height:24, borderRadius:'50%', background:p.color, border:'2px solid #111', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, color:'#fff', marginLeft:-4 }}>
              {p.name?.[0]?.toUpperCase()}
            </div>
          ))}
          {peers.length>5 && <div style={{ width:24, height:24, borderRadius:'50%', background:'#333', border:'2px solid #111', display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, color:'#888', marginLeft:-4 }}>+{peers.length-5}</div>}
        </div>

        <div className="flex-1"/>

        {/* Toolbar buttons */}
        {sheet && (
          <>
            {/* Find */}
            <button onClick={()=>setFindMode(f=>!f)} className={`btn-secondary text-xs px-2 py-1 h-8 ${findMode?'bg-accent text-white':''}`}>🔍 Find</button>
            {/* Sort */}
            <button onClick={()=>sortByColumn(sel.c)} className="btn-secondary text-xs px-2 py-1 h-8" title="Sort selected column">⇅ Sort</button>
            {/* Filter */}
            <button onClick={()=>setShowFilter(f=>!f)} className={`btn-secondary text-xs px-2 py-1 h-8 ${showFilter?'bg-accent text-white':''}`}>⊟ Filter</button>
            {/* Snapshot */}
            <button onClick={takeSnapshot} className="btn-secondary text-xs px-2 py-1 h-8" title="Save version snapshot">📷 Snap</button>
            {/* History */}
            <button onClick={()=>setShowHistory(h=>!h)} className="btn-secondary text-xs px-2 py-1 h-8">🕐 History</button>
            {/* Chat */}
            <button onClick={()=>setChatOpen(o=>!o)} style={{ position:'relative', background:chatOpen?'#6366f1':'#222', border:'1px solid #333', borderRadius:7, padding:'4px 10px', color:chatOpen?'#fff':'#888', cursor:'pointer', fontSize:12 }}>
              <MessageSquare size={13} style={{ display:'inline', marginRight:4 }}/>Chat
              {chatMsgs.length>0 && <span style={{ position:'absolute', top:-4, right:-4, width:14, height:14, borderRadius:'50%', background:'#6366f1', fontSize:8, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', border:'2px solid #111' }}>{Math.min(chatMsgs.length,9)}</span>}
            </button>
            <button onClick={exportCSV}  className="btn-secondary text-xs px-2 py-1 h-8"><Download size={12}/> CSV</button>
            <button onClick={exportJSON} className="btn-secondary text-xs px-2 py-1 h-8"><Download size={12}/> JSON</button>
            <button onClick={()=>{const url=`${window.location.origin}/sheets`;navigator.clipboard.writeText(url).catch(()=>{});setCopied(true);setTimeout(()=>setCopied(false),2000);}} className="btn-secondary text-xs px-2 py-1 h-8" style={{color:copied?'#22c55e':undefined}}>
              {copied?<Check size={12}/>:<Share2 size={12}/>} {copied?'Copied!':'Share'}
            </button>
            <button onClick={()=>persist(false)} className="btn-primary text-xs px-3 py-1 h-8"><Save size={12}/> Save</button>
          </>
        )}
        <NotificationBell/>
        <button onClick={logout} className="text-gray-500 hover:text-red-400 text-xs">Sign out</button>
      </nav>

      {/* Find bar */}
      {findMode && (
        <div style={{ background:'#0f0f0f', borderBottom:'1px solid #1e1e1e', padding:'6px 16px', display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:11, color:'#555' }}>Find:</span>
          <input autoFocus value={findText} onChange={e=>setFindText(e.target.value)}
            style={{ background:'#1a1a1a', border:'1px solid #333', borderRadius:6, padding:'4px 8px', color:'#fff', fontSize:12, outline:'none', width:200 }}
            placeholder="Search in sheet…"
          />
          <span style={{ fontSize:11, color:'#666' }}>{foundCells.size} matches</span>
          <button onClick={()=>{setFindMode(false);setFindText('');}} style={{ fontSize:11, color:'#555', background:'none', border:'none', cursor:'pointer' }}>✕</button>
        </div>
      )}

      {/* Filter bar */}
      {showFilter && (
        <div style={{ background:'#0f0f0f', borderBottom:'1px solid #1e1e1e', padding:'6px 16px', display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:11, color:'#555' }}>Filter col:</span>
          <select value={filterCol??''} onChange={e=>setFilterCol(e.target.value===''?null:Number(e.target.value))}
            style={{ background:'#1a1a1a', border:'1px solid #333', borderRadius:6, padding:'4px 8px', color:'#aaa', fontSize:12, outline:'none' }}>
            <option value="">None</option>
            {COL_LABELS.map((l,i)=><option key={i} value={i}>{l}</option>)}
          </select>
          <input value={filterVal} onChange={e=>setFilterVal(e.target.value)}
            style={{ background:'#1a1a1a', border:'1px solid #333', borderRadius:6, padding:'4px 8px', color:'#fff', fontSize:12, outline:'none', width:160 }}
            placeholder="Filter value…"
          />
          {visibleRows && <span style={{ fontSize:11, color:'#666' }}>{visibleRows.length} rows shown</span>}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar */}
        <aside className="w-44 bg-dark-800 border-r border-dark-600 flex flex-col shrink-0">
          <div className="p-2 border-b border-dark-600 flex gap-1.5">
            <div className="relative flex-1">
              <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-600"/>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…"
                className="w-full bg-dark-700 border border-dark-600 rounded pl-6 pr-1 py-1 text-xs text-white placeholder-gray-700 focus:outline-none focus:border-accent"/>
            </div>
            <button onClick={createSheet} className="btn-primary text-xs px-1.5 h-7"><Plus size={12}/></button>
          </div>
          <div className="flex-1 overflow-y-auto p-1.5">
            {filteredSheets.length===0
              ? <div className="text-center py-8 text-gray-700 text-xs"><p>No sheets</p><button onClick={createSheet} className="mt-1.5 text-accent hover:underline text-xs">Create →</button></div>
              : filteredSheets.map(s=>(
                <div key={s.id} onClick={()=>openSheet(s)}
                  className={`p-2 rounded-lg cursor-pointer mb-0.5 group flex items-center justify-between transition-colors ${activeId===s.id?'bg-dark-600 border border-accent/30':'hover:bg-dark-700'}`}>
                  <span className="text-xs font-medium text-white truncate">📊 {s.name}</span>
                  <button onClick={e=>deleteSheet(s.id,e)} className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 p-0.5"><Trash2 size={10}/></button>
                </div>
              ))
            }
          </div>
        </aside>

        {/* Main spreadsheet area */}
        {sheet ? (
          <div className="flex-1 flex flex-col overflow-hidden">

            {/* Formatting toolbar */}
            <div style={{ height:36, background:'#111', borderBottom:'1px solid #1e1e1e', display:'flex', alignItems:'center', padding:'0 12px', gap:6, flexShrink:0 }}>
              {/* Cell ref */}
              <span style={{ fontSize:11, fontWeight:700, color:'#6366f1', fontFamily:'monospace', width:36 }}>{selCell}</span>
              <div style={{ width:1, height:18, background:'#2a2a2a' }}/>
              {/* Bold */}
              <FmtBtn title="Bold" active={!!cellBold[cellKey(sel.r,sel.c)]} onClick={()=>setCellBold(p=>({...p,[cellKey(sel.r,sel.c)]:!p[cellKey(sel.r,sel.c)]}))}>B</FmtBtn>
              {/* Italic */}
              <FmtBtn title="Italic" active={!!cellItalic[cellKey(sel.r,sel.c)]} onClick={()=>setCellItalic(p=>({...p,[cellKey(sel.r,sel.c)]:!p[cellKey(sel.r,sel.c)]}))}>I</FmtBtn>
              {/* Align */}
              {['left','center','right'].map(a=>(
                <FmtBtn key={a} title={`Align ${a}`} active={cellAlign[cellKey(sel.r,sel.c)]===a} onClick={()=>setCellAlign(p=>({...p,[cellKey(sel.r,sel.c)]:a}))}>
                  {a==='left'?'⬅':a==='center'?'↔':'➡'}
                </FmtBtn>
              ))}
              <div style={{ width:1, height:18, background:'#2a2a2a' }}/>
              {/* Font size */}
              <select value={cellFontSize[cellKey(sel.r,sel.c)]||12} onChange={e=>setCellFontSize(p=>({...p,[cellKey(sel.r,sel.c)]:+e.target.value}))}
                style={{ background:'#1a1a1a', border:'1px solid #2a2a2a', borderRadius:4, padding:'2px 4px', color:'#aaa', fontSize:11, outline:'none' }}>
                {[10,11,12,13,14,16,18,20,24].map(s=><option key={s} value={s}>{s}</option>)}
              </select>
              {/* Cell color */}
              <input type="color" value={cellColors[cellKey(sel.r,sel.c)]||'#0d0d0d'} onChange={e=>setCellColors(p=>({...p,[cellKey(sel.r,sel.c)]:e.target.value}))}
                style={{ width:24, height:24, borderRadius:4, cursor:'pointer', border:'1px solid #2a2a2a', padding:1, background:'transparent' }} title="Cell background"/>
              <div style={{ width:1, height:18, background:'#2a2a2a' }}/>
              {/* Lock cell */}
              <button title={lockedCells[cellKey(sel.r,sel.c)]?'Unlock':'Lock cell'}
                onClick={()=>setLockedCells(p=>({...p,[cellKey(sel.r,sel.c)]:!p[cellKey(sel.r,sel.c)]}))}
                style={{ padding:'3px 6px', borderRadius:4, border:'none', cursor:'pointer', background:'transparent', color:lockedCells[cellKey(sel.r,sel.c)]?'#f97316':'#555', fontSize:12 }}>
                {lockedCells[cellKey(sel.r,sel.c)]?<Lock size={12}/>:<Unlock size={12}/>}
              </button>
              {/* Freeze */}
              <button onClick={()=>setFrozenRow(r=>r>0?0:sel.r)} style={{ padding:'2px 6px', borderRadius:4, border:'1px solid #2a2a2a', background:'transparent', color:'#666', fontSize:10, cursor:'pointer' }} title="Freeze/unfreeze rows">
                {frozenRow>0?'❄ Unfreeze rows':'❄ Freeze row'}
              </button>
              <div style={{ flex:1 }}/>
              {/* Formula bar */}
              <span style={{ fontSize:11, color:'#555', marginRight:4 }}>ƒ</span>
              <input
                value={editing?selVal:formula}
                onChange={e=>{ const v=e.target.value; setCell(sel.r,sel.c,v); setFormula(v); }}
                onFocus={()=>{ setEditing(true); setFormula(grid[sel.r]?.[sel.c]||''); }}
                onBlur={()=>setEditing(false)}
                placeholder="Value or =SUM(A1:A10)…"
                style={{ background:'#1a1a1a', border:'1px solid #2a2a2a', borderRadius:6, padding:'3px 8px', color:'#fff', fontSize:11, fontFamily:'monospace', outline:'none', width:220 }}
              />
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-auto" style={{ position:'relative' }}>
              <table style={{ borderCollapse:'collapse', tableLayout:'fixed', minWidth:'100%' }}>
                <thead>
                  <tr>
                    <th style={{ width:40, background:'#0d0d0d', border:'1px solid #1e1e1e', fontSize:10, color:'#444', position:'sticky', top:0, left:0, zIndex:4 }}/>
                    {COL_LABELS.map((l,ci)=>(
                      <th key={l} onClick={()=>sortByColumn(ci)} style={{ width:90, background:'#0d0d0d', border:'1px solid #1e1e1e', padding:'4px 6px', fontSize:11, color: sortCol===ci?'#a5b4fc':'#666', fontWeight:600, position:'sticky', top:0, zIndex:2, cursor:'pointer', userSelect:'none' }}>
                        {l}{sortCol===ci?(sortAsc?'↑':'↓'):''}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {grid.map((row,r)=>{
                    if(visibleRows && !visibleRows.includes(r)) return null;
                    const isFrozen=r<frozenRow;
                    return (
                      <tr key={r}>
                        <td style={{ background:isFrozen?'#111':'#0a0a0a', border:'1px solid #1a1a1a', textAlign:'center', fontSize:10, color:'#444', position:isFrozen?'sticky':'relative', top:isFrozen?36:undefined, left:0, zIndex:isFrozen?3:1, padding:'0 4px', width:40, fontFamily:'monospace' }}>{r+1}</td>
                        {row.map((val,c)=>{
                          const isSelected=sel.r===r&&sel.c===c;
                          const ck=cellKey(r,c);
                          const shown=display(val,grid);
                          const peer=getPeerForCell(r,c);
                          const isFound=foundCells.has(ck);
                          const isLocked=!!lockedCells[ck];
                          return (
                            <td key={c}
                              onClick={()=>{ if(!isLocked){ setSel({r,c}); setEditing(false); setFormula(val); onCellFocus(r,c); } }}
                              onDoubleClick={()=>{ if(!isLocked) setEditing(true); }}
                              onBlur={onCellBlur}
                              style={{
                                border:`1px solid ${isSelected?'#6366f1':peer?peer.user.color:'#1a1a1a'}`,
                                background: peer?`${peer.user.color}18`:isFound?'rgba(250,204,21,0.12)':cellColors[ck]||'#0a0a0a',
                                padding:0, position:'relative', cursor:isLocked?'not-allowed':'cell',
                                width:90,
                              }}
                            >
                              {/* Peer floating name badge */}
                              {peer && (
                                <div style={{ position:'absolute', top:-20, left:0, background:peer.user.color, color:'#fff', fontSize:9, fontWeight:700, padding:'2px 6px', borderRadius:'4px 4px 4px 0', whiteSpace:'nowrap', zIndex:10, pointerEvents:'none', boxShadow:'0 2px 6px rgba(0,0,0,.5)' }}>
                                  {peer.user.name}
                                </div>
                              )}
                              {isSelected&&editing
                                ? <input autoFocus value={val}
                                    onChange={e=>{ setCell(r,c,e.target.value); setFormula(e.target.value); }}
                                    onKeyDown={e=>handleKey(e,r,c)}
                                    onBlur={()=>{ setEditing(false); onCellBlur(); }}
                                    style={{ width:'100%', height:'100%', background:'rgba(99,102,241,0.1)', border:'none', outline:'none', padding:'2px 6px', fontSize:cellFontSize[ck]||12, color:'#fff', fontFamily:'monospace', fontWeight:cellBold[ck]?700:400, fontStyle:cellItalic[ck]?'italic':'normal' }}
                                  />
                                : <div tabIndex={isSelected?0:-1} onKeyDown={e=>handleKey(e,r,c)}
                                    style={{ padding:'2px 6px', fontSize:cellFontSize[ck]||12, color:String(shown).startsWith('#')?'#ef4444':'#d1d5db', minHeight:24, fontFamily:typeof shown==='number'||String(val).startsWith('=')?'monospace':'Inter,sans-serif', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', textAlign:cellAlign[ck]||'left', fontWeight:cellBold[ck]?700:400, fontStyle:cellItalic[ck]?'italic':'normal' }}>
                                    {isLocked&&<span style={{ fontSize:8, marginRight:3, opacity:0.4 }}>🔒</span>}{shown}
                                  </div>
                              }
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-dark-950 text-gray-600 flex-col gap-4">
            <span className="text-5xl">📊</span>
            <p className="text-lg font-medium">Select or create a sheet</p>
            <button onClick={createSheet} className="btn-primary"><Plus size={16}/> New Sheet</button>
          </div>
        )}

        {/* Version History Panel */}
        {showHistory && (
          <aside style={{ width:200, background:'#0f0f0f', borderLeft:'1px solid #1e1e1e', display:'flex', flexDirection:'column', flexShrink:0 }}>
            <div style={{ padding:'10px 12px', borderBottom:'1px solid #1e1e1e', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <p style={{ fontSize:12, fontWeight:600, color:'#888', margin:0 }}>Version History</p>
              <button onClick={()=>setShowHistory(false)} style={{ background:'none', border:'none', color:'#555', cursor:'pointer', fontSize:14 }}>✕</button>
            </div>
            <div style={{ flex:1, overflowY:'auto', padding:8 }}>
              {snapHistory.length===0
                ? <p style={{ fontSize:11, color:'#444', textAlign:'center', marginTop:20 }}>No snapshots yet.<br/>Click 📷 Snap to save.</p>
                : snapHistory.map((snap,i)=>(
                  <div key={i} style={{ background:'#1a1a1a', border:'1px solid #2a2a2a', borderRadius:8, padding:'8px 10px', marginBottom:6 }}>
                    <p style={{ fontSize:11, color:'#888', margin:'0 0 4px' }}>{snap.name}</p>
                    <p style={{ fontSize:10, color:'#555', margin:'0 0 6px' }}>{new Date(snap.ts).toLocaleTimeString()}</p>
                    <button onClick={()=>restoreSnapshot(snap)} style={{ fontSize:10, background:'rgba(99,102,241,0.15)', border:'1px solid rgba(99,102,241,0.3)', borderRadius:5, padding:'3px 8px', color:'#a5b4fc', cursor:'pointer' }}>Restore</button>
                  </div>
                ))
              }
            </div>
          </aside>
        )}

        {/* Chat panel */}
        {chatOpen && (
          <aside style={{ width:220, background:'#0f0f0f', borderLeft:'1px solid #1e1e1e', display:'flex', flexDirection:'column', flexShrink:0 }}>
            <div style={{ padding:'10px 12px', borderBottom:'1px solid #1e1e1e', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <p style={{ fontSize:12, fontWeight:600, color:'#888', margin:0 }}>Room Chat</p>
                <p style={{ fontSize:10, color:'#444', margin:'2px 0 0' }}>{peers.length+1} in room</p>
              </div>
              <button onClick={()=>setChatOpen(false)} style={{ background:'none', border:'none', color:'#555', cursor:'pointer', fontSize:14 }}>✕</button>
            </div>
            <div style={{ flex:1, overflowY:'auto', padding:'8px 10px', display:'flex', flexDirection:'column', gap:6 }}>
              {chatMsgs.length===0
                ? <p style={{ fontSize:11, color:'#333', textAlign:'center', marginTop:20 }}>No messages yet</p>
                : chatMsgs.map((m,i)=>(
                  <div key={i}>
                    <p style={{ fontSize:10, color:m.user.color, margin:'0 0 1px', fontWeight:600 }}>{m.user.name}</p>
                    <p style={{ fontSize:12, color:'#d1d5db', margin:0, lineHeight:1.5 }}>{m.text}</p>
                  </div>
                ))
              }
            </div>
            <div style={{ padding:'8px 10px', borderTop:'1px solid #1e1e1e', display:'flex', gap:4 }}>
              <input value={chatInput} onChange={e=>setChatInput(e.target.value)}
                onKeyDown={e=>{ if(e.key==='Enter') sendChat(); }}
                placeholder="Message…"
                style={{ flex:1, background:'#1a1a1a', border:'1px solid #2a2a2a', borderRadius:7, padding:'6px 8px', color:'#fff', fontSize:11, outline:'none' }}
              />
              <button onClick={sendChat} style={{ background:'#6366f1', border:'none', borderRadius:7, padding:'0 8px', color:'#fff', cursor:'pointer' }}><Send size={12}/></button>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
