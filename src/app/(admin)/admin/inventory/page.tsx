'use client';

import { useState } from 'react';

const LOG_TYPES = [
  { value: 'INBOUND', label: '입고' },
  { value: 'OUTBOUND', label: '출고' },
  { value: 'ADJUSTMENT', label: '조정' },
];

export default function AdminInventoryPage() {
  const [form, setForm] = useState({
    variantId: '',
    type: 'INBOUND',
    quantity: 1,
    reason: '',
  });
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);

    try {
      const res = await fetch('/api/admin/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variantId: form.variantId,
          type: form.type,
          quantity: Number(form.quantity),
          reason: form.reason || undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setResult({ success: true, message: `재고 처리 완료. 현재 재고: ${json.data.currentStock}` });
        setForm({ variantId: '', type: 'INBOUND', quantity: 1, reason: '' });
      } else {
        setResult({ success: false, message: json.error || '처리 실패' });
      }
    } catch {
      setResult({ success: false, message: '네트워크 오류' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">재고 관리</h1>

      <div className="bg-white rounded-lg shadow p-6 max-w-lg">
        <h2 className="text-lg font-semibold mb-4">재고 입출고</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">상품 옵션 ID (Variant ID)</label>
            <input
              type="text"
              value={form.variantId}
              onChange={(e) => setForm({ ...form, variantId: e.target.value })}
              placeholder="UUID"
              className="w-full px-3 py-2 border rounded-lg text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">유형</label>
            <div className="flex gap-2">
              {LOG_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setForm({ ...form, type: t.value })}
                  className={`px-4 py-2 rounded-lg text-sm border transition-colors ${
                    form.type === t.value
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">수량</label>
            <input
              type="number"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
              min={1}
              className="w-full px-3 py-2 border rounded-lg text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">사유 (선택)</label>
            <textarea
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? '처리 중...' : '재고 처리'}
          </button>
        </form>

        {result && (
          <div
            className={`mt-4 p-3 rounded-lg text-sm ${
              result.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}
          >
            {result.message}
          </div>
        )}
      </div>
    </div>
  );
}
