import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { LanguageToggle } from '../common/LanguageToggle.tsx';
import { PWAInstallButton } from '../pwa/PWAInstallButton.tsx';
import { COUNTRIES, Country } from '../../data/countries.ts';
import { uploadAvatar } from '../../utils/imageUpload.ts';
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
  Camera,
  Upload,
  Eye,
  EyeOff,
  AlertCircle,
  KeyRound,
  RefreshCw,
  Send,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';

const PRESET_AVATARS = [
  '/src/assets/images/avatar_sarah_1793024817988.jpg',
  '/src/assets/images/avatar_david_1793024817905.jpg',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
];

export const AuthModal: React.FC = () => {
  const {
    login,
    googleLogin,
    register,
    forgotPassword,
    resetPassword,
    telegramSendCode,
    telegramVerifyCode,
    telegramCompleteSignup,
  } = useAuth();
  const { language, t } = useLanguage();

  // Primary Method: 'telegram' (Phone + Code like Telegram) | 'email' (Email & Password) | 'forgot' (Recovery)
  const [authMethod, setAuthMethod] = useState<'telegram' | 'email' | 'forgot'>('telegram');

  // Telegram Flow Steps: 1 = Phone Number, 2 = 6-Digit Code, 3 = Profile Setup (New Users)
  const [telegramStep, setTelegramStep] = useState<1 | 2 | 3>(1);
  const [telegramCode, setTelegramCode] = useState('');
  const [codePreviewNotice, setCodePreviewNotice] = useState('');
  const [isExistingUserDetected, setIsExistingUserDetected] = useState(false);

  // Email Flow Mode: 'login' | 'register'
  const [emailMode, setEmailMode] = useState<'login' | 'register'>('login');

  // Shared Form States
  const [selectedCountry, setSelectedCountry] = useState<Country>(COUNTRIES[0]); // Rwanda +250
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');

  // Profile Data (for Telegram step 3 & Email register)
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(PRESET_AVATARS[0]);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [customAvatarUploaded, setCustomAvatarUploaded] = useState(false);
  const [avatarUploadError, setAvatarUploadError] = useState('');
  const avatarFileInputRef = useRef<HTMLInputElement | null>(null);

  // Email / Password Credentials
  const [identifier, setIdentifier] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Password Recovery States
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [showResetNewPassword, setShowResetNewPassword] = useState(false);
  const [resetStep, setResetStep] = useState<1 | 2>(1);

  // Status & Feedback
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Username Live Availability Checker
  const [usernameCheck, setUsernameCheck] = useState<{
    status: 'idle' | 'checking' | 'available' | 'taken' | 'invalid';
    message?: string;
  }>({ status: 'idle' });

  // Filter countries for dropdown
  const filteredCountries = useMemo(() => {
    if (!countrySearch.trim()) return COUNTRIES;
    const q = countrySearch.toLowerCase();
    return COUNTRIES.filter(
      (c) => c.name.toLowerCase().includes(q) || c.dialCode.includes(q) || c.code.toLowerCase().includes(q)
    );
  }, [countrySearch]);

  // Live check username debounced
  useEffect(() => {
    const clean = username.trim().toLowerCase().replace(/^@/, '').replace(/\s+/g, '_');
    if (!clean) {
      setUsernameCheck({ status: 'idle' });
      return;
    }
    if (clean.length < 2) {
      setUsernameCheck({
        status: 'invalid',
        message: language === 'rw' ? 'Izina rigomba kugira nibura inyuguti 2.' : 'Username must be at least 2 characters.',
      });
      return;
    }
    if (!/^[a-z0-9_.-]{2,32}$/.test(clean)) {
      setUsernameCheck({
        status: 'invalid',
        message: language === 'rw' ? 'Inyuguti, imibare, _, -, cyangwa . gusa.' : 'Only letters, numbers, _, -, or . allowed.',
      });
      return;
    }

    setUsernameCheck({ status: 'checking' });
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/auth/check-username?username=${encodeURIComponent(clean)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.available) {
            setUsernameCheck({ status: 'available' });
          } else {
            setUsernameCheck({
              status: 'taken',
              message: data.error || (language === 'rw' ? 'Iri zina ryarafashwe.' : 'This username is taken.'),
            });
          }
        } else {
          setUsernameCheck({ status: 'available' });
        }
      } catch (e) {
        setUsernameCheck({ status: 'available' });
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [username, language]);

  // Handle Device Photo Upload
  const handleDeviceAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingAvatar(true);
    setAvatarUploadError('');

    try {
      const result = await uploadAvatar(file);
      if (result.error) {
        setAvatarUploadError(result.error);
      } else if (result.url) {
        setSelectedAvatar(result.url);
        setCustomAvatarUploaded(true);
      }
    } catch (err: any) {
      setAvatarUploadError(err.message || 'Error uploading photo');
    } finally {
      setIsUploadingAvatar(false);
      if (e.target) e.target.value = '';
    }
  };

  // Suggest a Telegram username
  const generateSuggestedUsername = () => {
    const base = name.trim() ? name.trim().toLowerCase().replace(/[^a-z0-9]/g, '_') : 'eruda_user';
    const randomNum = Math.floor(100 + Math.random() * 900);
    const candidate = `${base.slice(0, 15)}_${randomNum}`;
    setUsername(candidate);
  };

  // =========================================================================
  // TELEGRAM FLOW HANDLERS
  // =========================================================================

  // Step 1: Send Code to Phone Number
  const handleTelegramSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanNum = phoneNumber.replace(/[\s\-\(\)]/g, '');
    if (!cleanNum || cleanNum.length < 5) {
      setErrorMsg(
        language === 'rw'
          ? 'Nyamuneka injiza nimero ya telefone iboneye.'
          : 'Please enter a valid phone number.'
      );
      return;
    }

    const fullPhone = `${selectedCountry.dialCode}${cleanNum}`;
    setIsLoading(true);
    const res = await telegramSendCode({ phone: fullPhone });
    setIsLoading(false);

    if (res.success) {
      if (res.codePreview) {
        setCodePreviewNotice(res.codePreview);
        setTelegramCode(res.codePreview); // Auto-fill for friction-free verification
      }
      setIsExistingUserDetected(!!res.isExistingUser);
      setSuccessMsg(
        res.message ||
          (language === 'rw'
            ? `Twohereje kode y'imibare 6 kuri ${fullPhone}.`
            : `We've sent a 6-digit confirmation code to ${fullPhone}.`)
      );
      setTelegramStep(2);
    } else {
      setErrorMsg(res.error || (language === 'rw' ? 'Ntibyakunze kohereza kode.' : 'Failed to send code.'));
    }
  };

  // Step 2: Verify 6-digit Code
  const handleTelegramVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanCode = telegramCode.trim().replace(/[^0-9]/g, '');
    if (!cleanCode || cleanCode.length < 6) {
      setErrorMsg(
        language === 'rw' ? "Injiza kode y'imibare 6 yose." : 'Please enter the complete 6-digit code.'
      );
      return;
    }

    const cleanNum = phoneNumber.replace(/[\s\-\(\)]/g, '');
    const fullPhone = `${selectedCountry.dialCode}${cleanNum}`;

    setIsLoading(true);
    const res = await telegramVerifyCode({ phone: fullPhone, code: cleanCode });
    setIsLoading(false);

    if (res.success) {
      if (res.isNewUser) {
        // Proceed to Telegram Profile Setup
        setTelegramStep(3);
        setSuccessMsg(
          language === 'rw'
            ? 'Kode yemejwe neza! Ubu tegura porofayili yawe ya E-RUDACTIVITY.'
            : 'Code confirmed! Now set up your E-RUDACTIVITY profile.'
        );
      } else {
        // Logged in immediately!
        setSuccessMsg(
          language === 'rw' ? 'Winjiye neza muri E-RUDACTIVITY!' : 'Logged in successfully!'
        );
      }
    } else {
      setErrorMsg(
        res.error ||
          (language === 'rw'
            ? "Kode siyo cyangwa yarangiye. Gerageza nanone."
            : 'Invalid or expired confirmation code.')
      );
    }
  };

  // Step 3: Complete Telegram Profile (New User)
  const handleTelegramCompleteSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!name.trim()) {
      setErrorMsg(language === 'rw' ? 'Injiza amazina yawe yose.' : 'Please enter your full name.');
      return;
    }

    const cleanUsername = username.trim().toLowerCase().replace(/^@/, '').replace(/\s+/g, '_');
    if (!cleanUsername || cleanUsername.length < 2) {
      setErrorMsg(
        language === 'rw' ? "Hitamo izina ry'ukoresha ryihariye (@handle)." : 'Please choose a username handle.'
      );
      return;
    }

    if (usernameCheck.status === 'taken') {
      setErrorMsg(
        language === 'rw'
          ? 'Iri zina ryarafashwe. Hitamo irindi cyangwa kanda Inama y\'Izina.'
          : 'This username is taken. Please choose another or click Suggest.'
      );
      return;
    }

    const cleanNum = phoneNumber.replace(/[\s\-\(\)]/g, '');
    const fullPhone = `${selectedCountry.dialCode}${cleanNum}`;

    setIsLoading(true);
    const res = await telegramCompleteSignup({
      phone: fullPhone,
      name: name.trim(),
      username: cleanUsername,
      bio: bio.trim() || (language === 'rw' ? 'Muraho! Ndi gukoresha E-RUDACTIVITY.' : 'Hey there! I am using E-RUDACTIVITY.'),
      avatar: selectedAvatar,
    });
    setIsLoading(false);

    if (res.success) {
      setSuccessMsg(
        res.message ||
          (language === 'rw'
            ? 'Konte yawe yakozwe neza! Murakaza neza muri E-RUDACTIVITY.'
            : 'Account created successfully! Welcome to E-RUDACTIVITY.')
      );
    } else {
      setErrorMsg(
        res.error ||
          (language === 'rw'
            ? 'Kwiyandikisha byanze. Nyamuneka gerageza nanone.'
            : 'Failed to create profile. Please try again.')
      );
    }
  };

  // =========================================================================
  // EMAIL / PASSWORD FLOW HANDLERS
  // =========================================================================

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!identifier.trim() || !password) {
      setErrorMsg(language === 'rw' ? 'Uzuza amakuru yose asabwa.' : 'Please enter your credentials.');
      return;
    }

    setIsLoading(true);
    const res = await login(identifier.trim(), password);
    setIsLoading(false);

    if (res.success) {
      setSuccessMsg(res.message || t.loginSuccess);
    } else {
      setErrorMsg(res.error || (language === 'rw' ? 'Injiza ijambobanga cyangwa email nyayo.' : 'Invalid credentials.'));
    }
  };

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!name.trim() || !email.trim() || !password) {
      setErrorMsg(language === 'rw' ? 'Uzuza amakuru yose asabwa.' : 'Please fill all required fields.');
      return;
    }

    if (password.length < 8) {
      setErrorMsg(language === 'rw' ? 'Ijambobanga rigomba kugira nibura inyuguti n\'imibare 8.' : 'Password must be at least 8 characters.');
      return;
    }

    if (confirmPassword && password !== confirmPassword) {
      setErrorMsg(language === 'rw' ? 'Amagambo y\'ibanga ntabwo ahura.' : 'Passwords do not match.');
      return;
    }

    const cleanUsername = username.trim()
      ? username.trim().toLowerCase().replace(/^@/, '').replace(/\s+/g, '_')
      : email.split('@')[0].replace(/[^a-z0-9_]/g, '_') + '_' + Math.floor(100 + Math.random() * 900);

    const fullPhone = phoneNumber ? `${selectedCountry.dialCode}${phoneNumber.replace(/\s+/g, '')}` : undefined;

    setIsLoading(true);
    const res = await register({
      name: name.trim(),
      username: cleanUsername,
      email: email.trim(),
      password,
      confirmPassword,
      phone: fullPhone,
      bio: bio.trim() || (language === 'rw' ? 'Muraho! Ndi gukoresha E-RUDACTIVITY.' : 'Hey there! I am using E-RUDACTIVITY.'),
      avatar: selectedAvatar,
    });
    setIsLoading(false);

    if (res.success) {
      setSuccessMsg(res.message || t.registerSuccess);
    } else {
      setErrorMsg(res.error || (language === 'rw' ? 'Kwiyandikisha byanze.' : 'Registration failed.'));
    }
  };

  // Google OAuth One-Click
  const handleGoogleAuth = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);
    try {
      const googleData = {
        email: email.trim() || 'rudactivity@gmail.com',
        name: name.trim() || (language === 'rw' ? 'Umukoresha wa E-RUDACTIVITY' : 'E-RUDACTIVITY User'),
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
      setErrorMsg(e.message || 'Error connecting with Google.');
    }
  };

  // Password Recovery Request
  const handleRequestResetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!resetEmail.trim() || !resetEmail.includes('@')) {
      setErrorMsg(language === 'rw' ? 'Injiza email nyayo yanditse muri sisitemu.' : 'Please enter a valid email.');
      return;
    }

    setIsLoading(true);
    const res = await forgotPassword(resetEmail.trim());
    setIsLoading(false);

    if (res.success) {
      setSuccessMsg(res.message || 'Reset code sent.');
      if (res.codePreview) {
        setCodePreviewNotice(res.codePreview);
        setResetCode(res.codePreview);
      }
      setResetStep(2);
    } else {
      setErrorMsg(res.error || 'Failed to request reset code.');
    }
  };

  // Password Reset Complete
  const handleCompletePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!resetCode.trim()) {
      setErrorMsg('Please enter the 6-digit code.');
      return;
    }
    if (!resetNewPassword || resetNewPassword.length < 8) {
      setErrorMsg('Password must be at least 8 characters.');
      return;
    }
    if (resetNewPassword !== resetConfirmPassword) {
      setErrorMsg('Passwords do not match.');
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
      setSuccessMsg(res.message || 'Password changed successfully!');
    } else {
      setErrorMsg(res.error || 'Failed to reset password.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-md bg-slate-900/95 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-2xl relative overflow-hidden max-h-[94vh] flex flex-col my-auto ring-1 ring-sky-500/20">
        {/* Top Controls: Language Switcher (Left) and PWA Install (Right) */}
        <div className="absolute top-4 left-4 z-10">
          <LanguageToggle variant="compact" />
        </div>
        <div className="absolute top-4 right-4 z-10">
          <PWAInstallButton variant="compact" />
        </div>

        {/* Telegram-style Background Glow */}
        <div className="absolute -top-24 -right-24 w-52 h-52 bg-sky-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-52 h-52 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Lockup: Futuristic Luxury 'R' Logo & E-RUDACTIVITY */}
        <div className="flex flex-col items-center text-center mb-3 shrink-0 mt-1">
          <div className="relative mb-2 group">
            <div className="w-16 h-16 rounded-2xl p-0.5 bg-gradient-to-tr from-cyan-400 via-sky-500 to-indigo-600 shadow-xl shadow-cyan-500/25 ring-1 ring-cyan-400/40 transition-transform group-hover:scale-105 duration-200">
              <img
                src="/src/assets/images/erudactivity_logo.jpg"
                alt="E-RUDACTIVITY Logo"
                className="w-full h-full object-cover rounded-[14px]"
              />
            </div>
            <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full ring-2 ring-slate-900 shadow-sm" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
            <span className="bg-gradient-to-r from-white via-slate-100 to-sky-200 bg-clip-text text-transparent">E-RUDACTIVITY</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold tracking-wide shadow-sm">
              Official
            </span>
          </h1>
          <p className="text-[11px] text-slate-400 mt-0.5 max-w-xs">
            {language === 'rw'
              ? 'Urubuga rwihuta kandi rutekanye rwo koherezanya ubutumwa no guhamagara ukoresheje Phone Number.'
              : 'Fast, secure messaging & calls with direct phone number verification.'}
          </p>
        </div>

        {/* Top Mode Selector: Telegram Phone vs Email/Password */}
        {authMethod !== 'forgot' && (
          <div className="flex p-1 bg-slate-950 rounded-xl mb-3 shrink-0 border border-slate-800/80">
            <button
              type="button"
              onClick={() => {
                setAuthMethod('telegram');
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                authMethod === 'telegram'
                  ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-md shadow-sky-500/25'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Smartphone size={14} />
              <span>{t.phoneAuthTab}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMethod('email');
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                authMethod === 'email'
                  ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-md shadow-sky-500/25'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Mail size={14} />
              <span>{t.emailAuthTab}</span>
            </button>
          </div>
        )}

        {/* Feedback Messages */}
        {errorMsg && (
          <div className="mb-3 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs shrink-0 flex items-start gap-2">
            <AlertCircle size={15} className="text-rose-400 shrink-0 mt-0.5" />
            <span className="flex-1 leading-relaxed">{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-3 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs shrink-0 flex items-start gap-2">
            <Check size={15} className="text-emerald-400 shrink-0 mt-0.5" />
            <span className="flex-1 leading-relaxed">{successMsg}</span>
          </div>
        )}

        {/* ================================================================= */}
        {/* METHOD 1: TELEGRAM PHONE NUMBER & INSTANT CODE FLOW (DEFAULT)    */}
        {/* ================================================================= */}
        {authMethod === 'telegram' && (
          <div className="flex-1 flex flex-col overflow-y-auto pr-0.5">
            {/* STEP 1: ENTER PHONE NUMBER */}
            {telegramStep === 1 && (
              <form onSubmit={handleTelegramSendCode} className="space-y-3.5">
                <div className="text-center py-1">
                  <p className="text-xs text-slate-300">
                    {t.telegramPhonePrompt}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {language === 'rw'
                      ? 'Nta jambo ry\'ibanga rikenewe — winjira ukoresheje kode y\'imibare 6.'
                      : 'No password needed — authenticate instantly with a 6-digit confirmation code.'}
                  </p>
                </div>

                {/* Country Selection & Phone Input */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {t.countryLabel} & {t.phoneLabel}
                  </label>
                  <div className="flex items-center gap-2">
                    {/* Country Selector Dropdown */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                        className="h-10 px-2.5 bg-slate-950 border border-slate-800 rounded-xl flex items-center gap-1.5 hover:border-sky-500/60 transition-colors text-xs text-white shrink-0 cursor-pointer"
                      >
                        <span className="text-base">{selectedCountry.flag}</span>
                        <span className="font-mono text-slate-300 font-medium text-xs">
                          {selectedCountry.dialCode}
                        </span>
                        <ChevronDown size={13} className="text-slate-500" />
                      </button>

                      {isCountryDropdownOpen && (
                        <div className="absolute top-12 left-0 z-50 w-72 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-2 animate-in fade-in zoom-in-95 duration-150">
                          <div className="relative mb-2">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" size={13} />
                            <input
                              type="text"
                              placeholder={language === 'rw' ? 'Shaka igihugu...' : 'Search country...'}
                              value={countrySearch}
                              onChange={(e) => setCountrySearch(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-7 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
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
                                    ? 'bg-sky-600/20 text-sky-300 font-medium'
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
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={15} />
                      <input
                        type="tel"
                        autoComplete="tel"
                        placeholder={t.phonePlaceholder}
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="w-full h-10 bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
                        required
                        autoFocus
                      />
                    </div>
                  </div>
                </div>

                {/* Submit Phone Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 mt-2 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 active:scale-[0.99] text-white font-semibold text-xs rounded-xl shadow-lg shadow-sky-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>{t.loading}</span>
                    </>
                  ) : (
                    <>
                      <span>{language === 'rw' ? 'Komeza (Next)' : 'Next'}</span>
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>

                {/* Quick Google Sign In */}
                <div className="pt-2 border-t border-slate-800/80">
                  <button
                    type="button"
                    onClick={handleGoogleAuth}
                    disabled={isLoading}
                    className="w-full py-2 px-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 font-medium text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    <span>{t.continueWithGoogle}</span>
                  </button>
                </div>
              </form>
            )}

            {/* STEP 2: ENTER 6-DIGIT CODE */}
            {telegramStep === 2 && (
              <form onSubmit={handleTelegramVerifyCode} className="space-y-3.5">
                <div className="text-center py-1">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950 border border-slate-800 text-xs font-mono text-sky-300 mb-1">
                    <span>{selectedCountry.dialCode} {phoneNumber}</span>
                    <button
                      type="button"
                      onClick={() => setTelegramStep(1)}
                      className="text-[10px] text-slate-400 hover:text-white underline cursor-pointer ml-1"
                    >
                      {language === 'rw' ? 'Hindura' : 'Edit'}
                    </button>
                  </div>
                  <p className="text-xs text-slate-300">
                    {t.telegramCodePrompt}
                  </p>
                </div>

                {/* Instant Verification Code Ready Banner */}
                {codePreviewNotice && (
                  <div
                    onClick={() => setTelegramCode(codePreviewNotice)}
                    className="p-3 bg-sky-950/40 border border-sky-500/30 rounded-2xl cursor-pointer hover:border-sky-400/60 transition-all text-center group"
                    title="Click to auto-fill code"
                  >
                    <div className="text-[10px] uppercase font-semibold tracking-wider text-sky-300 mb-1">
                      {language === 'rw' ? 'Kode y\'Icyitegererezo (Kanda Uyuzuze):' : 'Verification Code Ready (Click to fill):'}
                    </div>
                    <div className="text-xl font-mono font-bold tracking-widest text-white group-hover:scale-105 transition-transform">
                      {codePreviewNotice}
                    </div>
                  </div>
                )}

                {/* 6-Digit Code Input */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1 text-center">
                    {t.enterCode}
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="123456"
                    value={telegramCode}
                    onChange={(e) => setTelegramCode(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 text-center text-xl font-mono tracking-widest text-white placeholder:text-slate-600 focus:outline-none focus:border-sky-500 transition-colors"
                    required
                    autoFocus
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setTelegramStep(1)}
                    className="px-4 py-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                  >
                    <ArrowLeft size={14} />
                  </button>

                  <button
                    type="submit"
                    disabled={isLoading || telegramCode.trim().length < 6}
                    className="flex-1 py-2.5 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 active:scale-[0.99] text-white font-semibold text-xs rounded-xl shadow-lg shadow-sky-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        <span>{t.loading}</span>
                      </>
                    ) : (
                      <>
                        <span>{language === 'rw' ? 'Emeza Kode (Confirm)' : 'Confirm Code'}</span>
                        <ArrowRight size={14} />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: TELEGRAM PROFILE SETUP (FOR NEW USERS) */}
            {telegramStep === 3 && (
              <form onSubmit={handleTelegramCompleteSignup} className="space-y-3">
                <div className="text-center py-0.5">
                  <h3 className="text-sm font-bold text-white flex items-center justify-center gap-1.5">
                    <UserIcon size={16} className="text-sky-400" />
                    <span>{t.telegramProfileTitle}</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {t.telegramProfileSubtitle}
                  </p>
                </div>

                {/* Profile Avatar with Camera & Upload Button */}
                <div className="flex items-center gap-3 p-2.5 bg-slate-950/70 border border-slate-800 rounded-2xl">
                  <div className="relative shrink-0">
                    <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-sky-500 shadow-md bg-slate-900">
                      <img src={selectedAvatar} alt="Profile" className="w-full h-full object-cover" />
                      {isUploadingAvatar && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <RefreshCw size={16} className="animate-spin text-sky-400" />
                        </div>
                      )}
                    </div>
                    {customAvatarUploaded && (
                      <span className="absolute -bottom-1 -right-1 bg-emerald-500 text-[8px] font-bold text-white px-1.5 py-0.2 rounded-full border border-slate-900">
                        ✓
                      </span>
                    )}
                  </div>

                  <div className="flex-1 space-y-1">
                    <input
                      ref={avatarFileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleDeviceAvatarSelect}
                    />
                    <button
                      type="button"
                      disabled={isUploadingAvatar}
                      onClick={() => avatarFileInputRef.current?.click()}
                      className="w-full py-1.5 px-3 bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Camera size={13} />
                      <span>{t.chooseFromDevice}</span>
                    </button>
                    <p className="text-[10px] text-slate-400">
                      {language === 'rw' ? 'Hitamo ifoto muri telefone cyangwa PC' : 'Choose photo from phone or PC'}
                    </p>
                  </div>
                </div>

                {/* Full Name */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {t.fullNameLabel} <span className="text-sky-400">*</span>
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={15} />
                    <input
                      type="text"
                      placeholder={t.fullNamePlaceholder}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
                      required
                      autoFocus
                    />
                  </div>
                </div>

                {/* Username (@handle) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-slate-300">
                      {t.usernameLabel} <span className="text-sky-400">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={generateSuggestedUsername}
                      className="text-[10px] text-sky-400 hover:text-sky-300 font-medium flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles size={11} />
                      <span>{t.suggestUsername}</span>
                    </button>
                  </div>

                  <div className="relative">
                    <AtSign className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sky-400" size={15} />
                    <input
                      type="text"
                      placeholder={t.usernamePlaceholder}
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ''))}
                      className={`w-full bg-slate-950 border rounded-xl pl-10 pr-24 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none transition-colors ${
                        usernameCheck.status === 'taken'
                          ? 'border-rose-500/70 focus:border-rose-500'
                          : usernameCheck.status === 'available'
                          ? 'border-emerald-500/70 focus:border-emerald-500'
                          : 'border-slate-800 focus:border-sky-500'
                      }`}
                      required
                    />
                    {usernameCheck.status === 'checking' && (
                      <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] font-medium text-slate-400 bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800">
                        <RefreshCw size={10} className="animate-spin text-sky-400" />
                        <span>Verifying...</span>
                      </div>
                    )}
                    {usernameCheck.status === 'available' && (
                      <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/30">
                        <Check size={11} />
                        <span>Available</span>
                      </div>
                    )}
                    {usernameCheck.status === 'taken' && (
                      <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] font-semibold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/30">
                        <AlertCircle size={11} />
                        <span>Taken</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bio / Status */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {t.bioLabel}
                  </label>
                  <input
                    type="text"
                    placeholder={t.bioPlaceholder}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
                  />
                </div>

                {/* Submit Profile */}
                <button
                  type="submit"
                  disabled={isLoading || usernameCheck.status === 'taken' || !name.trim() || !username.trim()}
                  className="w-full py-2.5 mt-2 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 active:scale-[0.99] text-white font-semibold text-xs rounded-xl shadow-lg shadow-sky-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>{t.loading}</span>
                    </>
                  ) : (
                    <>
                      <Send size={14} />
                      <span>{t.startMessaging}</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* METHOD 2: STANDARD EMAIL & PASSWORD FLOW                          */}
        {/* ================================================================= */}
        {authMethod === 'email' && (
          <div className="flex-1 flex flex-col overflow-y-auto pr-0.5">
            {/* Email Mode Sub-tabs: Login vs Register */}
            <div className="flex p-1 bg-slate-950 rounded-xl mb-3 shrink-0 border border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setEmailMode('login');
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  emailMode === 'login' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {t.signIn}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmailMode('register');
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  emailMode === 'register' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {t.createAccount}
              </button>
            </div>

            {/* Email Login Form */}
            {emailMode === 'login' && (
              <form onSubmit={handleEmailLogin} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {language === 'rw' ? 'Email, Telefone, cyangwa Username' : 'Email, Phone, or Username'}
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={15} />
                    <input
                      type="text"
                      autoComplete="username"
                      placeholder="you@example.com or +250..."
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
                      required
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-slate-300">
                      {t.passwordLabel}
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMethod('forgot');
                        setResetEmail(identifier.includes('@') ? identifier : '');
                        setErrorMsg('');
                        setSuccessMsg('');
                      }}
                      className="text-[11px] text-sky-400 hover:text-sky-300 transition-colors cursor-pointer"
                    >
                      {t.forgotPassword}
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={15} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 mt-2 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 active:scale-[0.99] text-white font-semibold text-xs rounded-xl shadow-lg shadow-sky-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>{t.loading}</span>
                    </>
                  ) : (
                    <>
                      <span>{t.signIn}</span>
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Email Register Form */}
            {emailMode === 'register' && (
              <form onSubmit={handleEmailRegister} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {t.fullNameLabel} <span className="text-sky-400">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder={t.fullNamePlaceholder}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {t.emailLabel} <span className="text-sky-400">*</span>
                  </label>
                  <input
                    type="email"
                    placeholder={t.emailPlaceholder}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {t.passwordLabel} <span className="text-sky-400">*</span>
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder={t.passwordPlaceholder}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 mt-2 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 active:scale-[0.99] text-white font-semibold text-xs rounded-xl shadow-lg shadow-sky-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>{t.loading}</span>
                    </>
                  ) : (
                    <>
                      <span>{t.createAccount}</span>
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* METHOD 3: PASSWORD RECOVERY                                       */}
        {/* ================================================================= */}
        {authMethod === 'forgot' && (
          <div className="flex-1 flex flex-col overflow-y-auto pr-0.5">
            <div className="flex items-center justify-between mb-3 shrink-0 p-2 bg-slate-950/70 border border-slate-800 rounded-xl">
              <div className="flex items-center gap-2 text-xs font-semibold text-white">
                <KeyRound size={15} className="text-sky-400" />
                <span>{t.passwordRecovery}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAuthMethod('telegram');
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className="text-[11px] text-sky-400 hover:text-sky-300 font-medium cursor-pointer"
              >
                {t.back}
              </button>
            </div>

            {resetStep === 1 ? (
              <form onSubmit={handleRequestResetCode} className="space-y-3">
                <p className="text-xs text-slate-300">
                  {language === 'rw'
                    ? 'Injiza aderesi ya email yawe wandikishije. Turakwoherereza kode yo guhindura ijambobanga.'
                    : 'Enter your registered email address. We will generate a secure verification code.'}
                </p>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">{t.emailLabel}</label>
                  <input
                    type="email"
                    placeholder={t.emailPlaceholder}
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                    required
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>{t.sendResetCode}</span>
                  <ArrowRight size={14} />
                </button>
              </form>
            ) : (
              <form onSubmit={handleCompletePasswordReset} className="space-y-3">
                {codePreviewNotice && (
                  <div className="p-2.5 bg-sky-950/40 border border-sky-500/30 rounded-xl text-xs text-sky-300">
                    <span className="font-semibold text-white">Code: </span>
                    <span className="font-mono">{codePreviewNotice}</span>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">{t.enterResetCode}</label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="123456"
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-center font-mono text-sm text-white focus:outline-none focus:border-sky-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">{t.newPasswordLabel}</label>
                  <input
                    type="password"
                    placeholder="Min 8 characters"
                    value={resetNewPassword}
                    onChange={(e) => setResetNewPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">{t.confirmPasswordLabel}</label>
                  <input
                    type="password"
                    placeholder="Confirm new password"
                    value={resetConfirmPassword}
                    onChange={(e) => setResetConfirmPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>{t.resetPassword}</span>
                  <ArrowRight size={14} />
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
