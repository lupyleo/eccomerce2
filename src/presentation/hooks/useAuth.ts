'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { useCartStore } from './useCart';

export function useAuth() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const user = session?.user
    ? {
        id: session.user.id as string,
        email: session.user.email ?? '',
        name: session.user.name ?? '',
        role: (session.user as { role?: string }).role ?? 'CUSTOMER',
      }
    : null;

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });
      if (result?.error) {
        throw new Error('이메일 또는 비밀번호가 올바르지 않습니다.');
      }
      // Merge guest cart into authenticated user's cart
      await useCartStore.getState().mergeGuestCart();
      router.refresh();
    },
    [router],
  );

  const logout = useCallback(async () => {
    await signOut({ redirect: false });
    useCartStore.getState().clearSessionId();
    router.push('/');
    router.refresh();
  }, [router]);

  return {
    user,
    isAuthenticated: !!user,
    isLoading: status === 'loading',
    login,
    logout,
  };
}
