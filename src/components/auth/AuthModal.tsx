import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { Lock, Mail, User as UserIcon, Phone, ArrowRight, Zap, Globe, ChevronDown, Search, Check } from 'lucide-react';
import { COUNTRIES, Country } from '../../data/countries.ts';
import { PWAInstallButton } from '../pwa/PWAInstallButton.tsx';

export const AuthModal: React.FC = () => {
  const { login, register, isAuthenticated, switchAccount } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  // Registration Form States
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<Country>(COUNTRIES[0]); // Default: Rwanda (+250)
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [regPassword, setRegPassword] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
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

  if (isAuthenticated) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);
    const res = await login(identifier, password);
    setIsLoading(false);
    if (!res.success) {
      setErrorMsg(res.error || 'Login failed. Please check your credentials.');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!phoneNumber.trim()) {
      setErrorMsg('Please enter your phone number.');
      return;
    }

    const fullPhone = `${selectedCountry.dialCode} ${phoneNumber.trim()}`;

    setIsLoading(true);
    const res = await register({
      name,
      username,
      email,
      password: regPassword,
      phone: fullPhone,
    });
    setIsLoading(false);
    if (!res.success) {
      setErrorMsg(res.error || 'Registration failed.');
    }
  };

  const handleQuickDemoLogin = async (emailToUse: string, pass: string) => {
    setErrorMsg('');
    setIsLoading(true);
    await switchAccount(emailToUse, pass);
    setIsLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden max-h-[95vh] flex flex-col">
        {/* PWA Install Button */}
        <div className="absolute top-4 right-4 z-10">
          <PWAInstallButton variant="compact" />
        </div>

        {/* Subtle glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Lockup */}
        <div className="flex flex-col items-center text-center mb-5 shrink-0">
          <div className="relative mb-2.5">
            <img
              src="/src/assets/images/rudactivity_logo_1793024816643.jpg"
              alt="RUDACTIVITY"
              className="w-14 h-14 rounded-2xl shadow-xl shadow-indigo-500/20 ring-1 ring-indigo-500/30 object-cover"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">RUDACTIVITY</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Global Social Messaging, High-Definition Calls & Channels
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex p-1 bg-slate-950 rounded-xl mb-4 shrink-0">
          <button
            type="button"
            onClick={() => { setMode('login'); setErrorMsg(''); setIsCountryDropdownOpen(false); }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors ${
              mode === 'login' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); setErrorMsg(''); }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors ${
              mode === 'register' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Create Account
          </button>
        </div>

        {errorMsg && (
          <div className="mb-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs shrink-0">
            {errorMsg}
          </div>
        )}

        {/* Mode: Login */}
        {mode === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-3.5 flex-1 overflow-y-auto">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Username, Phone, or Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input
                  type="text"
                  placeholder="Username, +250... or email"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input
                  type="password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 mt-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
              <ArrowRight size={14} />
            </button>
          </form>
        ) : (
          /* Mode: Register with Country Code Selector & Phone */
          <form onSubmit={handleRegister} className="space-y-3 flex-1 overflow-y-auto pr-1">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Full Name</label>
              <div className="relative">
                <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={15} />
                <input
                  type="text"
                  placeholder="e.g. Jean Claude Munyaneza"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Username</label>
                <input
                  type="text"
                  placeholder="munyaneza_j"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Email</label>
                <input
                  type="email"
                  placeholder="jean@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>
            </div>

            {/* Country Selector & Phone Number Field */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Country & Phone Number (Igihugu na Nimero ya Telefone)
              </label>

              <div className="flex items-center gap-2">
                {/* Country Dropdown Trigger */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                    className="h-10 px-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center gap-1.5 hover:border-indigo-500/60 transition-colors text-xs text-white shrink-0"
                    title="Select Country"
                  >
                    <span className="text-base">{selectedCountry.flag}</span>
                    <span className="font-mono text-slate-300 font-medium">{selectedCountry.dialCode}</span>
                    <ChevronDown size={13} className="text-slate-500" />
                  </button>

                  {/* Dropdown Menu */}
                  {isCountryDropdownOpen && (
                    <div className="absolute top-12 left-0 z-50 w-72 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-2 animate-in fade-in zoom-in-95 duration-150">
                      {/* Search box */}
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

                      {/* List */}
                      <div className="max-h-48 overflow-y-auto space-y-0.5">
                        {filteredCountries.map((country) => (
                          <button
                            key={country.code}
                            type="button"
                            onClick={() => {
                              setSelectedCountry(country);
                              setIsCountryDropdownOpen(false);
                              setCountrySearch('');
                            }}
                            className={`w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between text-xs hover:bg-slate-800 transition-colors ${
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

                {/* Local Phone input */}
                <div className="relative flex-1">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                  <input
                    type="tel"
                    placeholder="788 123 456"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Selected: {selectedCountry.flag} {selectedCountry.name} ({selectedCountry.dialCode})
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Password</label>
              <input
                type="password"
                placeholder="8+ characters"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 mt-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoading ? 'Creating Account...' : 'Complete Registration'}
              <ArrowRight size={14} />
            </button>
          </form>
        )}

        {/* Demo profiles for rapid testing - superadmin credentials completely hidden */}
        <div className="mt-4 pt-3.5 border-t border-slate-800/80 shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-2">
            <Zap size={13} className="text-amber-400" />
            <span className="font-semibold text-slate-300">Quick Test Profiles</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => handleQuickDemoLogin('sarah.jenkins@example.com', 'SarahPass2026!')}
              className="p-1.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-indigo-500/50 text-left transition-colors"
            >
              <div className="font-semibold text-white text-[11px] truncate">Sarah J.</div>
              <div className="text-[9px] text-slate-400 truncate">@sarah_dev</div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemoLogin('david.chen@example.com', 'DavidPass2026!')}
              className="p-1.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-indigo-500/50 text-left transition-colors"
            >
              <div className="font-semibold text-white text-[11px] truncate">David Chen</div>
              <div className="text-[9px] text-slate-400 truncate">@david_ux</div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemoLogin('amara.diallo@example.com', 'AmaraPass2026!')}
              className="p-1.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-indigo-500/50 text-left transition-colors"
            >
              <div className="font-semibold text-white text-[11px] truncate">Amara D.</div>
              <div className="text-[9px] text-slate-400 truncate">@amara_cloud</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
