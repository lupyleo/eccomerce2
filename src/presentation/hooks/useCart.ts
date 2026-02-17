'use client';

import { create } from 'zustand';

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
}

export const useCartStore = create<CartStore>((set) => ({
  items: [],
  totalAmount: 0,
  itemCount: 0,
  isLoading: false,

  fetchCart: async () => {
    set({ isLoading: true });
    try {
      const res = await fetch('/api/cart');
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
      headers: { 'Content-Type': 'application/json' },
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
      headers: { 'Content-Type': 'application/json' },
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
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message ?? '삭제에 실패했습니다.');
    }
    await useCartStore.getState().fetchCart();
  },
}));
