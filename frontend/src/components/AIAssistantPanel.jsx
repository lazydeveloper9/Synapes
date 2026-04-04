/**
 * AIAssistantPanel.jsx
 * 
 * VS Code-style hovering AI button for Synapse workspace.
 * Features:
 *  - Floating icon (bottom-right, like VS Code AI button)
 *  - Two options: "Construct Info" and "Generate Image"
 *  - Auto hint popup when canvas text is detected or image uploaded
 *  - Image upload → LLaMA vision analysis
 *  - Text query → structured info + optional AI image generation
 *  - Copy-to-clipboard for all generated content
 *  - Matches existing dark theme exactly
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Sparkles, X, Image as ImageIcon, Info, Copy, Check,
  Download, Wand2, Upload, RotateCcw, ChevronRight,
  Loader2, Brain, Camera, FileText,
} from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';

/* ── Tiny markdown renderer (no extra deps) ─────────────────────────────── */
function SimpleMarkdown({ text }) {
  const lines  = (text || '').split('\n');
  const result = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith('## ')) {
      result.push(
        <h3 key={i} style={{ color: '#a5b4fc', fontWeight: 600, fontSize: 13,
          marginTop: 14, marginBottom: 4, borderBottom: '1px solid #2a2a2a', paddingBottom: 4 }}>
          {line.slice(3)}
        </h3>
      );
    } else if (line.startsWith('# ')) {
      result.push(
        <h2 key={i} style={{ color: '#818cf8', fontWeight: 700, fontSize: 14,
          marginTop: 12, marginBottom: 6 }}>
          {line.slice(2)}
        </h2>
      );
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      result.push(
        <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 2 }}>
          <span style={{ color: '#6366f1', marginTop: 2 }}>•</span>
          <span style={{ color: '#d1d5db', fontSize: 12, lineHeight: 1.6 }}>
            {renderInline(line.slice(2))}
          </span>
        </div>
      );
    } else if (line.trim() === '') {
      result.push(<div key={i} style={{ height: 6 }} />);
    } else {
      result.push(
        <p key={i} style={{ color: '#d1d5db', fontSize: 12, lineHeight: 1.7, marginBottom: 2 }}>
          {renderInline(line)}
        </p>
      );
    }
    i++;
  }
  return <div>{result}</div>;
}

function renderInline(text) {
  // Bold **text**
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith('**') && p.endsWith('**')
      ? <strong key={i} style={{ color: '#fff', fontWeight: 600 }}>{p.slice(2, -2)}</strong>
      : p
  );
}

/* ── Copy button ─────────────────────────────────────────────────────────── */
function CopyBtn({ text, style }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Copied to clipboard!');
    });
  };
  return (
    <button onClick={copy}
      title="Copy to clipboard"
      style={{
        display: 'flex', alignItems: 'center', gap: 4,
        padding: '5px 10px', borderRadius: 6, fontSize: 11, fontWeight: 500,
        background: copied ? '#1a2e1a' : '#1e1e1e',
        border: `1px solid ${copied ? '#22c55e' : '#333'}`,
        color: copied ? '#22c55e' : '#9ca3af',
        cursor: 'pointer', transition: 'all .2s', ...style,
      }}
    >
      {copied ? <Check size={11} /> : <Copy size={11} />}
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */
export default function AIAssistantPanel({
  canvasRef,       // fabric canvas ref (optional – for reading canvas text)
  onAddImageToCanvas, // callback(dataUrl) to drop generated image onto canvas
}) {
  const [panelOpen,    setPanelOpen]    = useState(false);
  const [mode,         setMode]         = useState(null);   // 'construct' | 'generate' | 'analyze'
  const [loading,      setLoading]      = useState(false);
  const [query,        setQuery]        = useState('');
  const [result,       setResult]       = useState(null);   // { type, info?, imageUrl?, prompt? }
  const [hints,        setHints]        = useState([]);
  const [showHints,    setShowHints]    = useState(false);
  const [hintQuery,    setHintQuery]    = useState('');
  const [uploadedImg,  setUploadedImg]  = useState(null);   // { file, preview }
  const [aiStatus,     setAiStatus]     = useState(null);
  const [menuOpen,     setMenuOpen]     = useState(false);

  const fileInputRef   = useRef(null);
  const panelRef       = useRef(null);
  const hintTimerRef   = useRef(null);
  const queryInputRef  = useRef(null);

  // ── Check AI service status on mount ──
  useEffect(() => {
    api.get('/ai/status').then(r => setAiStatus(r.data)).catch(() => {});
  }, []);

  // ── Close panel on outside click ──
  useEffect(() => {
    const h = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // ── Debounced hint fetch ──
  const fetchHints = useCallback(async (text) => {
    if (!text || text.length < 2) { setHints([]); setShowHints(false); return; }
    try {
      const { data } = await api.post('/ai/hint', { text, context: 'design canvas' });
      setHints(data.hints || []);
      setShowHints(data.hints?.length > 0);
    } catch { /* ignore */ }
  }, []);

  const onQueryChange = (e) => {
    const v = e.target.value;
    setQuery(v);
    clearTimeout(hintTimerRef.current);
    hintTimerRef.current = setTimeout(() => fetchHints(v), 500);
  };

  // ── Handle image file upload ──
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setUploadedImg({ file, preview: ev.target.result });
    reader.readAsDataURL(file);
    setMode('analyze');
    setPanelOpen(true);
    setMenuOpen(false);
  };

  // ── Construct Info ──
  const handleConstruct = async (q) => {
    const finalQuery = q || query;
    if (!finalQuery.trim()) return;
    setLoading(true);
    setResult(null);
    setShowHints(false);
    setMode('construct');
    try {
      const { data } = await api.post('/ai/construct-info', { query: finalQuery });
      setResult({ type: 'info', info: data.info, query: finalQuery });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to construct info');
    } finally {
      setLoading(false);
    }
  };

  // ── Generate Image ──
  const handleGenerate = async (q) => {
    const finalQuery = q || query;
    if (!finalQuery.trim()) return;
    setLoading(true);
    setResult(null);
    setShowHints(false);
    setMode('generate');
    try {
      // First get enhanced prompt from LLM
      const { data: infoData } = await api.post('/ai/construct-info', { query: finalQuery });
      // Extract image gen prompt from response
      const promptMatch = infoData.info?.match(/Image Generation Prompt[\s\S]*?\n([^\n#]+)/i);
      const enhancedPrompt = promptMatch?.[1]?.trim() || finalQuery;

      const { data } = await api.post('/ai/generate-image', {
        prompt: finalQuery,
        enhancedPrompt,
      });
      setResult({
        type:   'image',
        imageUrl: data.image,
        prompt:   data.prompt,
        info:     infoData.info,
        query:    finalQuery,
      });
    } catch (err) {
      const msg = err.response?.data?.error || 'Image generation failed';
      const hint = err.response?.data?.hint;
      setResult({ type: 'error', message: msg, hint, query: finalQuery });
    } finally {
      setLoading(false);
    }
  };

  // ── Analyze uploaded image ──
  const handleAnalyzeImage = async () => {
    if (!uploadedImg) return;
    setLoading(true);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append('image', uploadedImg.file);
      if (query.trim()) formData.append('prompt', query);
      const { data } = await api.post('/ai/analyze-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult({ type: 'imageAnalysis', info: data.info, preview: uploadedImg.preview });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Image analysis failed');
    } finally {
      setLoading(false);
    }
  };

  // ── Drop generated image onto canvas ──
  const handleAddToCanvas = () => {
    if (result?.imageUrl && onAddImageToCanvas) {
      onAddImageToCanvas(result.imageUrl);
      toast.success('Image added to canvas!');
    }
  };

  const reset = () => {
    setResult(null);
    setQuery('');
    setUploadedImg(null);
    setHints([]);
    setShowHints(false);
    setMode(null);
    setLoading(false);
  };

  /* ── Styles ──────────────────────────────────────────────────────────── */
  const S = {
    // Floating trigger button (bottom-right, VS Code style)
    fab: {
      position:   'fixed',
      bottom:     24,
      right:      24,
      zIndex:     10000,
      display:    'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      gap:        8,
    },
    fabBtn: {
      width:        48,
      height:       48,
      borderRadius: '50%',
      background:   'linear-gradient(135deg, #6366f1, #8b5cf6)',
      border:       '1px solid rgba(255,255,255,0.1)',
      color:        '#fff',
      cursor:       'pointer',
      display:      'flex',
      alignItems:   'center',
      justifyContent: 'center',
      boxShadow:    '0 4px 24px rgba(99,102,241,0.4)',
      transition:   'all .2s',
      position:     'relative',
    },
    // Quick-action menu that pops up above the FAB
    menu: {
      background:   '#141414',
      border:       '1px solid #2a2a2a',
      borderRadius: 12,
      padding:      6,
      minWidth:     210,
      boxShadow:    '0 12px 40px rgba(0,0,0,.7)',
      animation:    'aiPopIn .15s ease',
    },
    menuItem: (hover) => ({
      display:      'flex',
      alignItems:   'center',
      gap:          10,
      width:        '100%',
      padding:      '9px 12px',
      background:   hover ? '#1e1e1e' : 'none',
      border:       'none',
      borderRadius: 8,
      color:        '#e5e7eb',
      cursor:       'pointer',
      textAlign:    'left',
      transition:   'background .12s',
    }),
    // Main panel
    panel: {
      position:   'fixed',
      bottom:     84,
      right:      24,
      zIndex:     9999,
      width:      420,
      maxHeight:  '80vh',
      background: '#111111',
      border:     '1px solid #2a2a2a',
      borderRadius: 16,
      boxShadow:  '0 20px 60px rgba(0,0,0,.8)',
      display:    'flex',
      flexDirection: 'column',
      overflow:   'hidden',
      animation:  'aiSlideIn .2s ease',
    },
    header: {
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'space-between',
      padding:        '12px 16px',
      borderBottom:   '1px solid #1e1e1e',
      background:     '#0d0d0d',
    },
    body: {
      flex:       1,
      overflowY:  'auto',
      padding:    16,
    },
    input: {
      width:        '100%',
      background:   '#1a1a1a',
      border:       '1px solid #2a2a2a',
      borderRadius: 8,
      color:        '#fff',
      fontSize:     13,
      padding:      '9px 12px',
      outline:      'none',
      fontFamily:   'Inter, sans-serif',
      resize:       'none',
      lineHeight:   1.5,
    },
    actionBtn: (variant) => ({
      display:    'flex',
      alignItems: 'center',
      gap:        6,
      padding:    '8px 14px',
      borderRadius: 8,
      border:     'none',
      cursor:     'pointer',
      fontSize:   12,
      fontWeight: 600,
      transition: 'all .15s',
      ...(variant === 'primary'
        ? { background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff' }
        : variant === 'secondary'
        ? { background: '#1e1e1e', border: '1px solid #333', color: '#d1d5db' }
        : { background: '#1a2e1a', border: '1px solid #22c55e44', color: '#22c55e' }
      ),
    }),
    hintItem: {
      display:      'flex',
      alignItems:   'center',
      gap:          8,
      padding:      '7px 10px',
      borderRadius: 7,
      cursor:       'pointer',
      transition:   'background .1s',
    },
    resultBox: {
      background:   '#0d0d0d',
      border:       '1px solid #1e1e1e',
      borderRadius: 10,
      padding:      14,
      marginTop:    12,
    },
  };

  const HINT_ICONS = {
    construct: <Brain size={13} style={{ color: '#a5b4fc' }} />,
    generate:  <Wand2 size={13} style={{ color: '#f472b6' }} />,
    info:      <Info  size={13} style={{ color: '#34d399' }} />,
  };

  const [hoveredMenu, setHoveredMenu] = useState(null);

  return (
    <>
      {/* ── Global keyframe styles ── */}
      <style>{`
        @keyframes aiPopIn {
          from { opacity: 0; transform: scale(.9) translateY(8px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes aiSlideIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes aiSpin {
          to { transform: rotate(360deg); }
        }
        .ai-hint-item:hover { background: #1a1a1a !important; }
        .ai-fab-btn:hover   { transform: scale(1.08); box-shadow: 0 6px 32px rgba(99,102,241,.6) !important; }
        .ai-fab-btn:active  { transform: scale(.96); }
      `}</style>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />

      <div ref={panelRef} style={S.fab}>

        {/* ── Main Panel ── */}
        {panelOpen && (
          <div style={S.panel}>
            {/* Header */}
            <div style={S.header}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Sparkles size={14} color="#fff" />
                </div>
                <div>
                  <p style={{ color: '#fff', fontWeight: 600, fontSize: 13, lineHeight: 1 }}>
                    Synapse AI
                  </p>
                  <p style={{ color: '#555', fontSize: 10, marginTop: 2 }}>
                    {aiStatus
                      ? `${aiStatus.ollama ? '🟢 LLaMA' : aiStatus.anthropic ? '🟡 Claude' : '🔴 No LLM'} · ${aiStatus.sd ? '🟢 Image Gen' : '🔴 No Image Gen'}`
                      : 'Checking services…'}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {result && (
                  <button onClick={reset} title="Reset"
                    style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', padding: 4 }}>
                    <RotateCcw size={14} />
                  </button>
                )}
                <button onClick={() => { setPanelOpen(false); reset(); }}
                  style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', padding: 4 }}>
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div style={S.body}>

              {/* ── Mode: Analyze uploaded image ── */}
              {mode === 'analyze' && uploadedImg ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                    <Camera size={14} style={{ color: '#a5b4fc' }} />
                    <p style={{ color: '#a5b4fc', fontSize: 12, fontWeight: 600 }}>Image Analysis</p>
                  </div>

                  {/* Preview */}
                  <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden',
                    border: '1px solid #2a2a2a', marginBottom: 12 }}>
                    <img src={uploadedImg.preview} alt="Upload preview"
                      style={{ width: '100%', maxHeight: 200, objectFit: 'cover', display: 'block' }} />
                    <button
                      onClick={() => { setUploadedImg(null); setMode(null); }}
                      style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,.7)',
                        border: 'none', borderRadius: '50%', width: 24, height: 24,
                        color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <X size={12} />
                    </button>
                  </div>

                  {/* Optional custom prompt */}
                  <textarea
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Optional: Ask something specific about this image…"
                    rows={2}
                    style={{ ...S.input, marginBottom: 10 }}
                  />

                  <button
                    onClick={handleAnalyzeImage}
                    disabled={loading}
                    style={{ ...S.actionBtn('primary'), width: '100%', justifyContent: 'center', opacity: loading ? .7 : 1 }}>
                    {loading
                      ? <><Loader2 size={13} style={{ animation: 'aiSpin 1s linear infinite' }} /> Analyzing…</>
                      : <><Brain size={13} /> Analyze with LLaMA Vision</>}
                  </button>
                </div>

              ) : (
                /* ── Default: text query mode ── */
                <div>
                  {/* Upload area */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      border: '1px dashed #2a2a2a', borderRadius: 10,
                      padding: '12px 16px', marginBottom: 12,
                      display: 'flex', alignItems: 'center', gap: 8,
                      cursor: 'pointer', transition: 'border-color .2s',
                      background: '#0d0d0d',
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = '#6366f1'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = '#2a2a2a'}
                  >
                    <Upload size={16} style={{ color: '#6366f1', flexShrink: 0 }} />
                    <div>
                      <p style={{ color: '#9ca3af', fontSize: 12, fontWeight: 500 }}>
                        Upload image for analysis
                      </p>
                      <p style={{ color: '#444', fontSize: 10, marginTop: 1 }}>
                        LLaMA Vision will describe and analyze it
                      </p>
                    </div>
                  </div>

                  {/* Query input */}
                  <div style={{ position: 'relative' }}>
                    <textarea
                      ref={queryInputRef}
                      value={query}
                      onChange={onQueryChange}
                      onFocus={() => query.length >= 2 && setShowHints(hints.length > 0)}
                      placeholder="Type anything… e.g. &quot;Taj Mahal&quot;, &quot;neon city&quot;, &quot;solar system&quot;"
                      rows={3}
                      style={{ ...S.input, paddingBottom: 38 }}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleConstruct();
                        }
                      }}
                    />

                    {/* Hint popup */}
                    {showHints && hints.length > 0 && (
                      <div style={{
                        position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                        background: '#141414', border: '1px solid #2a2a2a',
                        borderRadius: '0 0 10px 10px', overflow: 'hidden',
                        boxShadow: '0 8px 24px rgba(0,0,0,.6)',
                        animation: 'aiPopIn .12s ease',
                      }}>
                        {hints.map((hint, i) => (
                          <button key={i}
                            className="ai-hint-item"
                            style={{ ...S.hintItem, width: '100%', border: 'none',
                              background: 'none', textAlign: 'left' }}
                            onClick={() => {
                              setShowHints(false);
                              if (hint.type === 'generate') handleGenerate(query);
                              else handleConstruct(query);
                            }}
                          >
                            {HINT_ICONS[hint.type] || <ChevronRight size={12} />}
                            <div style={{ flex: 1 }}>
                              <p style={{ color: '#e5e7eb', fontSize: 12, fontWeight: 500, lineHeight: 1.2 }}>
                                {hint.label}
                              </p>
                              <p style={{ color: '#555', fontSize: 10, marginTop: 1 }}>
                                {hint.description}
                              </p>
                            </div>
                            <span style={{
                              fontSize: 9, padding: '2px 6px', borderRadius: 4, fontWeight: 600,
                              background: hint.type === 'generate' ? '#2a1a2a' : hint.type === 'construct' ? '#1a1a3a' : '#1a2a1a',
                              color:      hint.type === 'generate' ? '#f472b6' : hint.type === 'construct' ? '#a5b4fc' : '#34d399',
                            }}>
                              {hint.type}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                    <button
                      onClick={() => handleConstruct()}
                      disabled={loading || !query.trim()}
                      style={{ ...S.actionBtn('secondary'), flex: 1, justifyContent: 'center',
                        opacity: (!query.trim() || loading) ? .5 : 1 }}>
                      <FileText size={13} /> Construct Info
                    </button>
                    <button
                      onClick={() => handleGenerate()}
                      disabled={loading || !query.trim()}
                      style={{ ...S.actionBtn('primary'), flex: 1, justifyContent: 'center',
                        opacity: (!query.trim() || loading) ? .5 : 1 }}>
                      <Wand2 size={13} /> Generate Image
                    </button>
                  </div>
                </div>
              )}

              {/* ── Loading State ── */}
              {loading && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
                  gap: 10, padding: '24px 0' }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Loader2 size={18} color="#fff" style={{ animation: 'aiSpin 1s linear infinite' }} />
                  </div>
                  <p style={{ color: '#6b7280', fontSize: 12 }}>
                    {mode === 'analyze' ? 'LLaMA Vision analyzing…'
                      : mode === 'generate' ? 'Generating image…'
                      : 'LLaMA constructing info…'}
                  </p>
                </div>
              )}

              {/* ── Result: Construct Info ── */}
              {!loading && result?.type === 'info' && (
                <div style={S.resultBox}>
                  <div style={{ display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Brain size={13} style={{ color: '#a5b4fc' }} />
                      <p style={{ color: '#a5b4fc', fontSize: 11, fontWeight: 600 }}>
                        INFO: {result.query?.toUpperCase()}
                      </p>
                    </div>
                    <CopyBtn text={result.info} />
                  </div>
                  <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                    <SimpleMarkdown text={result.info} />
                  </div>
                </div>
              )}

              {/* ── Result: Image Analysis ── */}
              {!loading && result?.type === 'imageAnalysis' && (
                <div style={S.resultBox}>
                  {result.preview && (
                    <img src={result.preview} alt="Analyzed"
                      style={{ width: '100%', maxHeight: 160, objectFit: 'cover',
                        borderRadius: 8, marginBottom: 12, border: '1px solid #222' }} />
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Camera size={13} style={{ color: '#34d399' }} />
                      <p style={{ color: '#34d399', fontSize: 11, fontWeight: 600 }}>
                        VISION ANALYSIS
                      </p>
                    </div>
                    <CopyBtn text={result.info} />
                  </div>
                  <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                    <SimpleMarkdown text={result.info} />
                  </div>
                </div>
              )}

              {/* ── Result: Generated Image ── */}
              {!loading && result?.type === 'image' && (
                <div style={S.resultBox}>
                  <img src={result.imageUrl} alt="Generated"
                    style={{ width: '100%', borderRadius: 8, marginBottom: 12,
                      border: '1px solid #2a2a2a', display: 'block' }} />

                  <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                    {onAddImageToCanvas && (
                      <button onClick={handleAddToCanvas}
                        style={{ ...S.actionBtn('success'), flex: 1, justifyContent: 'center' }}>
                        <ImageIcon size={13} /> Add to Canvas
                      </button>
                    )}
                    <a href={result.imageUrl} download={`${result.query || 'ai-image'}.png`}
                      style={{ ...S.actionBtn('secondary'), textDecoration: 'none',
                        flex: 1, justifyContent: 'center' }}>
                      <Download size={13} /> Download
                    </a>
                  </div>

                  {/* Prompt used */}
                  <div style={{ background: '#0a0a0a', borderRadius: 6, padding: 8, marginBottom: 10,
                    border: '1px solid #1a1a1a' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <p style={{ color: '#555', fontSize: 10, fontWeight: 500 }}>PROMPT USED</p>
                      <CopyBtn text={result.prompt} />
                    </div>
                    <p style={{ color: '#9ca3af', fontSize: 11, marginTop: 4, lineHeight: 1.5 }}>
                      {result.prompt}
                    </p>
                  </div>

                  {/* Info section */}
                  {result.info && (
                    <details style={{ marginTop: 8 }}>
                      <summary style={{ color: '#6366f1', fontSize: 11, cursor: 'pointer',
                        fontWeight: 600, listStyle: 'none', display: 'flex',
                        alignItems: 'center', gap: 4 }}>
                        <ChevronRight size={12} /> View Info
                      </summary>
                      <div style={{ marginTop: 8, maxHeight: 200, overflowY: 'auto' }}>
                        <SimpleMarkdown text={result.info} />
                      </div>
                      <div style={{ marginTop: 6 }}>
                        <CopyBtn text={result.info} />
                      </div>
                    </details>
                  )}
                </div>
              )}

              {/* ── Result: Error ── */}
              {!loading && result?.type === 'error' && (
                <div style={{ ...S.resultBox, borderColor: '#ef444433', background: '#1a0a0a' }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <X size={14} style={{ color: '#ef4444', flexShrink: 0, marginTop: 1 }} />
                    <div>
                      <p style={{ color: '#ef4444', fontSize: 12, fontWeight: 600 }}>
                        {result.message}
                      </p>
                      {result.hint && (
                        <p style={{ color: '#9ca3af', fontSize: 11, marginTop: 6, lineHeight: 1.5 }}>
                          💡 {result.hint}
                        </p>
                      )}
                    </div>
                  </div>
                  {/* Fallback: still show construct info */}
                  <button onClick={() => handleConstruct(result.query)}
                    style={{ ...S.actionBtn('secondary'), fontSize: 11 }}>
                    <FileText size={12} /> Get Info Instead
                  </button>
                </div>
              )}

            </div>
          </div>
        )}

        {/* ── Quick-action menu (pops above FAB) ── */}
        {menuOpen && !panelOpen && (
          <div style={S.menu}>
            {[
              { icon: <FileText size={15} style={{ color: '#a5b4fc' }} />, label: 'Construct Info', sub: 'Get rich info on any topic', action: () => { setMode('construct'); setPanelOpen(true); setMenuOpen(false); } },
              { icon: <Wand2 size={15} style={{ color: '#f472b6' }} />, label: 'Generate Image', sub: 'AI image from text prompt', action: () => { setMode('generate'); setPanelOpen(true); setMenuOpen(false); } },
              { icon: <Camera size={15} style={{ color: '#34d399' }} />, label: 'Analyze Image', sub: 'Upload for LLaMA vision analysis', action: () => { fileInputRef.current?.click(); setMenuOpen(false); } },
            ].map((item, i) => (
              <button key={i}
                onMouseEnter={() => setHoveredMenu(i)}
                onMouseLeave={() => setHoveredMenu(null)}
                style={S.menuItem(hoveredMenu === i)}
                onClick={item.action}
              >
                <div style={{ width: 32, height: 32, borderRadius: 8, background: '#1a1a1a',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '1px solid #2a2a2a', flexShrink: 0 }}>
                  {item.icon}
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 500, color: '#fff', lineHeight: 1.2 }}>
                    {item.label}
                  </p>
                  <p style={{ fontSize: 10, color: '#555', marginTop: 2 }}>{item.sub}</p>
                </div>
              </button>
            ))}

            {/* Divider + status */}
            <div style={{ borderTop: '1px solid #1e1e1e', margin: '4px 0', padding: '6px 12px 2px' }}>
              <p style={{ fontSize: 10, color: '#333', fontWeight: 500 }}>
                {aiStatus?.ollama ? '🟢 LLaMA Online' : aiStatus?.anthropic ? '🟡 Claude Fallback' : '🔴 No LLM — add ANTHROPIC_API_KEY'}
              </p>
            </div>
          </div>
        )}

        {/* ── FAB button ── */}
        <button
          className="ai-fab-btn"
          style={S.fabBtn}
          title="Synapse AI — Click for options"
          onClick={() => {
            if (panelOpen) { setPanelOpen(false); setMenuOpen(false); }
            else setMenuOpen(m => !m);
          }}
        >
          {panelOpen
            ? <X size={20} />
            : <Sparkles size={20} />}

          {/* Pulsing ring when panel is closed */}
          {!panelOpen && (
            <span style={{
              position: 'absolute', inset: -3,
              borderRadius: '50%',
              border: '2px solid rgba(99,102,241,.4)',
              animation: 'aiPulse 2s ease-in-out infinite',
            }} />
          )}
        </button>

        <style>{`
          @keyframes aiPulse {
            0%, 100% { transform: scale(1);   opacity: .4; }
            50%       { transform: scale(1.15); opacity: .15; }
          }
        `}</style>
      </div>
    </>
  );
}
