import { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';

export default function PresenceNav({ presence, notifications }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleObj = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleObj);
    return () => document.removeEventListener('mousedown', handleObj);
  }, []);

  const MAX_AVATARS = 4;
  const showAvatars = presence.slice(0, MAX_AVATARS);
  const extraAvatars = presence.length - showAvatars.length;

  return (
    <div className="flex items-center gap-4">
      {/* Avatars */}
      <div className="flex items-center -space-x-2">
        {showAvatars.map((u, i) => (
          <div key={`${u.id}-${i}`} title={u.name}
            className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white border-2 border-dark-800 shadow-sm transition-transform hover:-translate-y-0.5 hover:z-10 relative z-0"
            style={{ backgroundColor: u.color || '#6366f1' }}>
            {u.name.substring(0, 2).toUpperCase()}
          </div>
        ))}
        {extraAvatars > 0 && (
          <div className="w-7 h-7 rounded-full bg-dark-600 flex items-center justify-center text-[10px] font-bold text-gray-300 border-2 border-dark-800 shadow-sm z-0">
            +{extraAvatars}
          </div>
        )}
      </div>

      {/* Notifications */}
      <div ref={ref} className="relative">
        <button onClick={() => setOpen(!open)}
          className="relative p-1.5 text-gray-400 hover:text-white transition-colors"
          title="Activity Notifications">
          <Bell size={18} />
          {notifications.length > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse border border-dark-800"></span>
          )}
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-2 w-72 bg-dark-800 border border-dark-600 rounded-xl shadow-2xl overflow-hidden z-50">
            <div className="p-3 border-b border-dark-600">
              <h3 className="text-sm font-semibold text-white">Recent Activity</h3>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-xs text-gray-500">
                  No activity yet.
                </div>
              ) : (
                notifications.map((n, i) => (
                  <div key={i} className="p-3 border-b border-dark-700/50 hover:bg-dark-700 transition-colors last:border-0 border-l-[3px] border-l-accent">
                    <p className="text-xs text-gray-300">{n.text}</p>
                    <p className="text-[10px] text-gray-500 mt-1">
                      {n.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
