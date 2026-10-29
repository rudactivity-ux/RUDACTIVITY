import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import {
  Lock,
  Mail,
  User as UserIcon,
  Phone,
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  Search,
  Check,
  AtSign,
  Sparkles,
  FileText,
  ShieldCheck,
  Camera,
  Eye,
  EyeOff,
  AlertCircle,
  KeyRound,
  RefreshCw,
} from 'lucide-react';
import { COUNTRIES, Country } from '../../data/countries.ts';
import { PWAInstallButton } from '../pwa/PWAInstallButton.tsx';

// Preset avatar options
const PRESET_AVATARS = [
  '/src/assets/images/avatar_sarah_1793024817988.jpg',
  '/src/assets/images/avatar_david_1793024817905.jpg',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
];

export const AuthModal: React.FC = () => {
  const { login, googleLogin, register, forgotPassword, resetPassword, isAuthenticated } = useAuth();

  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');

  // Sign In Form States
  const [identifier, setIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Multi-step Registration States (Step 1 -> Step 2 -> Step 3)
  const [regStep, setRegStep] = useState<1 | 2 | 3>(1);

  // Step 1: Credentials
  const [email, setEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<Country>(COUNTRIES[0]); // Default: Rwanda (+250)
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');

  // Step 2: Personal Details & Bio
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(PRESET_AVATARS[0]);

  // Step 3: Username Handle
  const [username, setUsername] = useState('');

  // Forgot Password / Password Reset States
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [showResetNewPassword, setShowResetNewPassword] = useState(false);
  const [showResetConfirmPassword, setShowResetConfirmPassword] = useState(false);
  const [resetStep, setResetStep] = useState<1 | 2>(1);
  const [codePreviewNotice, setCodePreviewNotice] = useState<string | null>(null);

  // Status & Feedback States
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Filter countries by search query
  const filteredCountries = useMemo(() => {
    if (!countrySearch.trim()) return COUNTRIES;
    const q = countrySearch.toLowerCase().trim();
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.dialCode.includes(q) ||
        c.code.toLowerCase().includes(q)
    );
  }, [countrySearch]);

  // Password strength calculation
  const passwordStrength = useMemo(() => {
    const p = mode === 'register' ? regPassword : resetNewPassword;
    if (!p) return { score: 0, label: '', color: 'bg-slate-700' };
    let score = 0;
    if (p.length >= 8) score += 1;
    if (p.length >= 12) score += 1;
    if (/[A-Z]/.test(p) && /[a-z]/.test(p)) score += 1;
    if (/\d/.test(p)) score += 1;
    if (/[^A-Za-z0-9]/.test(p)) score += 1;

    if (score <= 1) return { score: 1, label: 'Weak (Kinte)', color: 'bg-rose-500' };
    if (score <= 2) return { score: 2, label: 'Fair (Kiringaniye)', color: 'bg-amber-500' };
    if (score <= 3) return { score: 3, label: 'Good (Gikomeye)', color: 'bg-indigo-400' };
    return { score: 4, label: 'Strong (Gikomeye cyane)', color: 'bg-emerald-500' };
  }, [regPassword, resetNewPassword, mode]);

  const passwordsMatch = useMemo(() => {
    if (mode === 'register') {
      if (!confirmPassword) return null;
      return regPassword === confirmPassword;
    }
    if (mode === 'forgot') {
      if (!resetConfirmPassword) return null;
      return resetNewPassword === resetConfirmPassword;
    }
    return null;
  }, [regPassword, confirmPassword, resetNewPassword, resetConfirmPassword, mode]);

  if (isAuthenticated) return null;

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!identifier.trim()) {
      setErrorMsg('Please enter your username, email, or phone number.');
      return;
    }
    if (!loginPassword) {
      setErrorMsg('Please enter your account password.');
      return;
    }

    setIsLoading(true);
    const res = await login(identifier.trim(), loginPassword);
    setIsLoading(false);
    if (!res.success) {
      setErrorMsg(res.error || 'Login failed. Please verify your credentials or reset your password.');
    }
  };

  // Google OAuth Sign-In / Sign-Up
  const handleGoogleAuth = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);
    try {
      const googleData = {
        email: email.trim() || 'rudactivity@gmail.com',
        name: name.trim() || 'RUDACTIVITY Google User',
        picture: selectedAvatar || 'https://lh3.googleusercontent.com/a/default-user=s96-c',
        sub: `google_${Date.now()}`,
      };

      const res = await googleLogin(googleData);
      setIsLoading(false);
      if (!res.success) {
        setErrorMsg(res.error || 'Google authentication failed.');
      }
    } catch (e: any) {
      setIsLoading(false);
      setErrorMsg(e.message || 'Error connecting to Google Auth.');
    }
  };

  // Step 1 Validation -> Next to Step 2
  const handleNextToStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      setErrorMsg('Please enter a valid email address (e.g. name@example.com).');
      return;
    }

    if (!phoneNumber.trim()) {
      setErrorMsg('Please enter your phone number.');
      return;
    }

    if (!regPassword || regPassword.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }

    if (!/(?=.*[A-Za-z])(?=.*\d)/.test(regPassword)) {
      setErrorMsg('Password must contain at least one letter and at least one number.');
      return;
    }

    if (!confirmPassword) {
      setErrorMsg('Please confirm your password.');
      return;
    }

    if (regPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please ensure both passwords are identical.');
      return;
    }

    // Auto-suggest username if empty
    if (!username) {
      const emailPart = email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '_');
      setUsername(emailPart || 'user_' + Math.floor(Math.random() * 1000));
    }

    setRegStep(2);
  };

  // Step 2 Validation -> Next to Step 3
  const handleNextToStep3 = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!name.trim() || name.trim().length < 2) {
      setErrorMsg('Please enter your full name (minimum 2 characters).');
      return;
    }

    // Auto update username handle based on Full Name if still default
    if (!username || username.startsWith('user_')) {
      const suggested = name
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '');
      setUsername(suggested || 'user_' + Math.floor(Math.random() * 1000));
    }

    setRegStep(3);
  };

  // Auto-generate username suggestion button helper
  const generateSuggestedUsername = () => {
    if (name.trim()) {
      const base = name.toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
      const num = Math.floor(100 + Math.random() * 900);
      setUsername(`${base}_${num}`);
    } else if (email.trim()) {
      const base = email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '_');
      const num = Math.floor(10 + Math.random() * 90);
      setUsername(`${base}${num}`);
    } else {
      setUsername(`user_${Math.floor(1000 + Math.random() * 9000)}`);
    }
  };

  // Final Registration Submission
  const handleFinalRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanUsername = username.trim().toLowerCase().replace(/^@/, '').replace(/\s+/g, '_');

    if (!cleanUsername || cleanUsername.length < 2) {
      setErrorMsg('Username must be at least 2 characters long.');
      return;
    }

    if (!/^[a-z0-9_.-]{2,32}$/.test(cleanUsername)) {
      setErrorMsg('Username must contain only letters, numbers, underscores, dots, or dashes (2-32 characters).');
      return;
    }

    const fullPhone = `${selectedCountry.dialCode} ${phoneNumber.trim()}`;

    setIsLoading(true);
    const res = await register({
      name: name.trim(),
      username: cleanUsername,
      email: email.trim(),
      password: regPassword,
      confirmPassword,
      phone: fullPhone,
      bio: bio.trim() || 'Hey there! I am using RUDACTIVITY.',
      avatar: selectedAvatar,
    });
    setIsLoading(false);

    if (res.success) {
      setSuccessMsg(res.message || 'Account created successfully! Welcome to RUDACTIVITY.');
    } else {
      setErrorMsg(res.error || 'Registration failed. Please check your information and try again.');
    }
  };

  // Handle Forgot Password Request (Step 1)
  const handleRequestResetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!resetEmail.trim() || !emailRegex.test(resetEmail.trim())) {
      setErrorMsg('Please enter a valid registered email address.');
      return;
    }

    setIsLoading(true);
    const res = await forgotPassword(resetEmail.trim());
    setIsLoading(false);

    if (res.success) {
      setSuccessMsg(res.message || 'Reset code generated.');
      if (res.codePreview) {
        setCodePreviewNotice(res.codePreview);
        setResetCode(res.codePreview);
      }
      setResetStep(2);
    } else {
      setErrorMsg(res.error || 'Failed to request password reset code.');
    }
  };

  // Handle Reset Password Submit (Step 2)
  const handleCompletePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!resetCode.trim()) {
      setErrorMsg('Please enter the 6-digit verification code.');
      return;
    }

    if (!resetNewPassword || resetNewPassword.length < 8) {
      setErrorMsg('New password must be at least 8 characters long.');
      return;
    }

    if (!/(?=.*[A-Za-z])(?=.*\d)/.test(resetNewPassword)) {
      setErrorMsg('New password must contain at least one letter and at least one number.');
      return;
    }

    if (resetNewPassword !== resetConfirmPassword) {
      setErrorMsg('Passwords do not match. Please verify both password fields.');
      return;
    }

    setIsLoading(true);
    const res = await resetPassword({
      email: resetEmail.trim(),
      code: resetCode.trim(),
      newPassword: resetNewPassword,
      confirmPassword: resetConfirmPassword,
    });
    setIsLoading(false);

    if (res.success) {
      setSuccessMsg(res.message || 'Password reset successfully!');
    } else {
      setErrorMsg(res.error || 'Password reset failed. Please check your verification code.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-2xl relative overflow-hidden max-h-[92vh] flex flex-col my-auto">
        {/* PWA Install Button */}
        <div className="absolute top-4 right-4 z-10">
          <PWAInstallButton variant="compact" />
        </div>

        {/* Subtle background glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Lockup */}
        <div className="flex flex-col items-center text-center mb-3.5 shrink-0">
          <div className="relative mb-2">
            <img
              src="/src/assets/images/rudactivity_logo_1793024816643.jpg"
              alt="RUDACTIVITY"
              className="w-12 h-12 rounded-2xl shadow-xl shadow-indigo-500/20 ring-1 ring-indigo-500/30 object-cover"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">RUDACTIVITY</h1>
          <p className="text-[11px] text-slate-400 mt-0.5 max-w-xs">
            Global Social Messaging, High-Definition Calls & Channels
          </p>
        </div>

        {/* Mode Switcher Tabs */}
        {mode !== 'forgot' ? (
          <div className="flex p-1 bg-slate-950 rounded-xl mb-3 shrink-0 border border-slate-800/60" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'login'}
              onClick={() => {
                setMode('login');
                setErrorMsg('');
                setSuccessMsg('');
                setIsCountryDropdownOpen(false);
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                mode === 'login'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Sign In (Kwinjira)
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'register'}
              onClick={() => {
                setMode('register');
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                mode === 'register'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Create Account (Kwiyandikisha)
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between mb-3 shrink-0 p-2 bg-slate-950/70 border border-slate-800 rounded-xl">
            <div className="flex items-center gap-2 text-xs font-semibold text-white">
              <KeyRound size={15} className="text-indigo-400" />
              <span>Password Recovery (Guhindura Ijambobanga)</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer"
            >
              Back to Sign In
            </button>
          </div>
        )}

        {/* Google OAuth One-Click Button (Available on Sign In and Create Account) */}
        {mode !== 'forgot' && (
          <div className="mb-3 shrink-0">
            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-white hover:bg-slate-100 text-slate-900 font-semibold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer border border-slate-200 disabled:opacity-60"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Gukomeza na Google (Continue with Google)</span>
            </button>

            <div className="relative my-2.5 flex items-center justify-center">
              <div className="border-t border-slate-800 w-full" />
              <span className="bg-slate-900 px-2 text-[10px] text-slate-500 uppercase tracking-wider font-semibold absolute">
                Cyangwa (Or)
              </span>
            </div>
          </div>
        )}

        {/* Multi-step progress bar when in Registration Mode */}
        {mode === 'register' && (
          <div className="mb-3 p-2 bg-slate-950/80 border border-slate-800 rounded-2xl shrink-0">
            <div className="flex items-center justify-between text-[11px] font-medium text-slate-400 mb-1.5 px-1">
              <span className={regStep >= 1 ? 'text-indigo-400 font-bold' : ''}>
                1. Credentials & Phone
              </span>
              <span className={regStep >= 2 ? 'text-indigo-400 font-bold' : ''}>
                2. Full Name & Bio
              </span>
              <span className={regStep >= 3 ? 'text-indigo-400 font-bold' : ''}>
                3. Username (@handle)
              </span>
            </div>
            {/* Visual step bar */}
            <div className="grid grid-cols-3 gap-1.5">
              <div
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  regStep >= 1 ? 'bg-indigo-500 shadow-sm shadow-indigo-500/50' : 'bg-slate-800'
                }`}
              />
              <div
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  regStep >= 2 ? 'bg-indigo-500 shadow-sm shadow-indigo-500/50' : 'bg-slate-800'
                }`}
              />
              <div
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  regStep >= 3 ? 'bg-indigo-500 shadow-sm shadow-indigo-500/50' : 'bg-slate-800'
                }`}
              />
            </div>
          </div>
        )}

        {/* Error notification banner */}
        {errorMsg && (
          <div className="mb-3 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs shrink-0 flex items-start gap-2">
            <AlertCircle size={15} className="text-rose-400 shrink-0 mt-0.5" />
            <span className="flex-1 leading-relaxed">{errorMsg}</span>
          </div>
        )}

        {/* Success notification banner */}
        {successMsg && (
          <div className="mb-3 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs shrink-0 flex items-start gap-2">
            <Check size={15} className="text-emerald-400 shrink-0 mt-0.5" />
            <span className="flex-1 leading-relaxed">{successMsg}</span>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* MODE: LOGIN */}
        {/* ------------------------------------------------------------------ */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-3 flex-1 overflow-y-auto pr-0.5">
            <div>
              <label htmlFor="login-identifier" className="block text-xs font-medium text-slate-300 mb-1">
                Username, Telefone, cyangwa Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input
                  id="login-identifier"
                  name="identifier"
                  type="text"
                  autoComplete="username"
                  placeholder="Username, +250... or email"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="login-password" className="block text-xs font-medium text-slate-300">
                  Ijambobanga (Password)
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setMode('forgot');
                    setResetEmail(identifier.includes('@') ? identifier : '');
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
                >
                  Forgot password? (Wibagiwe?)
                </button>
              </div>

              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input
                  id="login-password"
                  name="password"
                  type={showLoginPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-10 py-2.5 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                >
                  {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 mt-2 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] text-white font-semibold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Signing in... (Irikukwinjiza...)</span>
                </>
              ) : (
                <>
                  <span>Sign In (Kwinjira)</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </form>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* MODE: MULTI-STEP REGISTER (STEP 1 -> STEP 2 -> STEP 3) */}
        {/* ------------------------------------------------------------------ */}
        {mode === 'register' && (
          <div className="flex-1 flex flex-col overflow-y-auto pr-0.5">
            {/* STEP 1: EMAIL & PHONE NUMBER & PASSWORD & CONFIRM PASSWORD */}
            {regStep === 1 && (
              <form onSubmit={handleNextToStep2} className="space-y-3">
                {/* Email Registration Banner */}
                <div className="p-2.5 rounded-xl bg-indigo-950/40 border border-indigo-500/25 flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                      <Mail size={14} />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-indigo-200">Email Registration</div>
                      <div className="text-[10px] text-slate-400">Kwiyandikisha ukoresheje Email & Telefone</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                    Step 1 ya 3
                  </span>
                </div>

                {/* Email Address */}
                <div>
                  <label htmlFor="reg-email" className="block text-xs font-medium text-slate-300 mb-1">
                    Email Address (Anuwani ya Email) <span className="text-indigo-400">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={15} />
                    <input
                      id="reg-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      placeholder="e.g. name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                      required
                    />
                  </div>
                </div>

                {/* Country & Phone Number */}
                <div>
                  <label htmlFor="reg-phone" className="block text-xs font-medium text-slate-300 mb-1">
                    Country & Phone Number (Igihugu na Nimero ya Telefone) <span className="text-indigo-400">*</span>
                  </label>

                  <div className="flex items-center gap-2">
                    {/* Country Dropdown Trigger */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                        className="h-9 px-2.5 bg-slate-950 border border-slate-800 rounded-xl flex items-center gap-1 hover:border-indigo-500/60 transition-colors text-xs text-white shrink-0 cursor-pointer"
                        title="Select Country"
                      >
                        <span className="text-base">{selectedCountry.flag}</span>
                        <span className="font-mono text-slate-300 font-medium text-[11px]">
                          {selectedCountry.dialCode}
                        </span>
                        <ChevronDown size={13} className="text-slate-500" />
                      </button>

                      {/* Dropdown Menu */}
                      {isCountryDropdownOpen && (
                        <div className="absolute top-11 left-0 z-50 w-72 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-2 animate-in fade-in zoom-in-95 duration-150">
                          <div className="relative mb-2">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" size={13} />
                            <input
                              type="text"
                              placeholder="Search country or code..."
                              value={countrySearch}
                              onChange={(e) => setCountrySearch(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-7 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                              autoFocus
                            />
                          </div>

                          <div className="max-h-44 overflow-y-auto space-y-0.5">
                            {filteredCountries.map((country) => (
                              <button
                                key={country.code}
                                type="button"
                                onClick={() => {
                                  setSelectedCountry(country);
                                  setIsCountryDropdownOpen(false);
                                  setCountrySearch('');
                                }}
                                className={`w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between text-xs hover:bg-slate-800 transition-colors cursor-pointer ${
                                  selectedCountry.code === country.code
                                    ? 'bg-indigo-600/20 text-indigo-300 font-medium'
                                    : 'text-slate-300'
                                }`}
                              >
                                <div className="flex items-center gap-2 truncate">
                                  <span>{country.flag}</span>
                                  <span className="truncate">{country.name}</span>
                                </div>
                                <span className="font-mono text-[11px] text-slate-400 shrink-0 ml-2">
                                  {country.dialCode}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Local Phone Input */}
                    <div className="relative flex-1">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                      <input
                        id="reg-phone"
                        name="phone"
                        type="tel"
                        autoComplete="tel"
                        placeholder="788 123 456"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Password & Password Strength */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="reg-password" className="block text-xs font-medium text-slate-300">
                      Password (Ijambobanga) <span className="text-indigo-400">*</span>
                    </label>
                    {regPassword && (
                      <span className="text-[10px] text-slate-400 font-medium">
                        {passwordStrength.label}
                      </span>
                    )}
                  </div>

                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={15} />
                    <input
                      id="reg-password"
                      name="password"
                      type={showRegPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="Min 8 characters with letters & numbers"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-10 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      aria-label={showRegPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                    >
                      {showRegPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>

                  {/* Password strength bar */}
                  {regPassword && (
                    <div className="grid grid-cols-4 gap-1 mt-1.5">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className={`h-1 rounded-full transition-all ${
                            passwordStrength.score >= i ? passwordStrength.color : 'bg-slate-800'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="reg-confirm-password" className="block text-xs font-medium text-slate-300">
                      Confirm Password (Ongera usubiremo) <span className="text-indigo-400">*</span>
                    </label>
                    {confirmPassword && (
                      <span
                        className={`text-[10px] font-medium flex items-center gap-1 ${
                          passwordsMatch ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {passwordsMatch ? (
                          <>
                            <Check size={11} />
                            <span>Passwords match</span>
                          </>
                        ) : (
                          <span>Do not match</span>
                        )}
                      </span>
                    )}
                  </div>

                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={15} />
                    <input
                      id="reg-confirm-password"
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="Re-enter your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={`w-full bg-slate-950 border rounded-xl pl-10 pr-10 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none transition-colors ${
                        confirmPassword
                          ? passwordsMatch
                            ? 'border-emerald-500/60 focus:border-emerald-500'
                            : 'border-rose-500/60 focus:border-rose-500'
                          : 'border-slate-800 focus:border-indigo-500'
                      }`}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 mt-2 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] text-white font-semibold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Komeza muri Step 2 (Amazina na Imyirondoro)</span>
                  <ArrowRight size={14} />
                </button>
              </form>
            )}

            {/* STEP 2: AMAZINA NA IMYIRONDORO (FULL NAME, BIO & AVATAR) */}
            {regStep === 2 && (
              <form onSubmit={handleNextToStep3} className="space-y-3">
                <div className="text-xs text-indigo-300 font-semibold mb-1 flex items-center gap-1.5">
                  <UserIcon size={14} />
                  <span>Step 2: Kuzuza Amazina na Imyirondoro yawe</span>
                </div>

                {/* Full Name */}
                <div>
                  <label htmlFor="reg-name" className="block text-xs font-medium text-slate-300 mb-1">
                    Amazina yose (Full Name) <span className="text-indigo-400">*</span>
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={15} />
                    <input
                      id="reg-name"
                      name="name"
                      type="text"
                      autoComplete="name"
                      placeholder="e.g. Jean Claude Munyaneza"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                      required
                      autoFocus
                    />
                  </div>
                </div>

                {/* Bio / Description */}
                <div>
                  <label htmlFor="reg-bio" className="block text-xs font-medium text-slate-300 mb-1">
                    Imyirondoro gufi (Bio / About You)
                  </label>
                  <div className="relative">
                    <FileText className="absolute left-3.5 top-3 text-slate-500" size={15} />
                    <textarea
                      id="reg-bio"
                      name="bio"
                      placeholder="Sobanura muri make icyo ukora cyangwa status yawe..."
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      rows={2}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 resize-none transition-colors"
                    />
                  </div>
                </div>

                {/* Avatar selection */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center justify-between">
                    <span>Hitamo Ifoto y'umwirondoro (Profile Avatar)</span>
                    <Camera size={13} className="text-indigo-400" />
                  </label>
                  <div className="flex items-center gap-3">
                    {PRESET_AVATARS.map((url, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedAvatar(url)}
                        className={`relative rounded-2xl overflow-hidden p-0.5 border-2 transition-all cursor-pointer ${
                          selectedAvatar === url
                            ? 'border-indigo-500 scale-105 shadow-md shadow-indigo-500/30'
                            : 'border-slate-800 hover:border-slate-600 opacity-70'
                        }`}
                      >
                        <img src={url} alt={`Avatar option ${idx + 1}`} className="w-11 h-11 rounded-xl object-cover" />
                        {selectedAvatar === url && (
                          <div className="absolute top-0.5 right-0.5 bg-indigo-600 rounded-full p-0.5 text-white">
                            <Check size={10} />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setRegStep(1)}
                    className="px-4 py-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeft size={14} />
                    <span>Inyuma (Step 1)</span>
                  </button>

                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] text-white font-semibold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Komeza muri Step 3 (Gukora Username)</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: GUKORA USERNAME & PROFILE SUMMARY */}
            {regStep === 3 && (
              <form onSubmit={handleFinalRegister} className="space-y-3">
                <div className="text-xs text-indigo-300 font-semibold mb-1 flex items-center gap-1.5">
                  <AtSign size={14} />
                  <span>Step 3: Hitamo Username & Reba profile card yawe</span>
                </div>

                {/* Username handle field */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="reg-username" className="block text-xs font-medium text-slate-300">
                      Gukora Username (@handle) <span className="text-indigo-400">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={generateSuggestedUsername}
                      className="text-[10px] text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles size={11} />
                      <span>Inama ya Username</span>
                    </button>
                  </div>

                  <div className="relative">
                    <AtSign className="absolute left-3.5 top-1/2 -translate-y-1/2 text-indigo-400" size={15} />
                    <input
                      id="reg-username"
                      name="username"
                      type="text"
                      autoComplete="username"
                      placeholder="munyaneza_jc"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ''))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-20 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                      required
                      autoFocus
                    />
                    {username && username.length >= 2 && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-md border border-emerald-500/20">
                        <Check size={11} />
                        <span>Available</span>
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Unique handle for messaging, calls, and discovery across the platform.
                  </p>
                </div>

                {/* Member Card preview */}
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl relative overflow-hidden">
                  <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-2 flex items-center gap-1">
                    <ShieldCheck size={12} className="text-indigo-400" />
                    <span>RUDACTIVITY Member ID Card Preview</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <img
                      src={selectedAvatar}
                      alt="Profile Avatar"
                      className="w-12 h-12 rounded-xl object-cover ring-2 ring-indigo-500/40"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-white truncate">
                        {name || 'Your Full Name'}
                      </div>
                      <div className="text-[11px] font-mono text-indigo-400 truncate">
                        @{username || 'username'}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate mt-0.5">
                        {bio || 'Hey there! I am using RUDACTIVITY.'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setRegStep(2)}
                    className="px-4 py-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeft size={14} />
                    <span>Inyuma</span>
                  </button>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] text-white font-semibold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        <span>Creating Account... (Irikukwandikisha...)</span>
                      </>
                    ) : (
                      <>
                        <span>Rangiza Kwiyandikisha (Complete)</span>
                        <ArrowRight size={14} />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* MODE: FORGOT PASSWORD / PASSWORD RECOVERY */}
        {/* ------------------------------------------------------------------ */}
        {mode === 'forgot' && (
          <div className="flex-1 flex flex-col overflow-y-auto pr-0.5">
            {resetStep === 1 ? (
              <form onSubmit={handleRequestResetCode} className="space-y-3">
                <p className="text-xs text-slate-300 leading-relaxed">
                  Enter your registered email address. We will generate a secure 6-digit verification code to reset your account password.
                </p>

                <div>
                  <label htmlFor="reset-email" className="block text-xs font-medium text-slate-300 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                    <input
                      id="reset-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      placeholder="e.g. name@example.com"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setErrorMsg('');
                      setSuccessMsg('');
                    }}
                    className="px-4 py-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] text-white font-semibold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        <span>Sending code...</span>
                      </>
                    ) : (
                      <>
                        <span>Send Reset Code (Komeza)</span>
                        <ArrowRight size={14} />
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleCompletePasswordReset} className="space-y-3">
                {codePreviewNotice && (
                  <div className="p-3 bg-indigo-950/40 border border-indigo-500/30 rounded-xl text-xs text-indigo-300">
                    <div className="font-semibold text-white mb-0.5">Verification Code Ready:</div>
                    <div className="font-mono text-sm tracking-widest text-indigo-200 bg-slate-950 px-2 py-1 rounded inline-block">
                      {codePreviewNotice}
                    </div>
                  </div>
                )}

                <div>
                  <label htmlFor="reset-code" className="block text-xs font-medium text-slate-300 mb-1">
                    6-Digit Verification Code
                  </label>
                  <input
                    id="reset-code"
                    name="code"
                    type="text"
                    maxLength={6}
                    placeholder="123456"
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm font-mono tracking-widest text-white text-center placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="reset-new-password" className="block text-xs font-medium text-slate-300">
                      New Password (Ijambobanga rishya)
                    </label>
                    {resetNewPassword && (
                      <span className="text-[10px] text-slate-400 font-medium">
                        {passwordStrength.label}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={15} />
                    <input
                      id="reset-new-password"
                      name="newPassword"
                      type={showResetNewPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="Min 8 characters (letters & numbers)"
                      value={resetNewPassword}
                      onChange={(e) => setResetNewPassword(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-10 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowResetNewPassword(!showResetNewPassword)}
                      aria-label={showResetNewPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                    >
                      {showResetNewPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="reset-confirm-password" className="block text-xs font-medium text-slate-300">
                      Confirm New Password
                    </label>
                    {resetConfirmPassword && (
                      <span
                        className={`text-[10px] font-medium flex items-center gap-1 ${
                          passwordsMatch ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {passwordsMatch ? (
                          <>
                            <Check size={11} />
                            <span>Match</span>
                          </>
                        ) : (
                          <span>Do not match</span>
                        )}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={15} />
                    <input
                      id="reset-confirm-password"
                      name="confirmPassword"
                      type={showResetConfirmPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="Re-enter your new password"
                      value={resetConfirmPassword}
                      onChange={(e) => setResetConfirmPassword(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-10 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowResetConfirmPassword(!showResetConfirmPassword)}
                      aria-label={showResetConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                    >
                      {showResetConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setResetStep(1)}
                    className="px-4 py-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                  >
                    Back
                  </button>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] text-white font-semibold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        <span>Resetting...</span>
                      </>
                    ) : (
                      <>
                        <span>Reset Password & Sign In</span>
                        <ArrowRight size={14} />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
