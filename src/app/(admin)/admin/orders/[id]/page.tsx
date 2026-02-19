'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface OrderItem {
  id: string;
  productName: string;
  variantInfo: string;
  quantity: number;
  price: number;
  subtotal: number;
  variant: {
    size: string;
    color: string;
    product: {
      name: string;
      images: { url: string }[];
    };
  };
}

interface Payment {
  id: string;
  method: string;
  status: string;
  amount: number;
  paidAt: string | null;
  cancelledAmount: number;
}

interface Shipment {
  id: string;
  status: string;
  carrier: string;
  trackingNumber: string | null;
}

interface Return {
  id: string;
  reason: string;
  status: string;
  refundAmount: number;
  createdAt: string;
}

interface AdminOrderDetail {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  discountAmount: number;
  shippingFee: number;
  finalAmount: number;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    phone: string | null;
  } | null;
  addressSnapshot: {
    name: string;
    phone: string;
    zipCode: string;
    address1: string;
    address2?: string;
  };
  items: OrderItem[];
  payment: Payment | null;
  shipment: Shipment | null;
  returns: Return[];
  coupon: { code: string; name: string } | null;
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: '결제대기',
  PAID: '결제완료',
  PREPARING: '상품준비',
  SHIPPING: '배송중',
  DELIVERED: '배송완료',
  CONFIRMED: '구매확정',
  CANCELLED: '취소',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  PAID: 'bg-blue-100 text-blue-700',
  PREPARING: 'bg-purple-100 text-purple-700',
  SHIPPING: 'bg-indigo-100 text-indigo-700',
  DELIVERED: 'bg-green-100 text-green-700',
  CONFIRMED: 'bg-gray-100 text-gray-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

const RETURN_STATUS_LABELS: Record<string, string> = {
  REQUESTED: '요청됨',
  APPROVED: '승인됨',
  REJECTED: '거절됨',
  COMPLETED: '완료',
};

const STATUS_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['PAID', 'CANCELLED'],
  PAID: ['PREPARING', 'CANCELLED'],
  PREPARING: ['SHIPPING'],
  SHIPPING: ['DELIVERED'],
  DELIVERED: ['CONFIRMED'],
  CONFIRMED: [],
  CANCELLED: [],
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CARD: '카드',
  EASY_PAY: '간편결제',
  VIRTUAL_ACCOUNT: '가상계좌',
  BANK_TRANSFER: '계좌이체',
};

export default function AdminOrderDetailPage() {
  const params = useParams();
  const orderId = params.id as string;

  const [order, setOrder] = useState<AdminOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [statusError, setStatusError] = useState('');

  const fetchOrder = async () => {
    const res = await fetch(`/api/admin/orders/${orderId}`);
    const json = await res.json();
    if (json.success) setOrder(json.data);
  };

  useEffect(() => {
    fetchOrder().finally(() => setLoading(false));
  }, [orderId]);

  const handleStatusChange = async (newStatus: string) => {
    if (!confirm(`주문 상태를 "${STATUS_LABELS[newStatus]}"으로 변경하시겠습니까?`)) return;
    setStatusUpdating(true);
    setStatusError('');
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? '상태 변경에 실패했습니다.');
      await fetchOrder();
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : '상태 변경에 실패했습니다.');
    } finally {
      setStatusUpdating(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-500">로딩 중...</div>;
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">주문을 찾을 수 없습니다.</p>
        <Link href="/admin/orders" className="text-blue-600 hover:underline">
          목록으로
        </Link>
      </div>
    );
  }

  const allowedTransitions = STATUS_TRANSITIONS[order.status] ?? [];
  const addr = order.addressSnapshot;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">주문 상세</h1>
        <Link href="/admin/orders" className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">
          목록으로
        </Link>
      </div>

      {statusError && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{statusError}</div>
      )}

      {/* Order Header */}
      <div className="bg-white rounded-lg shadow p-5 mb-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">{order.orderNumber}</h2>
            <p className="text-sm text-gray-500 mt-1">
              주문일: {new Date(order.createdAt).toLocaleString('ko-KR')}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`px-3 py-1.5 rounded-full text-sm font-medium ${STATUS_COLORS[order.status] ?? 'bg-gray-100'}`}
            >
              {STATUS_LABELS[order.status] ?? order.status}
            </span>
          </div>
        </div>

        {allowedTransitions.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="text-sm text-gray-500 self-center">상태 변경:</span>
            {allowedTransitions.map((nextStatus) => (
              <button
                key={nextStatus}
                onClick={() => handleStatusChange(nextStatus)}
                disabled={statusUpdating}
                className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                {STATUS_LABELS[nextStatus] ?? nextStatus}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Customer Info */}
        <div className="bg-white rounded-lg shadow p-5">
          <h3 className="font-semibold mb-3">주문자 정보</h3>
          <div className="text-sm space-y-1.5">
            {order.user ? (
              <>
                <div className="flex gap-2">
                  <span className="text-gray-500 w-16 flex-shrink-0">이름</span>
                  <span>{order.user.name ?? '-'}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-gray-500 w-16 flex-shrink-0">이메일</span>
                  <span>{order.user.email}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-gray-500 w-16 flex-shrink-0">연락처</span>
                  <span>{order.user.phone ?? '-'}</span>
                </div>
              </>
            ) : (
              <p className="text-gray-400">회원 정보 없음</p>
            )}
          </div>
        </div>

        {/* Address Info */}
        <div className="bg-white rounded-lg shadow p-5">
          <h3 className="font-semibold mb-3">배송지 정보</h3>
          <div className="text-sm space-y-1.5">
            <div className="flex gap-2">
              <span className="text-gray-500 w-16 flex-shrink-0">받는분</span>
              <span>{addr.name}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-gray-500 w-16 flex-shrink-0">연락처</span>
              <span>{addr.phone}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-gray-500 w-16 flex-shrink-0">주소</span>
              <span>
                [{addr.zipCode}] {addr.address1}
                {addr.address2 ? ` ${addr.address2}` : ''}
              </span>
            </div>
            {order.note && (
              <div className="flex gap-2">
                <span className="text-gray-500 w-16 flex-shrink-0">메모</span>
                <span>{order.note}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Order Items */}
      <div className="bg-white rounded-lg shadow p-5 mb-4">
        <h3 className="font-semibold mb-3">주문 상품</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-4 py-2 text-left">상품명</th>
                <th className="px-4 py-2 text-left">옵션</th>
                <th className="px-4 py-2 text-right">단가</th>
                <th className="px-4 py-2 text-right">수량</th>
                <th className="px-4 py-2 text-right">소계</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {order.items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 font-medium">
                    {item.variant?.product?.name ?? item.productName}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {item.variant ? `${item.variant.size} / ${item.variant.color}` : item.variantInfo}
                  </td>
                  <td className="px-4 py-3 text-right">{item.price.toLocaleString()}원</td>
                  <td className="px-4 py-3 text-right">{item.quantity}</td>
                  <td className="px-4 py-3 text-right font-medium">{item.subtotal.toLocaleString()}원</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Payment Info */}
        <div className="bg-white rounded-lg shadow p-5">
          <h3 className="font-semibold mb-3">결제 정보</h3>
          <div className="text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-500">상품금액</span>
              <span>{order.totalAmount.toLocaleString()}원</span>
            </div>
            {order.discountAmount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>할인</span>
                <span>-{order.discountAmount.toLocaleString()}원</span>
              </div>
            )}
            {order.coupon && (
              <div className="flex justify-between text-gray-500 text-xs">
                <span>적용 쿠폰: {order.coupon.name} ({order.coupon.code})</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">배송비</span>
              <span>{order.shippingFee === 0 ? '무료' : `${order.shippingFee.toLocaleString()}원`}</span>
            </div>
            <hr />
            <div className="flex justify-between font-bold">
              <span>총 결제금액</span>
              <span>{order.finalAmount.toLocaleString()}원</span>
            </div>
            {order.payment && (
              <>
                <hr />
                <div className="flex justify-between">
                  <span className="text-gray-500">결제수단</span>
                  <span>{PAYMENT_METHOD_LABELS[order.payment.method] ?? order.payment.method}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">결제상태</span>
                  <span>{order.payment.status}</span>
                </div>
                {order.payment.paidAt && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">결제일시</span>
                    <span>{new Date(order.payment.paidAt).toLocaleString('ko-KR')}</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Shipment Info */}
        <div className="bg-white rounded-lg shadow p-5">
          <h3 className="font-semibold mb-3">배송 현황</h3>
          {order.shipment ? (
            <div className="text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">배송상태</span>
                <span>{order.shipment.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">택배사</span>
                <span>{order.shipment.carrier || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">운송장번호</span>
                <span>{order.shipment.trackingNumber ?? '-'}</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400">배송 정보가 없습니다.</p>
          )}
        </div>
      </div>

      {/* Returns */}
      {order.returns.length > 0 && (
        <div className="bg-white rounded-lg shadow p-5">
          <h3 className="font-semibold mb-3">반품 내역</h3>
          <div className="space-y-3">
            {order.returns.map((ret) => (
              <div key={ret.id} className="p-3 bg-gray-50 rounded-lg text-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">반품 사유: {ret.reason}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs ${
                      ret.status === 'COMPLETED'
                        ? 'bg-green-100 text-green-700'
                        : ret.status === 'REJECTED'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {RETURN_STATUS_LABELS[ret.status] ?? ret.status}
                  </span>
                </div>
                <div className="text-gray-500 flex gap-4">
                  <span>환불금액: {ret.refundAmount.toLocaleString()}원</span>
                  <span>요청일: {new Date(ret.createdAt).toLocaleDateString('ko-KR')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
