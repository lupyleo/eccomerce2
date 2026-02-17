'use client';

import Link from 'next/link';
import { formatPrice } from '@/lib/utils';
import { Button } from '@/presentation/components/ui';

interface CartSummaryProps {
  totalAmount: number;
  itemCount: number;
}

const FREE_SHIPPING_THRESHOLD = 50000;
const SHIPPING_FEE = 3000;

export default function CartSummary({ totalAmount, itemCount }: CartSummaryProps) {
  const shippingFee = totalAmount >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
  const finalAmount = totalAmount + shippingFee;

  return (
    <div className="bg-gray-50 rounded-lg p-6 sticky top-24">
      <h2 className="text-lg font-semibold mb-4">주문 요약</h2>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">상품금액 ({itemCount}개)</span>
          <span>{formatPrice(totalAmount)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">배송비</span>
          <span>{shippingFee === 0 ? '무료' : formatPrice(shippingFee)}</span>
        </div>
        {shippingFee > 0 && (
          <p className="text-xs text-gray-400">
            {formatPrice(FREE_SHIPPING_THRESHOLD - totalAmount)} 더 구매 시 무료배송
          </p>
        )}
        <hr className="my-3" />
        <div className="flex justify-between text-base font-semibold">
          <span>총 결제금액</span>
          <span>{formatPrice(finalAmount)}</span>
        </div>
      </div>

      <Link href="/checkout" className="block mt-6">
        <Button className="w-full" size="lg">
          주문하기
        </Button>
      </Link>
    </div>
  );
}
