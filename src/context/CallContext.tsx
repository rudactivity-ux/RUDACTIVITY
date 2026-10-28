import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { CallRecord, CallType, CallStatus } from '../types/index.ts';
import { useAuth } from './AuthContext.tsx';
import { useWebSocket } from './WebSocketContext.tsx';

interface CallContextType {
  activeCall: CallRecord | null;
  incomingCall: CallRecord | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  callStatus: CallStatus | 'idle';
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  callDuration: number; // in seconds
  callHistory: CallRecord[];
  initiateCall: (receiverId: string, receiverName: string, receiverAvatar: string, type: CallType, conversationId?: string) => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: (reason?: string) => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleVideo: () => void;
  toggleScreenShare: () => Promise<void>;
  switchCamera: () => Promise<void>;
  fetchCallHistory: () => Promise<void>;
}

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

const CallContext = createContext<CallContextType | undefined>(undefined);

export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token } = useAuth();
  const { addListener, sendEvent } = useWebSocket();

  const [activeCall, setActiveCall] = useState<CallRecord | null>(null);
  const [incomingCall, setIncomingCall] = useState<CallRecord | null>(null);
  const [callStatus, setCallStatus] = useState<CallStatus | 'idle'>('idle');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isVideoOff, setIsVideoOff] = useState<boolean>(false);
  const [isScreenSharing, setIsScreenSharing] = useState<boolean>(false);
  const [callDuration, setCallDuration] = useState<number>(0);
  const [callHistory, setCallHistory] = useState<CallRecord[]>([]);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const durationTimerRef = useRef<any>(null);
  const facingModeRef = useRef<'user' | 'environment'>('user');

  // Load call history
  const fetchCallHistory = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/calls/history', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCallHistory(data.calls || []);
      }
    } catch (err) {
      console.error('Failed to load call history:', err);
    }
  }, [token]);

  useEffect(() => {
    fetchCallHistory();
  }, [fetchCallHistory]);

  // Cleanup helper
  const cleanUpCallState = useCallback(() => {
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    setLocalStream(null);
    setRemoteStream(null);
    setActiveCall(null);
    setIncomingCall(null);
    setCallStatus('idle');
    setIsMuted(false);
    setIsVideoOff(false);
    setIsScreenSharing(false);
    setCallDuration(0);
  }, []);

  // Initialize WebRTC Peer Connection
  const createPeerConnection = useCallback((targetUserId: string, callId: string) => {
    try {
      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnectionRef.current = pc;

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendEvent('call:signal', {
            toUserId: targetUserId,
            callId,
            signalData: { type: 'candidate', candidate: event.candidate },
          });
        }
      };

      // Handle remote tracks
      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          setRemoteStream(event.streams[0]);
        } else {
          const stream = new MediaStream([event.track]);
          setRemoteStream(stream);
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') {
          setCallStatus('connected');
        } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
          console.warn('Peer connection interrupted');
        }
      };

      // Add local tracks if available
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current!);
        });
      }

      return pc;
    } catch (err) {
      console.error('Failed to create RTCPeerConnection:', err);
      return null;
    }
  }, [sendEvent]);

  // Duration timer when connected
  useEffect(() => {
    if (callStatus === 'connected') {
      durationTimerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
        durationTimerRef.current = null;
      }
    }
    return () => {
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    };
  }, [callStatus]);

  // Listen for WebSocket signaling events
  useEffect(() => {
    // 1. Incoming call
    const unsubIncoming = addListener('call:incoming', (payload: { call: CallRecord }) => {
      setIncomingCall(payload.call);
    });

    // 2. Outgoing ringing confirmation
    const unsubOutgoing = addListener('call:outgoing_ringing', (payload: { call: CallRecord }) => {
      setActiveCall(payload.call);
      setCallStatus('ringing');
    });

    // 3. Call connected
    const unsubConnected = addListener('call:connected', async (payload: { callId: string }) => {
      setCallStatus('connected');
      if (activeCall && user) {
        const otherUserId = activeCall.callerId === user.id ? activeCall.receiverId : activeCall.callerId;
        const pc = peerConnectionRef.current || createPeerConnection(otherUserId, payload.callId);

        // If caller, create SDP offer
        if (activeCall.callerId === user.id && pc) {
          try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            sendEvent('call:signal', {
              toUserId: otherUserId,
              callId: payload.callId,
              signalData: { type: 'offer', sdp: offer.sdp },
            });
          } catch (e) {
            console.error('Failed to create SDP offer:', e);
          }
        }
      }
    });

    // 4. Signal received (offer, answer, or candidate)
    const unsubSignal = addListener('call:signal', async (payload: { fromUserId: string; callId: string; signalData: any }) => {
      const { signalData, fromUserId, callId } = payload;
      let pc = peerConnectionRef.current;
      if (!pc) {
        pc = createPeerConnection(fromUserId, callId);
      }
      if (!pc) return;

      try {
        if (signalData.type === 'offer') {
          await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: signalData.sdp }));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          sendEvent('call:signal', {
            toUserId: fromUserId,
            callId,
            signalData: { type: 'answer', sdp: answer.sdp },
          });
        } else if (signalData.type === 'answer') {
          await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: signalData.sdp }));
        } else if (signalData.type === 'candidate') {
          await pc.addIceCandidate(new RTCIceCandidate(signalData.candidate));
        }
      } catch (err) {
        console.error('Error handling WebRTC signal:', err);
      }
    });

    // 5. Call ended or declined
    const unsubEnded = addListener('call:ended', () => {
      cleanUpCallState();
      fetchCallHistory();
    });

    return () => {
      unsubIncoming();
      unsubOutgoing();
      unsubConnected();
      unsubSignal();
      unsubEnded();
    };
  }, [addListener, sendEvent, activeCall, user, createPeerConnection, cleanUpCallState, fetchCallHistory]);

  // Initiate call
  const initiateCall = async (
    receiverId: string,
    receiverName: string,
    receiverAvatar: string,
    type: CallType,
    conversationId?: string
  ) => {
    if (!user) return;

    try {
      // Request media stream with fallback
      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: type === 'video' ? { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } : false,
        });
      } catch (mediaErr) {
        console.warn('Could not acquire local camera/mic stream, creating fallback silent stream:', mediaErr);
        // Fallback: create empty audio track so signaling continues gracefully
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const dst = ctx.createMediaStreamDestination();
        osc.connect(dst);
        osc.start();
        stream = dst.stream;
      }

      localStreamRef.current = stream;
      setLocalStream(stream);

      // Start call via signaling
      sendEvent('call:initiate', {
        receiverId,
        conversationId,
        type,
      });

      setCallStatus('calling');
    } catch (err) {
      console.error('Failed to initiate call:', err);
      cleanUpCallState();
    }
  };

  // Accept incoming call
  const acceptCall = async () => {
    if (!incomingCall || !user) return;

    try {
      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: incomingCall.type === 'video' ? { facingMode: 'user' } : false,
        });
      } catch (mediaErr) {
        console.warn('Audio/video permission fallback for receiver:', mediaErr);
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const dst = ctx.createMediaStreamDestination();
        stream = dst.stream;
      }

      localStreamRef.current = stream;
      setLocalStream(stream);

      setActiveCall(incomingCall);
      setIncomingCall(null);
      setCallStatus('connected');

      // Create peer connection
      createPeerConnection(incomingCall.callerId, incomingCall.id);

      // Tell caller we accepted
      sendEvent('call:accept', { callId: incomingCall.id });
    } catch (err) {
      console.error('Error accepting call:', err);
      cleanUpCallState();
    }
  };

  // Reject call
  const rejectCall = (reason: string = 'declined') => {
    if (incomingCall) {
      sendEvent('call:reject', { callId: incomingCall.id, reason });
      setIncomingCall(null);
      cleanUpCallState();
    }
  };

  // End active call
  const endCall = () => {
    if (activeCall) {
      sendEvent('call:end', { callId: activeCall.id, durationSeconds: callDuration });
      cleanUpCallState();
      fetchCallHistory();
    }
  };

  // Toggle Mute
  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      const newMuted = !isMuted;
      setIsMuted(newMuted);

      if (activeCall && user) {
        const otherId = activeCall.callerId === user.id ? activeCall.receiverId : activeCall.callerId;
        sendEvent('call:mute_state', { toUserId: otherId, callId: activeCall.id, isMuted: newMuted, isVideoOff });
      }
    }
  };

  // Toggle Video
  const toggleVideo = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      const newVideoOff = !isVideoOff;
      setIsVideoOff(newVideoOff);

      if (activeCall && user) {
        const otherId = activeCall.callerId === user.id ? activeCall.receiverId : activeCall.callerId;
        sendEvent('call:mute_state', { toUserId: otherId, callId: activeCall.id, isMuted, isVideoOff: newVideoOff });
      }
    }
  };

  // Toggle Screen Share
  const toggleScreenShare = async () => {
    if (!peerConnectionRef.current || !activeCall) return;

    if (isScreenSharing) {
      // Revert to camera
      try {
        const camStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facingModeRef.current },
        });
        const videoTrack = camStream.getVideoTracks()[0];
        const sender = peerConnectionRef.current.getSenders().find((s) => s.track && s.track.kind === 'video');
        if (sender) {
          sender.replaceTrack(videoTrack);
        }
        setLocalStream(camStream);
        localStreamRef.current = camStream;
        setIsScreenSharing(false);
      } catch (e) {
        console.error('Failed to revert to camera:', e);
      }
    } else {
      // Start screen capture
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = screenStream.getVideoTracks()[0];

        screenTrack.onended = () => {
          setIsScreenSharing(false);
        };

        const sender = peerConnectionRef.current.getSenders().find((s) => s.track && s.track.kind === 'video');
        if (sender) {
          sender.replaceTrack(screenTrack);
        }
        setLocalStream(screenStream);
        localStreamRef.current = screenStream;
        setIsScreenSharing(true);
      } catch (err) {
        console.error('Failed to capture screen:', err);
      }
    }
  };

  // Switch Camera
  const switchCamera = async () => {
    if (!localStreamRef.current || !peerConnectionRef.current) return;
    try {
      const nextMode = facingModeRef.current === 'user' ? 'environment' : 'user';
      facingModeRef.current = nextMode;

      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: nextMode },
      });
      const newTrack = newStream.getVideoTracks()[0];

      const sender = peerConnectionRef.current.getSenders().find((s) => s.track && s.track.kind === 'video');
      if (sender) {
        sender.replaceTrack(newTrack);
      }
      setLocalStream(newStream);
      localStreamRef.current = newStream;
    } catch (e) {
      console.error('Failed to switch camera:', e);
    }
  };

  return (
    <CallContext.Provider
      value={{
        activeCall,
        incomingCall,
        localStream,
        remoteStream,
        callStatus,
        isMuted,
        isVideoOff,
        isScreenSharing,
        callDuration,
        callHistory,
        initiateCall,
        acceptCall,
        rejectCall,
        endCall,
        toggleMute,
        toggleVideo,
        toggleScreenShare,
        switchCamera,
        fetchCallHistory,
      }}
    >
      {children}
    </CallContext.Provider>
  );
};

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error('useCall must be used within a CallProvider');
  }
  return context;
};
