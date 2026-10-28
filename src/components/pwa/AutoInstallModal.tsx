import React, { useState, useEffect } from 'react';
import {
  Download,
  Smartphone,
  Monitor,
  Share2,
  PlusSquare,
  CheckCircle2,
  X,
  Sparkles,
  ShieldCheck,
  Zap,
  ArrowRight
} from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

interface AutoInstallModalProps {
  forceOpen?: boolean;
  onCloseManual?: () => void;
}

export const AutoInstallModal: React.FC<AutoInstallModalProps> = ({ forceOpen, onCloseManual }) => {
  const { isInstallable, isInstalled, isIOS, isAndroid, isDesktop, install } = usePWAInstall();
  const [isOpen, setIsOpen] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  useEffect(() => {
    // If explicitly forced open (e.g. from Sidebar or Settings button)
    if (forceOpen) {
      setIsOpen(true);
      return;
    }

    // If already running in standalone mode (already installed), do not pop up automatically
    if (isInstalled) {
      return;
    }

    // Check if user dismissed it in this session
    const dismissedSession = sessionStorage.getItem('rudactivity_pwa_dismissed');
    if (dismissedSession === 'true') {
      return;
    }

    // Prompt automatically 1.2 seconds after loading so user sees the prompt to download the app right away
    const timer = setTimeout(() => {
      setIsOpen(true);
    }, 1200);

    return () => clearTimeout(timer);
  }, [isInstalled, forceOpen]);

  const handleInstallClick = async () => {
    setIsInstalling(true);
    try {
      if (isInstallable) {
        const success = await install();
        if (success) {
          setInstallSuccess(true);
          setTimeout(() => {
            setIsOpen(false);
            if (onCloseManual) onCloseManual();
          }, 2000);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsInstalling(false);
    }
  };

  const handleDismiss = () => {
    setIsOpen(false);
    sessionStorage.setItem('rudactivity_pwa_dismissed', 'true');
    if (onCloseManual) onCloseManual();
  };

  if (!isOpen || isInstalled) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <div 
        className="relative w-full max-w-lg bg-gradient-to-b from-slate-900 to-slate-950 border border-indigo-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-indigo-950/60 text-white overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow ambient background effect */}
        <div className="absolute -top-24 -right-24 w-60 h-60 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/60 hover:bg-slate-800 transition cursor-pointer"
          aria-label="Funga"
        >
          <X size={18} />
        </button>

        {installSuccess ? (
          <div className="text-center py-8 space-y-4">
            <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto animate-bounce">
              <CheckCircle2 size={36} />
            </div>
            <h3 className="text-xl font-bold text-white">App Yamaze Kwinjira!</h3>
            <p className="text-sm text-slate-300">
              RUDACTIVITY yamaze gushyirwa muri terefoni cyangwa mudasobwa yawe. Ubu ushobora kuyifungura mu buryo bwigenga (Standalone App).
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header with App Logo & Title */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <img
                  src="/pwa-192x192.png"
                  alt="RUDACTIVITY Logo"
                  className="w-16 h-16 rounded-2xl ring-2 ring-indigo-500/40 shadow-lg object-cover bg-indigo-950"
                  onError={(e) => {
                    // Fallback to SVG if png is not yet ready
                    (e.target as HTMLImageElement).src = '/icon.svg';
                  }}
                />
                <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-slate-950 p-1 rounded-full ring-2 ring-slate-900">
                  <Sparkles size={12} />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-medium mb-1">
                  <Download size={11} />
                  <span>Download & Install App</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight truncate">
                  Shyira RUDACTIVITY muri {isDesktop ? 'Mudasobwa' : 'Telefoni'}
                </h2>
                <p className="text-xs text-slate-400">
                  {isDesktop ? 'Desktop App ya Mudasobwa' : 'Mobile App ya Telefoni'} • Umutekano Usesuye
                </p>
              </div>
            </div>

            {/* Value Proposition bullets */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-slate-300">
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50">
                <Zap size={16} className="text-amber-400 shrink-0" />
                <span>Umuvuduko wihuse cyane (Ultra-Fast)</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50">
                <ShieldCheck size={16} className="text-emerald-400 shrink-0" />
                <span>Ubutumwa n'amajwi birinzwe 100%</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50">
                <Smartphone size={16} className="text-indigo-400 shrink-0" />
                <span>Kwakira amamenyesha (Notifications)</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50">
                <Monitor size={16} className="text-sky-400 shrink-0" />
                <span>Gukora no mu gihe nta internet (Offline)</span>
              </div>
            </div>

            {/* Installation Action Area */}
            {isInstallable ? (
              /* Chromium / Android / Edge / Chrome Desktop 1-Click Install */
              <div className="space-y-3">
                <button
                  onClick={handleInstallClick}
                  disabled={isInstalling}
                  className="w-full py-3.5 px-6 bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold text-sm sm:text-base rounded-2xl shadow-xl shadow-indigo-600/30 transition-all flex items-center justify-center gap-3 cursor-pointer group active:scale-[0.98]"
                >
                  <Download size={20} className="group-hover:-translate-y-0.5 transition-transform" />
                  <span>
                    {isInstalling
                      ? 'Irikwinjira...'
                      : `Shyira App muri ${isDesktop ? 'Mudasobwa (Install App)' : 'Telefoni (Install App)'}`}
                  </span>
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </button>
                <p className="text-center text-xs text-slate-400">
                  Kanda kuri iyi buto, uhite wemeza "Install" muri browser yawe.
                </p>
              </div>
            ) : isIOS ? (
              /* iOS Safari Guide */
              <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 space-y-3">
                <h4 className="text-sm font-semibold text-indigo-300 flex items-center gap-2">
                  <Smartphone size={16} />
                  <span>Uko wayishyira muri iPhone / iPad (iOS):</span>
                </h4>
                <ol className="text-xs text-slate-300 space-y-2 list-decimal list-inside leading-relaxed">
                  <li>
                    Kanda kuri buto ya <strong className="text-white inline-flex items-center gap-1"><Share2 size={13} className="text-blue-400" /> Share</strong> iri hasi muri Safari.
                  </li>
                  <li>
                    Manuka hasi gato maze ukande <strong className="text-white inline-flex items-center gap-1"><PlusSquare size={13} className="text-emerald-400" /> Add to Home Screen (Shyira kuri Home Screen)</strong>.
                  </li>
                  <li>
                    Kanda <strong className="text-white">Add</strong> hejuru iburyo. App ihita ijya muri telefone yawe!
                  </li>
                </ol>
              </div>
            ) : (
              /* Desktop or other browsers where prompt hasn't fired yet */
              <div className="space-y-3">
                <button
                  onClick={handleInstallClick}
                  className="w-full py-3.5 px-6 bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold text-sm sm:text-base rounded-2xl shadow-xl shadow-indigo-600/30 transition-all flex items-center justify-center gap-3 cursor-pointer group"
                >
                  <Download size={20} className="group-hover:-translate-y-0.5 transition-transform" />
                  <span>Shyira App muri {isDesktop ? 'Mudasobwa' : 'Telefoni'} (Install)</span>
                </button>
                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs text-slate-300 flex items-start gap-2.5">
                  <Monitor size={16} className="text-indigo-400 shrink-0 mt-0.5" />
                  <p>
                    Reba hejuru ku murongo wa browser (Address Bar) ukande akamenyetso ka <strong>Install App ⊕</strong> cyangwa kanda kuri menu (•••) uhitemo <strong>"Install RUDACTIVITY"</strong>.
                  </p>
                </div>
              </div>
            )}

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-indigo-400" />
                <span>Nta mbogamizi • Byoroshye</span>
              </span>
              <button
                onClick={handleDismiss}
                className="hover:text-slate-200 transition underline underline-offset-2 cursor-pointer"
              >
                Komeza ukoreshe browser
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
