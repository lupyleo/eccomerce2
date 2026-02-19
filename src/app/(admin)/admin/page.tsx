'use client';

import { useEffect, useState } from 'react';

interface DashboardData {
  totalRevenue: number;
  totalOrders: number;
  totalUsers: number;
  pendingOrders: number;
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    status: string;
    finalAmount: number;
    createdAt: string;
  }>;
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/dashboard')
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setData(json.data);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-12 text-gray-500">로딩 중...</div>;
  if (!data) return <div className="text-center py-12 text-red-500">데이터를 불러올 수 없습니다.</div>;

  const stats = [
    { label: '총 매출', value: `${data.totalRevenue.toLocaleString()}원` },
    { label: '총 주문', value: `${data.totalOrders}건` },
    { label: '총 회원', value: `${data.totalUsers}명` },
    { label: '처리 대기', value: `${data.pendingOrders}건` },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">대시보드</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-lg shadow p-5">
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className="text-2xl font-bold mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="px-5 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">최근 주문</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-5 py-3 text-left">주문번호</th>
                <th className="px-5 py-3 text-left">상태</th>
                <th className="px-5 py-3 text-right">금액</th>
                <th className="px-5 py-3 text-left">날짜</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.recentOrders?.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium">{order.orderNumber}</td>
                  <td className="px-5 py-3">
                    <span className="px-2 py-1 rounded-full text-xs bg-gray-100">{order.status}</span>
                  </td>
                  <td className="px-5 py-3 text-right">{order.finalAmount?.toLocaleString()}원</td>
                  <td className="px-5 py-3 text-gray-500">
                    {new Date(order.createdAt).toLocaleDateString('ko-KR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
