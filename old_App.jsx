import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

const WS_URL = typeof window !== 'undefined'
  ? (import.meta.env.VITE_WS_URL || 'ws://localhost:1234')
  : 'ws://localhost:1234';
const AI_URL = import.meta.env.VITE_AI_API_URL || 'http://localhost:8000';

const NAMES = ['Cyber Fox', 'Neon Phantom', 'Byte Wolf', 'Aero Falcon', 'Nova Spark', 'Quantum Shade'];
const COLORS = ['#f43f5e', '#a855f7', '#3b82f6', '#10b981', '#f59e0b', '#ec4899'];
const getRandomElem = (arr) => arr[Math.floor(Math.random() * arr.length)];
const getInitials = (name) => name.split(' ').map(n => n.charAt(0).toUpperCase()).join('').substring(0, 2);

function App() {
  const [status, setStatus] = useState('initializing');
  const [aiActive, setAiActive] = useState(false);
  const [aiLog, setAiLog] = useState('');
  
  const [roomId, setRoomId] = useState('');
  const [inviteCopied, setInviteCopied] = useState(false);
  
  // -- Phase 4: Awareness Avatars --
  const [activeUsers, setActiveUsers] = useState([]);
  
  const ydocRef = useRef(null);
  const providerRef = useRef(null);
  const [ready, setReady] = useState(false);
  const abortControllerRef = useRef(null);

  useEffect(() => {
    const urlParams = new URL(window.location.href).searchParams;
    let activeRoom = urlParams.get('room');
    if (!activeRoom) {
      activeRoom = Math.random().toString(36).substring(2, 8);
      window.history.replaceState(null, '', `?room=${activeRoom}`);
    }
    setRoomId(activeRoom);

    const doc = new Y.Doc();
    ydocRef.current = doc;

    const provider = new WebsocketProvider(WS_URL, activeRoom, doc, { connect: true });
    providerRef.current = provider;

    // Broadcasting Identity
    const localUser = {
      id: Math.random().toString(),
      name: getRandomElem(NAMES) + ' ' + Math.floor(Math.random() * 999),
      color: getRandomElem(COLORS),
    };
    provider.awareness.setLocalStateField('user', localUser);

    // Monitoring Room Peers
    provider.awareness.on('change', () => {
      const states = Array.from(provider.awareness.getStates().values());
      const users = states.filter(s => s.user).map(s => s.user);
      setActiveUsers(users);
    });

    provider.on('status', ({ status }) => setStatus(status));
    setReady(true);

    return () => {
      provider.destroy();
      doc.destroy();
    };
  }, []);

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({ history: false }),
        ...(ready && ydocRef.current ? [Collaboration.configure({ document: ydocRef.current })] : []),
      ],
      content: ready ? undefined : '<p>Connecting to decentralized workspace...</p>',
      editable: true,
    },
    [ready]
  );

  const handleAIAssist = useCallback(async () => {
    if (aiActive) {
      if (abortControllerRef.current) abortControllerRef.current.abort();
      setAiActive(false);
      setAiLog(prev => prev + '\n[Auto-Complete Manually Stopped]');
      return;
    }

    if (!editor) return;
    const currentContext = editor.getText();
    if (!currentContext.trim()) {
      setAiLog('⚠ Start typing so the AI knows what to auto-complete!');
      return;
    }

    setAiActive(true);
    setAiLog('⟳ Reading context and prompting Llama 3.2...');
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch(`${AI_URL}/ai/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: currentContext }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      if (!response.body) throw new Error('ReadableStream not supported');

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          setAiLog(prev => prev + '\n✅ Streaming Auto-Complete Finished!');
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.startsWith('data: '));
        
        for (const line of lines) {
          const content = line.replace('data: ', '').trim();
          if (content === '[DONE]') continue; 
          if (content) {
            try {
              const parsedToken = JSON.parse(content);
              if (editor) {
                editor.commands.insertContentAt(editor.state.selection.to, parsedToken);
                setAiLog(prev => prev + parsedToken);
              }
            } catch (e) {}
          }
        }
      }
    } catch (error) {
      if (error.name === 'AbortError') return; 
      setAiLog(prev => prev + '\n⚠ Connection error. Verify host AI endpoint is up.');
    } finally {
      setAiActive(false);
    }
  }, [aiActive, editor]);

  const copyInviteLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setInviteCopied(true);
    setTimeout(() => setInviteCopied(false), 2000);
  };

  const statusColor = status === 'connected' ? '#4ade80' : status === 'connecting' ? '#fbbf24' : '#f87171';

  return (
    <div style={{
      minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
      fontFamily: "'Inter', system-ui, sans-serif", color: '#e2e8f0', padding: '2rem',
    }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '2rem', background: 'linear-gradient(90deg, #818cf8, #38bdf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              ⚡ Synapse
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
              Real-time Workspaces · Team Utkarsh · HACKSAGON
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            
            {/* Phase 4 Avatars */}
            {activeUsers.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', marginRight: '0.5rem' }}>
                {activeUsers.map((u, i) => (
                  <div
                    key={u.id}
                    title={u.name}
                    style={{
                      width: '32px', height: '32px',
                      borderRadius: '50%', background: u.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'white', fontWeight: 'bold', fontSize: '0.75rem',
                      marginLeft: i > 0 ? '-10px' : '0',
                      border: '2px solid #0f172a',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                      zIndex: activeUsers.length - i
                    }}
                  >
                    {getInitials(u.name)}
                  </div>
                ))}
              </div>
            )}

            {roomId && (
              <div 
                onClick={copyInviteLink}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  background: inviteCopied ? 'rgba(74,222,128,0.2)' : 'rgba(99,102,241,0.15)',
                  border: `1px solid ${inviteCopied ? '#4ade80' : 'rgba(99,102,241,0.4)'}`,
                  borderRadius: '6px', padding: '0.35rem 0.75rem', cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <span style={{ fontSize: '0.75rem', color: inviteCopied ? '#4ade80' : '#818cf8', fontWeight: 'bold' }}>
                  {inviteCopied ? '📋 Link Copied!' : `Workspace: ${roomId.toUpperCase()}`}
                </span>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(30,41,59,0.8)', borderRadius: '20px', padding: '0.35rem 0.75rem', border: `1px solid ${statusColor}44` }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor, boxShadow: `0 0 6px ${statusColor}`, display: 'inline-block' }} />
              <span style={{ fontSize: '0.75rem', color: statusColor, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{status}</span>
            </div>

            <button
              onClick={handleAIAssist}
              disabled={!ready}
              style={{
                background: aiActive ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'linear-gradient(135deg, #6366f1, #4f46e5)',
                color: 'white', border: 'none', padding: '0.55rem 1.25rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.88rem', boxShadow: '0 4px 15px rgba(99,102,241,0.35)', transition: 'opacity 0.2s', opacity: ready ? 1 : 0.5,
              }}
            >
              {aiActive ? '⏹ Stop Generating' : '🤖 Contextual Auto-Complete'}
            </button>
          </div>
        </div>

        <div style={{ background: 'rgba(30, 41, 59, 0.75)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: '12px', padding: '1.5rem 2rem', backdropFilter: 'blur(12px)', boxShadow: '0 25px 50px rgba(0,0,0,0.5)', minHeight: 380, position: 'relative' }}>
          {editor ? <EditorContent editor={editor} /> : <p style={{ color: '#475569', fontStyle: 'italic' }}>Initializing SyncEngine...</p>}
        </div>

        {aiLog && (
          <div style={{ marginTop: '1rem', background: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(56,189,248,0.25)', borderRadius: '8px', padding: '1rem 1.25rem', fontSize: '0.82rem', color: '#38bdf8', fontFamily: 'monospace', whiteSpace: 'pre-wrap', maxHeight: 150, overflowY: 'auto' }}>
            <span style={{ color: '#475569' }}>Llama-3.2 › </span>{aiLog}
            {aiActive && <span style={{ animation: 'blink 1s infinite' }}>▋</span>}
          </div>
        )}

      </div>
      <style>{`
        .ProseMirror { outline: none; min-height: 340px; line-height: 1.75; font-size: 1.05rem; }
        .ProseMirror p { margin: 0.4rem 0; color: #cbd5e1; }
        .ProseMirror p.is-editor-empty:first-child::before { color: #475569; content: attr(data-placeholder); float: left; pointer-events: none; height: 0; }
        .ProseMirror strong { color: #c084fc; }
        .ProseMirror h1, .ProseMirror h2 { color: #e2e8f0; }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
      `}</style>
    </div>
  );
}

export default App;
