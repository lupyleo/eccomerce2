'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { formatPrice } from '@/lib/utils';
import { useCartStore } from '@/presentation/hooks/useCart';
import { Button } from '@/presentation/components/ui';

interface CartItemRowProps {
  item: {
    id: string;
    variant: {
      id: string;
      size: string;
      color: string;
      price: number;
      availableStock: number;
      product: {
        name: string;
        slug: string;
        primaryImage: { url: string; alt: string | null } | null;
      };
    };
    quantity: number;
    subtotal: number;
  };
}

export default function CartItemRow({ item }: CartItemRowProps) {
  const { updateQuantity, removeItem } = useCartStore();
  const [loading, setLoading] = useState(false);

  const handleQuantityChange = async (newQty: number) => {
    if (newQty < 1 || newQty > item.variant.availableStock) return;
    setLoading(true);
    try {
      await updateQuantity(item.id, newQty);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async () => {
    setLoading(true);
    try {
      await removeItem(item.id);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex gap-4 py-4 border-b border-gray-100">
      <div className="w-20 h-20 flex-shrink-0 bg-gray-100 rounded-md overflow-hidden relative">
        {item.variant.product.primaryImage ? (
          <Image
            src={item.variant.product.primaryImage.url}
            alt={item.variant.product.primaryImage.alt ?? item.variant.product.name}
            fill
            className="object-cover"
            sizes="80px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
            No Image
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <Link
          href={`/products/${item.variant.product.slug}`}
          className="text-sm font-medium text-gray-900 hover:underline line-clamp-1"
        >
          {item.variant.product.name}
        </Link>
        <p className="text-xs text-gray-500 mt-0.5">
          {item.variant.size} / {item.variant.color}
        </p>

        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleQuantityChange(item.quantity - 1)}
              disabled={loading || item.quantity <= 1}
              className="w-7 h-7 flex items-center justify-center border border-gray-300 rounded text-sm disabled:opacity-50"
            >
              -
            </button>
            <span className="text-sm w-8 text-center">{item.quantity}</span>
            <button
              onClick={() => handleQuantityChange(item.quantity + 1)}
              disabled={loading || item.quantity >= item.variant.availableStock}
              className="w-7 h-7 flex items-center justify-center border border-gray-300 rounded text-sm disabled:opacity-50"
            >
              +
            </button>
          </div>
          <span className="text-sm font-semibold">{formatPrice(item.subtotal)}</span>
        </div>
      </div>

      <Button variant="ghost" size="icon" onClick={handleRemove} disabled={loading} aria-label="삭제">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </Button>
    </div>
  );
}
