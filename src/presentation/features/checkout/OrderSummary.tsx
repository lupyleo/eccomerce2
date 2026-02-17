'use client';

import Image from 'next/image';
import { formatPrice } from '@/lib/utils';

interface OrderSummaryItem {
  id: string;
  variant: {
    size: string;
    color: string;
    price: number;
    product: {
      name: string;
      primaryImage: { url: string; alt: string | null } | null;
    };
  };
  quantity: number;
  subtotal: number;
}

interface OrderSummaryProps {
  items: OrderSummaryItem[];
  totalAmount: number;
  shippingFee: number;
  discount: number;
}

export default function OrderSummary({ items, totalAmount, shippingFee, discount }: OrderSummaryProps) {
  const finalAmount = totalAmount + shippingFee - discount;

  return (
    <div className="bg-gray-50 rounded-lg p-6">
      <h3 className="font-semibold mb-4">주문 상품 ({items.length})</h3>

      <div className="space-y-3 mb-4">
        {items.map((item) => (
          <div key={item.id} className="flex gap-3">
            <div className="w-12 h-12 bg-gray-200 rounded overflow-hidden relative flex-shrink-0">
              {item.variant.product.primaryImage ? (
                <Image
                  src={item.variant.product.primaryImage.url}
                  alt={item.variant.product.primaryImage.alt ?? ''}
                  fill
                  className="object-cover"
                  sizes="48px"
                />
              ) : null}
            </div>
            <div className="flex-1 min-w-0 text-sm">
              <p className="font-medium truncate">{item.variant.product.name}</p>
              <p className="text-gray-500 text-xs">
                {item.variant.size}/{item.variant.color} x {item.quantity}
              </p>
            </div>
            <p className="text-sm font-medium whitespace-nowrap">{formatPrice(item.subtotal)}</p>
          </div>
        ))}
      </div>

      <hr className="my-4" />

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">상품금액</span>
          <span>{formatPrice(totalAmount)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">배송비</span>
          <span>{shippingFee === 0 ? '무료' : formatPrice(shippingFee)}</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-green-600">
            <span>할인</span>
            <span>-{formatPrice(discount)}</span>
          </div>
        )}
        <hr className="my-2" />
        <div className="flex justify-between text-base font-bold">
          <span>총 결제금액</span>
          <span>{formatPrice(finalAmount)}</span>
        </div>
      </div>
    </div>
  );
}
