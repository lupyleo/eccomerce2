'use client';

import { useEffect, useState } from 'react';

interface Coupon {
  id: string;
  code: string;
  type: string;
  value: number;
  minOrderAmount: number;
  maxUses: number | null;
  usedCount: number;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
}

const COUPON_TYPE_LABELS: Record<string, string> = {
  PERCENTAGE: '정률(%)',
  FIXED: '정액(원)',
};

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    code: '',
    type: 'PERCENTAGE',
    value: 0,
    minOrderAmount: 0,
    maxUses: '',
    expiresAt: '',
  });

  const fetchCoupons = () => {
    setLoading(true);
    fetch('/api/admin/coupons')
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setCoupons(json.data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const body: Record<string, unknown> = {
      code: form.code,
      type: form.type,
      value: Number(form.value),
      minOrderAmount: Number(form.minOrderAmount),
    };
    if (form.maxUses) body.maxUses = Number(form.maxUses);
    if (form.expiresAt) body.expiresAt = new Date(form.expiresAt).toISOString();

    const res = await fetch('/api/admin/coupons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (json.success) {
      setShowForm(false);
      setForm({ code: '', type: 'PERCENTAGE', value: 0, minOrderAmount: 0, maxUses: '', expiresAt: '' });
      fetchCoupons();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    const res = await fetch(`/api/admin/coupons/${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (json.success) fetchCoupons();
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    const res = await fetch(`/api/admin/coupons/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !isActive }),
    });
    const json = await res.json();
    if (json.success) fetchCoupons();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">쿠폰 관리</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
        >
          {showForm ? '취소' : '쿠폰 생성'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-lg shadow p-5 mb-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">쿠폰 코드</label>
              <input
                type="text"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">할인 유형</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                <option value="PERCENTAGE">정률(%)</option>
                <option value="FIXED">정액(원)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                할인값 {form.type === 'PERCENTAGE' ? '(%)' : '(원)'}
              </label>
              <input
                type="number"
                value={form.value}
                onChange={(e) => setForm({ ...form, value: Number(e.target.value) })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">최소 주문금액</label>
              <input
                type="number"
                value={form.minOrderAmount}
                onChange={(e) => setForm({ ...form, minOrderAmount: Number(e.target.value) })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">최대 사용 횟수 (빈칸=무제한)</label>
              <input
                type="number"
                value={form.maxUses}
                onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">만료일 (선택)</label>
              <input
                type="datetime-local"
                value={form.expiresAt}
                onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
          </div>
          <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">
            생성
          </button>
        </form>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">로딩 중...</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-5 py-3 text-left">코드</th>
                <th className="px-5 py-3 text-left">유형</th>
                <th className="px-5 py-3 text-right">할인</th>
                <th className="px-5 py-3 text-right">최소금액</th>
                <th className="px-5 py-3 text-center">사용/제한</th>
                <th className="px-5 py-3 text-center">상태</th>
                <th className="px-5 py-3 text-left">만료일</th>
                <th className="px-5 py-3 text-center">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {coupons.map((coupon) => (
                <tr key={coupon.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-mono font-medium">{coupon.code}</td>
                  <td className="px-5 py-3">{COUPON_TYPE_LABELS[coupon.type] ?? coupon.type}</td>
                  <td className="px-5 py-3 text-right">
                    {coupon.type === 'PERCENTAGE' ? `${coupon.value}%` : `${coupon.value.toLocaleString()}원`}
                  </td>
                  <td className="px-5 py-3 text-right">{coupon.minOrderAmount.toLocaleString()}원</td>
                  <td className="px-5 py-3 text-center">
                    {coupon.usedCount}/{coupon.maxUses ?? '∞'}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <button
                      onClick={() => toggleActive(coupon.id, coupon.isActive)}
                      className={`px-2 py-1 rounded-full text-xs ${coupon.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                    >
                      {coupon.isActive ? '활성' : '비활성'}
                    </button>
                  </td>
                  <td className="px-5 py-3 text-gray-500">
                    {coupon.expiresAt ? new Date(coupon.expiresAt).toLocaleDateString('ko-KR') : '-'}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <button
                      onClick={() => handleDelete(coupon.id)}
                      className="text-red-600 hover:underline text-xs"
                    >
                      삭제
                    </button>
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
