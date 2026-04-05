import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { ArrowLeft, Plus, Trash2, Save, Download, Search, Share2, Check } from 'lucide-react';
import { usePresence } from '../hooks/usePresence';
import PresenceNav from '../components/PresenceNav';
import VoiceChannel from '../components/VoiceChannel';
import { useNotify, NotificationBell } from '../components/NotificationSystem';
import { useAIWorkspace } from '../hooks/useAIWorkspace';
import AIPromptMenu, { AISelectionBubble } from '../components/AIPromptMenu';

/* ─── constants ─────────────────────────────────────────────────────────── */
const ROWS = 30;
const COLS = 10;
const COL_LABELS = Array.from({ length: COLS }, (_, i) => String.fromCharCode(65 + i)); // A-J
const STORAGE_KEY = 'synapse_sheets';
const emptyGrid   = () => Array.from({ length: ROWS }, () => Array(COLS).fill(''));
const newSheet    = (name = 'Sheet 1') => ({ id: Date.now().toString(), name, grid: emptyGrid(), updatedAt: Date.now() });
const loadSheets  = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; } };
const saveSheets  = (s) => localStorage.setItem(STORAGE_KEY, JSON.stringify(s));

/* ─── tiny formula engine ────────────────────────────────────────────────── */
const cellRef = (label, grid) => {
  const m = label.match(/^([A-J])(\d+)$/i);
  if (!m) return NaN;
  const col = m[1].toUpperCase().charCodeAt(0) - 65;
  const row = parseInt(m[2]) - 1;
  return grid[row]?.[col] ?? '';
};

const evalFormula = (expr, grid) => {
  try {
    const resolved = expr.replace(/[A-J]\d+/gi, ref => {
      const val = cellRef(ref, grid);
      return isNaN(Number(val)) ? `"${val}"` : (Number(val) || 0);
    });
    // SUM(A1:A5) style
    const sumMatch = resolved.match(/SUM\(([A-J])(\d+):([A-J])(\d+)\)/i);
    if (sumMatch) {
      const c1 = sumMatch[1].toUpperCase().charCodeAt(0) - 65;
      const r1 = parseInt(sumMatch[2]) - 1;
      const c2 = sumMatch[3].toUpperCase().charCodeAt(0) - 65;
      const r2 = parseInt(sumMatch[4]) - 1;
      let sum = 0;
      for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) sum += Number(grid[r]?.[c]) || 0;
      return sum;
    }
    // AVG
    const avgMatch = resolved.match(/AVG\(([A-J])(\d+):([A-J])(\d+)\)/i);
    if (avgMatch) {
      const c1 = avgMatch[1].toUpperCase().charCodeAt(0) - 65;
      const r1 = parseInt(avgMatch[2]) - 1;
      const c2 = avgMatch[3].toUpperCase().charCodeAt(0) - 65;
      const r2 = parseInt(avgMatch[4]) - 1;
      let sum = 0; let count = 0;
      for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) { sum += Number(grid[r]?.[c]) || 0; count++; }
      return count ? (sum / count).toFixed(2) : 0;
    }
    // eslint-disable-next-line no-new-func
    return Function(`"use strict"; return (${resolved})`)();
  } catch { return '#ERR'; }
};

const display = (val, grid) => {
  if (typeof val === 'string' && val.startsWith('=')) return evalFormula(val.slice(1), grid);
  return val;
};

/* ─── ExcelEditor ────────────────────────────────────────────────────────── */
export default function ExcelEditor() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const autoRef = useRef(null);

  const [sheets,   setSheets]   = useState(loadSheets);
  const [activeId, setActiveId] = useState(null);
  const [sel,      setSel]      = useState({ r: 0, c: 0 });
  const [editing,  setEditing]  = useState(false);
  const [formula,  setFormula]  = useState('');
  const [search,   setSearch]   = useState('');
  const [copied,   setCopied]   = useState(false);
  const { notifyOpen } = useNotify();

  const sheet = sheets.find(s => s.id === activeId);
  const grid  = sheet?.grid || emptyGrid();

  const { presence, notifications, provider, localUser } = usePresence(activeId ? `sheets-${activeId}` : null);

  const selVal  = grid[sel.r]?.[sel.c] ?? '';
  const selCell = sel.r >= 0 && sel.c >= 0 ? `${COL_LABELS[sel.c]}${sel.r + 1}` : '';

  const { aiMenuPos, contextText, closeMenu, selectionBubble, openFromBubble, closeBubble } = useAIWorkspace({
    getEditorSelection: () => {
      // the window.getSelection() often grabs empty space on tables, so we pass the exact active cell value!
      return selVal;
    }
  });

  const persist = useCallback((silent = false) => {
    if (!activeId) return;
    setSheets(prev => {
      const updated = prev.map(s => s.id === activeId ? { ...s, updatedAt: Date.now() } : s);
      saveSheets(updated);
      return updated;
    });
    if (!silent) toast.success('Saved! ✓');
  }, [activeId]);

  const autoSave = () => { clearTimeout(autoRef.current); autoRef.current = setTimeout(() => persist(true), 1500); };

  const createSheet = () => {
    const s = newSheet(`Sheet ${sheets.length + 1}`);
    const updated = [...sheets, s];
    setSheets(updated); saveSheets(updated); openSheet(s);
  };

  const openSheet = (s) => {
    notifyOpen('sheets', s.name);
    setActiveId(s.id);
  };

  const deleteSheet = (id, e) => {
    e.stopPropagation();
    if (!confirm('Delete this sheet?')) return;
    const updated = sheets.filter(s => s.id !== id);
    setSheets(updated); saveSheets(updated);
    if (activeId === id) setActiveId(null);
  };

  const setCell = (r, c, val) => {
    setSheets(prev => {
      const updated = prev.map(s => {
        if (s.id !== activeId) return s;
        const g = s.grid.map(row => [...row]);
        g[r][c] = val;
        return { ...s, grid: g, updatedAt: Date.now() };
      });
      saveSheets(updated);
      return updated;
    });
    autoSave();
  };


  const handleKey = (e, r, c) => {
    if (e.key === 'Enter') { setEditing(false); setSel({ r: Math.min(ROWS-1, r+1), c }); }
    if (e.key === 'Tab')   { e.preventDefault(); setEditing(false); setSel({ r, c: Math.min(COLS-1, c+1) }); }
    if (e.key === 'Escape') { setEditing(false); }
    if (e.key === 'ArrowUp'    && !editing) { e.preventDefault(); setSel({ r:Math.max(0,r-1), c }); }
    if (e.key === 'ArrowDown'  && !editing) { e.preventDefault(); setSel({ r:Math.min(ROWS-1,r+1), c }); }
    if (e.key === 'ArrowLeft'  && !editing) { e.preventDefault(); setSel({ r, c:Math.max(0,c-1) }); }
    if (e.key === 'ArrowRight' && !editing) { e.preventDefault(); setSel({ r, c:Math.min(COLS-1,c+1) }); }
  };

  const exportCSV = () => {
    if (!sheet) return;
    const csv = sheet.grid.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a'); a.href=url; a.download=`${sheet.name}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported as CSV!');
  };

  const filteredSheets = sheets.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="h-screen bg-dark-900 flex flex-col overflow-hidden">

      {/* Nav */}
      <nav className="h-12 bg-dark-800 border-b border-dark-600 flex items-center px-4 gap-3 shrink-0 z-50">
        <button onClick={() => navigate('/hub')} className="tool-btn"><ArrowLeft size={16}/></button>
        <div className="w-px h-6 bg-dark-600" />
        <span className="font-bold text-sm">📊 Synapse Sheets</span>
        <div className="flex-1" />
        {provider && localUser && <VoiceChannel provider={provider} localUser={localUser} />}
        <PresenceNav presence={presence} notifications={notifications} />
        <div className="w-px h-6 bg-dark-600 mx-2"/>
        {sheet && (
          <>
            <button onClick={exportCSV}          className="btn-secondary text-xs px-3 py-1.5 h-8"><Download size={13}/> CSV</button>
            <button onClick={() => persist(false)} className="btn-primary text-xs px-3 py-1.5 h-8"><Save size={13}/> Save</button>
            <button onClick={()=>{ const url=`${window.location.origin}/sheets?room=${sheet.id}`; navigator.clipboard.writeText(url).catch(()=>{}); setCopied(true); setTimeout(()=>setCopied(false),2000); toast.success('Shareable link copied!'); }} className="btn-secondary text-xs px-3 py-1.5 h-8" style={{color:copied?'#22c55e':undefined}}>
              {copied?<Check size={13}/>:<Share2 size={13}/>} {copied?'Copied!':'Share'}
            </button>
          </>
        )}
        <NotificationBell />
        <button onClick={logout} className="text-gray-500 hover:text-red-400 text-xs ml-2">Sign out</button>
      </nav>

      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar */}
        <aside className="w-48 bg-dark-800 border-r border-dark-600 flex flex-col shrink-0">
          <div className="p-3 border-b border-dark-600 flex gap-2">
            <div className="relative flex-1">
              <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500"/>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…"
                className="w-full bg-dark-700 border border-dark-600 rounded-lg pl-7 pr-2 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-accent"/>
            </div>
            <button onClick={createSheet} className="btn-primary text-xs px-2 py-1.5 h-8"><Plus size={14}/></button>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {filteredSheets.length === 0
              ? <div className="text-center py-10 text-gray-600 text-xs">
                  <p>No sheets yet</p>
                  <button onClick={createSheet} className="mt-2 text-accent hover:underline">Create one →</button>
                </div>
              : filteredSheets.map(s => (
                <div key={s.id} onClick={()=>openSheet(s)}
                  className={`p-2.5 rounded-lg cursor-pointer mb-1 group flex items-center justify-between transition-colors ${activeId===s.id?'bg-dark-600 border border-accent/30':'hover:bg-dark-700'}`}>
                  <span className="text-xs font-medium text-white truncate">📊 {s.name}</span>
                  <button onClick={e=>deleteSheet(s.id,e)} className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-600 hover:text-red-400">
                    <Trash2 size={11}/>
                  </button>
                </div>
              ))
            }
          </div>
        </aside>

        {/* Spreadsheet */}
        {sheet ? (
          <div className="flex-1 flex flex-col overflow-hidden">

            {/* Formula bar */}
            <div className="h-9 bg-dark-800 border-b border-dark-600 flex items-center px-3 gap-3 shrink-0">
              <span className="text-xs font-mono text-accent font-bold w-10">{selCell}</span>
              <div className="w-px h-5 bg-dark-600"/>
              <span className="text-xs text-gray-500 mr-1">ƒ</span>
              <input
                value={editing ? selVal : formula}
                onChange={e => { const v=e.target.value; setCell(sel.r,sel.c,v); setFormula(v); }}
                onFocus={()=>{ setEditing(true); setFormula(grid[sel.r]?.[sel.c]||''); }}
                onBlur={()=>setEditing(false)}
                placeholder="Value or =formula"
                className="flex-1 bg-transparent text-xs text-white font-mono focus:outline-none placeholder-gray-700"
              />
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-auto">
              <table style={{ borderCollapse:'collapse', tableLayout:'fixed', minWidth:'100%' }}>
                {/* Column headers */}
                <thead>
                  <tr>
                    <th style={{ width:44, background:'#111', border:'1px solid #222', fontSize:11, color:'#555', position:'sticky', top:0, left:0, zIndex:3 }}>#</th>
                    {COL_LABELS.map(l => (
                      <th key={l} style={{ width:100, background:'#111', border:'1px solid #222', padding:'4px 8px', fontSize:11, color:'#888', fontWeight:600, position:'sticky', top:0, zIndex:2 }}>{l}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {grid.map((row, r) => (
                    <tr key={r}>
                      {/* Row number */}
                      <td style={{ background:'#111', border:'1px solid #222', textAlign:'center', fontSize:11, color:'#555', position:'sticky', left:0, zIndex:1, padding:'0 4px' }}>{r+1}</td>
                      {row.map((val, c) => {
                        const isSelected = sel.r===r && sel.c===c;
                        const shown = display(val, grid);
                        return (
                          <td key={c}
                            onClick={()=>{ setSel({r,c}); setEditing(false); setFormula(val); }}
                            onDoubleClick={()=>setEditing(true)}
                            style={{ border:`1px solid ${isSelected?'#6366f1':'#1e1e1e'}`, background: isSelected?'rgba(99,102,241,0.08)':'#0d0d0d', padding:0, position:'relative' }}
                          >
                            {isSelected && editing
                              ? <input autoFocus value={val}
                                  onChange={e=>{ setCell(r,c,e.target.value); setFormula(e.target.value); }}
                                  onKeyDown={e=>handleKey(e,r,c)}
                                  onBlur={()=>setEditing(false)}
                                  style={{ width:'100%', height:'100%', background:'rgba(99,102,241,0.12)', border:'none', outline:'none', padding:'3px 6px', fontSize:12, color:'#fff', fontFamily:'JetBrains Mono,monospace' }}
                                />
                              : <div onKeyDown={e=>handleKey(e,r,c)} tabIndex={isSelected?0:-1}
                                  style={{ padding:'3px 6px', fontSize:12, color: String(shown).startsWith('#')?'#ef4444':'#d1d5db', minHeight:24, fontFamily:'Inter,sans-serif', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                                  {shown}
                                </div>
                            }
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              <AISelectionBubble bubble={selectionBubble} onOpen={openFromBubble} onClose={closeBubble} />
              <AIPromptMenu 
                position={aiMenuPos} 
                contextText={contextText} 
                onClose={closeMenu} 
                onInsert={(generatedText) => {
                  setCell(sel.r, sel.c, generatedText);
                  setFormula(generatedText);
                }}
              />
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-dark-950 text-gray-600 flex-col gap-4">
            <span className="text-5xl">📊</span>
            <p className="text-lg font-medium">Select or create a sheet</p>
            <button onClick={createSheet} className="btn-primary"><Plus size={16}/> New Sheet</button>
          </div>
        )}
      </div>
    </div>
  );
}
