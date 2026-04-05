import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Languages, Edit3, Type, Send, X, Loader2, Wand2 } from 'lucide-react';

// Fix: use correct env var name with fallback
const AI_API_URL = import.meta.env.VITE_AI_API_URL
  ? `${import.meta.env.VITE_AI_API_URL}/ai/process`
  : `http://${window.location.hostname}:8000/ai/process`;

/** Floating "Ask AI" bubble that appears above selected text */
export function AISelectionBubble({ bubble, onOpen, onClose }) {
  if (!bubble) return null;

  const safeX = Math.max(60, Math.min(bubble.x, window.innerWidth - 60));
  const safeY = Math.max(50, bubble.y);

  return (
    <div
      style={{
        position: 'fixed',
        left: safeX,
        top: safeY,
        transform: 'translateX(-50%) translateY(-100%)',
        zIndex: 99998,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        background: 'rgba(15, 15, 15, 0.97)',
        border: '1px solid rgba(99, 102, 241, 0.5)',
        borderRadius: 999,
        padding: '5px 12px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.6), 0 0 0 1px rgba(99,102,241,0.2)',
        backdropFilter: 'blur(12px)',
        animation: 'aiBubbleIn 0.15s ease-out',
        cursor: 'default',
        userSelect: 'none',
        pointerEvents: 'all',
      }}
      onMouseDown={e => e.stopPropagation()} // prevent selection clear
    >
      <button
        onClick={(e) => { e.stopPropagation(); e.preventDefault(); onOpen(); }}
        style={{
          background: 'none',
          border: 'none',
          color: '#a5b4fc',
          cursor: 'pointer',
          fontSize: 12,
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          padding: '2px 4px',
          borderRadius: 6,
          transition: 'color 0.15s',
          fontFamily: 'Inter, sans-serif',
          whiteSpace: 'nowrap',
        }}
        onMouseEnter={e => { e.currentTarget.style.color = '#818cf8'; }}
        onMouseLeave={e => { e.currentTarget.style.color = '#a5b4fc'; }}
      >
        <Wand2 size={13} />
        Ask AI
      </button>
      <div style={{ width: 1, height: 14, background: 'rgba(99,102,241,0.3)' }} />
      <button
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
        onMouseEnter={e => { e.currentTarget.style.color = '#888'; }}
        onMouseLeave={e => { e.currentTarget.style.color = '#555'; }}
      >
        <X size={12} />
      </button>
      <style>{`
        @keyframes aiBubbleIn {
          from { opacity: 0; transform: translateX(-50%) translateY(calc(-100% + 8px)); }
          to   { opacity: 1; transform: translateX(-50%) translateY(-100%); }
        }
      `}</style>
    </div>
  );
}

/** Main AI prompt menu panel */
export default function AIPromptMenu({ position, contextText, onClose, onInsert }) {
  const [loading, setLoading] = useState(false);
  const [streamedText, setStreamedText] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [error, setError] = useState('');
  const menuRef = useRef(null);
  const abortRef = useRef(null);

  // Close menu when clicking completely outside (with delay to ignore the triggering click)
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };
    const timer = setTimeout(() => document.addEventListener('mousedown', handleClickOutside), 150);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  // Cancel stream on unmount
  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  const handlePrompt = async (task) => {
    setLoading(true);
    setStreamedText('');
    setError('');

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    try {
      const response = await fetch(AI_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task, context: contextText || '', customPrompt }),
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`AI service error: ${response.status} ${response.statusText}`);
      }
      if (!response.body) {
        throw new Error('ReadableStream not supported in this browser.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let finalString = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // SSE frames are separated by '\n\n'
        const frames = buffer.split('\n\n');
        buffer = frames.pop() ?? ''; // last partial frame stays in buffer

        for (const frame of frames) {
          for (const line of frame.split('\n')) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data:')) continue;

            const dataStr = trimmed.slice(5).trim(); // strip 'data:' prefix
            if (dataStr === '[DONE]') {
              reader.cancel();
              setLoading(false);
              return;
            }

            try {
              const token = JSON.parse(dataStr);
              if (typeof token === 'string') {
                finalString += token;
                setStreamedText(finalString);
              }
            } catch (_) {
              // non-JSON chunk, append as-is (shouldn't normally happen)
              if (dataStr) {
                finalString += dataStr;
                setStreamedText(finalString);
              }
            }
          }
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error('[AI Menu Error]:', err);
      setError(err.message.includes('fetch') || err.message.includes('network')
        ? 'Cannot connect to AI service. Make sure the AI server is running on port 8000.'
        : err.message
      );
    } finally {
      setLoading(false);
    }
  };

  const handleInsert = () => {
    if (streamedText.trim() && onInsert) {
      onInsert(streamedText);
    }
    onClose();
  };

  if (!position) return null;

  // Keep menu inside viewport
  const safeX = Math.min(Math.max(position.x, 10), window.innerWidth - 330);
  const safeY = Math.min(position.y + 15, window.innerHeight - 340);

  return (
    <div
      ref={menuRef}
      onMouseDown={e => e.stopPropagation()}
      style={{
        position: 'fixed',
        left: safeX,
        top: safeY,
        zIndex: 99999,
        width: 320,
        background: 'rgba(10, 10, 10, 0.97)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(99, 102, 241, 0.35)',
        borderRadius: 14,
        boxShadow: '0 20px 60px rgba(0,0,0,0.8), 0 0 0 1px rgba(99,102,241,0.15)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        animation: 'aiMenuIn 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.07)',
        background: 'rgba(99,102,241,0.08)',
      }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#a5b4fc', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Sparkles size={13} style={{ color: '#818cf8' }} />
          Synapse AI
        </span>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', display: 'flex', padding: 2 }}
          onMouseEnter={e => { e.currentTarget.style.color = '#fff'; }}
          onMouseLeave={e => { e.currentTarget.style.color = '#555'; }}
        >
          <X size={14} />
        </button>
      </div>

      <div style={{ padding: 12 }}>
        {/* Show the initial action menu */}
        {!streamedText && !loading && !error ? (
          <div>
            {/* Context preview */}
            <div style={{ marginBottom: 10 }}>
              <p style={{ fontSize: 10, textTransform: 'uppercase', fontWeight: 700, color: '#555', letterSpacing: '0.08em', marginBottom: 5 }}>
                Selected Text
              </p>
              <div style={{
                background: 'rgba(255,255,255,0.04)', borderRadius: 8,
                padding: '8px 10px', fontSize: 11, color: '#888',
                fontStyle: 'italic', border: '1px solid rgba(255,255,255,0.07)',
                maxHeight: 60, overflow: 'hidden',
                lineHeight: 1.5,
              }}>
                {contextText && contextText.trim()
                  ? `"${contextText.substring(0, 120)}${contextText.length > 120 ? '…' : ''}"`
                  : '(no text selected — AI will generate from scratch)'}
              </div>
            </div>

            {/* Quick action grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 }}>
              {[
                { task: 'autocomplete', label: 'Auto-complete', icon: <Sparkles size={12} />, color: '#facc15' },
                { task: 'rephrase',     label: 'Rephrase',      icon: <Edit3 size={12} />,    color: '#60a5fa' },
                { task: 'refine',       label: 'Refine & Fix',  icon: <Type size={12} />,     color: '#4ade80' },
                { task: 'hindi',        label: 'Hindi',         icon: <Languages size={12} />, color: '#a78bfa' },
              ].map(({ task, label, icon, color }) => (
                <button
                  key={task}
                  onClick={() => handlePrompt(task)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    padding: '8px 10px', borderRadius: 9,
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: '#d1d5db', fontSize: 12, cursor: 'pointer',
                    transition: 'all 0.15s', textAlign: 'left',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.15)'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                >
                  <span style={{ color }}>{icon}</span>
                  {label}
                </button>
              ))}
            </div>

            {/* Custom prompt input */}
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Custom instruction… (press Enter)"
                value={customPrompt}
                onChange={e => setCustomPrompt(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && customPrompt.trim()) handlePrompt('custom'); }}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 9, paddingLeft: 12, paddingRight: 36, paddingTop: 8, paddingBottom: 8,
                  fontSize: 12, color: '#fff',
                  outline: 'none', transition: 'border-color 0.15s',
                  fontFamily: 'Inter, sans-serif',
                }}
                onFocus={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.6)'; }}
                onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
              />
              <button
                onClick={() => customPrompt.trim() && handlePrompt('custom')}
                style={{
                  position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: '#555', cursor: 'pointer', padding: 2,
                }}
                onMouseEnter={e => { e.currentTarget.style.color = '#818cf8'; }}
                onMouseLeave={e => { e.currentTarget.style.color = '#555'; }}
              >
                <Send size={13} />
              </button>
            </div>
          </div>
        ) : error ? (
          /* Error state */
          <div>
            <div style={{
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 8, padding: '10px 12px', marginBottom: 10,
            }}>
              <p style={{ fontSize: 12, color: '#f87171', lineHeight: 1.5 }}>⚠ {error}</p>
            </div>
            <button
              onClick={() => { setError(''); setStreamedText(''); }}
              style={{
                width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8, color: '#d1d5db', fontSize: 12, padding: '8px', cursor: 'pointer',
              }}
            >
              ← Try Again
            </button>
          </div>
        ) : (
          /* Streaming / result mode */
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{
              height: 180, overflowY: 'auto',
              background: 'rgba(255,255,255,0.03)',
              borderRadius: 9, padding: '10px 12px',
              fontSize: 13, color: '#d1d5db',
              border: '1px solid rgba(255,255,255,0.07)',
              whiteSpace: 'pre-wrap', lineHeight: 1.7,
              marginBottom: 10,
            }}>
              {streamedText}
              {loading && (
                <span style={{
                  display: 'inline-block', width: 6, height: 14,
                  marginLeft: 3, background: '#818cf8',
                  animation: 'cursorBlink 0.8s step-end infinite',
                  verticalAlign: 'text-bottom', borderRadius: 2,
                }} />
              )}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleInsert}
                disabled={loading}
                style={{
                  flex: 1, background: loading ? 'rgba(99,102,241,0.4)' : '#6366f1',
                  border: 'none', borderRadius: 9, color: '#fff', fontSize: 12,
                  fontWeight: 700, padding: '9px', cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#818cf8'; }}
                onMouseLeave={e => { if (!loading) e.currentTarget.style.background = '#6366f1'; }}
              >
                {loading ? <><Loader2 size={13} style={{ animation: 'spin 0.8s linear infinite' }} /> Generating…</> : '✓ Insert into Editor'}
              </button>
              <button
                onClick={() => { abortRef.current?.abort(); setStreamedText(''); setError(''); setLoading(false); }}
                disabled={false}
                style={{
                  padding: '9px 14px', background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)', borderRadius: 9,
                  color: '#9ca3af', fontSize: 12, cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
              >
                Discard
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes aiMenuIn {
          from { opacity: 0; transform: scale(0.95) translateY(-6px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);    }
        }
        @keyframes cursorBlink {
          0%, 100% { opacity: 1; } 50% { opacity: 0; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); } to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
