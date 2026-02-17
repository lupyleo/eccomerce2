'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/presentation/components/ui';
import AddressForm from './AddressForm';

interface Address {
  id: string;
  name: string;
  phone: string;
  zipCode: string;
  address1: string;
  address2: string | null;
  isDefault: boolean;
}

interface AddressSelectorProps {
  selectedId: string | null;
  onSelect: (address: Address) => void;
}

export default function AddressSelector({ selectedId, onSelect }: AddressSelectorProps) {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const initialSelectDone = useRef(false);

  const fetchAddresses = useCallback(async () => {
    try {
      const res = await fetch('/api/users/me/addresses');
      if (res.ok) {
        const json = await res.json();
        setAddresses(json.data);
        return json.data as Address[];
      }
    } finally {
      setLoading(false);
    }
    return [];
  }, []);

  useEffect(() => {
    fetchAddresses().then((list) => {
      if (!initialSelectDone.current && list.length > 0) {
        initialSelectDone.current = true;
        const defaultAddr = list.find((a) => a.isDefault) ?? list[0];
        onSelect(defaultAddr);
      }
    });
  }, [fetchAddresses, onSelect]);

  const handleAddAddress = async (data: Record<string, unknown>) => {
    const res = await fetch('/api/users/me/addresses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const json = await res.json();
      setAddresses((prev) => [...prev, json.data]);
      onSelect(json.data);
      setShowForm(false);
    }
  };

  if (loading) {
    return <div className="animate-pulse h-20 bg-gray-100 rounded-md" />;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium">배송지</h3>
        <Button variant="outline" size="sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? '취소' : '새 배송지'}
        </Button>
      </div>

      {showForm && (
        <div className="mb-4 p-4 border border-gray-200 rounded-lg">
          <AddressForm onSubmit={handleAddAddress} onCancel={() => setShowForm(false)} />
        </div>
      )}

      <div className="space-y-2">
        {addresses.map((addr) => (
          <label
            key={addr.id}
            className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
              selectedId === addr.id
                ? 'border-gray-900 bg-gray-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <input
              type="radio"
              name="address"
              checked={selectedId === addr.id}
              onChange={() => onSelect(addr)}
              className="mt-1"
            />
            <div className="text-sm">
              <p className="font-medium">
                {addr.name} {addr.isDefault && <span className="text-xs text-gray-500">(기본)</span>}
              </p>
              <p className="text-gray-600">{addr.phone}</p>
              <p className="text-gray-500">
                [{addr.zipCode}] {addr.address1} {addr.address2}
              </p>
            </div>
          </label>
        ))}
        {addresses.length === 0 && !showForm && (
          <p className="text-sm text-gray-500 text-center py-4">
            등록된 배송지가 없습니다. 새 배송지를 추가해주세요.
          </p>
        )}
      </div>
    </div>
  );
}
