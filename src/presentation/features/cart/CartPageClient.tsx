'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useCartStore } from '@/presentation/hooks/useCart';
import { Spinner, Button } from '@/presentation/components/ui';
import CartItemRow from './CartItemRow';
import CartSummary from './CartSummary';

export default function CartPageClient() {
  const { items, totalAmount, itemCount, isLoading, fetchCart } = useCartStore();

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  if (isLoading && items.length === 0) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-20">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
          />
        </svg>
        <h2 className="mt-4 text-lg font-medium text-gray-900">장바구니가 비어있습니다</h2>
        <p className="mt-2 text-sm text-gray-500">마음에 드는 상품을 담아보세요.</p>
        <Link href="/products" className="inline-block mt-6">
          <Button variant="outline">쇼핑 계속하기</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">장바구니 ({itemCount})</h2>
        </div>
        <div>
          {items.map((item) => (
            <CartItemRow key={item.id} item={item} />
          ))}
        </div>
      </div>
      <div>
        <CartSummary totalAmount={totalAmount} itemCount={itemCount} />
      </div>
    </div>
  );
}
