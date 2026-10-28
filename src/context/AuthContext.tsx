import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, PrivacySettings } from '../types/index.ts';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (identifier: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: { name: string; username: string; email: string; password: string; phone?: string }) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<boolean>;
  changePassword: (curr: string, next: string) => Promise<{ success: boolean; error?: string }>;
  privacySettings: PrivacySettings;
  updatePrivacy: (settings: Partial<PrivacySettings>) => Promise<boolean>;
  blockedUserIds: string[];
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
          const data = await res.json();
          setUser(data.user);
          loadPrivacy(token);
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
        const data = await res.json();
        setPrivacySettings(data.privacySettings);
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
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Login failed' };
      }
      localStorage.setItem('rudactivity_token', data.token);
      setToken(data.token);
      setUser(data.user);
      loadPrivacy(data.token);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error' };
    }
  };

  const register = async (regData: { name: string; username: string; email: string; password: string; phone?: string }) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(regData),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Registration failed' };
      }
      localStorage.setItem('rudactivity_token', data.token);
      setToken(data.token);
      setUser(data.user);
      loadPrivacy(data.token);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error' };
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
        const resData = await res.json();
        setUser(resData.user);
        return true;
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
      const data = await res.json();
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
        const data = await res.json();
        setPrivacySettings(data.privacySettings);
        return true;
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
        const data = await res.json();
        setBlockedUserIds(data.blockedUserIds || []);
        return true;
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
        const data = await res.json();
        setBlockedUserIds(data.blockedUserIds || []);
        return true;
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
        register,
        logout,
        updateProfile,
        changePassword,
        privacySettings,
        updatePrivacy,
        blockedUserIds,
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
