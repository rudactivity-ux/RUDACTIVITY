import React, { useRef, useEffect } from 'react';
import { useCall } from '../../context/CallContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Monitor,
  SwitchCamera,
  Maximize2,
  Volume2
} from 'lucide-react';

export const CallModal: React.FC = () => {
  const {
    activeCall,
    callStatus,
    localStream,
    remoteStream,
    isMuted,
    isVideoOff,
    isScreenSharing,
    callDuration,
    endCall,
    toggleMute,
    toggleVideo,
    toggleScreenShare,
    switchCamera,
  } = useCall();
  const { user } = useAuth();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Bind local stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Bind remote stream
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  if (!activeCall || callStatus === 'idle') return null;

  const isCaller = activeCall.callerId === user?.id;
  const peerName = isCaller ? activeCall.receiverName : activeCall.callerName;
  const peerAvatar = isCaller ? activeCall.receiverAvatar : activeCall.callerAvatar;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-2xl flex flex-col items-center justify-between p-4 sm:p-8 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="w-full max-w-4xl flex items-center justify-between text-slate-300">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-sm font-medium tracking-wide">
            {callStatus === 'connected' ? 'Secure WebRTC Peer Connection' : 'Signaling Peer...'}
          </span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 px-4 py-1.5 rounded-full text-xs font-mono font-medium text-slate-200">
          {callStatus === 'connected' ? formatDuration(callDuration) : callStatus.toUpperCase()}
        </div>
      </div>

      {/* Main Viewport */}
      <div className="relative w-full max-w-4xl flex-1 my-6 rounded-3xl overflow-hidden bg-slate-900/60 border border-slate-800/80 flex items-center justify-center shadow-2xl">
        {activeCall.type === 'video' ? (
          <>
            {/* Remote video feed */}
            {remoteStream ? (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center gap-4 p-8 text-center">
                <div className="relative">
                  <img
                    src={peerAvatar}
                    alt={peerName}
                    className="w-32 h-32 rounded-full object-cover ring-4 ring-indigo-500/40 shadow-2xl"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  <div className="absolute inset-0 rounded-full border border-indigo-400/50 animate-ping opacity-30" />
                </div>
                <h3 className="text-xl font-bold text-white mt-2">{peerName}</h3>
                <p className="text-sm text-slate-400">
                  {callStatus === 'ringing' ? 'Ringing...' : 'Establishing encrypted video stream...'}
                </p>
              </div>
            )}

            {/* Local video thumbnail (PiP) */}
            <div className="absolute bottom-6 right-6 w-36 h-48 sm:w-48 sm:h-64 rounded-2xl overflow-hidden bg-slate-950 border-2 border-slate-700/80 shadow-2xl z-10 group">
              {isVideoOff ? (
                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-slate-500 text-xs gap-2">
                  <VideoOff size={24} />
                  <span>Camera off</span>
                </div>
              ) : (
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover -scale-x-100"
                />
              )}
              <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/60 text-[10px] text-white backdrop-blur">
                You
              </div>
            </div>
          </>
        ) : (
          /* Voice Call Audio Viewport */
          <div className="flex flex-col items-center justify-center gap-6 p-8 text-center">
            <div className="relative">
              <div className="absolute -inset-4 bg-indigo-500/10 rounded-full blur-xl animate-pulse" />
              <img
                src={peerAvatar}
                alt={peerName}
                className="relative w-36 h-36 rounded-full object-cover ring-4 ring-indigo-500/50 shadow-2xl"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <div className="absolute bottom-0 right-0 bg-indigo-600 p-2 rounded-full text-white ring-4 ring-slate-950">
                <Volume2 size={18} />
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-white">{peerName}</h2>
              <p className="text-sm text-indigo-300 mt-1">
                {callStatus === 'connected' ? 'High-Definition Audio Active' : 'Connecting Audio Stream...'}
              </p>
            </div>

            {callStatus === 'connected' && (
              <div className="flex items-center gap-1.5 h-8">
                <span className="w-1.5 bg-indigo-400 rounded-full animate-soundwave-1" />
                <span className="w-1.5 bg-indigo-400 rounded-full animate-soundwave-2" />
                <span className="w-1.5 bg-indigo-500 rounded-full animate-soundwave-3" />
                <span className="w-1.5 bg-indigo-400 rounded-full animate-soundwave-4" />
                <span className="w-1.5 bg-indigo-400 rounded-full animate-soundwave-5" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Call Action Bar */}
      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 backdrop-blur-xl rounded-full px-6 py-4 flex items-center justify-center gap-4 sm:gap-6 shadow-2xl">
        {/* Mute Mic */}
        <button
          onClick={toggleMute}
          className={`p-3.5 rounded-full transition-all ${
            isMuted
              ? 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30'
              : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
          }`}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
        </button>

        {/* Video Toggle (if video call) */}
        {activeCall.type === 'video' && (
          <>
            <button
              onClick={toggleVideo}
              className={`p-3.5 rounded-full transition-all ${
                isVideoOff
                  ? 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30'
                  : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
              }`}
              title={isVideoOff ? 'Enable Camera' : 'Disable Camera'}
            >
              {isVideoOff ? <VideoOff size={22} /> : <Video size={22} />}
            </button>

            <button
              onClick={switchCamera}
              className="p-3.5 rounded-full bg-slate-800 text-slate-200 hover:bg-slate-700 transition-all"
              title="Flip / Switch Camera"
            >
              <SwitchCamera size={22} />
            </button>

            <button
              onClick={toggleScreenShare}
              className={`p-3.5 rounded-full transition-all ${
                isScreenSharing
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
              }`}
              title="Share Screen"
            >
              <Monitor size={22} />
            </button>
          </>
        )}

        {/* End Call Button */}
        <button
          onClick={endCall}
          className="p-4 rounded-full bg-rose-600 text-white hover:bg-rose-500 shadow-lg shadow-rose-600/30 transition-all hover:scale-105"
          title="End Call"
        >
          <PhoneOff size={24} />
        </button>
      </div>
    </div>
  );
};
