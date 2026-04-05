import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, Volume2, VolumeX, PhoneCall, PhoneOff, Wifi, WifiOff } from 'lucide-react';
import Peer from 'peerjs';

export default function VoiceChannel({ provider, localUser }) {
  const [isJoined,       setIsJoined]       = useState(false);
  const [micEnabled,     setMicEnabled]     = useState(false);
  const [speakerEnabled, setSpeakerEnabled] = useState(true);
  const [connectedPeers, setConnectedPeers] = useState([]);
  const [debugStatus,    setDebugStatus]    = useState('Disconnected');
  const [peerServOk,     setPeerServOk]     = useState(false); // broker health

  const peerRef        = useRef(null);
  const localStreamRef = useRef(null);
  const silentCtxRef   = useRef(null);
  const audioRefs      = useRef({});
  const activeCalls    = useRef({});

  /* ── Silent fallback stream (allows WebRTC handshake without mic) ── */
  const getSilentStream = useCallback(() => {
    try {
      if (!silentCtxRef.current) {
        const ctx  = new (window.AudioContext || window.webkitAudioContext)();
        const dest = ctx.createMediaStreamDestination();
        silentCtxRef.current = dest.stream;
      }
      return silentCtxRef.current;
    } catch (e) {
      console.warn('[Voice] Silent stream creation failed:', e);
      return null;
    }
  }, []);

  /* ── Remove peer audio & close WebRTC call ── */
  const removePeerAudio = useCallback((peerId) => {
    const audio = audioRefs.current[peerId];
    if (audio) {
      audio.srcObject = null;
      if (audio.parentNode) audio.parentNode.removeChild(audio);
      delete audioRefs.current[peerId];
    }
    const call = activeCalls.current[peerId];
    if (call) {
      try { call.close(); } catch (_) {}
      delete activeCalls.current[peerId];
    }
    setConnectedPeers(prev => prev.filter(id => id !== peerId));
  }, []);

  /* ── Attach remote stream to an <audio> element ── */
  const handleRemoteStream = useCallback((peerId, stream) => {
    let audio = audioRefs.current[peerId];
    if (!audio) {
      audio = document.createElement('audio');
      audio.autoplay  = true;
      audio.playsInline = true;
      document.body.appendChild(audio);
      audioRefs.current[peerId] = audio;
    }
    audio.srcObject = stream;
    audio.muted     = !speakerEnabled;
    audio.play().catch(e => console.warn('[Voice] Play error:', e));
    setDebugStatus('🔊 Receiving audio');
  }, [speakerEnabled]);

  /* ── Replace audio track in all active calls without reconnecting ── */
  const replaceTrackInCalls = useCallback((newTrack) => {
    Object.values(activeCalls.current).forEach(call => {
      try {
        const senders = call.peerConnection?.getSenders?.() || [];
        const sender  = senders.find(s => s.track?.kind === 'audio');
        if (sender) {
          sender.replaceTrack(newTrack).catch(e => console.warn('[Voice] replaceTrack error:', e));
        }
      } catch (e) {
        console.warn('[Voice] Could not replace track on call:', e);
      }
    });
  }, []);

  /* ── Full teardown ── */
  const teardownVoice = useCallback(() => {
    Object.keys(activeCalls.current).forEach(removePeerAudio);
    if (peerRef.current) {
      try { peerRef.current.destroy(); } catch (_) {}
      peerRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    if (provider?.awareness) {
      try {
        const state = provider.awareness.getLocalState() || {};
        provider.awareness.setLocalState({ ...state, voicePeerId: null });
      } catch (_) {}
    }
    setMicEnabled(false);
    setPeerServOk(false);
    setConnectedPeers([]);
    setDebugStatus('Disconnected');
  }, [provider, removePeerAudio]);

  /* ── Initialize PeerJS broker connection ── */
  const initPeer = useCallback((stream = null) => {
    if (peerRef.current) {
      try { peerRef.current.destroy(); } catch (_) {}
    }
    setDebugStatus('Connecting to broker…');
    setPeerServOk(false);

    const uniqueId  = `${(localUser?.id || 'guest').slice(0, 8)}-${Math.random().toString(36).slice(2, 7)}`;
    const peerHost  = window.location.hostname;
    const peerPort  = 5000;
    const isSecure  = window.location.protocol === 'https:';

    const peer = new Peer(uniqueId, {
      host:   peerHost,
      port:   peerPort,
      path:   '/peerjs',
      secure: isSecure,
      debug:  0,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' },
        ]
      }
    });

    peerRef.current = peer;

    peer.on('open', (id) => {
      setPeerServOk(true);
      setDebugStatus('Joined room — waiting for peers');
      if (provider?.awareness) {
        const state = provider.awareness.getLocalState() || {};
        provider.awareness.setLocalState({ ...state, voicePeerId: id });
      }
    });

    /* Answer incoming calls */
    peer.on('call', (call) => {
      const answerStream = stream || localStreamRef.current || getSilentStream();
      if (answerStream) {
        call.answer(answerStream);
      } else {
        call.answer(); // answer with no stream — avoids call hanging
      }
      call.on('stream', remoteStream => handleRemoteStream(call.peer, remoteStream));
      call.on('close', ()  => removePeerAudio(call.peer));
      call.on('error', ()  => removePeerAudio(call.peer));
      activeCalls.current[call.peer] = call;
    });

    peer.on('disconnected', () => {
      setDebugStatus('Broker disconnected — retrying…');
      setPeerServOk(false);
      try { peer.reconnect(); } catch (_) {}
    });

    peer.on('error', (err) => {
      console.error('[Voice] PeerJS error:', err.type, err);
      const msgs = {
        'network':              '⚠ Network error',
        'peer-unavailable':     '⚠ Peer unavailable',
        'server-error':         '⚠ Broker unreachable',
        'socket-error':         '⚠ Socket error',
        'socket-closed':        '⚠ Socket closed',
        'browser-incompatible': '⚠ Browser incompatible',
        'unavailable-id':       '⚠ ID conflict — retrying',
      };
      setDebugStatus(msgs[err.type] || `⚠ Error: ${err.type}`);
      if (err.type === 'unavailable-id') {
        setTimeout(() => initPeer(stream), 1500);
      }
    });
  }, [localUser, provider, getSilentStream, handleRemoteStream, removePeerAudio]);

  /* ── Mesh awareness: dial peers discovered via Yjs awareness ── */
  useEffect(() => {
    if (!isJoined || !provider?.awareness) return;

    const dial = () => {
      const myId = peerRef.current?.id;
      if (!myId || !peerRef.current?.open) return;

      const states      = provider.awareness.getStates();
      const remotePeers = Array.from(states.values())
        .map(s => s.voicePeerId)
        .filter(id => id && id !== myId);

      setConnectedPeers([...remotePeers]);

      // Dial new peers
      remotePeers.forEach(targetId => {
        if (activeCalls.current[targetId]) return;
        const outStream = localStreamRef.current || getSilentStream();
        if (!outStream) return;

        const call = peerRef.current.call(targetId, outStream);
        if (!call) return;

        call.on('stream', remoteStream => handleRemoteStream(targetId, remoteStream));
        call.on('close',  () => removePeerAudio(targetId));
        call.on('error',  () => removePeerAudio(targetId));
        activeCalls.current[targetId] = call;
      });

      // Hang up stale peers
      Object.keys(activeCalls.current).forEach(existingId => {
        if (!remotePeers.includes(existingId)) removePeerAudio(existingId);
      });
    };

    provider.awareness.on('change', dial);
    dial(); // initial dial

    return () => provider.awareness.off('change', dial);
  }, [isJoined, provider, getSilentStream, handleRemoteStream, removePeerAudio]);

  /* ── Cleanup on unmount ── */
  useEffect(() => () => teardownVoice(), [teardownVoice]);

  /* ── Join / Leave toggle ── */
  const toggleConnection = () => {
    if (isJoined) {
      setIsJoined(false);
      teardownVoice();
    } else {
      setIsJoined(true);
      initPeer();
    }
  };

  /* ── Microphone toggle ── */
  const toggleMic = async () => {
    if (!isJoined) return;

    if (!navigator.mediaDevices?.getUserMedia) {
      setDebugStatus('⚠ Mic blocked — needs HTTPS or localhost');
      return;
    }

    try {
      if (!localStreamRef.current) {
        setDebugStatus('Requesting mic access…');
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        localStreamRef.current = stream;
        setMicEnabled(true);
        setDebugStatus('🎙 Mic live');
        // Push real mic track to existing calls seamlessly
        replaceTrackInCalls(stream.getAudioTracks()[0]);
      } else {
        const track = localStreamRef.current.getAudioTracks()[0];
        if (track) {
          track.enabled = !track.enabled;
          setMicEnabled(track.enabled);
          setDebugStatus(track.enabled ? '🎙 Mic live' : '🔇 Mic muted');
        }
      }
    } catch (err) {
      console.error('[Voice] Mic error:', err);
      const msgs = {
        'NotAllowedError':     '🚫 Mic permission denied',
        'NotFoundError':       '🚫 No mic found',
        'NotReadableError':    '🚫 Mic in use by another app',
        'OverconstrainedError':'🚫 Mic not compatible',
      };
      setDebugStatus(msgs[err.name] || `🚫 Mic error: ${err.name}`);
    }
  };

  /* ── Speaker toggle ── */
  const toggleSpeaker = () => {
    const next = !speakerEnabled;
    setSpeakerEnabled(next);
    Object.values(audioRefs.current).forEach(a => { a.muted = !next; });
  };

  return (
    <div className="flex items-center gap-1.5 bg-dark-700/80 rounded-lg px-2 py-1 mx-1 border border-dark-600 shadow-inner">

      {/* Join/Leave */}
      <button
        onClick={toggleConnection}
        title={isJoined ? 'Leave Voice Room' : 'Join Voice Room'}
        className={`flex items-center gap-1 px-2 py-1.5 rounded-md transition-all text-xs font-semibold ${
          isJoined
            ? 'bg-red-500 hover:bg-red-600 text-white'
            : 'bg-emerald-600/80 hover:bg-emerald-500 text-white'
        }`}
      >
        {isJoined ? <PhoneOff size={13}/> : <PhoneCall size={13}/>}
        <span>{isJoined ? 'Leave' : 'Join'}</span>
      </button>

      <div className="w-px h-4 bg-dark-600"/>

      {/* Mic toggle */}
      <button
        onClick={toggleMic}
        disabled={!isJoined}
        title={micEnabled ? 'Mute mic' : 'Unmute mic'}
        className={`p-1.5 rounded-md transition-all ${
          !isJoined          ? 'opacity-30 cursor-not-allowed text-gray-500' :
          micEnabled         ? 'bg-indigo-600/30 text-indigo-400 hover:bg-indigo-600/50' :
                               'text-gray-400 hover:text-white hover:bg-dark-600'
        }`}
      >
        {micEnabled ? <Mic size={13}/> : <MicOff size={13}/>}
      </button>

      {/* Speaker toggle */}
      <button
        onClick={toggleSpeaker}
        title={speakerEnabled ? 'Mute speaker' : 'Unmute speaker'}
        className={`p-1.5 rounded-md transition-all ${
          speakerEnabled ? 'text-gray-300 hover:bg-dark-600 hover:text-white' : 'bg-red-500/20 text-red-400'
        }`}
      >
        {speakerEnabled ? <Volume2 size={13}/> : <VolumeX size={13}/>}
      </button>

      <div className="w-px h-4 bg-dark-600"/>

      {/* Status + peer count */}
      <div className="flex flex-col items-end min-w-[80px]">
        <span className="flex items-center gap-1 text-[9px] uppercase font-bold text-gray-500 truncate max-w-[100px]" title={debugStatus}>
          {isJoined && (peerServOk ? <Wifi size={9} className="text-emerald-400 shrink-0"/> : <WifiOff size={9} className="text-yellow-400 shrink-0"/>)}
          <span>{debugStatus}</span>
        </span>
        {isJoined && (
          <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1 leading-none mt-0.5">
            <span className={`w-1.5 h-1.5 rounded-full ${peerServOk ? 'bg-emerald-500 animate-pulse' : 'bg-yellow-500'}`}/>
            {connectedPeers.length} {connectedPeers.length === 1 ? 'peer' : 'peers'}
          </span>
        )}
      </div>
    </div>
  );
}
