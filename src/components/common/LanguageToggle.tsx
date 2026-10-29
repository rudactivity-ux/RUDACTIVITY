import React from 'react';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { Globe } from 'lucide-react';

interface LanguageToggleProps {
  variant?: 'compact' | 'full' | 'dropdown';
  className?: string;
}

export const LanguageToggle: React.FC<LanguageToggleProps> = ({ variant = 'compact', className = '' }) => {
  const { language, setLanguage, toggleLanguage, t } = useLanguage();

  if (variant === 'full') {
    return (
      <div className={`grid grid-cols-2 gap-2.5 ${className}`}>
        <button
          type="button"
          onClick={() => setLanguage('rw')}
          className={`p-3.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
            language === 'rw'
              ? 'border-indigo-500 bg-indigo-600/15 text-white ring-1 ring-indigo-500/50'
              : 'border-slate-800 bg-slate-950/40 text-slate-300 hover:border-slate-700 hover:bg-slate-900/60'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <span className="text-base">🇷🇼</span>
            <div>
              <p className="text-xs font-semibold text-white">Ikinyarwanda</p>
              <p className="text-[10px] text-slate-400">Ururimi rw'Ikinyarwanda</p>
            </div>
          </div>
          {language === 'rw' && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Active
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setLanguage('en')}
          className={`p-3.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
            language === 'en'
              ? 'border-indigo-500 bg-indigo-600/15 text-white ring-1 ring-indigo-500/50'
              : 'border-slate-800 bg-slate-950/40 text-slate-300 hover:border-slate-700 hover:bg-slate-900/60'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <span className="text-base">🇬🇧</span>
            <div>
              <p className="text-xs font-semibold text-white">English</p>
              <p className="text-[10px] text-slate-400">International English</p>
            </div>
          </div>
          {language === 'en' && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Active
            </span>
          )}
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      title={language === 'rw' ? 'Switch to English' : 'Hindura mu Kinyarwanda'}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium border transition-colors cursor-pointer select-none ${
        language === 'rw'
          ? 'bg-indigo-950/40 border-indigo-500/40 text-indigo-300 hover:bg-indigo-900/50'
          : 'bg-slate-950/40 border-slate-700/60 text-slate-300 hover:bg-slate-800/60'
      } ${className}`}
    >
      <Globe size={13} className="text-indigo-400 shrink-0" />
      <span className="font-semibold">{language === 'rw' ? 'RW' : 'EN'}</span>
      <span className="text-[10px] text-slate-400 opacity-70">
        {language === 'rw' ? '🇷🇼' : '🇬🇧'}
      </span>
    </button>
  );
};
