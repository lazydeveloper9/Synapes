
import { useState, useEffect, useRef, createContext, useContext } from 'react';
import toast from 'react-hot-toast';
import { Bell, X, FileText, LayoutGrid, Monitor, Code2, Palette } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';


const DEFAULT_CTX = {
  notifs:      [],
  notifyOpen:  () => {},
  markAllRead: () => {},
  clearAll:    () => {},
  unread:      0,
};

const NotifCtx = createContext(DEFAULT_CTX);   // ← was createContext(null)

const CHANNEL = 'synapse_file_events';
const STORAGE = 'synapse_notifications';

const WS_META = {
  design: { label: 'Design Studio', color: '#6366f1', Icon: Palette  },
  docs:   { label: 'Docs',          color: '#3b82f6', Icon: FileText  },
  sheets: { label: 'Sheets',        color: '#22c55e', Icon: LayoutGrid },
  slides: { label: 'Slides',        color: '#f97316', Icon: Monitor   },
  code:   { label: 'Code',          color: '#ec4899', Icon: Code2     },
};

const loadNotifs = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE) || '[]'); }
  catch { return []; }
};
const saveNotifs = (n) => {
  try { localStorage.setItem(STORAGE, JSON.stringify(n.slice(0, 50))); }
  catch (_) {}
};


export function NotificationProvider({ children }) {
  const [notifs, setNotifs] = useState(loadNotifs);
  const channelRef = useRef(null);

  useEffect(() => {
  
    try {
      channelRef.current = new BroadcastChannel(CHANNEL);
      channelRef.current.onmessage = (e) => receiveEvent(e.data);
    } catch (_) { /* Safari private mode — BroadcastChannel not available */ }

    
    const onStorage = (e) => {
      if (e.key === 'synapse_last_event' && e.newValue) {
        try { receiveEvent(JSON.parse(e.newValue)); } catch (_) {}
      }
    };
    window.addEventListener('storage', onStorage);

    return () => {
      channelRef.current?.close();
      window.removeEventListener('storage', onStorage);
    };

    
  }, []);

  const receiveEvent = (evt) => {
    if (!evt?.workspace || !evt?.name) return;
    const meta = WS_META[evt.workspace] || WS_META.design;
    const notif = {
      id:        `${Date.now()}-${Math.random()}`,
      workspace: evt.workspace,
      name:      evt.name,
      ts:        Date.now(),
      read:      false,
    };
    setNotifs((prev) => {
      const updated = [notif, ...prev];
      saveNotifs(updated);
      return updated;
    });
    toast(`📂 "${evt.name}" opened in ${meta.label}`, {
      duration: 3500,
      style: {
        background: '#1a1a1a', color: '#fff',
        border: `1px solid ${meta.color}55`, fontSize: 13,
      },
    });
  };

  /** Call this from any workspace when a file is opened */
  const notifyOpen = (workspace, name) => {
    if (!workspace || !name) return;
    const evt = { workspace, name, ts: Date.now() };
    // Broadcast to other tabs
    try { channelRef.current?.postMessage(evt); } catch (_) {}
    // Safari/same-tab fallback via storage event
    try { localStorage.setItem('synapse_last_event', JSON.stringify(evt)); } catch (_) {}
    // Record locally in this tab
    receiveEvent(evt);
  };

  const markAllRead = () => {
    setNotifs((prev) => {
      const updated = prev.map((n) => ({ ...n, read: true }));
      saveNotifs(updated);
      return updated;
    });
  };

  const clearAll = () => { setNotifs([]); saveNotifs([]); };

  const unread = notifs.filter((n) => !n.read).length;

  return (
    <NotifCtx.Provider value={{ notifs, notifyOpen, markAllRead, clearAll, unread }}>
      {children}
    </NotifCtx.Provider>
  );
}

/** Hook — safe: returns DEFAULT_CTX if used outside provider (no crash) */
export const useNotify = () => useContext(NotifCtx);

/* ─── Notification Bell ──────────────────────────────────────────────────── */
export function NotificationBell() {
  const { notifs, markAllRead, clearAll, unread } = useNotify();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const toggle = () => {
    setOpen((o) => !o);
    if (!open) markAllRead();
  };

  const timeAgo = (ts) => {
    const m = Math.floor((Date.now() - ts) / 60000);
    if (m < 1)  return 'just now';
    if (m < 60) return `${m}m ago`;
    return `${Math.floor(m / 60)}h ago`;
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Bell button */}
      <motion.button
        onClick={toggle}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        style={{
          position: 'relative', width: 36, height: 36, borderRadius: 10,
          background: open ? '#1e1e1e' : 'transparent',
          border: `1px solid ${open ? '#333' : 'transparent'}`,
          color: '#888', cursor: 'pointer', display: 'flex',
          alignItems: 'center', justifyContent: 'center', transition: 'all .15s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = '#1e1e1e'; e.currentTarget.style.borderColor = '#333'; }}
        onMouseLeave={(e) => { if (!open) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; } }}
      >
        <Bell size={17} />

        {/* Unread badge */}
        <AnimatePresence>
          {unread > 0 && (
            <motion.span
              key="badge"
              initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
              style={{
                position: 'absolute', top: -4, right: -4,
                minWidth: 16, height: 16, borderRadius: '999px',
                background: '#6366f1', color: '#fff',
                fontSize: 9, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '0 3px', border: '2px solid #0a0a0a',
              }}
            >
              {unread > 9 ? '9+' : unread}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            style={{
              position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 9999,
              width: 320, background: '#111', border: '1px solid #222',
              borderRadius: 16, overflow: 'hidden',
              boxShadow: '0 16px 48px rgba(0,0,0,.7)',
            }}
          >
            {/* Header */}
            <div style={{ padding: '13px 16px', borderBottom: '1px solid #1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#fff', margin: 0 }}>Notifications</p>
                <p style={{ fontSize: 11, color: '#444', margin: '2px 0 0' }}>{notifs.length} total</p>
              </div>
              {notifs.length > 0 && (
                <button
                  onClick={clearAll}
                  style={{ fontSize: 11, color: '#555', background: 'none', border: '1px solid #252525', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#aaa'; e.currentTarget.style.borderColor = '#333'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = '#555'; e.currentTarget.style.borderColor = '#252525'; }}
                >
                  Clear all
                </button>
              )}
            </div>

            {/* List */}
            <div style={{ maxHeight: 340, overflowY: 'auto' }}>
              {notifs.length === 0 ? (
                <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                  <Bell size={28} style={{ color: '#2a2a2a', margin: '0 auto 10px', display: 'block' }} />
                  <p style={{ fontSize: 12, color: '#3a3a3a', margin: 0 }}>No notifications yet</p>
                  <p style={{ fontSize: 11, color: '#2a2a2a', marginTop: 4 }}>File opens will appear here</p>
                </div>
              ) : (
                notifs.map((n) => {
                  const meta = WS_META[n.workspace] || WS_META.design;
                  const { Icon } = meta;
                  return (
                    <div key={n.id} style={{
                      padding: '10px 16px', borderBottom: '1px solid #141414',
                      display: 'flex', alignItems: 'flex-start', gap: 10,
                      background: n.read ? 'transparent' : 'rgba(99,102,241,0.04)',
                    }}>
                      {/* Icon */}
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: `${meta.color}18`, border: `1px solid ${meta.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon size={14} style={{ color: meta.color }} />
                      </div>
                      {/* Text */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 12, color: '#d1d5db', fontWeight: 500, margin: '0 0 2px' }}>
                          <span style={{ color: meta.color }}>{meta.label}</span> — file opened
                        </p>
                        <p style={{ fontSize: 11, color: '#666', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          "{n.name}"
                        </p>
                        <p style={{ fontSize: 10, color: '#3a3a3a', margin: '3px 0 0' }}>{timeAgo(n.ts)}</p>
                      </div>
                      {/* Unread dot */}
                      {!n.read && (
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#6366f1', flexShrink: 0, marginTop: 5 }} />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
