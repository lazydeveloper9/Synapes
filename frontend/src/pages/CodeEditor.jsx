import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { ArrowLeft, Plus, Trash2, Save, Download, Play, Search, Terminal, Share2, Check, MessageSquare, Send, Loader2, Lightbulb, AlertTriangle, Info, Sparkles, Users } from 'lucide-react';
import { useNotify, NotificationBell } from '../components/NotificationSystem';
import { io } from 'socket.io-client';

/* ─── Constants ─────────────────────────────────────────────────────────── */
const STORAGE_KEY = 'synapse_code';
const SOCKET_URL  = 'http://localhost:5000';
const API_BASE    = 'http://localhost:5000/api';

const LANGS = [
  { id:'javascript', label:'JavaScript', ext:'js',   runnable:true  },
  { id:'typescript', label:'TypeScript', ext:'ts',   runnable:false },
  { id:'python',     label:'Python',     ext:'py',   runnable:false },
  { id:'html',       label:'HTML',       ext:'html', runnable:true  },
  { id:'css',        label:'CSS',        ext:'css',  runnable:false },
  { id:'json',       label:'JSON',       ext:'json', runnable:false },
  { id:'markdown',   label:'Markdown',   ext:'md',   runnable:false },
  { id:'bash',       label:'Bash',       ext:'sh',   runnable:false },
];

const THEMES = {
  dark:  { bg:'#0d0d0d', line:'#1a1a1a', text:'#d4d4d4', lineNo:'#3a3a3a' },
  mocha: { bg:'#1e1e2e', line:'#2a2a3e', text:'#cdd6f4', lineNo:'#45475a' },
  light: { bg:'#fafafa', line:'#f0f0f0', text:'#383a42', lineNo:'#c0c0c0' },
};

const loadFiles = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; } };
const saveFiles = (f) => localStorage.setItem(STORAGE_KEY, JSON.stringify(f));
const timeAgo   = (ts) => { const m=Math.floor((Date.now()-ts)/60000); return m<60?`${m}m ago`:m<1440?`${Math.floor(m/60)}h ago`:`${Math.floor(m/1440)}d ago`; };
const newFile   = (lang='javascript') => ({ id:Date.now().toString(), name:`untitled.${LANGS.find(l=>l.id===lang)?.ext||'js'}`, lang, code:lang==='javascript'?'// Welcome to Synapse Code!\nconsole.log("Hello, world!");\n':'', updatedAt:Date.now() });

/* ─── Syntax highlighter ─────────────────────────────────────────────────── */
const highlight = (code, langId) => {
  if(!code) return '';
  const esc=code.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  if(langId==='json') return esc.replace(/"([^"]+)"(\s*:)/g,'<span style="color:#61afef">"$1"</span>$2').replace(/:\s*"([^"]*)"/g,': <span style="color:#98c379">"$1"</span>').replace(/:\s*(\d+\.?\d*)/g,': <span style="color:#d19a66">$1</span>').replace(/:\s*(true|false|null)/g,': <span style="color:#c678dd">$1</span>');
  if(langId==='html') return esc.replace(/(&lt;\/?)([\w-]+)/g,'$1<span style="color:#e06c75">$2</span>').replace(/([\w-]+)(=)/g,'<span style="color:#d19a66">$1</span>$2').replace(/="([^"]*)"/g,'="<span style="color:#98c379">$1</span>"').replace(/&lt;!--[\s\S]*?--&gt;/g,m=>`<span style="color:#5c6370">${m}</span>`);
  if(langId==='css') return esc.replace(/([\w-]+)\s*:/g,'<span style="color:#61afef">$1</span>:').replace(/:\s*([^;{}\n]+)/g,': <span style="color:#98c379">$1</span>').replace(/\/\*[\s\S]*?\*\//g,m=>`<span style="color:#5c6370">${m}</span>`);
  const kws=langId==='python'?['def','class','import','from','return','if','elif','else','for','while','try','except','with','as','in','not','and','or','True','False','None','print','lambda','pass','break','continue','yield']:['const','let','var','function','return','if','else','for','while','switch','case','break','continue','class','extends','import','export','default','async','await','try','catch','finally','new','this','typeof','instanceof','void','null','undefined','true','false','of','in','from','throw'];
  let r=esc;
  r=r.replace(/(["'`])(?:(?!\1)[^\\]|\\.)*?\1/g,m=>`<span style="color:#98c379">${m}</span>`);
  r=r.replace(/(\/\/[^\n]*)/g,'<span style="color:#5c6370">$1</span>');
  r=r.replace(/(#[^\n]*)/g,'<span style="color:#5c6370">$1</span>');
  r=r.replace(/\b(\d+\.?\d*)\b/g,'<span style="color:#d19a66">$1</span>');
  kws.forEach(kw=>{ r=r.replace(new RegExp(`\\b(${kw})\\b`,'g'),'<span style="color:#c678dd">$1</span>'); });
  r=r.replace(/\b([a-zA-Z_$][\w$]*)\s*\(/g,'<span style="color:#61afef">$1</span>(');
  return r;
};

/* ─── AI API calls ───────────────────────────────────────────────────────── */
const aiAnalyze = async (code, lang, error) => {
  try {
    const res=await fetch(`${API_BASE}/codeai/analyze`,{ method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({code,lang,error}) });
    return await res.json();
  } catch { return { issues:[], hints:['API unavailable'], fixed:code }; }
};

const aiSummary = async (code, lang, output, error) => {
  try {
    const res=await fetch(`${API_BASE}/codeai/summary`,{ method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({code,lang,output,error}) });
    return await res.json();
  } catch { return { summary:'Code ran.', suggestions:[] }; }
};

/* ─── CodeEditor ─────────────────────────────────────────────────────────── */
export default function CodeEditor() {
  const navigate=useNavigate();
  const { user, logout }=useAuth();
  const { notifyOpen }=useNotify();
  const textareaRef=useRef(null);
  const autoRef=useRef(null);
  const socketRef=useRef(null);
  const analyzeTimerRef=useRef(null);

  /* Files */
  const [files,     setFiles]     = useState(loadFiles);
  const [activeId,  setActiveId]  = useState(null);
  const [search,    setSearch]    = useState('');
  const [themeKey,  setThemeKey]  = useState('dark');
  const [fontSize,  setFontSize]  = useState(14);
  const [copied,    setCopied]    = useState(false);

  /* Output */
  const [output,    setOutput]    = useState([]);
  const [running,   setRunning]   = useState(false);
  const [showOut,   setShowOut]   = useState(false);

  /* AI Copilot */
  const [issues,         setIssues]         = useState([]);   // [{line, severity, message}]
  const [hints,          setHints]           = useState([]);
  const [aiSuggestion,   setAiSuggestion]   = useState('');   // inline suggestion
  const [aiLoading,      setAiLoading]       = useState(false);
  const [runSummary,     setRunSummary]      = useState(null); // {summary, suggestions}
  const [showCopilot,    setShowCopilot]     = useState(true);
  const [copilotChat,    setCopilotChat]     = useState([]);   // [{role,content}]
  const [copilotInput,   setCopilotInput]    = useState('');
  const [copilotLoading, setCopilotLoading]  = useState(false);

  /* Collab */
  const [peers,     setPeers]     = useState([]);
  const [peerCursors,setPeerCursors]=useState({});  // {socketId: {user,line,col}}
  const [collabRoom,setCollabRoom]=useState('');
  const [connected, setConnected] = useState(false);
  const [chatMsgs,  setChatMsgs]  = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [showChat,  setShowChat]  = useState(false);

  const file=files.find(f=>f.id===activeId);
  const lang=LANGS.find(l=>l.id===file?.lang)||LANGS[0];
  const theme=THEMES[themeKey];

  /* ── Socket.io ── */
  useEffect(()=>{
    const sock=io(SOCKET_URL,{transports:['websocket','polling']});
    socketRef.current=sock;
    sock.on('connect',()=>setConnected(true));
    sock.on('disconnect',()=>{ setConnected(false); setPeers([]); setPeerCursors({}); });
    sock.on('users-update',({users})=>setPeers(users.filter(u=>u.id!==sock.id)));
    sock.on('peer-cursor',({userId,user:u,line,col})=>{
      if(!u){ setPeerCursors(p=>{ const n={...p}; delete n[userId]; return n; }); return; }
      setPeerCursors(p=>({...p,[userId]:{user:u,line,col}}));
    });
    sock.on('peer-code-update',({code,fileId})=>{
      if(fileId!==activeId) return;
      setFiles(prev=>prev.map(f=>f.id===fileId?{...f,code,updatedAt:Date.now()}:f));
    });
    sock.on('room-chat-msg',msg=>setChatMsgs(p=>[...p,msg].slice(-100)));
    return ()=>sock.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  const joinRoom=(name)=>{
    if(!socketRef.current||!name) return;
    setCollabRoom(name);
    socketRef.current.emit('join-room',{ roomId:`code-${name}`, name:user?.name||'Anonymous' });
    toast.success(`Joined room "${name}"!`);
  };

  /* ── Persist ── */
  const persist=useCallback((silent=false)=>{
    if(!activeId) return;
    setFiles(prev=>{ const u=prev.map(f=>f.id===activeId?{...f,updatedAt:Date.now()}:f); saveFiles(u); return u; });
    if(!silent) toast.success('Saved! ✓');
  },[activeId]);

  const autoSave=()=>{ clearTimeout(autoRef.current); autoRef.current=setTimeout(()=>persist(true),2000); };

  /* ── File ops ── */
  const createFile=(lang='javascript')=>{ const f=newFile(lang); const u=[f,...files]; setFiles(u); saveFiles(u); setActiveId(f.id); };
  const deleteFile=(id,e)=>{ e.stopPropagation(); if(!confirm('Delete?')) return; const u=files.filter(f=>f.id!==id); setFiles(u); saveFiles(u); if(activeId===id) setActiveId(null); };
  const openFile=(f)=>{ notifyOpen('code',f.name); setActiveId(f.id); setIssues([]); setHints([]); setRunSummary(null); };

  const updateCode=(code)=>{
    setFiles(prev=>{ const u=prev.map(f=>f.id===activeId?{...f,code,updatedAt:Date.now()}:f); saveFiles(u); return u; });
    // Broadcast to collab peers
    socketRef.current?.emit('code-update',{code,fileId:activeId});
    autoSave();
    // Schedule AI analysis
    clearTimeout(analyzeTimerRef.current);
    analyzeTimerRef.current=setTimeout(()=>runAIAnalysis(code,file?.lang||'javascript'),2500);
  };

  /* ── AI Analysis ── */
  const runAIAnalysis=async(code,lang)=>{
    if(!code||code.length<10) return;
    setAiLoading(true);
    const result=await aiAnalyze(code,lang,null);
    setIssues(result.issues||[]);
    setHints(result.hints||[]);
    setAiLoading(false);
  };

  /* ── Run code ── */
  const runCode=async()=>{
    if(!file) return;
    setRunning(true); setShowOut(true); setOutput([]); setRunSummary(null);

    if(file.lang==='html'){
      setOutput([{ type:'info', text:'Rendering HTML in output…' }]);
      setRunning(false);
      const sum=await aiSummary(file.code,'html','(HTML rendered)',null);
      setRunSummary(sum);
      return;
    }

    const logs=[];
    const origLog=console.log, origErr=console.error, origWarn=console.warn;
    console.log=(...a)=>{ logs.push({type:'log',text:a.map(String).join(' ')}); origLog(...a); };
    console.error=(...a)=>{ logs.push({type:'err',text:a.map(String).join(' ')}); origErr(...a); };
    console.warn=(...a)=>{ logs.push({type:'warn',text:a.map(String).join(' ')}); origWarn(...a); };

    let runtimeError=null;
    try {
      // eslint-disable-next-line no-new-func
      const fn=new Function(file.code);
      const result=fn();
      if(result!==undefined) logs.push({type:'result',text:String(result)});
      if(logs.length===0) logs.push({type:'info',text:'✓ Ran successfully (no output)'});
    } catch(err) {
      runtimeError=err.message;
      logs.push({type:'err',text:`❌ ${err.message}`});
      // AI error analysis
      setAiLoading(true);
      const analysis=await aiAnalyze(file.code,file.lang,err.message);
      setIssues(analysis.issues||[]);
      setHints(analysis.hints||[]);
      setAiLoading(false);
    }

    console.log=origLog; console.error=origErr; console.warn=origWarn;
    setOutput(logs);
    setRunning(false);

    // AI run summary
    const outText=logs.map(l=>l.text).join('\n');
    const sum=await aiSummary(file.code,file.lang,outText,runtimeError);
    setRunSummary(sum);
  };

  /* ── Copilot chat ── */
  const sendCopilotMsg=async()=>{
    if(!copilotInput.trim()||!file) return;
    const userMsg={ role:'user', content:copilotInput.trim() };
    setCopilotChat(prev=>[...prev,userMsg]);
    setCopilotInput('');
    setCopilotLoading(true);

    try {
      const res=await fetch(`${API_BASE}/chat`,{
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          system:`You are an expert coding assistant (Copilot) inside the Synapse code editor. The user is working on a ${file.lang} file named "${file.name}". Current code:\n\`\`\`${file.lang}\n${file.code.slice(0,1500)}\n\`\`\`\nBe concise, practical, and helpful. Format code in backticks.`,
          messages:[...copilotChat,userMsg].slice(-8),
        }),
      });
      const data=await res.json();
      setCopilotChat(prev=>[...prev,{role:'assistant',content:data.reply||'I had trouble generating a response.'}]);
    } catch {
      setCopilotChat(prev=>[...prev,{role:'assistant',content:'Connection error. Check that your backend is running.'}]);
    }
    setCopilotLoading(false);
  };

  /* ── Room chat ── */
  const sendChat=()=>{
    if(!chatInput.trim()) return;
    socketRef.current?.emit('room-chat',{text:chatInput.trim()});
    setChatInput('');
  };

  /* ── Download ── */
  const downloadFile=()=>{
    if(!file) return;
    const blob=new Blob([file.code],{type:'text/plain'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=url; a.download=file.name; a.click();
    URL.revokeObjectURL(url);
    toast.success('Downloaded!');
  };

  const handleTab=(e)=>{
    if(e.key!=='Tab') return;
    e.preventDefault();
    const el=textareaRef.current;
    const start=el.selectionStart, end=el.selectionEnd;
    const code=file?.code||'';
    const next=code.slice(0,start)+'  '+code.slice(end);
    updateCode(next);
    setTimeout(()=>{ el.selectionStart=el.selectionEnd=start+2; },0);
  };

  const onTextareaChange=(e)=>{
    updateCode(e.target.value);
    // Track cursor for collab
    const lines=e.target.value.slice(0,e.target.selectionStart).split('\n');
    socketRef.current?.emit('code-cursor',{ line:lines.length, col:lines[lines.length-1].length });
  };

  const lines=(file?.code||'').split('\n');
  const filtered=files.filter(f=>f.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="h-screen bg-dark-900 flex flex-col overflow-hidden">

      {/* ── Nav ── */}
      <nav className="h-12 bg-dark-800 border-b border-dark-600 flex items-center px-4 gap-2 shrink-0 z-50">
        <button onClick={()=>navigate('/hub')} className="tool-btn"><ArrowLeft size={16}/></button>
        <div className="w-px h-5 bg-dark-600"/>
        <span className="font-bold text-sm">💻 Synapse Code</span>

        {/* Collab room */}
        <div style={{ display:'flex', alignItems:'center', gap:4, background:'#1a1a1a', border:'1px solid #2a2a2a', borderRadius:8, padding:'0 8px', height:28 }}>
          <div style={{ width:7, height:7, borderRadius:'50%', background:connected?'#22c55e':'#555' }}/>
          <input placeholder="Room (up to 22 users)…" style={{ background:'none', border:'none', outline:'none', color:'#aaa', fontSize:11, width:130, fontFamily:'Inter,sans-serif' }}
            onKeyDown={e=>{ if(e.key==='Enter') joinRoom(e.target.value); }}
            onChange={e=>setCollabRoom(e.target.value)} value={collabRoom}
          />
          <button onClick={()=>joinRoom(collabRoom)} style={{ background:'#6366f1', border:'none', borderRadius:5, padding:'2px 7px', color:'#fff', fontSize:10, cursor:'pointer' }}>Join</button>
        </div>

        {/* Peer avatars */}
        <div style={{ display:'flex' }}>
          {peers.slice(0,6).map(p=>(
            <div key={p.id} title={p.name} style={{ width:22, height:22, borderRadius:'50%', background:p.color, border:'2px solid #111', display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:700, color:'#fff', marginLeft:-4 }}>
              {p.name?.[0]?.toUpperCase()}
            </div>
          ))}
          {peers.length>6&&<div style={{ width:22,height:22,borderRadius:'50%',background:'#333',border:'2px solid #111',display:'flex',alignItems:'center',justifyContent:'center',fontSize:8,color:'#888',marginLeft:-4 }}>+{peers.length-6}</div>}
        </div>

        <div className="flex-1"/>

        {/* Theme */}
        {['dark','mocha','light'].map(t=>(
          <button key={t} onClick={()=>setThemeKey(t)} className={`text-xs px-2 py-1 rounded ${themeKey===t?'bg-accent text-white':'bg-dark-700 text-gray-400 hover:text-white'}`}>{t}</button>
        ))}

        {/* Font size */}
        <div className="flex items-center gap-1 bg-dark-700 rounded px-2 py-1">
          <button onClick={()=>setFontSize(s=>Math.max(10,s-1))} className="text-gray-400 hover:text-white text-xs">A-</button>
          <span className="text-xs text-gray-300 w-5 text-center">{fontSize}</span>
          <button onClick={()=>setFontSize(s=>Math.min(22,s+1))} className="text-gray-400 hover:text-white text-xs">A+</button>
        </div>

        {/* Copilot toggle */}
        <button onClick={()=>setShowCopilot(s=>!s)}
          style={{ display:'flex', alignItems:'center', gap:4, padding:'4px 10px', borderRadius:7, border:'none', cursor:'pointer', fontSize:12, fontWeight:600, transition:'all .15s',
            background:showCopilot?'linear-gradient(135deg,#6366f1,#8b5cf6)':'#1a1a1a', color:showCopilot?'#fff':'#888',
            boxShadow:showCopilot?'0 0 16px rgba(99,102,241,0.4)':'none',
          }}
        >
          <Sparkles size={13}/> Copilot
          {aiLoading&&<Loader2 size={11} style={{ animation:'spin .8s linear infinite' }}/>}
          {!aiLoading&&issues.filter(i=>i.severity==='error').length>0&&<span style={{ background:'#ef4444', color:'#fff', borderRadius:10, fontSize:9, padding:'1px 4px', fontWeight:700 }}>{issues.filter(i=>i.severity==='error').length}</span>}
        </button>

        {file&&(
          <>
            {lang.runnable&&<button onClick={runCode} disabled={running} className="btn-primary text-xs px-3 py-1.5 h-8">{running?<Loader2 size={13} style={{ animation:'spin .8s linear infinite' }}/>:<Play size={13}/>} Run</button>}
            <button onClick={downloadFile} className="btn-secondary text-xs px-2 py-1 h-8"><Download size={13}/></button>
            <button onClick={()=>persist(false)} className="btn-primary text-xs px-2 py-1 h-8"><Save size={13}/> Save</button>
          </>
        )}

        {/* Room chat */}
        <button onClick={()=>setShowChat(o=>!o)} style={{ position:'relative', background:showChat?'#6366f1':'#1a1a1a', border:'1px solid #2a2a2a', borderRadius:7, padding:'4px 8px', color:showChat?'#fff':'#777', cursor:'pointer', fontSize:12 }}>
          <MessageSquare size={13} style={{ display:'inline',marginRight:3 }}/>Chat
          {chatMsgs.length>0&&<span style={{ position:'absolute', top:-4, right:-4, width:13,height:13,borderRadius:'50%',background:'#6366f1',fontSize:8,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',border:'2px solid #111' }}>{Math.min(chatMsgs.length,9)}</span>}
        </button>

        <NotificationBell/>
        <button onClick={logout} className="text-gray-500 hover:text-red-400 text-xs ml-1">Sign out</button>
      </nav>

      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar */}
        <aside className="w-48 bg-dark-800 border-r border-dark-600 flex flex-col shrink-0">
          <div className="p-2 border-b border-dark-600 flex gap-1.5">
            <div className="relative flex-1">
              <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-600"/>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search files…"
                className="w-full bg-dark-700 border border-dark-600 rounded pl-6 pr-1 py-1 text-xs text-white placeholder-gray-700 focus:outline-none focus:border-accent"/>
            </div>
            <select onChange={e=>{ createFile(e.target.value); e.target.value=''; }} value=""
              className="bg-accent text-white text-xs rounded px-1 cursor-pointer focus:outline-none w-7">
              <option value="" disabled>+</option>
              {LANGS.map(l=><option key={l.id} value={l.id}>{l.label}</option>)}
            </select>
          </div>
          <div className="flex-1 overflow-y-auto p-1.5">
            {filtered.length===0
              ? <div className="text-center py-8 text-gray-700 text-xs"><Terminal size={24} className="mx-auto mb-1.5 opacity-30"/><p>No files</p><button onClick={()=>createFile()} className="mt-1 text-accent hover:underline text-xs">Create →</button></div>
              : filtered.map(f=>(
                <div key={f.id} onClick={()=>openFile(f)}
                  className={`p-2 rounded-lg cursor-pointer mb-0.5 group flex items-center gap-1.5 transition-colors ${activeId===f.id?'bg-dark-600 border border-accent/30':'hover:bg-dark-700'}`}>
                  <span className="text-xs font-mono" style={{ color:f.lang==='javascript'?'#f0d060':f.lang==='python'?'#4ec9b0':f.lang==='html'?'#e06c75':'#9cdcfe', flexShrink:0 }}>
                    {LANGS.find(l=>l.id===f.lang)?.ext||'?'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-white truncate">{f.name}</p>
                    <p className="text-[9px] text-gray-600">{timeAgo(f.updatedAt)}</p>
                  </div>
                  <button onClick={e=>deleteFile(f.id,e)} className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400"><Trash2 size={10}/></button>
                </div>
              ))
            }
          </div>
        </aside>

        {/* Main editor area */}
        {file ? (
          <div className="flex-1 flex overflow-hidden">

            {/* Editor + output column */}
            <div className="flex-1 flex flex-col overflow-hidden" style={{ background:theme.bg }}>

              {/* File tab */}
              <div style={{ height:34, background:'#111', borderBottom:'1px solid #1e1e1e', display:'flex', alignItems:'center', padding:'0 12px', gap:8, flexShrink:0 }}>
                <span style={{ fontSize:12, color:'#888', fontFamily:'monospace' }}>{file.name}</span>
                <span style={{ fontSize:10, padding:'1px 5px', borderRadius:4, background:'#1e1e1e', color:'#555' }}>{lang.label}</span>
                {issues.length>0&&<span style={{ fontSize:10, color:issues.some(i=>i.severity==='error')?'#f87171':'#fbbf24' }}>⚠ {issues.length} issue{issues.length>1?'s':''}</span>}
                <div style={{ flex:1 }}/>
                <span style={{ fontSize:10, color:'#444' }}>{lines.length} lines</span>
                {/* Peer cursors indicator */}
                {Object.keys(peerCursors).length>0&&<span style={{ fontSize:10, color:'#6366f1' }}><Users size={10} style={{ display:'inline',marginRight:2 }}/>{Object.keys(peerCursors).length} editing</span>}
                <button onClick={()=>setShowOut(o=>!o)} style={{ fontSize:10, background:'#1e1e1e', border:'1px solid #2e2e2e', borderRadius:4, padding:'2px 7px', color:showOut?'#6366f1':'#888', cursor:'pointer' }}>
                  <Terminal size={10} style={{ display:'inline', marginRight:3 }}/>Output
                </button>
              </div>

              {/* Code area */}
              <div style={{ flex:showOut?'0 0 55%':1, display:'flex', overflow:'hidden', position:'relative' }}>
                {/* Line numbers */}
                <div style={{ width:44, background:theme.line, borderRight:'1px solid #1e1e1e', padding:'12px 0', overflow:'hidden', flexShrink:0, userSelect:'none' }}>
                  {lines.map((_,i)=>{
                    const hasIssue=issues.find(x=>x.line===i+1);
                    return (
                      <div key={i} style={{ height:fontSize*1.8, lineHeight:`${fontSize*1.8}px`, textAlign:'right', paddingRight:6, fontSize:fontSize-2, color:hasIssue?( hasIssue.severity==='error'?'#f87171':'#fbbf24'):theme.lineNo, fontFamily:'JetBrains Mono,monospace', position:'relative' }}>
                        {hasIssue&&<span style={{ position:'absolute', left:2, top:'50%', transform:'translateY(-50%)', fontSize:8 }}>{hasIssue.severity==='error'?'●':'◉'}</span>}
                        {i+1}
                      </div>
                    );
                  })}
                </div>

                {/* Syntax highlight overlay */}
                <div style={{ position:'absolute', left:44, top:0, right:0, bottom:0, padding:'12px 16px', pointerEvents:'none', overflow:'hidden', whiteSpace:'pre', fontFamily:'JetBrains Mono,monospace', fontSize, lineHeight:1.8, color:theme.text }}>
                  <div dangerouslySetInnerHTML={{ __html:highlight(file.code,file.lang) }}/>
                </div>

                {/* Peer cursor overlays */}
                {Object.values(peerCursors).map(({user:u,line})=>(
                  <div key={u.id||u.name} style={{ position:'absolute', left:44, top:12+(line-1)*fontSize*1.8, right:0, height:fontSize*1.8, background:`${u.color}18`, pointerEvents:'none', zIndex:2 }}>
                    <span style={{ position:'absolute', right:4, top:0, fontSize:9, color:u.color, fontWeight:700, background:u.color+'22', padding:'0 4px', borderRadius:4 }}>{u.name}</span>
                  </div>
                ))}

                {/* Textarea */}
                <textarea ref={textareaRef} value={file.code} onChange={onTextareaChange} onKeyDown={handleTab} spellCheck={false}
                  style={{ flex:1, padding:'12px 16px', background:'transparent', border:'none', outline:'none', resize:'none', color:'transparent', caretColor:theme.text, fontFamily:'JetBrains Mono,monospace', fontSize, lineHeight:1.8, whiteSpace:'pre', overflowWrap:'normal', overflow:'auto' }}
                />
              </div>

              {/* Output panel */}
              {showOut&&(
                <div style={{ flex:'0 0 45%', borderTop:'1px solid #1e1e1e', background:'#080808', display:'flex', flexDirection:'column', overflow:'hidden' }}>
                  <div style={{ height:30, display:'flex', alignItems:'center', padding:'0 12px', gap:8, borderBottom:'1px solid #1e1e1e', flexShrink:0 }}>
                    <Terminal size={12} style={{ color:'#555' }}/><span style={{ fontSize:11, color:'#555' }}>Output</span>
                    <div style={{ flex:1 }}/>
                    <button onClick={()=>setOutput([])} style={{ fontSize:10, color:'#555', background:'none', border:'none', cursor:'pointer' }}>Clear</button>
                  </div>
                  <div style={{ flex:1, overflow:'auto', padding:'8px 12px' }}>
                    {output.length===0
                      ? <p style={{ color:'#333', fontSize:12, fontFamily:'monospace' }}>No output. Click Run.</p>
                      : output.map((o,i)=>(
                        <p key={i} style={{ fontSize:12, fontFamily:'JetBrains Mono,monospace', lineHeight:1.7, color:o.type==='err'?'#f87171':o.type==='warn'?'#fbbf24':o.type==='result'?'#a5b4fc':'#6ee7b7', margin:'0 0 2px' }}>
                          {o.type==='err'?'⨯':o.type==='warn'?'⚠':o.type==='result'?'←':'›'} {o.text}
                        </p>
                      ))
                    }
                    {/* AI Run Summary */}
                    {runSummary&&(
                      <div style={{ marginTop:10, background:'rgba(99,102,241,0.08)', border:'1px solid rgba(99,102,241,0.2)', borderRadius:8, padding:'10px 12px' }}>
                        <p style={{ fontSize:11, color:'#a5b4fc', fontWeight:600, marginBottom:4, display:'flex', alignItems:'center', gap:4 }}><Sparkles size={11}/>AI Run Summary</p>
                        <p style={{ fontSize:12, color:'#d1d5db', lineHeight:1.6, margin:'0 0 6px' }}>{runSummary.summary}</p>
                        {runSummary.suggestions?.length>0&&(
                          <ul style={{ margin:0, padding:'0 0 0 14px' }}>
                            {runSummary.suggestions.map((s,i)=><li key={i} style={{ fontSize:11, color:'#888', lineHeight:1.6 }}>{s}</li>)}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ── Copilot Panel ── */}
            {showCopilot&&(
              <aside style={{ width:280, background:'#0a0a0f', borderLeft:'1px solid #1a1a2a', display:'flex', flexDirection:'column', flexShrink:0, overflow:'hidden' }}>

                {/* Header */}
                <div style={{ padding:'10px 14px', borderBottom:'1px solid #1a1a2a', background:'linear-gradient(135deg,rgba(99,102,241,0.08),rgba(139,92,246,0.06))', flexShrink:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:2 }}>
                    <Sparkles size={14} style={{ color:'#a5b4fc' }}/>
                    <p style={{ fontSize:13, fontWeight:700, color:'#a5b4fc', margin:0 }}>AI Copilot</p>
                    {aiLoading&&<Loader2 size={11} style={{ color:'#6366f1', animation:'spin .8s linear infinite' }}/>}
                  </div>
                  <p style={{ fontSize:10, color:'#444', margin:0 }}>Live analysis · Error detection · Chat</p>
                </div>

                {/* Issues */}
                {issues.length>0&&(
                  <div style={{ borderBottom:'1px solid #1a1a2a', padding:'8px 12px', flexShrink:0 }}>
                    <p style={{ fontSize:10, fontWeight:600, color:'#555', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:5 }}>Issues ({issues.length})</p>
                    <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                      {issues.slice(0,5).map((issue,i)=>(
                        <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:6, background:issue.severity==='error'?'rgba(239,68,68,0.06)':issue.severity==='warning'?'rgba(251,191,36,0.06)':'rgba(99,102,241,0.06)', borderRadius:6, padding:'6px 8px', border:`1px solid ${issue.severity==='error'?'rgba(239,68,68,0.2)':issue.severity==='warning'?'rgba(251,191,36,0.2)':'rgba(99,102,241,0.15)'}` }}>
                          {issue.severity==='error'?<AlertTriangle size={11} style={{ color:'#f87171', flexShrink:0, marginTop:1 }}/>:issue.severity==='warning'?<AlertTriangle size={11} style={{ color:'#fbbf24', flexShrink:0, marginTop:1 }}/>:<Info size={11} style={{ color:'#a5b4fc', flexShrink:0, marginTop:1 }}/>}
                          <div>
                            {issue.line&&<span style={{ fontSize:9, color:'#555', marginRight:4 }}>L{issue.line}</span>}
                            <span style={{ fontSize:11, color:issue.severity==='error'?'#fca5a5':issue.severity==='warning'?'#fde68a':'#c7d2fe', lineHeight:1.4 }}>{issue.message}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Hints */}
                {hints.length>0&&(
                  <div style={{ borderBottom:'1px solid #1a1a2a', padding:'8px 12px', flexShrink:0 }}>
                    <p style={{ fontSize:10, fontWeight:600, color:'#555', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:5 }}>Hints</p>
                    {hints.map((h,i)=>(
                      <div key={i} style={{ display:'flex', gap:6, alignItems:'flex-start', marginBottom:4 }}>
                        <Lightbulb size={11} style={{ color:'#fbbf24', flexShrink:0, marginTop:1 }}/>
                        <p style={{ fontSize:11, color:'#888', lineHeight:1.5, margin:0 }}>{h}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Chat */}
                <div style={{ flex:1, overflow:'auto', padding:'8px 12px', display:'flex', flexDirection:'column', gap:6 }}>
                  {copilotChat.length===0&&(
                    <div style={{ textAlign:'center', padding:'20px 0' }}>
                      <Sparkles size={24} style={{ color:'#2a2a4a', margin:'0 auto 8px', display:'block' }}/>
                      <p style={{ fontSize:12, color:'#333' }}>Ask me anything about your code</p>
                      <div style={{ display:'flex', flexDirection:'column', gap:4, marginTop:10 }}>
                        {['Explain this code','Fix the errors','How to optimize?','Add error handling'].map(q=>(
                          <button key={q} onClick={()=>{ setCopilotInput(q); }}
                            style={{ background:'#111', border:'1px solid #1e1e1e', borderRadius:7, padding:'6px 10px', color:'#666', fontSize:11, cursor:'pointer', textAlign:'left', transition:'all .15s' }}
                            onMouseEnter={e=>{ e.currentTarget.style.color='#a5b4fc'; e.currentTarget.style.borderColor='rgba(99,102,241,0.3)'; }}
                            onMouseLeave={e=>{ e.currentTarget.style.color='#666'; e.currentTarget.style.borderColor='#1e1e1e'; }}
                          >💬 {q}</button>
                        ))}
                      </div>
                    </div>
                  )}
                  {copilotChat.map((m,i)=>(
                    <div key={i} style={{ display:'flex', justifyContent:m.role==='user'?'flex-end':'flex-start' }}>
                      <div style={{ maxWidth:'90%', padding:'7px 10px', borderRadius:m.role==='user'?'12px 12px 3px 12px':'12px 12px 12px 3px', background:m.role==='user'?'rgba(99,102,241,0.25)':'#141420', border:m.role==='user'?'1px solid rgba(99,102,241,0.3)':'1px solid #1e1e2a', color:'#d1d5db', fontSize:12, lineHeight:1.6 }}>
                        <pre style={{ margin:0, whiteSpace:'pre-wrap', fontFamily:'inherit', fontSize:'inherit' }}>{m.content}</pre>
                      </div>
                    </div>
                  ))}
                  {copilotLoading&&(
                    <div style={{ display:'flex', gap:4, padding:'8px 10px', background:'#141420', borderRadius:8, width:'fit-content' }}>
                      {[0,1,2].map(i=><div key={i} style={{ width:5,height:5,borderRadius:'50%',background:'#6366f1',animation:`bounce 0.6s ${i*0.15}s infinite alternate` }}/>)}
                    </div>
                  )}
                </div>

                {/* Chat input */}
                <div style={{ padding:'8px 12px', borderTop:'1px solid #1a1a2a', display:'flex', gap:4, flexShrink:0 }}>
                  <input value={copilotInput} onChange={e=>setCopilotInput(e.target.value)}
                    onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendCopilotMsg();} }}
                    placeholder="Ask Copilot…"
                    style={{ flex:1, background:'#111', border:'1px solid #1e1e1e', borderRadius:8, padding:'7px 10px', color:'#fff', fontSize:11, outline:'none', fontFamily:'Inter,sans-serif' }}
                    onFocus={e=>e.target.style.borderColor='rgba(99,102,241,0.4)'}
                    onBlur={e=>e.target.style.borderColor='#1e1e1e'}
                  />
                  <button onClick={sendCopilotMsg} disabled={copilotLoading||!copilotInput.trim()}
                    style={{ background:copilotLoading||!copilotInput.trim()?'#1a1a1a':'#6366f1', border:'none', borderRadius:8, padding:'0 10px', color:copilotLoading||!copilotInput.trim()?'#444':'#fff', cursor:copilotLoading||!copilotInput.trim()?'not-allowed':'pointer', transition:'all .15s' }}>
                    {copilotLoading?<Loader2 size={13} style={{ animation:'spin .8s linear infinite' }}/>:<Send size={13}/>}
                  </button>
                </div>
              </aside>
            )}

            {/* Room chat */}
            {showChat&&(
              <aside style={{ width:200, background:'#0f0f0f', borderLeft:'1px solid #1a1a1a', display:'flex', flexDirection:'column', flexShrink:0 }}>
                <div style={{ padding:'10px 12px', borderBottom:'1px solid #1a1a1a', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div><p style={{ fontSize:12, fontWeight:600, color:'#888', margin:0 }}>Room Chat</p><p style={{ fontSize:10, color:'#444', margin:'2px 0 0' }}>{peers.length+1} online</p></div>
                  <button onClick={()=>setShowChat(false)} style={{ background:'none', border:'none', color:'#555', cursor:'pointer', fontSize:13 }}>✕</button>
                </div>
                <div style={{ flex:1, overflowY:'auto', padding:'8px 10px', display:'flex', flexDirection:'column', gap:5 }}>
                  {chatMsgs.length===0?<p style={{ fontSize:11, color:'#333', textAlign:'center', marginTop:16 }}>No messages</p>:chatMsgs.map((m,i)=>(
                    <div key={i}><p style={{ fontSize:10, color:m.user.color, margin:'0 0 1px', fontWeight:600 }}>{m.user.name}</p><p style={{ fontSize:11, color:'#d1d5db', margin:0, lineHeight:1.5 }}>{m.text}</p></div>
                  ))}
                </div>
                <div style={{ padding:'6px 8px', borderTop:'1px solid #1a1a1a', display:'flex', gap:3 }}>
                  <input value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter') sendChat(); }}
                    placeholder="Message…" style={{ flex:1, background:'#1a1a1a', border:'1px solid #2a2a2a', borderRadius:6, padding:'5px 7px', color:'#fff', fontSize:11, outline:'none' }}/>
                  <button onClick={sendChat} style={{ background:'#6366f1', border:'none', borderRadius:6, padding:'0 7px', color:'#fff', cursor:'pointer' }}><Send size={11}/></button>
                </div>
              </aside>
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-600 flex-col gap-4" style={{ background:'#0d0d0d' }}>
            <Terminal size={56} className="opacity-20"/>
            <p className="text-lg font-medium">Select or create a file</p>
            <button onClick={()=>createFile()} className="btn-primary"><Plus size={16}/> New File</button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes bounce { from { transform: translateY(0); } to { transform: translateY(-5px); } }
      `}</style>
    </div>
  );
}
