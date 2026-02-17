'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button, Spinner } from '@/presentation/components/ui';
import AddressForm from '@/presentation/features/checkout/AddressForm';

interface Address {
  id: string;
  name: string;
  phone: string;
  zipCode: string;
  address1: string;
  address2: string | null;
  isDefault: boolean;
}

export default function AddressList() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchAddresses = useCallback(async () => {
    try {
      const res = await fetch('/api/users/me/addresses');
      if (res.ok) {
        const json = await res.json();
        setAddresses(json.data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

  const handleAdd = async (data: Record<string, unknown>) => {
    const res = await fetch('/api/users/me/addresses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      setShowForm(false);
      fetchAddresses();
    }
  };

  const handleEdit = async (data: Record<string, unknown>) => {
    if (!editingId) return;
    const res = await fetch(`/api/users/me/addresses/${editingId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      setEditingId(null);
      fetchAddresses();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('배송지를 삭제하시겠습니까?')) return;
    const res = await fetch(`/api/users/me/addresses/${id}`, { method: 'DELETE' });
    if (res.ok) {
      fetchAddresses();
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium">배송지 관리</h3>
        <Button variant="outline" size="sm" onClick={() => { setShowForm(!showForm); setEditingId(null); }}>
          {showForm ? '취소' : '배송지 추가'}
        </Button>
      </div>

      {showForm && (
        <div className="mb-4 p-4 border border-gray-200 rounded-lg">
          <AddressForm onSubmit={handleAdd} onCancel={() => setShowForm(false)} />
        </div>
      )}

      <div className="space-y-3">
        {addresses.map((addr) => (
          <div key={addr.id} className="p-4 border border-gray-200 rounded-lg">
            {editingId === addr.id ? (
              <AddressForm
                defaultValues={{
                  name: addr.name,
                  phone: addr.phone,
                  zipCode: addr.zipCode,
                  address1: addr.address1,
                  address2: addr.address2 ?? '',
                  isDefault: addr.isDefault,
                }}
                onSubmit={handleEdit}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <div>
                <div className="flex items-center justify-between">
                  <p className="font-medium text-sm">
                    {addr.name}
                    {addr.isDefault && (
                      <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        기본
                      </span>
                    )}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setEditingId(addr.id); setShowForm(false); }}
                      className="text-xs text-gray-500 hover:text-gray-900"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => handleDelete(addr.id)}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      삭제
                    </button>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mt-1">{addr.phone}</p>
                <p className="text-sm text-gray-500">
                  [{addr.zipCode}] {addr.address1} {addr.address2}
                </p>
              </div>
            )}
          </div>
        ))}
        {addresses.length === 0 && !showForm && (
          <p className="text-sm text-gray-500 text-center py-4">등록된 배송지가 없습니다.</p>
        )}
      </div>
    </div>
  );
}
