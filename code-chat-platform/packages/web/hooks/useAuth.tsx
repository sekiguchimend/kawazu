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

  const refreshUser = async () => {
    try {
      const token = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      
      if (!token || !storedUser) {
        setUser(null);
        setProfile(null);
        setIsLoading(false);
        return;
      }

      // まず保存されているユーザー情報を復元
      try {
        const userData = JSON.parse(storedUser);
        setUser(userData);
      } catch (parseError) {
        console.error('Failed to parse stored user data:', parseError);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        setProfile(null);
        setIsLoading(false);
        return;
      }

      // バックグラウンドでトークン検証（非同期で実行し、エラーでも継続）
      try {
        const verifyResult = await verifyToken(token);
        if (!verifyResult.success || !verifyResult.data?.valid) {
          console.log('Token verification failed, clearing auth state');
          // トークンが無効な場合は削除
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
          setProfile(null);
        } else {
          console.log('Token verification successful');
          // プロフィール情報を別途取得（エラーでも認証状態は維持）
          try {
            const result = await getCurrentUser();
            if (result.success && result.data) {
              setProfile(result.data.profile);
            }
          } catch (profileError) {
            console.error('Failed to get profile, but keeping auth state:', profileError);
          }
        }
      } catch (error) {
        console.error('Token verification error, but keeping current session:', error);
        // 一時的な通信エラーの場合は認証状態を維持
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
      // 予期しないエラーの場合のみクリア
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = (token: string, userData: User) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    setIsLoading(false);
    
    // プロフィール情報は別途取得（無限ループを避ける）
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
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setProfile(null);
  };

  useEffect(() => {
    refreshUser();
  }, []);

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