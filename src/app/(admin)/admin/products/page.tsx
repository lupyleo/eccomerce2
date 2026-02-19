'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Product {
  id: string;
  name: string;
  slug: string;
  basePrice: number;
  status: string;
  brand: { name: string } | null;
  category: { name: string } | null;
  variantCount: number;
  totalStock: number;
  createdAt: string;
}

interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const fetchProducts = (p: number, q: string) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p), limit: '20' });
    if (q) params.set('search', q);
    fetch(`/api/admin/products?${params}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setProducts(json.data);
          setMeta(json.meta);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchProducts(page, search);
  }, [page]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchProducts(1, search);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    const res = await fetch(`/api/admin/products/${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (json.success) fetchProducts(page, search);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">상품 관리</h1>
        <Link
          href="/admin/products/new"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
        >
          상품 등록
        </Link>
      </div>

      <form onSubmit={handleSearch} className="mb-4 flex gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="상품명 검색..."
          className="flex-1 px-3 py-2 border rounded-lg text-sm"
        />
        <button type="submit" className="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm">
          검색
        </button>
      </form>

      {loading ? (
        <div className="text-center py-12 text-gray-500">로딩 중...</div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="px-5 py-3 text-left">상품명</th>
                  <th className="px-5 py-3 text-left">브랜드</th>
                  <th className="px-5 py-3 text-left">카테고리</th>
                  <th className="px-5 py-3 text-right">가격</th>
                  <th className="px-5 py-3 text-center">상태</th>
                  <th className="px-5 py-3 text-center">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium">{product.name}</td>
                    <td className="px-5 py-3 text-gray-500">{product.brand?.name ?? '-'}</td>
                    <td className="px-5 py-3 text-gray-500">{product.category?.name ?? '-'}</td>
                    <td className="px-5 py-3 text-right">{product.basePrice.toLocaleString()}원</td>
                    <td className="px-5 py-3 text-center">
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${product.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                      >
                        {product.status === 'ACTIVE' ? '판매중' : '비활성'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center space-x-2">
                      <Link
                        href={`/admin/products/${product.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        수정
                      </Link>
                      <button
                        onClick={() => handleDelete(product.id)}
                        className="text-red-600 hover:underline"
                      >
                        삭제
                      </button>
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
