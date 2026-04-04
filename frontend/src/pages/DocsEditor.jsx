import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Plus, Trash2, Save, Download, FileText,
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight,
  List, Type, Search, Share2, Check,
} from 'lucide-react';
import { useNotify, NotificationBell } from '../components/NotificationSystem';

/* ─── helpers ─────────────────────────────────────────────────────────────── */
const STORAGE_KEY = 'synapse_docs';

const loadDocs  = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; } };
const saveDocs  = (docs) => localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
const timeAgo   = (ts) => { const m=Math.floor((Date.now()-ts)/60000); return m<60?`${m}m ago`:m<1440?`${Math.floor(m/60)}h ago`:`${Math.floor(m/1440)}d ago`; };
const newDoc    = () => ({ id: Date.now().toString(), title: 'Untitled Document', content: '', updatedAt: Date.now() });

/* ─── Toolbar button ─────────────────────────────────────────────────────── */
const TB = ({ title, onClick, active, children }) => (
  <button title={title} onClick={onClick}
    style={{
      width:30, height:30, borderRadius:6, border:'none', cursor:'pointer',
      background: active ? '#6366f1' : 'transparent', color: active ? '#fff' : '#aaa',
      display:'flex', alignItems:'center', justifyContent:'center', transition:'all .15s',
    }}
    onMouseEnter={e=>{ if(!active) e.currentTarget.style.background='#1e1e1e'; }}
    onMouseLeave={e=>{ if(!active) e.currentTarget.style.background='transparent'; }}
  >{children}</button>
);

/* ─── DocsEditor ─────────────────────────────────────────────────────────── */
export default function DocsEditor() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const editorRef = useRef(null);
  const autoRef   = useRef(null);

  const [docs,       setDocs]       = useState(loadDocs);
  const [activeId,   setActiveId]   = useState(null);
  const [search,     setSearch]     = useState('');
  const [title,      setTitle]      = useState('');
  const [wordCount,  setWordCount]  = useState(0);
  const [copied,     setCopied]     = useState(false);
  const { notifyOpen } = useNotify();

  const activeDoc = docs.find(d => d.id === activeId);

  useEffect(() => {
    if (editorRef.current && activeDoc) {
      editorRef.current.innerHTML = activeDoc.content;
      countWords();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  const countWords = () => {
    const text = editorRef.current?.innerText || '';
    setWordCount(text.trim() ? text.trim().split(/\s+/).length : 0);
  };

  const autoSave = () => {
    clearTimeout(autoRef.current);
    autoRef.current = setTimeout(() => persist(true), 1500);
  };

  const persist = useCallback((silent = false) => {
    if (!activeId || !editorRef.current) return;
    const content = editorRef.current.innerHTML;
    const updated = docs.map(d => d.id === activeId ? { ...d, title, content, updatedAt: Date.now() } : d);
    setDocs(updated);
    saveDocs(updated);
    if (!silent) toast.success('Saved! ✓');
  }, [activeId, title, docs]);

  const createDoc = () => {
    const d = newDoc();
    const updated = [d, ...docs];
    setDocs(updated);
    saveDocs(updated);
    setActiveId(d.id);
    setTitle(d.title);
  };

  const deleteDoc = (id, e) => {
    e.stopPropagation();
    if (!confirm('Delete this document?')) return;
    const updated = docs.filter(d => d.id !== id);
    setDocs(updated);
    saveDocs(updated);
    if (activeId === id) { setActiveId(null); setTitle(''); }
    toast.success('Document deleted');
  };

  const openDoc = (d) => {
    notifyOpen('docs', d.title);
    // save current before switching
    if (activeId && editorRef.current) {
      const content = editorRef.current.innerHTML;
      const updated = docs.map(x => x.id === activeId ? { ...x, title, content, updatedAt: Date.now() } : x);
      setDocs(updated);
      saveDocs(updated);
    }
    setActiveId(d.id);
    setTitle(d.title);
  };

  const cmd = (command, value = null) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  const exportTXT = () => {
    const text = editorRef.current?.innerText || '';
    const blob = new Blob([`${title}\n\n${text}`], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a'); a.href = url; a.download = `${title}.txt`; a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported as TXT!');
  };

  const exportDOC = () => {
    const content = editorRef.current?.innerHTML || '';
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${title}</title><style>body{margin:40px;font-family:Arial;font-size:14px;line-height:1.7;color:#111}h1,h2,h3{color:#111}</style></head><body><h1>${title}</h1>${content}<p style="color:#999;font-size:11px;margin-top:40px">Created with Synapse Docs — ${new Date().toLocaleDateString()}</p></body></html>`;
    const blob = new Blob([html], { type: 'application/msword' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a'); a.href = url; a.download = `${title}.doc`; a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported as DOC!');
  };

  const filtered = docs.filter(d => d.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="h-screen bg-dark-900 flex flex-col overflow-hidden">

      {/* Nav */}
      <nav className="h-12 bg-dark-800 border-b border-dark-600 flex items-center px-4 gap-3 shrink-0 z-50">
        <button onClick={() => navigate('/hub')} className="tool-btn"><ArrowLeft size={16} /></button>
        <div className="w-px h-6 bg-dark-600" />
        <span className="font-bold text-sm">📝 Synapse Docs</span>
        <div className="flex-1" />
        {activeDoc && (
          <>
            <span className="text-xs text-gray-500">{wordCount} words</span>
            <button onClick={exportTXT}  className="btn-secondary text-xs px-3 py-1.5 h-8"><Download size={13}/> TXT</button>
            <button onClick={exportDOC}  className="btn-secondary text-xs px-3 py-1.5 h-8"><FileText size={13}/> DOC</button>
            <button onClick={() => persist(false)} className="btn-primary text-xs px-3 py-1.5 h-8"><Save size={13}/> Save</button>
            {activeDoc && (
              <button onClick={() => {
                const url = `${window.location.origin}/docs`;
                navigator.clipboard.writeText(url).catch(()=>{});
                setCopied(true); setTimeout(()=>setCopied(false),2000);
                if(typeof toast !== 'undefined') toast.success('Link copied!');
              }}
                className="btn-secondary text-xs px-3 py-1.5 h-8"
                style={{ color: copied ? '#22c55e' : undefined }}
              >
                {copied ? <Check size={13}/> : <Share2 size={13}/>} {copied ? 'Copied!' : 'Share'}
              </button>
            )}
          </>
        )}
        <NotificationBell />
        <button onClick={logout} className="text-gray-500 hover:text-red-400 text-xs ml-2">Sign out</button>
      </nav>

      <div className="flex flex-1 overflow-hidden">

        {/* ── Sidebar ── */}
        <aside className="w-60 bg-dark-800 border-r border-dark-600 flex flex-col shrink-0">
          <div className="p-3 border-b border-dark-600 flex gap-2">
            <div className="relative flex-1">
              <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500" />
              <input value={search} onChange={e=>setSearch(e.target.value)}
                placeholder="Search docs…"
                className="w-full bg-dark-700 border border-dark-600 rounded-lg pl-7 pr-2 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-accent" />
            </div>
            <button onClick={createDoc} className="btn-primary text-xs px-2 py-1.5 h-8 shrink-0"><Plus size={14}/></button>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {filtered.length === 0
              ? <div className="text-center py-12 text-gray-600">
                  <FileText size={32} className="mx-auto mb-3 opacity-30" />
                  <p className="text-xs">No documents yet</p>
                  <button onClick={createDoc} className="mt-3 text-accent text-xs hover:underline">Create one →</button>
                </div>
              : filtered.map(d => (
                <div key={d.id} onClick={() => openDoc(d)}
                  className={`p-3 rounded-lg cursor-pointer mb-1 group transition-colors ${activeId===d.id?'bg-dark-600 border border-accent/30':'hover:bg-dark-700'}`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-white truncate flex-1">{d.title}</p>
                    <button onClick={(e)=>deleteDoc(d.id,e)} className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-600 hover:text-red-400 transition-all ml-1">
                      <Trash2 size={11}/>
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-600 mt-0.5">{timeAgo(d.updatedAt)}</p>
                </div>
              ))
            }
          </div>
        </aside>

        {/* ── Editor area ── */}
        {activeDoc ? (
          <div className="flex-1 flex flex-col overflow-hidden bg-dark-950">

            {/* Formatting toolbar */}
            <div className="h-10 bg-dark-800 border-b border-dark-600 flex items-center px-4 gap-1 shrink-0">
              {/* Heading */}
              <select onChange={e => cmd('formatBlock', e.target.value)} defaultValue=""
                className="bg-dark-700 border border-dark-600 text-gray-300 text-xs rounded px-2 py-1 mr-2 focus:outline-none">
                <option value="">Normal</option>
                <option value="h1">Heading 1</option>
                <option value="h2">Heading 2</option>
                <option value="h3">Heading 3</option>
              </select>

              <div className="w-px h-5 bg-dark-600 mx-1" />
              <TB title="Bold"      onClick={()=>cmd('bold')}          ><Bold size={13}/></TB>
              <TB title="Italic"    onClick={()=>cmd('italic')}        ><Italic size={13}/></TB>
              <TB title="Underline" onClick={()=>cmd('underline')}     ><Underline size={13}/></TB>
              <div className="w-px h-5 bg-dark-600 mx-1" />
              <TB title="Align Left"   onClick={()=>cmd('justifyLeft')}  ><AlignLeft size={13}/></TB>
              <TB title="Align Center" onClick={()=>cmd('justifyCenter')}><AlignCenter size={13}/></TB>
              <TB title="Align Right"  onClick={()=>cmd('justifyRight')} ><AlignRight size={13}/></TB>
              <div className="w-px h-5 bg-dark-600 mx-1" />
              <TB title="Bullet list" onClick={()=>cmd('insertUnorderedList')}><List size={13}/></TB>
              <TB title="Font size +" onClick={()=>cmd('fontSize', '5')}><span className="text-xs font-bold">A+</span></TB>
              <TB title="Font size -" onClick={()=>cmd('fontSize', '2')}><span className="text-xs">A-</span></TB>
              <div className="w-px h-5 bg-dark-600 mx-1" />
              <input type="color" title="Text color" defaultValue="#ffffff"
                onChange={e=>cmd('foreColor', e.target.value)}
                className="w-7 h-7 rounded cursor-pointer bg-transparent border-0 p-0.5" />
            </div>

            {/* Document title */}
            <div className="px-12 pt-10 pb-4 bg-dark-950">
              <input value={title} onChange={e=>setTitle(e.target.value)} onBlur={()=>autoSave()}
                placeholder="Document title…"
                className="w-full bg-transparent text-3xl font-bold text-white focus:outline-none placeholder-gray-700"
                style={{ fontFamily:'Inter,sans-serif', letterSpacing:'-0.5px' }} />
            </div>

            {/* Content area */}
            <div className="flex-1 overflow-y-auto px-12 pb-16">
              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={() => { autoSave(); countWords(); }}
                style={{
                  minHeight: 400, outline: 'none',
                  fontSize: 15, lineHeight: 1.8, color: '#d1d5db',
                  fontFamily: 'Inter, sans-serif',
                }}
                data-placeholder="Start writing…"
              />
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-dark-950 text-gray-600 flex-col gap-4">
            <FileText size={64} className="opacity-20" />
            <p className="text-lg font-medium">Select or create a document</p>
            <button onClick={createDoc} className="btn-primary"><Plus size={16}/> New Document</button>
          </div>
        )}
      </div>

      <style>{`
        [contenteditable]:empty:before { content: attr(data-placeholder); color: #374151; pointer-events:none; }
        [contenteditable] h1 { font-size:26px; font-weight:700; color:#fff; margin:16px 0 8px; }
        [contenteditable] h2 { font-size:20px; font-weight:600; color:#e5e7eb; margin:14px 0 6px; }
        [contenteditable] h3 { font-size:16px; font-weight:600; color:#d1d5db; margin:12px 0 4px; }
        [contenteditable] ul,ol { padding-left:24px; margin:8px 0; }
        [contenteditable] li { margin:4px 0; }
      `}</style>
    </div>
  );
}
