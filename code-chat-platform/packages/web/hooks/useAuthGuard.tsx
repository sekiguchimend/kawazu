'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './useAuth';

interface UseAuthGuardOptions {
  redirectTo?: string;
  requireAuth?: boolean;
}

export const useAuthGuard = ({ 
  redirectTo = '/auth', 
  requireAuth = true 
}: UseAuthGuardOptions = {}) => {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (requireAuth && !isAuthenticated) {
      console.log('🔒 Authentication required, redirecting to:', redirectTo);
      router.push(redirectTo);
    } else if (!requireAuth && isAuthenticated) {
      console.log('🔓 Already authenticated, redirecting to dashboard');
      router.push('/dashboard');
    }
  }, [isLoading, isAuthenticated, requireAuth, redirectTo, router]);

  return {
    user,
    isLoading,
    isAuthenticated,
    isReady: !isLoading && (requireAuth ? isAuthenticated : true)
  };
}; 