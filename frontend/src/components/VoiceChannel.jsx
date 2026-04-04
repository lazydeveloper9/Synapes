import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, Volume2, VolumeX, PhoneCall, PhoneOff } from 'lucide-react';
import Peer from 'peerjs';

export default function VoiceChannel({ provider, localUser }) {
  const [isJoined, setIsJoined] = useState(false);
  const [micEnabled, setMicEnabled] = useState(false);
  const [speakerEnabled, setSpeakerEnabled] = useState(true);
  const [connectedPeers, setConnectedPeers] = useState([]);
  const [debugStatus, setDebugStatus] = useState('Disconnected');
  
  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const audioRefs = useRef({}); 
  const activeCalls = useRef({}); 
  const silentStreamRef = useRef(null);

  // Helper: Create a dummy silent audio stream so PeerJS can establish connections without mic access
  const getFailsafeStream = useCallback(() => {
    if (localStreamRef.current) return localStreamRef.current;
    if (!silentStreamRef.current) {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const dest = ctx.createMediaStreamDestination();
        silentStreamRef.current = dest.stream;
      } catch (e) {
        console.warn('Silent audio fallback not supported in this browser.');
      }
    }
    return silentStreamRef.current;
  }, []); 
  
  // Clean up a specific call
  const removePeerAudio = useCallback((peerId) => {
    if (audioRefs.current[peerId]) {
      const audioEl = audioRefs.current[peerId];
      if (audioEl.parentNode) {
        audioEl.parentNode.removeChild(audioEl);
      }
      audioEl.srcObject = null;
      delete audioRefs.current[peerId];
    }
    if (activeCalls.current[peerId]) {
      activeCalls.current[peerId].close();
      delete activeCalls.current[peerId];
    }
  }, []);

  // Handle incoming streams
  const handleRemoteStream = useCallback((peerId, stream) => {
    if (!audioRefs.current[peerId]) {
      const audioEl = new Audio();
      audioEl.autoplay = true;
      document.body.appendChild(audioEl);
      audioRefs.current[peerId] = audioEl;
    }
    const audioEl = audioRefs.current[peerId];
    audioEl.srcObject = stream;
    // Set speaker preference
    audioEl.muted = !speakerEnabled;
    audioEl.play().catch(e => console.warn('Audio play prevented:', e));
    
    setDebugStatus('Connected & Receiving');
  }, [speakerEnabled]);

  // Completely shutdown voice channel
  const teardownVoice = useCallback(() => {
    Object.keys(activeCalls.current).forEach(removePeerAudio);
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    if (provider?.awareness) {
      const state = provider.awareness.getLocalState();
      provider.awareness.setLocalState({ ...state, voicePeerId: null });
    }
    setMicEnabled(false);
    setDebugStatus('Disconnected');
  }, [provider, removePeerAudio]);

  // Initialize or re-index the Peer connection
  const initPeer = useCallback((stream = null) => {
    if (peerRef.current) {
      peerRef.current.destroy();
    }
    setDebugStatus('Connecting WebRTC...');
    
    const uniquePeerId = `${localUser.id}-${Math.random().toString(36).substring(7)}`;
    const peer = new Peer(uniquePeerId, {
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' }
        ]
      }
    });
    peerRef.current = peer;

    peer.on('open', (id) => {
      setDebugStatus('Broker joined. Waiting...');
      if (provider?.awareness) {
        const state = provider.awareness.getLocalState();
        provider.awareness.setLocalState({ ...state, voicePeerId: id });
      }
    });

    peer.on('call', (call) => {
      // Answer the call with our local stream (or silent fallback if mic is off)
      call.answer(stream || getFailsafeStream());
      
      call.on('stream', (remoteStream) => {
        handleRemoteStream(call.peer, remoteStream);
      });
      call.on('close', () => removePeerAudio(call.peer));
      call.on('error', () => removePeerAudio(call.peer));
      
      activeCalls.current[call.peer] = call;
    });

    peer.on('error', (err) => {
      console.error('PeerJS error:', err);
      setDebugStatus(`Error: ${err.type}`);
    });

  }, [localUser.id, provider, handleRemoteStream, removePeerAudio]);

  // Toggle Connection State
  const toggleConnection = () => {
    if (!isJoined) {
      setIsJoined(true);
      initPeer(); // just join as listener initially without mic permission prompts
    } else {
      setIsJoined(false);
      teardownVoice();
    }
  };

  // Teardown heavily explicitly solely on unmount bounds
  useEffect(() => {
    return () => teardownVoice();
  }, [teardownVoice]);

  // Mesh Network Manager - Watch Yjs awareness for changes and dial missing peers
  useEffect(() => {
    if (!isJoined || !provider?.awareness) return;
    
    const handleAwarenessUpdate = () => {
      const states = provider.awareness.getStates();
      const myPeerId = peerRef.current?.id;
      if (!myPeerId) return;

      // Extract all peer IDs listed by others
      const remotePeerIds = Array.from(states.values())
        .map(s => s.voicePeerId)
        .filter(id => id && id !== myPeerId);
        
      setConnectedPeers([...remotePeerIds]);
        
      // Dial any new peers that we haven't connected to yet
      remotePeerIds.forEach(targetPeerId => {
        if (!activeCalls.current[targetPeerId]) {
          const call = peerRef.current.call(targetPeerId, localStreamRef.current || getFailsafeStream());
          if (call) {
             call.on('stream', (remoteStream) => {
               handleRemoteStream(targetPeerId, remoteStream);
             });
             call.on('close', () => removePeerAudio(targetPeerId));
             call.on('error', () => removePeerAudio(targetPeerId));
             
             activeCalls.current[targetPeerId] = call;
          }
        }
      });
    };
    
    provider.awareness.on('change', handleAwarenessUpdate);
    // Initial sync check
    handleAwarenessUpdate();
    
    return () => provider.awareness.off('change', handleAwarenessUpdate);
  }, [isJoined, provider, handleRemoteStream, removePeerAudio]);

  // Microphone Toggle logic
  const toggleMic = async () => {
    if (!isJoined) return; // Must be joined to enable mic
    
    if (!localStreamRef.current) {
      setDebugStatus('Requesting mic access...');
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStreamRef.current = stream;
        setMicEnabled(true);
        // By re-initializing the peer while passing the stream, it will re-invoke the Mesh network
        initPeer(stream);
      } catch (err) {
        console.error('Microphone access denied: ', err);
        setDebugStatus('Mic hardware blocked');
      }
    } else {
      // Audio stream exists, just flip the hardware bit safely
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setMicEnabled(audioTrack.enabled);
        setDebugStatus(audioTrack.enabled ? 'Mic Unmuted' : 'Mic Muted');
      }
    }
  };

  // Speaker Toggle logic
  const toggleSpeaker = () => {
    const next = !speakerEnabled;
    setSpeakerEnabled(next);
    Object.values(audioRefs.current).forEach(audio => {
      audio.muted = !next;
    });
  };

  return (
    <div className="flex items-center gap-1.5 bg-dark-700/80 rounded-lg px-2 py-1 mx-1 border border-dark-600 shadow-inner overflow-hidden">
      
      {/* Join/Leave Connection Button */}
      <button 
        onClick={toggleConnection}
        title={isJoined ? "Disconnect Voice" : "Join Voice Channel"}
        className={`flex items-center gap-1 p-1.5 rounded-md transition-all text-xs font-semibold ${
          isJoined ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-emerald-600/80 hover:bg-emerald-500 text-white'
        }`}
      >
        {isJoined ? <PhoneOff size={14} /> : <PhoneCall size={14} />}
        <span>{isJoined ? 'Leave' : 'Join'}</span>
      </button>

      <div className="w-px h-4 bg-dark-600 mx-0.5" />

      {/* Mic Toggle (only enabled if joined) */}
      <button 
        onClick={toggleMic}
        disabled={!isJoined}
        title={micEnabled ? "Mute Microphone" : "Unmute Microphone"}
        className={`p-1.5 rounded-md transition-all ${
          !isJoined ? 'opacity-30 cursor-not-allowed text-gray-500' :
          micEnabled ? 'bg-indigo-600/30 text-indigo-400' : 'text-gray-400 hover:text-white hover:bg-dark-600'
        }`}
      >
        {micEnabled ? <Mic size={14} /> : <MicOff size={14} />}
      </button>
      
      {/* Speaker Toggle */}
      <button 
        onClick={toggleSpeaker}
        title={speakerEnabled ? "Mute Output" : "Unmute Output"}
        className={`p-1.5 rounded-md transition-all ${speakerEnabled ? 'text-gray-300 hover:bg-dark-600 hover:text-white' : 'bg-red-500/20 text-red-400'}`}
      >
        {speakerEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
      </button>
      
      {/* Debug Indicator & Peers */}
      <div className="flex flex-col items-end ml-1 mr-0.5 min-w-20">
        <span className="text-[9px] text-gray-500 truncate max-w-24 uppercase font-bold" title={debugStatus}>
          {debugStatus}
        </span>
        {isJoined && (
          <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1 leading-none mt-0.5">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
            {connectedPeers.length} {connectedPeers.length === 1 ? 'peer' : 'peers'}
          </span>
        )}
      </div>
    </div>
  );
}
