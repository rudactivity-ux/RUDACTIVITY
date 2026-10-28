import React, { useState } from 'react';
import { Download, Smartphone, Monitor } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { AutoInstallModal } from './AutoInstallModal';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'compact' | 'full' | 'sidebar';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  variant = 'compact',
}) => {
  const { isInstalled, isDesktop } = usePWAInstall();
  const [modalOpen, setModalOpen] = useState(false);

  // If already installed and running standalone, don't show the install CTA
  if (isInstalled) {
    return null;
  }

  if (variant === 'sidebar') {
    return (
      <>
        <button
          onClick={() => setModalOpen(true)}
          className={`w-full group flex items-center justify-between p-2.5 rounded-xl bg-gradient-to-r from-indigo-900/40 via-indigo-800/30 to-blue-900/40 border border-indigo-500/30 hover:border-indigo-400/60 text-white transition-all shadow-md cursor-pointer ${className}`}
          title="Shyira App muri Telefoni cyangwa Mudasobwa"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-lg bg-indigo-600 text-white shadow-sm group-hover:scale-105 transition-transform">
              <Download size={16} />
            </div>
            <div className="text-left min-w-0">
              <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                <span>Shyira App muri {isDesktop ? 'PC' : 'Terefoni'}</span>
                <span className="text-[10px] px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 rounded font-normal">App</span>
              </div>
              <p className="text-[11px] text-indigo-200/70 truncate">Kanda hano yinjire ako kanya</p>
            </div>
          </div>
          {isDesktop ? <Monitor size={15} className="text-indigo-300" /> : <Smartphone size={15} className="text-indigo-300" />}
        </button>

        {modalOpen && (
          <AutoInstallModal forceOpen={true} onCloseManual={() => setModalOpen(false)} />
        )}
      </>
    );
  }

  if (variant === 'full') {
    return (
      <>
        <button
          onClick={() => setModalOpen(true)}
          className={`flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs sm:text-sm rounded-xl shadow-lg shadow-indigo-600/30 transition cursor-pointer ${className}`}
        >
          <Download size={16} />
          <span>Shyira App muri {isDesktop ? 'Mudasobwa' : 'Telefoni'}</span>
        </button>

        {modalOpen && (
          <AutoInstallModal forceOpen={true} onCloseManual={() => setModalOpen(false)} />
        )}
      </>
    );
  }

  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 hover:text-white text-xs font-medium transition cursor-pointer ${className}`}
        title="Download / Install RUDACTIVITY App"
      >
        <Download size={14} />
        <span className="hidden sm:inline">Shyira App muri {isDesktop ? 'PC' : 'Telefoni'}</span>
        <span className="sm:hidden">Install</span>
      </button>

      {modalOpen && (
        <AutoInstallModal forceOpen={true} onCloseManual={() => setModalOpen(false)} />
      )}
    </>
  );
};
