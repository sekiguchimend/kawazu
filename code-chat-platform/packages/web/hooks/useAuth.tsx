'use client';

import { useState, useEffect, useContext, createContext, ReactNode } from 'react';
import { getCurrentUser, verifyToken } from '@/lib/api';
import { UserProfile } from '@/types';

interface User {
  id: string;
  email: string;
  username: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (token: string, userData: User) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  const refreshUser = async () => {
    try {
      const token = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      
      if (!token || !storedUser) {
        console.log('No token or user data found, clearing auth state');
        setUser(null);
        setProfile(null);
        setIsLoading(false);
        return;
      }

      // まず保存されているユーザー情報を復元
      try {
        const userData = JSON.parse(storedUser);
        setUser(userData);
        console.log('Restored user from localStorage:', userData.username);
      } catch (parseError) {
        console.error('Failed to parse stored user data:', parseError);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        setProfile(null);
        setIsLoading(false);
        return;
      }

      // バックグラウンドでトークン検証
      try {
        console.log('Verifying token...');
        const verifyResult = await verifyToken(token);
        
        if (!verifyResult.success || !verifyResult.data?.valid) {
          console.log('Token verification failed, clearing auth state');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
          setProfile(null);
        } else {
          console.log('Token verification successful');
          
          // 検証されたユーザー情報で更新
          const verifiedUser = verifyResult.data.user;
          if (verifiedUser) {
            setUser(verifiedUser);
            localStorage.setItem('user', JSON.stringify(verifiedUser));
          }

          // プロフィール情報を取得
          try {
            const result = await getCurrentUser();
            if (result.success && result.data) {
              setProfile(result.data.profile);
            }
          } catch (profileError) {
            console.error('Failed to get profile, but keeping auth state:', profileError);
          }
        }
      } catch (error: any) {
        console.error('Token verification error:', error);
        
        // ネットワークエラーの場合は認証状態を維持
        if (error.message?.includes('fetch') || error.message?.includes('network')) {
          console.log('Network error during token verification, keeping current session');
        } else {
          // その他のエラーの場合は認証をクリア
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
          setProfile(null);
        }
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      setProfile(null);
    } finally {
      setIsLoading(false);
      setIsInitialized(true);
    }
  };

  const login = (token: string, userData: User) => {
    console.log('Logging in user:', userData.username);
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    setIsLoading(false);
    
    // プロフィール情報は別途取得
    setTimeout(async () => {
      try {
        const result = await getCurrentUser();
        if (result.success && result.data) {
          setProfile(result.data.profile);
        }
      } catch (error) {
        console.error('Failed to get profile after login:', error);
      }
    }, 100);
  };

  const logout = () => {
    console.log('Logging out user');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setProfile(null);
  };

  // 初期化時のみ実行
  useEffect(() => {
    if (!isInitialized) {
      refreshUser();
    }
  }, [isInitialized]);

  // 定期的なトークン検証（5分ごと）
  useEffect(() => {
    if (!isInitialized || !user) return;

    const intervalId = setInterval(async () => {
      const token = localStorage.getItem('token');
      if (token && user) {
        try {
          const verifyResult = await verifyToken(token);
          if (!verifyResult.success || !verifyResult.data?.valid) {
            console.log('Token expired during periodic check, logging out');
            logout();
          }
        } catch (error) {
          console.error('Periodic token verification failed:', error);
        }
      }
    }, 5 * 60 * 1000); // 5分

    return () => clearInterval(intervalId);
  }, [isInitialized, user]);

  const value = {
    user,
    profile,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 