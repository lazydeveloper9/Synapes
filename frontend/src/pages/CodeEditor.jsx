import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { ArrowLeft, Plus, Trash2, Save, Download, Play, Square as Stop, Search, Terminal, Share2, Check } from 'lucide-react';
import { usePresence } from '../hooks/usePresence';
import PresenceNav from '../components/PresenceNav';
import VoiceChannel from '../components/VoiceChannel';
import { useNotify, NotificationBell } from '../components/NotificationSystem';

/* ─── constants ─────────────────────────────────────────────────────────── */
const STORAGE_KEY = 'synapse_code';

const LANGS = [
  { id: 'javascript', label: 'JavaScript', ext: 'js',   comment: '//', runnable: true  },
  { id: 'typescript', label: 'TypeScript', ext: 'ts',   comment: '//', runnable: false },
  { id: 'python',     label: 'Python',     ext: 'py',   comment: '#',  runnable: false },
  { id: 'html',       label: 'HTML',       ext: 'html', comment: '<!--', runnable: true },
  { id: 'css',        label: 'CSS',        ext: 'css',  comment: '/*', runnable: false },
  { id: 'json',       label: 'JSON',       ext: 'json', comment: null, runnable: false },
  { id: 'markdown',   label: 'Markdown',   ext: 'md',   comment: null, runnable: false },
  { id: 'bash',       label: 'Bash',       ext: 'sh',   comment: '#',  runnable: false },
];

const THEMES = {
  dark:  { bg: '#0d0d0d', line: '#1a1a1a', text: '#d4d4d4', lineNo: '#3a3a3a', kw: '#c678dd', str: '#98c379', num: '#d19a66', fn: '#61afef', com: '#5c6370' },
  mocha: { bg: '#1e1e2e', line: '#2a2a3e', text: '#cdd6f4', lineNo: '#45475a', kw: '#cba6f7', str: '#a6e3a1', num: '#fab387', fn: '#89b4fa', com: '#6c7086' },
  light: { bg: '#fafafa', line: '#f0f0f0', text: '#383a42', lineNo: '#c0c0c0', kw: '#a626a4', str: '#50a14f', num: '#986801', fn: '#4078f2', com: '#9ea1a7' },
};

const loadFiles  = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; } };
const saveFiles  = (f) => localStorage.setItem(STORAGE_KEY, JSON.stringify(f));
const timeAgo    = (ts) => { const m=Math.floor((Date.now()-ts)/60000); return m<60?`${m}m ago`:m<1440?`${Math.floor(m/60)}h ago`:`${Math.floor(m/1440)}d ago`; };
const newFile    = (lang='javascript') => ({ id: Date.now().toString(), name: `untitled.${LANGS.find(l=>l.id===lang)?.ext||'js'}`, lang, code: LANGS.find(l=>l.id===lang)?.id==='javascript'?'// Welcome to Synapse Code!\nconsole.log("Hello, world!");\n':'', updatedAt: Date.now() });

/* ─── syntax highlighter (simple regex-based) ────────────────────────────── */
const highlight = (code, langId) => {
  if (!code) return '';
  const esc = code.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  if (langId === 'json') {
    return esc
      .replace(/"([^"]+)"(\s*:)/g, '<span style="color:#61afef">"$1"</span>$2')
      .replace(/:\s*"([^"]*)"/g, ': <span style="color:#98c379">"$1"</span>')
      .replace(/:\s*(\d+\.?\d*)/g, ': <span style="color:#d19a66">$1</span>')
      .replace(/:\s*(true|false|null)/g, ': <span style="color:#c678dd">$1</span>');
  }

  if (langId === 'html') {
    return esc
      .replace(/(&lt;\/?)([\w-]+)/g, '$1<span style="color:#e06c75">$2</span>')
      .replace(/([\w-]+)(=)/g, '<span style="color:#d19a66">$1</span>$2')
      .replace(/="([^"]*)"/g, '="<span style="color:#98c379">$1</span>"')
      .replace(/&lt;!--[\s\S]*?--&gt;/g, m=>`<span style="color:#5c6370">${m}</span>`);
  }

  if (langId === 'css') {
    return esc
      .replace(/([\w-]+)\s*:/g, '<span style="color:#61afef">$1</span>:')
      .replace(/:\s*([^;{}\n]+)/g, ': <span style="color:#98c379">$1</span>')
      .replace(/\/\*[\s\S]*?\*\//g, m=>`<span style="color:#5c6370">${m}</span>`);
  }

  // JS/TS/Python/Bash
  const keywords = langId==='python'
    ? ['def','class','import','from','return','if','elif','else','for','while','try','except','with','as','in','not','and','or','True','False','None','print','lambda','pass','break','continue','yield']
    : ['const','let','var','function','return','if','else','for','while','switch','case','break','continue','class','extends','import','export','default','async','await','try','catch','finally','new','this','typeof','instanceof','void','null','undefined','true','false','of','in','from','throw'];

  let result = esc;
  // strings
  result = result.replace(/(["'`])(?:(?!\1)[^\\]|\\.)*?\1/g, m=>`<span style="color:#98c379">${m}</span>`);
  // comments
  result = result.replace(/(\/\/[^\n]*)/g, '<span style="color:#5c6370">$1</span>');
  result = result.replace(/(#[^\n]*)/g, '<span style="color:#5c6370">$1</span>');
  // numbers
  result = result.replace(/\b(\d+\.?\d*)\b/g, '<span style="color:#d19a66">$1</span>');
  // keywords
  keywords.forEach(kw => {
    result = result.replace(new RegExp(`\\b(${kw})\\b`, 'g'), '<span style="color:#c678dd">$1</span>');
  });
  // function names
  result = result.replace(/\b([a-zA-Z_$][\w$]*)\s*\(/g, '<span style="color:#61afef">$1</span>(');
  return result;
};

/* ─── CodeEditor ─────────────────────────────────────────────────────────── */
export default function CodeEditor() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const textareaRef = useRef(null);
  const autoRef     = useRef(null);
  const iframeRef   = useRef(null);

  const [files,    setFiles]    = useState(loadFiles);
  const [activeId, setActiveId] = useState(null);
  const [search,   setSearch]   = useState('');
  const [themeKey, setThemeKey] = useState('dark');
  const [output,   setOutput]   = useState([]);
  const [running,  setRunning]  = useState(false);
  const [showOut,  setShowOut]  = useState(false);
  const [fontSize, setFontSize] = useState(14);
  const [copied,   setCopied]   = useState(false);
  const { notifyOpen } = useNotify();

  const theme = THEMES[themeKey];
  const file  = files.find(f => f.id === activeId);
  const lang  = LANGS.find(l => l.id === file?.lang) || LANGS[0];

  const { presence, notifications } = usePresence(activeId ? `code-${activeId}` : null);

  const persist = (silent=false) => {
    if (!activeId) return;
    setFiles(prev => {
      const updated = prev.map(f => f.id===activeId ? { ...f, updatedAt: Date.now() } : f);
      saveFiles(updated);
      return updated;
    });
    if (!silent) toast.success('Saved! ✓');
  };

  const autoSave = () => { clearTimeout(autoRef.current); autoRef.current = setTimeout(()=>persist(true), 1500); };

  const updateCode = (code) => {
    setFiles(prev => {
      const updated = prev.map(f => f.id===activeId ? { ...f, code, updatedAt: Date.now() } : f);
      saveFiles(updated);
      return updated;
    });
    autoSave();
  };

  const createFile = (langId='javascript') => {
    const f = newFile(langId);
    const updated = [f, ...files];
    setFiles(updated); saveFiles(updated); openFile(f);
  };

  const openFile = (f) => {
    notifyOpen('code', f.name);
    setActiveId(f.id);
  };

  const deleteFile = (id, e) => {
    e.stopPropagation();
    if (!confirm('Delete this file?')) return;
    const updated = files.filter(f => f.id !== id);
    setFiles(updated); saveFiles(updated);
    if (activeId === id) setActiveId(null);
  };

  const downloadFile = () => {
    if (!file) return;
    const blob = new Blob([file.code], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a'); a.href=url; a.download=file.name; a.click();
    URL.revokeObjectURL(url);
    toast.success('File downloaded!');
  };

  /* ── JS runner ── */
  const runCode = () => {
    if (!file) return;
    setRunning(true); setShowOut(true); setOutput([]);

    if (file.lang === 'html') {
      // render HTML in iframe
      setOutput([{ type:'info', text:'Rendering HTML…' }]);
      setRunning(false);
      return;
    }

    // Capture console.log
    const logs = [];
    const origLog  = console.log;
    const origErr  = console.error;
    const origWarn = console.warn;
    console.log  = (...a) => { logs.push({ type:'log',  text:a.map(String).join(' ') }); origLog(...a);  };
    console.error= (...a) => { logs.push({ type:'err',  text:a.map(String).join(' ') }); origErr(...a);  };
    console.warn = (...a) => { logs.push({ type:'warn', text:a.map(String).join(' ') }); origWarn(...a); };

    try {
      // eslint-disable-next-line no-new-func
      const fn = new Function(file.code);
      const result = fn();
      if (result !== undefined) logs.push({ type:'result', text: String(result) });
      if (logs.length === 0) logs.push({ type:'info', text:'✓ Ran successfully (no output)' });
    } catch (err) {
      logs.push({ type:'err', text: `❌ ${err.message}` });
    }

    console.log  = origLog;
    console.error= origErr;
    console.warn = origWarn;
    setOutput(logs);
    setRunning(false);
  };

  const handleTab = (e) => {
    if (e.key !== 'Tab') return;
    e.preventDefault();
    const el  = textareaRef.current;
    const start = el.selectionStart;
    const end   = el.selectionEnd;
    const code  = file?.code || '';
    const next  = code.slice(0, start) + '  ' + code.slice(end);
    updateCode(next);
    setTimeout(() => { el.selectionStart = el.selectionEnd = start + 2; }, 0);
  };

  const lines = (file?.code || '').split('\n');
  const filtered = files.filter(f => f.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="h-screen bg-dark-900 flex flex-col overflow-hidden">

      {/* Nav */}
      <nav className="h-12 bg-dark-800 border-b border-dark-600 flex items-center px-4 gap-3 shrink-0 z-50">
        <button onClick={()=>navigate('/hub')} className="tool-btn"><ArrowLeft size={16}/></button>
        <div className="w-px h-6 bg-dark-600"/>
        <span className="font-bold text-sm">💻 Synapse Code</span>
        <div className="flex-1"/>
        {provider && localUser && <VoiceChannel provider={provider} localUser={localUser} />}
        <PresenceNav presence={presence} notifications={notifications} />
        <div className="w-px h-6 bg-dark-600 mx-2"/>

        {/* Theme */}
        {['dark','mocha','light'].map(t => (
          <button key={t} onClick={()=>setThemeKey(t)}
            className={`text-xs px-2 py-1 rounded ${themeKey===t?'bg-accent text-white':'bg-dark-700 text-gray-400 hover:text-white'}`}>{t}</button>
        ))}

        {/* Font size */}
        <div className="flex items-center gap-1 bg-dark-700 rounded px-2 py-1">
          <button onClick={()=>setFontSize(s=>Math.max(10,s-1))} className="text-gray-400 hover:text-white text-xs">A-</button>
          <span className="text-xs text-gray-300 w-6 text-center">{fontSize}</span>
          <button onClick={()=>setFontSize(s=>Math.min(22,s+1))} className="text-gray-400 hover:text-white text-xs">A+</button>
        </div>

        {file && (
          <>
            {lang.runnable && (
              <button onClick={runCode} className="btn-primary text-xs px-3 py-1.5 h-8"><Play size={13}/> Run</button>
            )}
            <button onClick={downloadFile} className="btn-secondary text-xs px-3 py-1.5 h-8"><Download size={13}/></button>
            <button onClick={()=>persist(false)} className="btn-primary text-xs px-3 py-1.5 h-8"><Save size={13}/> Save</button>
            <button onClick={()=>{ const url=`${window.location.origin}/code?room=${file.id}`; navigator.clipboard.writeText(url).catch(()=>{}); setCopied(true); setTimeout(()=>setCopied(false),2000); toast.success('Shareable link copied!'); }} className="btn-secondary text-xs px-3 py-1.5 h-8" style={{color:copied?'#22c55e':undefined}}>
              {copied?<Check size={13}/>:<Share2 size={13}/>} {copied?'Copied!':'Share'}
            </button>
          </>
        )}
        <NotificationBell />
        <button onClick={logout} className="text-gray-500 hover:text-red-400 text-xs ml-1">Sign out</button>
      </nav>

      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar */}
        <aside className="w-52 bg-dark-800 border-r border-dark-600 flex flex-col shrink-0">
          <div className="p-3 border-b border-dark-600 flex gap-2">
            <div className="relative flex-1">
              <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500"/>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search files…"
                className="w-full bg-dark-700 border border-dark-600 rounded pl-6 pr-2 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-accent"/>
            </div>
            {/* Language quick-create dropdown */}
            <select onChange={e=>{ createFile(e.target.value); e.target.value=''; }}
              value=""
              className="bg-accent text-white text-xs rounded px-1 cursor-pointer focus:outline-none w-8">
              <option value="" disabled>+</option>
              {LANGS.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
            </select>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {filtered.length === 0
              ? <div className="text-center py-10 text-gray-600 text-xs">
                  <Terminal size={28} className="mx-auto mb-2 opacity-30"/>
                  <p>No files yet</p>
                  <button onClick={()=>createFile()} className="mt-2 text-accent hover:underline">Create one →</button>
                </div>
              : filtered.map(f => (
                <div key={f.id} onClick={()=>openFile(f)}
                  className={`p-2.5 rounded-lg cursor-pointer mb-1 group flex items-center gap-2 transition-colors ${activeId===f.id?'bg-dark-600 border border-accent/30':'hover:bg-dark-700'}`}>
                  <span className="text-xs font-mono" style={{ color: LANGS.find(l=>l.id===f.lang)?.id==='javascript'?'#f0d060':LANGS.find(l=>l.id===f.lang)?.id==='python'?'#4ec9b0':'#9cdcfe' }}>
                    {LANGS.find(l=>l.id===f.lang)?.ext||'?'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-white truncate">{f.name}</p>
                    <p className="text-[10px] text-gray-600">{timeAgo(f.updatedAt)}</p>
                  </div>
                  <button onClick={e=>deleteFile(f.id,e)} className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400"><Trash2 size={11}/></button>
                </div>
              ))
            }
          </div>
        </aside>

        {/* Editor + output */}
        {file ? (
          <div className="flex-1 flex flex-col overflow-hidden" style={{ background: theme.bg }}>

            {/* File tab bar */}
            <div style={{ height:36, background:'#111', borderBottom:'1px solid #1e1e1e', display:'flex', alignItems:'center', padding:'0 12px', gap:8, flexShrink:0 }}>
              <span style={{ fontSize:12, color:'#888', fontFamily:'monospace' }}>{file.name}</span>
              <span style={{ fontSize:11, padding:'1px 6px', borderRadius:4, background:'#1e1e1e', color:'#555' }}>{lang.label}</span>
              <div style={{ flex:1 }}/>
              <span style={{ fontSize:11, color:'#444' }}>{lines.length} lines</span>
              <button onClick={()=>setShowOut(o=>!o)} style={{ fontSize:11, background:'#1e1e1e', border:'1px solid #2e2e2e', borderRadius:4, padding:'2px 8px', color: showOut?'#6366f1':'#888', cursor:'pointer' }}>
                <Terminal size={11} style={{ display:'inline', marginRight:4 }}/>Output
              </button>
            </div>

            {/* Code editor */}
            <div style={{ flex: showOut ? '0 0 60%' : 1, display:'flex', overflow:'hidden', position:'relative' }}>
              {/* Line numbers */}
              <div style={{ width:42, background: theme.line, borderRight:'1px solid #1e1e1e', padding:'12px 0', overflow:'hidden', flexShrink:0, userSelect:'none' }}>
                {lines.map((_, i) => (
                  <div key={i} style={{ height: fontSize*1.8, lineHeight:`${fontSize*1.8}px`, textAlign:'right', paddingRight:8, fontSize:fontSize-2, color: theme.lineNo, fontFamily:'JetBrains Mono,monospace' }}>
                    {i+1}
                  </div>
                ))}
              </div>

              {/* Syntax highlight overlay */}
              <div style={{ position:'absolute', left:42, top:0, right:0, bottom:0, padding:'12px 16px', pointerEvents:'none', overflow:'hidden', whiteSpace:'pre', fontFamily:'JetBrains Mono,monospace', fontSize, lineHeight:1.8, color: theme.text }}>
                <div dangerouslySetInnerHTML={{ __html: highlight(file.code, file.lang) }} />
              </div>

              {/* Transparent textarea on top */}
              <textarea
                ref={textareaRef}
                value={file.code}
                onChange={e => updateCode(e.target.value)}
                onKeyDown={handleTab}
                spellCheck={false}
                style={{
                  flex:1, padding:'12px 16px', background:'transparent',
                  border:'none', outline:'none', resize:'none', color:'transparent',
                  caretColor: theme.text, fontFamily:'JetBrains Mono,monospace',
                  fontSize, lineHeight:1.8, whiteSpace:'pre', overflowWrap:'normal',
                  overflow:'auto',
                }}
              />
            </div>

            {/* Output panel */}
            {showOut && (
              <div style={{ flex:'0 0 40%', borderTop:'1px solid #1e1e1e', background:'#080808', display:'flex', flexDirection:'column', overflow:'hidden' }}>
                <div style={{ height:32, display:'flex', alignItems:'center', padding:'0 12px', gap:8, borderBottom:'1px solid #1e1e1e', flexShrink:0 }}>
                  <Terminal size={13} style={{ color:'#555' }}/>
                  <span style={{ fontSize:11, color:'#555' }}>Output</span>
                  <div style={{ flex:1 }}/>
                  <button onClick={()=>setOutput([])} style={{ fontSize:11, color:'#555', background:'none', border:'none', cursor:'pointer' }}>Clear</button>
                </div>
                <div style={{ flex:1, overflow:'auto', padding:'8px 12px' }}>
                  {output.length === 0
                    ? <p style={{ color:'#333', fontSize:12, fontFamily:'monospace' }}>No output yet. Click Run.</p>
                    : output.map((o,i) => (
                      <p key={i} style={{ fontSize:13, fontFamily:'JetBrains Mono,monospace', lineHeight:1.7,
                        color: o.type==='err'?'#f87171':o.type==='warn'?'#fbbf24':o.type==='result'?'#a5b4fc':'#6ee7b7' }}>
                        {o.type==='err'?'⨯':o.type==='warn'?'⚠':o.type==='result'?'←':'›'} {o.text}
                      </p>
                    ))
                  }
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-600 flex-col gap-4" style={{ background:'#0d0d0d' }}>
            <Terminal size={64} className="opacity-20"/>
            <p className="text-lg font-medium">Select or create a file</p>
            <button onClick={()=>createFile()} className="btn-primary"><Plus size={16}/> New File</button>
          </div>
        )}
      </div>
    </div>
  );
}
