'use client';

import { useState } from 'react';
import { formatPrice } from '@/lib/utils';
import { Button, Input } from '@/presentation/components/ui';
import { Alert, AlertDescription } from '@/presentation/components/ui';

interface CouponInputProps {
  orderAmount: number;
  onApply: (coupon: { code: string; discount: number }) => void;
  onClear: () => void;
  appliedCode: string | null;
  discount: number;
}

export default function CouponInput({ orderAmount, onApply, onClear, appliedCode, discount }: CouponInputProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleApply = async () => {
    if (!code.trim()) return;
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim(), orderAmount }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message ?? '쿠폰 적용에 실패했습니다.');
      }
      onApply({ code: json.data.code, discount: json.data.discount });
    } catch (err) {
      setError(err instanceof Error ? err.message : '쿠폰 적용에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (appliedCode) {
    return (
      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
        <div>
          <p className="text-sm font-medium text-green-800">
            쿠폰 적용됨: {appliedCode}
          </p>
          <p className="text-sm text-green-600">-{formatPrice(discount)} 할인</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClear}>
          취소
        </Button>
      </div>
    );
  }

  return (
    <div>
      <h3 className="font-medium mb-2">쿠폰</h3>
      {error && (
        <Alert variant="destructive" className="mb-2">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="flex gap-2">
        <Input
          placeholder="쿠폰 코드 입력"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="flex-1"
        />
        <Button variant="outline" onClick={handleApply} loading={loading} disabled={!code.trim()}>
          적용
        </Button>
      </div>
    </div>
  );
}
