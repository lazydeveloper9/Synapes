import { useState, useEffect, useMemo, useRef } from 'react';
import { HocuspocusProvider } from "@hocuspocus/provider";
import * as Y from "yjs";
import { useAuth } from '../context/AuthContext';

const COLORS = ["#f43f5e", "#a855f7", "#3b82f6", "#10b981", "#f59e0b", "#ec4899", "#14b8a6"];
const randColor = () => COLORS[Math.floor(Math.random() * COLORS.length)];

export function usePresence(roomId) {
  const { user } = useAuth();
  const [presence, setPresence] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [status, setStatus] = useState("connecting");
  
  const ydoc = useMemo(() => new Y.Doc(), []);

  const localUser = useMemo(() => {
    return {
      id: user?._id || Math.random().toString(36).slice(2),
      name: user?.name || `Guest ${Math.floor(Math.random() * 999)}`,
      color: randColor(),
    };
  }, [user]);

  const addNotification = (text) => {
    setNotifications(prev => [{ id: Date.now() + Math.random(), text, time: new Date() }, ...prev].slice(0, 30));
  };
  
  const provider = useMemo(() => {
    if (!roomId) return null;
    let WS_URL = import.meta.env.VITE_WS_URL || `ws://${window.location.hostname}:1234`;
    if (WS_URL.includes('localhost')) {
      WS_URL = WS_URL.replace('localhost', window.location.hostname);
    }
    return new HocuspocusProvider({
      url: WS_URL,
      name: roomId,
      document: ydoc,
      onStatus: ({ status }) => setStatus(status),
    });
  }, [roomId, ydoc]);

  useEffect(() => {
    if (!provider) return;
    
    // Once provider exists, optionally handle onConnect dynamically or rely on events:
    provider.on('connect', () => {
      provider.awareness.setLocalStateField('user', localUser);
    });
    // Attempt eagerly too, in case connected quickly
    if (provider.status === "connected") {
      provider.awareness.setLocalStateField('user', localUser);
    }

    const prevUsersList = new Map();

    const handleAwarenessChange = ({ added, updated, removed }) => {
      const states = provider.awareness.getStates();
      
      const currentUsers = Array.from(states.values()).map(s => s.user).filter(Boolean);
      // Deduplicate by ID
      const uniqueUsers = [];
      const seen = new Set();
      for (const u of currentUsers) {
        if (!seen.has(u.id)) {
          seen.add(u.id);
          uniqueUsers.push(u);
        }
      }
      setPresence(uniqueUsers);

      // Track joins
      added.forEach(clientId => {
        const u = states.get(clientId)?.user;
        if (u && u.id !== localUser.id) {
          prevUsersList.set(clientId, u);
          addNotification(`👋 ${u.name} joined.`);
        }
      });
      
      // Track leaves
      removed.forEach(clientId => {
        const u = prevUsersList.get(clientId);
        if (u && u.id !== localUser.id) {
          addNotification(`🚶 ${u.name} left.`);
        }
        prevUsersList.delete(clientId);
      });
    };

    provider.awareness.on('change', handleAwarenessChange);

    // Track document changes to notify who changed what (throttled/debounced)
    let lastChangeTime = 0;
    const handleUpdate = (update, origin) => {
      // Check if it's a remote change (origin is the provider, not local)
      if (origin && origin === provider) {
        const now = Date.now();
        if (now - lastChangeTime > 2000) { // Limit to 1 notification every 2 secs
           // In Yjs, finding exactly *who* made the update requires tracking via awareness or mapping origin
           // We'll just say "Document was updated"
           addNotification(`✏️ Document was updated.`);
           lastChangeTime = now;
        }
      }
    };
    ydoc.on('update', handleUpdate);

    return () => {
      ydoc.off('update', handleUpdate);
      provider.destroy();
    };
  }, [roomId, localUser, provider, ydoc]);

  return { presence, notifications, ydoc, provider, addNotification, localUser, status };
}
