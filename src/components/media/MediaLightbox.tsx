import React from 'react';
import { X, Download, ExternalLink } from 'lucide-react';

interface MediaLightboxProps {
  url: string | null;
  type: 'image' | 'video' | null;
  name?: string;
  onClose: () => void;
}

export const MediaLightbox: React.FC<MediaLightboxProps> = ({ url, type, name, onClose }) => {
  if (!url || !type) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-between p-4 sm:p-6 animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Top Header */}
      <div
        className="w-full max-w-5xl flex items-center justify-between text-white py-2"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-sm font-medium text-slate-300 truncate max-w-xs sm:max-w-md">
          {name || 'Media Preview'}
        </span>

        <div className="flex items-center gap-2">
          <a
            href={url}
            download={name || 'rudactivity_media'}
            target="_blank"
            rel="noreferrer"
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="Download"
          >
            <Download size={18} />
          </a>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div
        className="flex-1 w-full max-w-5xl flex items-center justify-center p-2 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {type === 'image' ? (
          <img
            src={url}
            alt={name || 'Preview'}
            className="max-h-[85vh] max-w-full object-contain rounded-xl shadow-2xl"
          />
        ) : (
          <video
            src={url}
            controls
            autoPlay
            className="max-h-[85vh] max-w-full rounded-xl shadow-2xl"
          />
        )}
      </div>

      <div className="py-2 text-xs text-slate-400">
        Click anywhere outside or press Esc to close
      </div>
    </div>
  );
};
