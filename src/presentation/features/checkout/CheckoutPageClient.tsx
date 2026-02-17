'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/presentation/hooks/useCart';
import { Spinner, Button } from '@/presentation/components/ui';
import { Alert, AlertDescription } from '@/presentation/components/ui';
import AddressSelector from './AddressSelector';
import CouponInput from './CouponInput';
import PaymentMethodSelector from './PaymentMethodSelector';
import OrderSummary from './OrderSummary';

const FREE_SHIPPING_THRESHOLD = 50000;
const SHIPPING_FEE = 3000;

interface SelectedAddress {
  id: string;
  name: string;
  phone: string;
  zipCode: string;
  address1: string;
  address2: string | null;
  isDefault: boolean;
}

export default function CheckoutPageClient() {
  const router = useRouter();
  const { items, totalAmount, fetchCart, isLoading } = useCartStore();

  const [selectedAddress, setSelectedAddress] = useState<SelectedAddress | null>(null);
  const [coupon, setCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('CARD');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const shippingFee = totalAmount >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;

  const handleOrder = async () => {
    if (!selectedAddress) {
      setError('배송지를 선택해주세요.');
      return;
    }
    if (items.length === 0) {
      setError('장바구니가 비어있습니다.');
      return;
    }

    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          addressId: selectedAddress.id,
          couponCode: coupon?.code,
          paymentMethod,
          note: note || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message ?? '주문에 실패했습니다.');
      }
      await fetchCart();
      router.push(`/orders/${json.data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '주문에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading && items.length === 0) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <section className="border border-gray-200 rounded-lg p-5">
          <AddressSelector
            selectedId={selectedAddress?.id ?? null}
            onSelect={setSelectedAddress}
          />
        </section>

        <section className="border border-gray-200 rounded-lg p-5">
          <CouponInput
            orderAmount={totalAmount}
            onApply={setCoupon}
            onClear={() => setCoupon(null)}
            appliedCode={coupon?.code ?? null}
            discount={coupon?.discount ?? 0}
          />
        </section>

        <section className="border border-gray-200 rounded-lg p-5">
          <PaymentMethodSelector value={paymentMethod} onChange={setPaymentMethod} />
        </section>

        <section className="border border-gray-200 rounded-lg p-5">
          <h3 className="font-medium mb-2">배송 메모</h3>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="배송 시 요청사항을 입력해주세요 (선택)"
            className="w-full rounded-md border border-gray-300 p-3 text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </section>
      </div>

      <div>
        <OrderSummary
          items={items}
          totalAmount={totalAmount}
          shippingFee={shippingFee}
          discount={coupon?.discount ?? 0}
        />
        <Button
          className="w-full mt-4"
          size="lg"
          onClick={handleOrder}
          loading={submitting}
          disabled={!selectedAddress || items.length === 0}
        >
          결제하기
        </Button>
      </div>
    </div>
  );
}
