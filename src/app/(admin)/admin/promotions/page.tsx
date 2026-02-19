'use client';

import { useEffect, useState } from 'react';

interface Promotion {
  id: string;
  name: string;
  type: string;
  discountRate: number;
  isActive: boolean;
  startDate: string;
  endDate: string;
  category: { id: string; name: string } | null;
  createdAt: string;
}

const TYPE_LABELS: Record<string, string> = {
  CATEGORY_DISCOUNT: '카테고리 할인',
  PERIOD_DISCOUNT: '기간 할인',
};

export default function AdminPromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '',
    type: 'CATEGORY_DISCOUNT',
    discountRate: 10,
    categoryId: '',
    startDate: '',
    endDate: '',
  });

  const fetchPromotions = () => {
    setLoading(true);
    fetch('/api/admin/promotions')
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setPromotions(json.data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPromotions();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const body: Record<string, unknown> = {
      name: form.name,
      type: form.type,
      discountRate: Number(form.discountRate),
      startDate: new Date(form.startDate).toISOString(),
      endDate: new Date(form.endDate).toISOString(),
    };
    if (form.categoryId) body.categoryId = form.categoryId;

    const res = await fetch('/api/admin/promotions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (json.success) {
      setShowForm(false);
      setForm({ name: '', type: 'CATEGORY_DISCOUNT', discountRate: 10, categoryId: '', startDate: '', endDate: '' });
      fetchPromotions();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    const res = await fetch(`/api/admin/promotions/${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (json.success) fetchPromotions();
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    const res = await fetch(`/api/admin/promotions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !isActive }),
    });
    const json = await res.json();
    if (json.success) fetchPromotions();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">프로모션 관리</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
        >
          {showForm ? '취소' : '프로모션 생성'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-lg shadow p-5 mb-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">프로모션명</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">유형</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                <option value="CATEGORY_DISCOUNT">카테고리 할인</option>
                <option value="PERIOD_DISCOUNT">기간 할인</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">할인율 (%)</label>
              <input
                type="number"
                value={form.discountRate}
                onChange={(e) => setForm({ ...form, discountRate: Number(e.target.value) })}
                min={0}
                max={100}
                className="w-full px-3 py-2 border rounded-lg text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">카테고리 ID (선택)</label>
              <input
                type="text"
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                placeholder="UUID"
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">시작일</label>
              <input
                type="datetime-local"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">종료일</label>
              <input
                type="datetime-local"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
                required
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
                <th className="px-5 py-3 text-left">프로모션명</th>
                <th className="px-5 py-3 text-left">유형</th>
                <th className="px-5 py-3 text-right">할인율</th>
                <th className="px-5 py-3 text-left">카테고리</th>
                <th className="px-5 py-3 text-left">기간</th>
                <th className="px-5 py-3 text-center">상태</th>
                <th className="px-5 py-3 text-center">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {promotions.map((promo) => (
                <tr key={promo.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium">{promo.name}</td>
                  <td className="px-5 py-3">{TYPE_LABELS[promo.type] ?? promo.type}</td>
                  <td className="px-5 py-3 text-right">{promo.discountRate}%</td>
                  <td className="px-5 py-3 text-gray-500">{promo.category?.name ?? '-'}</td>
                  <td className="px-5 py-3 text-gray-500 text-xs">
                    {new Date(promo.startDate).toLocaleDateString('ko-KR')} ~{' '}
                    {new Date(promo.endDate).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <button
                      onClick={() => toggleActive(promo.id, promo.isActive)}
                      className={`px-2 py-1 rounded-full text-xs ${promo.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                    >
                      {promo.isActive ? '활성' : '비활성'}
                    </button>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <button
                      onClick={() => handleDelete(promo.id)}
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
