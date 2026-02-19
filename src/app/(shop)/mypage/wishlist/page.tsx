'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface WishlistItem {
  id: string;
  productId: string;
  product: {
    id: string;
    name: string;
    slug: string;
    basePrice: number;
    status: string;
    primaryImage: { url: string; alt: string | null } | null;
    brand: string | null;
  };
  createdAt: string;
}

export default function WishlistPage() {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const fetchWishlist = async () => {
    const res = await fetch('/api/wishlists');
    const json = await res.json();
    if (json.success) setItems(json.data);
  };

  useEffect(() => {
    fetchWishlist().finally(() => setLoading(false));
  }, []);

  const handleRemove = async (productId: string) => {
    setRemovingId(productId);
    try {
      const res = await fetch(`/api/wishlists/${productId}`, { method: 'DELETE' });
      if (res.ok) {
        setItems((prev) => prev.filter((item) => item.productId !== productId));
      }
    } finally {
      setRemovingId(null);
    }
  };

  const handleAddToCart = async (productId: string) => {
    const res = await fetch('/api/cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, quantity: 1 }),
    });
    if (res.ok) {
      alert('장바구니에 담겼습니다.');
    } else {
      alert('옵션을 선택해주세요. 상품 페이지에서 추가해주세요.');
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">위시리스트</h1>
        <Link
          href="/mypage"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          마이페이지로
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">로딩 중...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-400 text-lg mb-2">위시리스트가 비어있습니다.</p>
          <p className="text-gray-400 text-sm mb-6">마음에 드는 상품을 담아보세요.</p>
          <Link
            href="/products"
            className="inline-block px-6 py-2.5 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-700"
          >
            쇼핑하러 가기
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">{items.length}개 상품</p>
          {items.map((item) => {
            const product = item.product;
            return (
              <div
                key={item.id}
                className="flex gap-4 p-4 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
              >
                {/* Product Image */}
                <Link href={`/products/${product.slug}`} className="flex-shrink-0">
                  <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden relative">
                    {product.primaryImage ? (
                      <Image
                        src={product.primaryImage.url}
                        alt={product.primaryImage.alt ?? product.name}
                        fill
                        className="object-cover"
                        sizes="96px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">
                        이미지 없음
                      </div>
                    )}
                  </div>
                </Link>

                {/* Product Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      {product.brand && (
                        <p className="text-xs text-gray-400 mb-0.5">{product.brand}</p>
                      )}
                      <Link
                        href={`/products/${product.slug}`}
                        className="text-sm font-medium text-gray-900 hover:underline line-clamp-2"
                      >
                        {product.name}
                      </Link>
                    </div>
                    <button
                      onClick={() => handleRemove(product.id)}
                      disabled={removingId === product.id}
                      className="flex-shrink-0 text-gray-300 hover:text-red-500 transition-colors disabled:opacity-50"
                      aria-label="위시리스트에서 제거"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  </div>

                  <p className="text-base font-bold text-gray-900 mt-2">
                    {product.basePrice.toLocaleString()}원
                  </p>

                  {product.status !== 'ACTIVE' && (
                    <span className="inline-block mt-1 px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded">
                      {product.status === 'SOLD_OUT' ? '품절' : '판매중지'}
                    </span>
                  )}

                  <div className="flex gap-2 mt-3">
                    <Link
                      href={`/products/${product.slug}`}
                      className="flex-1 py-1.5 text-center border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                    >
                      상품 보기
                    </Link>
                    <button
                      onClick={() => handleAddToCart(product.id)}
                      disabled={product.status !== 'ACTIVE'}
                      className="flex-1 py-1.5 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      장바구니 담기
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
