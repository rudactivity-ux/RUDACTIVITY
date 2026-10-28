import React from 'react';
import { useCall } from '../../context/CallContext.tsx';
import { Phone, Video, PhoneOff, Check } from 'lucide-react';

export const IncomingCallBanner: React.FC = () => {
  const { incomingCall, acceptCall, rejectCall } = useCall();

  if (!incomingCall) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4 animate-in slide-in-from-top-4 duration-300">
      <div className="bg-slate-900/95 border border-indigo-500/40 backdrop-blur-xl rounded-2xl p-4 shadow-2xl shadow-indigo-500/10 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img
              src={incomingCall.callerAvatar}
              alt={incomingCall.callerName}
              className="w-12 h-12 rounded-full object-cover ring-2 ring-indigo-500 animate-pulse"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <div className="absolute -bottom-1 -right-1 bg-indigo-600 rounded-full p-1 text-white">
              {incomingCall.type === 'video' ? <Video size={12} /> : <Phone size={12} />}
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-white text-sm">{incomingCall.callerName}</h4>
            <p className="text-xs text-indigo-300">
              Incoming {incomingCall.type === 'video' ? 'Video' : 'Voice'} Call...
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => rejectCall('declined')}
            className="p-2.5 rounded-full bg-rose-600/20 text-rose-400 hover:bg-rose-600 hover:text-white transition-colors"
            title="Decline"
          >
            <PhoneOff size={18} />
          </button>
          <button
            onClick={acceptCall}
            className="p-2.5 rounded-full bg-emerald-600 text-white hover:bg-emerald-500 shadow-lg shadow-emerald-600/30 transition-all hover:scale-105"
            title="Accept"
          >
            <Check size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
