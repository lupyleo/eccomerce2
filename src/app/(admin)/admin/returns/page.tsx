'use client';

import { useEffect, useState } from 'react';

interface Return {
  id: string;
  reason: string;
  status: string;
  refundAmount: number | null;
  createdAt: string;
  order: {
    orderNumber: string;
    user: { name: string | null; email: string } | null;
  };
}

const STATUS_LABELS: Record<string, string> = {
  REQUESTED: '요청됨',
  APPROVED: '승인됨',
  REJECTED: '거절됨',
  COMPLETED: '완료',
};

const STATUS_COLORS: Record<string, string> = {
  REQUESTED: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-blue-100 text-blue-700',
  REJECTED: 'bg-red-100 text-red-700',
  COMPLETED: 'bg-green-100 text-green-700',
};

export default function AdminReturnsPage() {
  const [returns, setReturns] = useState<Return[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  const fetchReturns = (status: string) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    fetch(`/api/admin/returns?${params}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setReturns(json.data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchReturns(statusFilter);
  }, [statusFilter]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    const res = await fetch(`/api/admin/returns/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    const json = await res.json();
    if (json.success) fetchReturns(statusFilter);
    else alert(json.error || '처리 실패');
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">반품 관리</h1>

      <div className="mb-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
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
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-5 py-3 text-left">주문번호</th>
                <th className="px-5 py-3 text-left">요청자</th>
                <th className="px-5 py-3 text-left">사유</th>
                <th className="px-5 py-3 text-center">상태</th>
                <th className="px-5 py-3 text-right">환불금액</th>
                <th className="px-5 py-3 text-left">요청일</th>
                <th className="px-5 py-3 text-center">처리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {returns.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium">{r.order.orderNumber}</td>
                  <td className="px-5 py-3 text-gray-500">
                    {r.order.user?.name ?? r.order.user?.email ?? '-'}
                  </td>
                  <td className="px-5 py-3 text-gray-500 max-w-[200px] truncate">{r.reason}</td>
                  <td className="px-5 py-3 text-center">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${STATUS_COLORS[r.status] ?? 'bg-gray-100'}`}
                    >
                      {STATUS_LABELS[r.status] ?? r.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    {r.refundAmount != null ? `${r.refundAmount.toLocaleString()}원` : '-'}
                  </td>
                  <td className="px-5 py-3 text-gray-500">
                    {new Date(r.createdAt).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="px-5 py-3 text-center space-x-1">
                    {r.status === 'REQUESTED' && (
                      <>
                        <button
                          onClick={() => handleStatusChange(r.id, 'APPROVED')}
                          className="text-blue-600 hover:underline text-xs"
                        >
                          승인
                        </button>
                        <button
                          onClick={() => handleStatusChange(r.id, 'REJECTED')}
                          className="text-red-600 hover:underline text-xs"
                        >
                          거절
                        </button>
                      </>
                    )}
                    {r.status === 'APPROVED' && (
                      <button
                        onClick={() => handleStatusChange(r.id, 'COMPLETED')}
                        className="text-green-600 hover:underline text-xs"
                      >
                        완료처리
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
