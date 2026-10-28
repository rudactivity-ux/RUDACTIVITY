import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import {
  X,
  User,
  Shield,
  Lock,
  Palette,
  Globe,
  Download,
  Trash2,
  Check,
  AlertTriangle,
  Smartphone,
  Eye
} from 'lucide-react';
import { PWAInstallButton } from '../pwa/PWAInstallButton.tsx';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const {
    user,
    token,
    updateProfile,
    changePassword,
    privacySettings,
    updatePrivacy,
    logout,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<
    'profile' | 'privacy' | 'security' | 'appearance' | 'language' | 'data'
  >('profile');

  // Profile Form state
  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [statusText, setStatusText] = useState(user?.statusText || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar || '');

  // Password state
  const [currPassword, setCurrPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passMsg, setPassMsg] = useState<{ text: string; isError: boolean } | null>(null);

  // Privacy states
  const [lastSeen, setLastSeen] = useState(privacySettings.lastSeenVisibility);
  const [profilePhoto, setProfilePhoto] = useState(privacySettings.profilePhotoVisibility);
  const [callPerm, setCallPerm] = useState(privacySettings.whoCanCallMe);
  const [readReceipts, setReadReceipts] = useState(privacySettings.readReceipts);

  // Appearance / Language states
  const [theme, setTheme] = useState('dark');
  const [lang, setLang] = useState('en');

  // Account deletion state
  const [deleteConfirmPass, setDeleteConfirmPass] = useState('');
  const [deleteError, setDeleteError] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    const success = await updateProfile({
      name,
      bio,
      statusText,
      phone,
      avatar: avatarUrl,
    });
    setIsSaving(false);
    if (success) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassMsg(null);
    const res = await changePassword(currPassword, newPassword);
    if (res.success) {
      setPassMsg({ text: 'Password changed successfully.', isError: false });
      setCurrPassword('');
      setNewPassword('');
    } else {
      setPassMsg({ text: res.error || 'Failed to change password.', isError: true });
    }
  };

  const handleSavePrivacy = async () => {
    setIsSaving(true);
    await updatePrivacy({
      lastSeenVisibility: lastSeen,
      profilePhotoVisibility: profilePhoto,
      whoCanCallMe: callPerm,
      readReceipts,
    });
    setIsSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleExportData = () => {
    if (!token) return;
    window.open('/api/users/export-data', '_blank');
  };

  const handleDeleteAccount = async () => {
    if (!deleteConfirmPass) {
      setDeleteError('Enter your password to confirm account deletion.');
      return;
    }
    try {
      const res = await fetch('/api/users/delete-account', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ passwordConfirm: deleteConfirmPass }),
      });
      const data = await res.json();
      if (res.ok) {
        logout();
        onClose();
      } else {
        setDeleteError(data.error || 'Failed to delete account.');
      }
    } catch (err: any) {
      setDeleteError(err.message || 'Error deleting account.');
    }
  };

  const avatarOptions = [
    '/src/assets/images/rudactivity_logo_1793024816643.jpg',
    '/src/assets/images/avatar_sarah_1793024817988.jpg',
    '/src/assets/images/avatar_david_1793024817905.jpg',
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-lg text-white">Settings</h3>
            {saveSuccess && (
              <span className="text-xs text-emerald-400 flex items-center gap-1">
                <Check size={14} /> Saved
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body Split */}
        <div className="flex-1 flex flex-col sm:flex-row overflow-hidden">
          {/* Navigation Sidebar */}
          <div className="w-full sm:w-48 bg-slate-950/60 p-3 border-b sm:border-b-0 sm:border-r border-slate-800 space-y-1">
            <button
              onClick={() => setActiveTab('profile')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                activeTab === 'profile'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <User size={15} /> Edit Profile
            </button>
            <button
              onClick={() => setActiveTab('privacy')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                activeTab === 'privacy'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Eye size={15} /> Privacy & Visibility
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                activeTab === 'security'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Lock size={15} /> Security & 2FA
            </button>
            <button
              onClick={() => setActiveTab('appearance')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                activeTab === 'appearance'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Palette size={15} /> Appearance
            </button>
            <button
              onClick={() => setActiveTab('language')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                activeTab === 'language'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Globe size={15} /> Language
            </button>
            <button
              onClick={() => setActiveTab('data')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                activeTab === 'data'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Download size={15} /> Data & Account
            </button>

            {/* PWA Install Button inside Settings */}
            <div className="pt-3 mt-2 border-t border-slate-800/80">
              <PWAInstallButton variant="sidebar" />
            </div>
          </div>

          {/* Tab Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            {/* Tab: Profile */}
            {activeTab === 'profile' && (
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-2">Avatar Selection</label>
                  <div className="flex items-center gap-3">
                    {avatarOptions.map((opt, i) => (
                      <img
                        key={i}
                        src={opt}
                        alt="Avatar Option"
                        onClick={() => setAvatarUrl(opt)}
                        className={`w-12 h-12 rounded-full object-cover cursor-pointer transition-all ${
                          avatarUrl === opt
                            ? 'ring-2 ring-indigo-500 scale-105 shadow-lg'
                            : 'opacity-60 hover:opacity-100'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Display Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Username</label>
                    <input
                      type="text"
                      value={`@${user?.username}`}
                      disabled
                      className="w-full bg-slate-950/40 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-500 cursor-not-allowed"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Bio / About</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={2}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Status Text</label>
                    <input
                      type="text"
                      value={statusText}
                      onChange={(e) => setStatusText(e.target.value)}
                      placeholder="e.g. In a meeting, Traveling"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Phone Number</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+1 555 0199"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-colors shadow-lg shadow-indigo-600/20"
                  >
                    {isSaving ? 'Saving...' : 'Save Profile Changes'}
                  </button>
                </div>
              </form>
            )}

            {/* Tab: Privacy */}
            {activeTab === 'privacy' && (
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2">
                    Who can see my Last Seen & Online status?
                  </label>
                  <div className="flex gap-2">
                    {(['everyone', 'contacts', 'nobody'] as const).map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setLastSeen(opt)}
                        className={`flex-1 py-2 text-xs font-medium rounded-lg capitalize border transition-colors ${
                          lastSeen === opt
                            ? 'bg-indigo-600 text-white border-indigo-500'
                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2">
                    Who can see my Profile Photo?
                  </label>
                  <div className="flex gap-2">
                    {(['everyone', 'contacts', 'nobody'] as const).map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setProfilePhoto(opt)}
                        className={`flex-1 py-2 text-xs font-medium rounded-lg capitalize border transition-colors ${
                          profilePhoto === opt
                            ? 'bg-indigo-600 text-white border-indigo-500'
                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2">
                    Who can initiate Voice & Video calls to me?
                  </label>
                  <div className="flex gap-2">
                    {(['everyone', 'contacts', 'nobody'] as const).map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setCallPerm(opt)}
                        className={`flex-1 py-2 text-xs font-medium rounded-lg capitalize border transition-colors ${
                          callPerm === opt
                            ? 'bg-indigo-600 text-white border-indigo-500'
                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between">
                  <div>
                    <h5 className="text-xs font-semibold text-white">Read Receipts</h5>
                    <p className="text-[11px] text-slate-400">
                      Display double blue checkmarks when you have read messages.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={readReceipts}
                    onChange={(e) => setReadReceipts(e.target.checked)}
                    className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                  />
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleSavePrivacy}
                    disabled={isSaving}
                    className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-colors shadow-lg shadow-indigo-600/20"
                  >
                    Save Privacy Settings
                  </button>
                </div>
              </div>
            )}

            {/* Tab: Security */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <h4 className="text-sm font-semibold text-white">Change Account Password</h4>
                  {passMsg && (
                    <div
                      className={`p-3 rounded-xl text-xs ${
                        passMsg.isError
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}
                    >
                      {passMsg.text}
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Current Password</label>
                    <input
                      type="password"
                      value={currPassword}
                      onChange={(e) => setCurrPassword(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">New Password (8+ characters)</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-colors"
                  >
                    Update Password
                  </button>
                </form>

                <div className="pt-4 border-t border-slate-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-white">Two-Factor Authentication (2FA)</h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Add an extra layer of protection requiring SMS or TOTP authenticator code on login.
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded bg-slate-800 text-[10px] text-slate-300">
                      Standard Session Protection
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Appearance */}
            {activeTab === 'appearance' && (
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-white">Theme & Palette</h4>
                <p className="text-xs text-slate-400">
                  Select your preferred color mood for chat backdrops and interface accents.
                </p>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  {[
                    { id: 'dark', name: 'Dark Obsidian', color: 'bg-slate-950 ring-indigo-500' },
                    { id: 'navy', name: 'Midnight Navy', color: 'bg-slate-900 ring-blue-500' },
                    { id: 'violet', name: 'Amethyst Violet', color: 'bg-purple-950 ring-purple-500' },
                    { id: 'light', name: 'Clean Neutral', color: 'bg-slate-800 ring-slate-400' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTheme(t.id)}
                      className={`p-4 rounded-xl border text-left flex items-center justify-between transition-colors ${
                        theme === t.id
                          ? 'border-indigo-500 bg-indigo-600/10'
                          : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-4 h-4 rounded-full ${t.color}`} />
                        <span className="text-xs font-semibold text-white">{t.name}</span>
                      </div>
                      {theme === t.id && <Check size={14} className="text-indigo-400" />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Tab: Language */}
            {activeTab === 'language' && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-white">International Language</h4>
                <p className="text-xs text-slate-400">
                  RUDACTIVITY is built for global communities worldwide.
                </p>

                <div className="grid grid-cols-2 gap-2.5 pt-2">
                  {[
                    { code: 'en', name: 'English (US)' },
                    { code: 'fr', name: 'Français (French)' },
                    { code: 'es', name: 'Español (Spanish)' },
                    { code: 'sw', name: 'Kiswahili (Swahili)' },
                    { code: 'rw', name: 'Ikinyarwanda' },
                    { code: 'de', name: 'Deutsch (German)' },
                    { code: 'zh', name: '中文 (Simplified)' },
                    { code: 'ja', name: '日本語 (Japanese)' },
                    { code: 'ar', name: 'العربية (Arabic)' },
                  ].map((l) => (
                    <button
                      key={l.code}
                      onClick={() => setLang(l.code)}
                      className={`p-3 rounded-xl border text-left flex items-center justify-between transition-colors ${
                        lang === l.code
                          ? 'border-indigo-500 bg-indigo-600/10 text-white'
                          : 'border-slate-800 bg-slate-950/40 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <span className="text-xs font-medium">{l.name}</span>
                      {lang === l.code && <Check size={14} className="text-indigo-400" />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Tab: Data & Account */}
            {activeTab === 'data' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-semibold text-white">Export Personal Data</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Download an official JSON archive containing your user profile, conversations summary, sent messages, and call history.
                  </p>
                  <button
                    onClick={handleExportData}
                    className="mt-3 px-4 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-colors flex items-center gap-2"
                  >
                    <Download size={14} /> Download My Data (JSON)
                  </button>
                </div>

                <div className="pt-6 border-t border-slate-800">
                  <h4 className="text-sm font-semibold text-rose-400 flex items-center gap-1.5">
                    <AlertTriangle size={15} /> Delete Account
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Permanently delete your profile, active sessions, and private configuration. This action cannot be undone.
                  </p>

                  {deleteError && (
                    <div className="mt-2 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-lg">
                      {deleteError}
                    </div>
                  )}

                  <div className="mt-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <input
                      type="password"
                      placeholder="Confirm with current password..."
                      value={deleteConfirmPass}
                      onChange={(e) => setDeleteConfirmPass(e.target.value)}
                      className="bg-slate-950 border border-rose-500/30 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-rose-500 flex-1"
                    />
                    <button
                      onClick={handleDeleteAccount}
                      className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-xl transition-colors whitespace-nowrap"
                    >
                      Delete Forever
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
