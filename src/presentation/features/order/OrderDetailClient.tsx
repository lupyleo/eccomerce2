'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { formatPrice } from '@/lib/utils';
import { Spinner, Button } from '@/presentation/components/ui';
import { Alert, AlertDescription } from '@/presentation/components/ui';
import OrderStatusBadge from './OrderStatusBadge';

interface OrderDetail {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  discountAmount: number;
  shippingFee: number;
  finalAmount: number;
  addressSnapshot: {
    name: string;
    phone: string;
    zipCode: string;
    address1: string;
    address2?: string;
  };
  note: string | null;
  items: {
    id: string;
    productName: string;
    variantInfo: string;
    price: number;
    quantity: number;
    subtotal: number;
    productSlug: string;
    image: string | null;
  }[];
  payment: {
    method: string;
    status: string;
    amount: number;
    paidAt: string | null;
  } | null;
  shipment: {
    status: string;
    carrier: string;
    trackingNumber: string | null;
  } | null;
  createdAt: string;
}

export default function OrderDetailClient({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await fetch(`/api/orders/${orderId}`);
        if (res.ok) {
          const json = await res.json();
          setOrder(json.data);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [orderId]);

  const handleCancel = async () => {
    if (!confirm('주문을 취소하시겠습니까?')) return;
    setCancelling(true);
    setError('');
    try {
      const res = await fetch(`/api/orders/${orderId}/cancel`, { method: 'POST' });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error?.message ?? '주문 취소에 실패했습니다.');
      }
      const json = await res.json();
      setOrder((prev) => prev ? { ...prev, status: json.data.status } : prev);
    } catch (err) {
      setError(err instanceof Error ? err.message : '주문 취소에 실패했습니다.');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-20">
        <h2 className="text-lg font-medium">주문을 찾을 수 없습니다</h2>
        <Link href="/orders" className="inline-block mt-4">
          <Button variant="outline">주문내역으로</Button>
        </Link>
      </div>
    );
  }

  const addr = order.addressSnapshot;
  const canCancel = ['PENDING', 'PAID'].includes(order.status);

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Order Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{order.orderNumber}</h2>
          <p className="text-sm text-gray-500">
            {new Date(order.createdAt).toLocaleDateString('ko-KR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      {/* Items */}
      <section className="border border-gray-200 rounded-lg p-5">
        <h3 className="font-medium mb-4">주문 상품</h3>
        <div className="space-y-3">
          {order.items.map((item) => (
            <div key={item.id} className="flex gap-3">
              <div className="w-16 h-16 bg-gray-100 rounded overflow-hidden relative flex-shrink-0">
                {item.image && (
                  <Image src={item.image} alt="" fill className="object-cover" sizes="64px" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <Link
                  href={`/products/${item.productSlug}`}
                  className="text-sm font-medium hover:underline"
                >
                  {item.productName}
                </Link>
                <p className="text-xs text-gray-500">{item.variantInfo}</p>
                <p className="text-sm mt-1">
                  {formatPrice(item.price)} x {item.quantity} ={' '}
                  <span className="font-semibold">{formatPrice(item.subtotal)}</span>
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Delivery */}
      <section className="border border-gray-200 rounded-lg p-5">
        <h3 className="font-medium mb-3">배송 정보</h3>
        <div className="text-sm space-y-1">
          <p>{addr.name} ({addr.phone})</p>
          <p className="text-gray-600">[{addr.zipCode}] {addr.address1} {addr.address2}</p>
          {order.note && <p className="text-gray-500 mt-2">메모: {order.note}</p>}
        </div>
        {order.shipment && (
          <div className="mt-3 p-3 bg-gray-50 rounded text-sm">
            <p>택배사: {order.shipment.carrier}</p>
            {order.shipment.trackingNumber && (
              <p>운송장: {order.shipment.trackingNumber}</p>
            )}
          </div>
        )}
      </section>

      {/* Payment Summary */}
      <section className="border border-gray-200 rounded-lg p-5">
        <h3 className="font-medium mb-3">결제 정보</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">상품금액</span>
            <span>{formatPrice(order.totalAmount)}</span>
          </div>
          {order.discountAmount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>할인</span>
              <span>-{formatPrice(order.discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-600">배송비</span>
            <span>{order.shippingFee === 0 ? '무료' : formatPrice(order.shippingFee)}</span>
          </div>
          <hr />
          <div className="flex justify-between font-bold text-base">
            <span>총 결제금액</span>
            <span>{formatPrice(order.finalAmount)}</span>
          </div>
          {order.payment && (
            <p className="text-gray-500 text-xs">
              결제수단: {order.payment.method === 'CARD' ? '카드' : order.payment.method === 'EASY_PAY' ? '간편결제' : '가상계좌'}
            </p>
          )}
        </div>
      </section>

      {/* Actions */}
      <div className="flex gap-3">
        <Link href="/orders">
          <Button variant="outline">목록으로</Button>
        </Link>
        {canCancel && (
          <Button variant="destructive" onClick={handleCancel} loading={cancelling}>
            주문 취소
          </Button>
        )}
      </div>
    </div>
  );
}
