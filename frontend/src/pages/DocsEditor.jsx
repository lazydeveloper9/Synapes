import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import { usePresence } from '../hooks/usePresence';
import PresenceNav from '../components/PresenceNav';
import VoiceChannel from '../components/VoiceChannel';
import { useNotify, NotificationBell } from '../components/NotificationSystem';
import { useAIWorkspace } from '../hooks/useAIWorkspace';
import AIPromptMenu, { AISelectionBubble } from '../components/AIPromptMenu';

import {
  ArrowLeft, Plus, Trash2, Save, Download, FileText,
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight,
  List, Search, Share2,
} from 'lucide-react';

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

/* ─── Editor Component ───────────────────────────────────────────────────── */
function TiptapRoom({ id, title, setTitle, persist, ydoc, provider, localUser, status }) {

  const editor = useEditor({
    extensions: provider ? [
      StarterKit.configure({ history: false }),
      Collaboration.configure({ document: ydoc }),
      CollaborationCursor.configure({
        provider: provider,
        user: localUser,
      }),
    ] : [],
    content: "",
    editable: true,
  }, [provider]);

  const { aiMenuPos, contextText, closeMenu, selectionBubble, openFromBubble, closeBubble } = useAIWorkspace({
    getEditorSelection: () => {
      // Tiptap native selection mapping (more reliable than window obj)
      if (!editor) return "";
      const { from, to } = editor.state.selection;
      return editor.state.doc.textBetween(from, to, ' ');
    }
  });

  if (!editor) return <div className="flex-1 flex items-center justify-center bg-dark-950"><div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin"/></div>;

  const exportTXT = () => {
    const text = editor.getText();
    const blob = new Blob([`${title}\n\n${text}`], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a'); a.href = url; a.download = `${title}.txt`; a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported as TXT!');
  };

  const shareRoom = () => {
    const link = `${window.location.origin}/docs?room=${id}`;
    navigator.clipboard.writeText(link);
    toast.success('Workspace link copied to clipboard!');
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-dark-950">
      {/* Action Bar (Save/Export/Share) */}
      <div className="absolute top-2 right-4 flex items-center gap-2 z-50">
        <span className="text-xs flex items-center px-2 mr-2" style={{color: status === "connected" ? "#4ade80" : "#fbbf24"}}>
          {status === "connected" ? "● Connected" : "● Reconnecting..."}
        </span>
        <button onClick={shareRoom} className="btn-primary text-xs px-3 py-1.5 h-8 bg-indigo-600 hover:bg-indigo-500 flex items-center gap-1"><Share2 size={13}/> Share</button>
        <button onClick={exportTXT}  className="btn-secondary text-xs px-3 py-1.5 h-8"><Download size={13}/> TXT</button>
        <button onClick={() => persist(false)} className="btn-primary text-xs px-3 py-1.5 h-8"><Save size={13}/> Save</button>
      </div>

      {/* Formatting toolbar */}
      <div className="h-10 bg-dark-800 border-b border-dark-600 flex items-center px-4 gap-1 shrink-0 mt-2">
        <select onChange={e => {
            if(e.target.value === "") editor.chain().focus().setParagraph().run();
            else editor.chain().focus().toggleHeading({ level: parseInt(e.target.value) }).run();
          }} 
          className="bg-dark-700 border border-dark-600 text-gray-300 text-xs rounded px-2 py-1 mr-2 focus:outline-none">
          <option value="">Normal</option>
          <option value="1">Heading 1</option>
          <option value="2">Heading 2</option>
          <option value="3">Heading 3</option>
        </select>
        <div className="w-px h-5 bg-dark-600 mx-1" />
        <TB title="Bold"   active={editor.isActive('bold')}   onClick={()=>editor.chain().focus().toggleBold().run()}><Bold size={13}/></TB>
        <TB title="Italic" active={editor.isActive('italic')} onClick={()=>editor.chain().focus().toggleItalic().run()}><Italic size={13}/></TB>
        <TB title="Bullet list" active={editor.isActive('bulletList')} onClick={()=>editor.chain().focus().toggleBulletList().run()}><List size={13}/></TB>
      </div>

      {/* Document title */}
      <div className="px-12 pt-10 pb-4 bg-dark-950">
        <input value={title} onChange={e=>setTitle(e.target.value)}
          placeholder="Document title…"
          className="w-full bg-transparent text-3xl font-bold text-white focus:outline-none placeholder-gray-700"
          style={{ fontFamily:'Inter,sans-serif', letterSpacing:'-0.5px' }} />
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto px-12 pb-16 tiptap-wrapper">
        <EditorContent editor={editor} style={{ minHeight: 400, outline: 'none', fontSize: 15, lineHeight: 1.8, color: '#d1d5db' }}  />
        
        {/* Floating AI bubble (appears on text selection) */}
        <AISelectionBubble bubble={selectionBubble} onOpen={openFromBubble} onClose={closeBubble} />
        {/* Universal AI Menu Popup */}
        <AIPromptMenu 
          position={aiMenuPos} 
          contextText={contextText} 
          onClose={closeMenu} 
          onInsert={(generatedText) => {
             // Insert at cursor or replace selection
             editor.commands.insertContent(generatedText);
             editor.commands.focus();
          }}
        />
      </div>

      <style>{`
        .tiptap-wrapper .ProseMirror:focus { outline: none; }
        .tiptap-wrapper h1 { font-size:26px; font-weight:700; color:#fff; margin:16px 0 8px; }
        .tiptap-wrapper h2 { font-size:20px; font-weight:600; color:#e5e7eb; margin:14px 0 6px; }
        .tiptap-wrapper h3 { font-size:16px; font-weight:600; color:#d1d5db; margin:12px 0 4px; }
        .tiptap-wrapper ul { padding-left:24px; margin:8px 0; list-style-type: disc; }
        .tiptap-wrapper p.is-editor-empty:first-child::before {
          content: 'Start writing collaboratively…'; color: #374151; float: left; height: 0; pointer-events: none;
        }
        /* Cursor styles for collaboration */
        .collaboration-cursor__caret { position: relative; margin-left: -1px; margin-right: -1px; border-left: 2px solid #0D0D0D; word-break: normal; pointer-events: none; }
        .collaboration-cursor__label { position: absolute; top: -1.4em; left: -1px; font-size: 12px; font-style: normal; font-weight: 600; line-height: normal; white-space: nowrap; border-radius: 4px; padding: 2px 6px; pointer-events: none; }
      `}</style>
    </div>
  );
}

/* ─── DocsEditor ─────────────────────────────────────────────────────────── */
export default function DocsEditor() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [docs, setDocs] = useState(loadDocs);
  const [activeId, setActiveId] = useState(null);
  const [search, setSearch] = useState('');
  
  // Local state for active document title
  const [title, setTitle] = useState('');
  const { notifyOpen } = useNotify();

  const activeDoc = docs.find(d => d.id === activeId);
  const { presence, notifications, ydoc, provider, localUser, status } = usePresence(activeId ? `docs-${activeId}` : null);

  // Auto-join shared link via URL '?room=xyz'
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const roomParam = searchParams.get('room');
    if (roomParam) {
      const existing = docs.find(d => d.id === roomParam);
      if (!existing) {
        const d = { id: roomParam, title: 'Shared Document', content: '', updatedAt: Date.now() };
        const updated = [d, ...docs];
        setDocs(updated);
        saveDocs(updated);
        setTitle('Shared Document');
      } else {
        setTitle(existing.title);
      }
      setActiveId(roomParam);
      window.history.replaceState(null, '', window.location.pathname);
      toast.success('Joined remote workspace!');
    }
  }, [docs]);

  const persist = useCallback((silent = false) => {
    if (!activeId) return;
    const updated = docs.map(d => d.id === activeId ? { ...d, title, updatedAt: Date.now() } : d);
    setDocs(updated);
    saveDocs(updated);
    if (!silent) toast.success('Saved title metadata!');
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
    if (!window.confirm('Delete this document from local list?')) return;
    const updated = docs.filter(d => d.id !== id);
    setDocs(updated);
    saveDocs(updated);
    if (activeId === id) { setActiveId(null); setTitle(''); }
    toast.success('Document deleted');
  };

  const openDoc = (d) => {
    notifyOpen('docs', d.title);
    // save current title before switching
    if (activeId) {
      persist(true);
    }
    setActiveId(d.id);
    setTitle(d.title);
  };

  const filtered = docs.filter(d => d.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="h-screen bg-dark-900 flex flex-col overflow-hidden relative">
      {/* Nav */}
      <nav className="h-12 bg-dark-800 border-b border-dark-600 flex items-center px-4 gap-3 shrink-0 z-50">
        <button onClick={() => navigate('/hub')} className="tool-btn"><ArrowLeft size={16} /></button>
        <div className="w-px h-6 bg-dark-600" />
        <span className="font-bold text-sm">📝 Synapse Docs - Live Collaboration</span>
        <div className="flex-1" />
        {provider && localUser && <VoiceChannel provider={provider} localUser={localUser} />}
        <PresenceNav presence={presence} notifications={notifications} />
        <div className="w-px h-6 bg-dark-600 mx-2" />
        <NotificationBell />
        <button onClick={logout} className="text-gray-500 hover:text-red-400 text-xs ml-2">Sign out</button>
      </nav>

      <div className="flex flex-1 overflow-hidden relative">
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
          <TiptapRoom 
            key={activeId} 
            id={activeId} 
            title={title} 
            setTitle={setTitle}
            persist={persist} 
            ydoc={ydoc}
            provider={provider}
            localUser={localUser}
            status={status}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-dark-950 text-gray-600 flex-col gap-4">
            <FileText size={64} className="opacity-20" />
            <p className="text-lg font-medium">Select or create a document</p>
            <button onClick={createDoc} className="btn-primary"><Plus size={16}/> New Document</button>
          </div>
        )}
      </div>
    </div>
  );
}
