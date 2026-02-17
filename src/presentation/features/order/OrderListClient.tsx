'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { formatPrice } from '@/lib/utils';
import { Spinner, Button } from '@/presentation/components/ui';
import OrderStatusBadge from './OrderStatusBadge';

interface OrderSummary {
  id: string;
  orderNumber: string;
  status: string;
  finalAmount: number;
  itemCount: number;
  firstItem: { productName: string; image: string | null } | null;
  createdAt: string;
}

export default function OrderListClient() {
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchOrders = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/orders?page=${p}&limit=10`);
      if (res.ok) {
        const json = await res.json();
        setOrders(json.data);
        setTotalPages(json.meta.totalPages);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders(page);
  }, [fetchOrders, page]);

  if (loading && orders.length === 0) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-20">
        <h2 className="text-lg font-medium text-gray-900">주문 내역이 없습니다</h2>
        <p className="mt-2 text-sm text-gray-500">첫 주문을 시작해보세요.</p>
        <Link href="/products" className="inline-block mt-4">
          <Button variant="outline">쇼핑하기</Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-4">
        {orders.map((order) => (
          <Link
            key={order.id}
            href={`/orders/${order.id}`}
            className="block border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{order.orderNumber}</span>
                <OrderStatusBadge status={order.status} />
              </div>
              <span className="text-xs text-gray-500">
                {new Date(order.createdAt).toLocaleDateString('ko-KR')}
              </span>
            </div>
            <div className="flex items-center gap-3">
              {order.firstItem?.image && (
                <div className="w-14 h-14 bg-gray-100 rounded overflow-hidden relative flex-shrink-0">
                  <Image
                    src={order.firstItem.image}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="56px"
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {order.firstItem?.productName}
                  {order.itemCount > 1 && ` 외 ${order.itemCount - 1}건`}
                </p>
                <p className="text-sm font-semibold mt-0.5">{formatPrice(order.finalAmount)}</p>
              </div>
              <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            이전
          </Button>
          <span className="flex items-center px-3 text-sm text-gray-600">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            다음
          </Button>
        </div>
      )}
    </div>
  );
}
