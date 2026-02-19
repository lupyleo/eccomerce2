'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  finalAmount: number;
  user: { name: string | null; email: string } | null;
  createdAt: string;
}

interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
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

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');

  const fetchOrders = (p: number, s: string, q: string) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p), limit: '20' });
    if (s) params.set('status', s);
    if (q) params.set('search', q);
    fetch(`/api/admin/orders?${params}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setOrders(json.data);
          setMeta(json.meta);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOrders(page, status, search);
  }, [page, status]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchOrders(1, status, search);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">주문 관리</h1>

      <div className="flex gap-2 mb-4 flex-wrap">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-[200px]">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="주문번호 또는 이메일 검색..."
            className="flex-1 px-3 py-2 border rounded-lg text-sm"
          />
          <button type="submit" className="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm">
            검색
          </button>
        </form>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 border rounded-lg text-sm"
        >
          <option value="">전체 상태</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">로딩 중...</div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="px-5 py-3 text-left">주문번호</th>
                  <th className="px-5 py-3 text-left">주문자</th>
                  <th className="px-5 py-3 text-center">상태</th>
                  <th className="px-5 py-3 text-right">결제금액</th>
                  <th className="px-5 py-3 text-left">주문일</th>
                  <th className="px-5 py-3 text-center">상세</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium">{order.orderNumber}</td>
                    <td className="px-5 py-3 text-gray-500">
                      {order.user?.name ?? order.user?.email ?? '-'}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${STATUS_COLORS[order.status] ?? 'bg-gray-100'}`}
                      >
                        {STATUS_LABELS[order.status] ?? order.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      {order.finalAmount.toLocaleString()}원
                    </td>
                    <td className="px-5 py-3 text-gray-500">
                      {new Date(order.createdAt).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        상세
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {meta && meta.totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              {Array.from({ length: meta.totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`px-3 py-1 rounded text-sm ${p === page ? 'bg-blue-600 text-white' : 'bg-white border hover:bg-gray-50'}`}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
