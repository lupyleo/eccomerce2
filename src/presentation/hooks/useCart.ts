'use client';

import { create } from 'zustand';
import { useSession } from 'next-auth/react';
import { useEffect, useRef } from 'react';

interface CartItem {
  id: string;
  variant: {
    id: string;
    sku: string;
    size: string;
    color: string;
    colorCode: string | null;
    price: number;
    availableStock: number;
    product: {
      id: string;
      name: string;
      slug: string;
      primaryImage: { url: string; alt: string | null } | null;
    };
  };
  quantity: number;
  subtotal: number;
}

interface CartStore {
  items: CartItem[];
  totalAmount: number;
  itemCount: number;
  isLoading: boolean;
  fetchCart: () => Promise<void>;
  addItem: (variantId: string, quantity: number) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  mergeGuestCart: () => Promise<void>;
  clearSessionId: () => void;
}

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  let sessionId = localStorage.getItem('guest_session_id');
  if (!sessionId) {
    sessionId = generateUUID();
    localStorage.setItem('guest_session_id', sessionId);
  }
  return sessionId;
}

function cartHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const sessionId = getSessionId();
  if (sessionId) {
    headers['x-session-id'] = sessionId;
  }
  return headers;
}

export const useCartStore = create<CartStore>((set) => ({
  items: [],
  totalAmount: 0,
  itemCount: 0,
  isLoading: false,

  fetchCart: async () => {
    set({ isLoading: true });
    try {
      const res = await fetch('/api/cart', { headers: cartHeaders() });
      if (!res.ok) {
        set({ items: [], totalAmount: 0, itemCount: 0 });
        return;
      }
      const json = await res.json();
      const data = json.data;
      set({
        items: data.items,
        totalAmount: data.totalAmount,
        itemCount: data.itemCount,
      });
    } finally {
      set({ isLoading: false });
    }
  },

  addItem: async (variantId, quantity) => {
    const res = await fetch('/api/cart/items', {
      method: 'POST',
      headers: cartHeaders(),
      body: JSON.stringify({ variantId, quantity }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message ?? '장바구니 추가에 실패했습니다.');
    }
    await useCartStore.getState().fetchCart();
  },

  updateQuantity: async (itemId, quantity) => {
    const res = await fetch(`/api/cart/items/${itemId}`, {
      method: 'PATCH',
      headers: cartHeaders(),
      body: JSON.stringify({ quantity }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message ?? '수량 변경에 실패했습니다.');
    }
    await useCartStore.getState().fetchCart();
  },

  removeItem: async (itemId) => {
    const res = await fetch(`/api/cart/items/${itemId}`, {
      method: 'DELETE',
      headers: cartHeaders(),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message ?? '삭제에 실패했습니다.');
    }
    await useCartStore.getState().fetchCart();
  },

  mergeGuestCart: async () => {
    const sessionId = typeof window !== 'undefined'
      ? localStorage.getItem('guest_session_id')
      : null;
    if (!sessionId) return;

    try {
      await fetch('/api/cart/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
    } finally {
      localStorage.removeItem('guest_session_id');
      await useCartStore.getState().fetchCart();
    }
  },

  clearSessionId: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('guest_session_id');
    }
  },
}));

/**
 * Hook that detects session changes and auto-merges guest cart.
 * Handles social login redirect where mergeGuestCart() can't be called inline.
 * Should be rendered once in a top-level provider component.
 */
export function useCartSessionSync() {
  const { data: session } = useSession();
  const prevUserIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    const userId = session?.user?.id as string | undefined;

    // Detect transition from no user to authenticated user
    if (userId && !prevUserIdRef.current) {
      const sessionId = localStorage.getItem('guest_session_id');
      if (sessionId) {
        useCartStore.getState().mergeGuestCart();
      }
    }

    prevUserIdRef.current = userId;
  }, [session?.user?.id]);
}
