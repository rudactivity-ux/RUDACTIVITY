import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, PrivacySettings } from '../types/index.ts';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (identifier: string, pass: string) => Promise<{ success: boolean; error?: string; message?: string }>;
  googleLogin: (data: { email: string; name: string; picture?: string; sub?: string; googleToken?: string }) => Promise<{ success: boolean; error?: string }>;
  register: (data: { name: string; username: string; email: string; password: string; confirmPassword?: string; phone?: string; bio?: string; avatar?: string }) => Promise<{ success: boolean; error?: string; message?: string }>;
  forgotPassword: (email: string) => Promise<{ success: boolean; error?: string; message?: string; codePreview?: string }>;
  resetPassword: (data: { email: string; code: string; newPassword: string; confirmPassword?: string }) => Promise<{ success: boolean; error?: string; message?: string }>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<boolean>;
  changePassword: (curr: string, next: string) => Promise<{ success: boolean; error?: string }>;
  privacySettings: PrivacySettings;
  updatePrivacy: (settings: Partial<PrivacySettings>) => Promise<boolean>;
  blockedUserIds: string[];
  telegramSendCode: (data: { phone?: string; email?: string }) => Promise<{ success: boolean; error?: string; message?: string; codePreview?: string; isExistingUser?: boolean; userPreview?: any }>;
  telegramVerifyCode: (data: { phone?: string; email?: string; code: string }) => Promise<{ success: boolean; isNewUser?: boolean; error?: string; message?: string }>;
  telegramCompleteSignup: (data: { phone?: string; email?: string; name: string; username: string; bio?: string; avatar?: string; password?: string }) => Promise<{ success: boolean; error?: string; message?: string }>;
  blockUser: (targetId: string) => Promise<boolean>;
  unblockUser: (targetId: string) => Promise<boolean>;
  switchAccount: (emailOrUser: string, pass: string) => Promise<boolean>;
}

const defaultPrivacy: PrivacySettings = {
  lastSeenVisibility: 'everyone',
  profilePhotoVisibility: 'everyone',
  whoCanCallMe: 'everyone',
  readReceipts: true,
  whoCanAddToGroups: 'everyone',
};

async function parseJsonResponse(res: Response, fallbackError = 'Request failed') {
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      return await res.json();
    } catch (e) {
      return { error: 'Invalid response from server.' };
    }
  }
  const text = await res.text();
  console.warn('Server non-JSON response:', res.status, text.slice(0, 150));
  if (res.status === 404) {
    return { error: 'Iseriveri ntiraboneka cyangwa iri gutunganywa. Nyamuneka ongera ugerageze mu kanya gato.' };
  }
  return { error: res.ok ? fallbackError : `Service notice (${res.status}). Please try again.` };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('rudactivity_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>(defaultPrivacy);
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);

  useEffect(() => {
    async function loadUser() {
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await parseJsonResponse(res);
          if (data && data.user) {
            setUser(data.user);
            loadPrivacy(token);
          } else {
            localStorage.removeItem('rudactivity_token');
            setToken(null);
            setUser(null);
          }
        } else {
          // Token expired or invalid
          localStorage.removeItem('rudactivity_token');
          setToken(null);
          setUser(null);
        }
      } catch (err) {
        console.error('Failed to load authenticated user:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadUser();
  }, [token]);

  async function loadPrivacy(authToken: string) {
    try {
      const res = await fetch('/api/users/privacy', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await parseJsonResponse(res);
        if (data && data.privacySettings) {
          setPrivacySettings(data.privacySettings);
        }
      }
    } catch (err) {
      console.error('Failed to load privacy settings:', err);
    }
  }

  const login = async (identifier: string, pass: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loginIdentifier: identifier, password: pass }),
      });
      const data = await parseJsonResponse(res, 'Login failed');
      if (!res.ok) {
        return { success: false, error: data.error || 'Login failed. Please check your credentials.' };
      }
      localStorage.setItem('rudactivity_token', data.token);
      setToken(data.token);
      setUser(data.user);
      loadPrivacy(data.token);
      return { success: true, message: data.message || 'Logged in successfully.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error occurred during login.' };
    }
  };

  const googleLogin = async (googleData: { email: string; name: string; picture?: string; sub?: string; googleToken?: string }) => {
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(googleData),
      });
      const data = await parseJsonResponse(res, 'Google authentication failed');
      if (!res.ok) {
        return { success: false, error: data.error || 'Google authentication failed' };
      }
      localStorage.setItem('rudactivity_token', data.token);
      setToken(data.token);
      setUser(data.user);
      loadPrivacy(data.token);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error during Google authentication' };
    }
  };

  const register = async (regData: {
    name: string;
    username: string;
    email: string;
    password: string;
    confirmPassword?: string;
    phone?: string;
    bio?: string;
    avatar?: string;
  }) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(regData),
      });
      const data = await parseJsonResponse(res, 'Registration failed');
      if (!res.ok) {
        return { success: false, error: data.error || 'Registration failed' };
      }
      localStorage.setItem('rudactivity_token', data.token);
      setToken(data.token);
      setUser(data.user);
      loadPrivacy(data.token);
      return { success: true, message: data.message || 'Account created successfully! Welcome to RUDACTIVITY.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error occurred during registration.' };
    }
  };

  const forgotPassword = async (email: string) => {
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await parseJsonResponse(res, 'Failed to request password reset');
      if (!res.ok) {
        return { success: false, error: data.error || 'Password reset request failed' };
      }
      return {
        success: true,
        message: data.message,
        codePreview: data.codePreview,
      };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error requesting password reset.' };
    }
  };

  const resetPassword = async (payload: {
    email: string;
    code: string;
    newPassword: string;
    confirmPassword?: string;
  }) => {
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await parseJsonResponse(res, 'Failed to reset password');
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to reset password' };
      }
      if (data.token && data.user) {
        localStorage.setItem('rudactivity_token', data.token);
        setToken(data.token);
        setUser(data.user);
        loadPrivacy(data.token);
      }
      return { success: true, message: data.message || 'Password reset successfully!' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error resetting password.' };
    }
  };

  const telegramSendCode = async (data: { phone?: string; email?: string }) => {
    try {
      const res = await fetch('/api/auth/telegram/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const resData = await parseJsonResponse(res, 'Failed to send confirmation code');
      if (!res.ok) {
        return { success: false, error: resData.error || 'Failed to send confirmation code' };
      }
      return {
        success: true,
        message: resData.message,
        codePreview: resData.codePreview,
        isExistingUser: resData.isExistingUser,
        userPreview: resData.userPreview,
      };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error sending confirmation code.' };
    }
  };

  const telegramVerifyCode = async (data: { phone?: string; email?: string; code: string }) => {
    try {
      const res = await fetch('/api/auth/telegram/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const resData = await parseJsonResponse(res, 'Verification failed');
      if (!res.ok) {
        return { success: false, error: resData.error || 'Verification failed' };
      }
      if (resData.token && resData.user) {
        localStorage.setItem('rudactivity_token', resData.token);
        setToken(resData.token);
        setUser(resData.user);
        loadPrivacy(resData.token);
      }
      return {
        success: true,
        isNewUser: resData.isNewUser,
        message: resData.message,
      };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error during verification.' };
    }
  };

  const telegramCompleteSignup = async (data: { phone?: string; email?: string; name: string; username: string; bio?: string; avatar?: string; password?: string }) => {
    try {
      const res = await fetch('/api/auth/telegram/complete-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const resData = await parseJsonResponse(res, 'Failed to complete profile');
      if (!res.ok) {
        return { success: false, error: resData.error || 'Failed to complete profile' };
      }
      if (resData.token && resData.user) {
        localStorage.setItem('rudactivity_token', resData.token);
        setToken(resData.token);
        setUser(resData.user);
        loadPrivacy(resData.token);
      }
      return {
        success: true,
        message: resData.message || 'Account created successfully! Welcome to E-RUDACTIVITY.',
      };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error during registration.' };
    }
  };

  const logout = async () => {
    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (e) {
        // Ignore logout error
      }
    }
    localStorage.removeItem('rudactivity_token');
    setToken(null);
    setUser(null);
  };

  const updateProfile = async (data: Partial<User>) => {
    if (!token) return false;
    try {
      const res = await fetch('/api/users/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const resData = await parseJsonResponse(res);
        if (resData && resData.user) {
          setUser(resData.user);
          return true;
        }
      }
    } catch (err) {
      console.error('Failed to update profile:', err);
    }
    return false;
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    if (!token) return { success: false, error: 'Not authenticated' };
    try {
      const res = await fetch('/api/users/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await parseJsonResponse(res, 'Password change failed');
      if (res.ok) {
        return { success: true };
      }
      return { success: false, error: data.error };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const updatePrivacy = async (settings: Partial<PrivacySettings>) => {
    if (!token) return false;
    try {
      const res = await fetch('/api/users/privacy', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ privacySettings: settings }),
      });
      if (res.ok) {
        const data = await parseJsonResponse(res);
        if (data && data.privacySettings) {
          setPrivacySettings(data.privacySettings);
          return true;
        }
      }
    } catch (err) {
      console.error('Failed to update privacy settings:', err);
    }
    return false;
  };

  const blockUser = async (targetId: string) => {
    if (!token) return false;
    try {
      const res = await fetch('/api/users/block', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ targetUserId: targetId }),
      });
      if (res.ok) {
        const data = await parseJsonResponse(res);
        if (data && data.blockedUserIds) {
          setBlockedUserIds(data.blockedUserIds);
          return true;
        }
      }
    } catch (err) {
      console.error('Failed to block user:', err);
    }
    return false;
  };

  const unblockUser = async (targetId: string) => {
    if (!token) return false;
    try {
      const res = await fetch('/api/users/unblock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ targetUserId: targetId }),
      });
      if (res.ok) {
        const data = await parseJsonResponse(res);
        if (data && data.blockedUserIds) {
          setBlockedUserIds(data.blockedUserIds);
          return true;
        }
      }
    } catch (err) {
      console.error('Failed to unblock user:', err);
    }
    return false;
  };

  const switchAccount = async (emailOrUser: string, pass: string) => {
    const res = await login(emailOrUser, pass);
    return res.success;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        login,
        googleLogin,
        register,
        forgotPassword,
        resetPassword,
        logout,
        updateProfile,
        changePassword,
        privacySettings,
        updatePrivacy,
        blockedUserIds,
        telegramSendCode,
        telegramVerifyCode,
        telegramCompleteSignup,
        blockUser,
        unblockUser,
        switchAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

