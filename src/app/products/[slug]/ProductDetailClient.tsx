'use client';

import { useState } from 'react';
import { formatPrice } from '@/lib/utils';
import VariantSelector from '@/components/product/VariantSelector';
import { useCartStore } from '@/presentation/hooks/useCart';

interface Variant {
  id: string;
  sku: string;
  size: string;
  color: string;
  colorCode: string | null;
  price: number;
  availableStock: number;
  isActive: boolean;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  basePrice: number;
  status: string;
  category: {
    id: string;
    name: string;
    slug: string;
    parent?: { id: string; name: string; slug: string } | null;
  };
  brand: { id: string; name: string; slug: string; logoUrl: string | null } | null;
  images: { id: string; url: string; alt: string | null; sortOrder: number; isPrimary: boolean }[];
  variants: Variant[];
  avgRating: number;
  reviewCount: number;
  salesCount: number;
}

interface ProductDetailClientProps {
  product: Product;
}

export default function ProductDetailClient({ product }: ProductDetailClientProps) {
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [cartMessage, setCartMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const displayPrice = selectedVariant ? selectedVariant.price : product.basePrice;
  const isSoldOut = product.status === 'SOLD_OUT';
  const isVariantSoldOut = selectedVariant && selectedVariant.availableStock <= 0;

  const { addItem } = useCartStore();

  const handleAddToCart = async () => {
    if (!selectedVariant) return;
    setIsAddingToCart(true);
    setCartMessage(null);

    try {
      await addItem(selectedVariant.id, quantity);
      setCartMessage({ type: 'success', text: '장바구니에 추가되었습니다.' });
    } catch (err) {
      setCartMessage({ type: 'error', text: err instanceof Error ? err.message : '장바구니 추가에 실패했습니다.' });
    } finally {
      setIsAddingToCart(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
      {/* Image Gallery */}
      <div>
        <div className="aspect-square bg-gray-100 rounded-xl overflow-hidden mb-4">
          {product.images.length > 0 ? (
            <img
              src={product.images[selectedImageIndex].url}
              alt={product.images[selectedImageIndex].alt ?? product.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <svg className="w-24 h-24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
        </div>

        {/* Thumbnails */}
        {product.images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto">
            {product.images.map((image, i) => (
              <button
                key={image.id}
                onClick={() => setSelectedImageIndex(i)}
                className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                  i === selectedImageIndex
                    ? 'border-gray-900'
                    : 'border-transparent hover:border-gray-300'
                }`}
              >
                <img
                  src={image.url}
                  alt={image.alt ?? `${product.name} ${i + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Product Info */}
      <div>
        {/* Brand & Category */}
        <div className="flex items-center gap-2 mb-2">
          {product.brand && (
            <span className="text-sm text-gray-500">{product.brand.name}</span>
          )}
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">{product.name}</h1>

        {/* Rating */}
        {product.reviewCount > 0 && (
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <svg
                  key={star}
                  className={`w-4 h-4 ${
                    star <= Math.round(product.avgRating)
                      ? 'text-yellow-400 fill-current'
                      : 'text-gray-300 fill-current'
                  }`}
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <span className="text-sm text-gray-500">
              {product.avgRating.toFixed(1)} ({product.reviewCount}개 리뷰)
            </span>
          </div>
        )}

        {/* Price */}
        <p className="text-3xl font-bold text-gray-900 mb-8">
          {formatPrice(displayPrice)}
        </p>

        {isSoldOut ? (
          <div className="bg-gray-100 rounded-lg p-6 text-center">
            <p className="text-gray-500 font-medium">품절된 상품입니다.</p>
          </div>
        ) : (
          <>
            {/* Variant Selector */}
            <VariantSelector
              variants={product.variants}
              basePrice={product.basePrice}
              onVariantSelect={setSelectedVariant}
            />

            {/* Quantity & Add to Cart */}
            {selectedVariant && !isVariantSoldOut && (
              <div className="mt-6 space-y-4">
                {/* Quantity */}
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-900">수량</span>
                  <div className="flex items-center border border-gray-300 rounded-lg">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="px-3 py-2 text-gray-500 hover:text-gray-900 transition-colors"
                    >
                      -
                    </button>
                    <span className="px-4 py-2 text-sm font-medium border-x border-gray-300 min-w-[48px] text-center">
                      {quantity}
                    </span>
                    <button
                      onClick={() =>
                        setQuantity(Math.min(selectedVariant.availableStock, quantity + 1))
                      }
                      className="px-3 py-2 text-gray-500 hover:text-gray-900 transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Total */}
                <div className="flex items-center justify-between py-4 border-t border-gray-200">
                  <span className="text-sm text-gray-500">총 상품금액</span>
                  <span className="text-xl font-bold text-gray-900">
                    {formatPrice(selectedVariant.price * quantity)}
                  </span>
                </div>

                {/* Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={handleAddToCart}
                    disabled={isAddingToCart}
                    className="flex-1 bg-gray-900 text-white py-3.5 rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isAddingToCart ? '추가 중...' : '장바구니 담기'}
                  </button>
                </div>

                {/* Cart Message */}
                {cartMessage && (
                  <div
                    className={`p-3 rounded-lg text-sm ${
                      cartMessage.type === 'success'
                        ? 'bg-green-50 text-green-700'
                        : 'bg-red-50 text-red-700'
                    }`}
                  >
                    {cartMessage.text}
                  </div>
                )}
              </div>
            )}

            {isVariantSoldOut && (
              <div className="mt-6 bg-gray-100 rounded-lg p-4 text-center">
                <p className="text-gray-500 text-sm">선택하신 옵션은 품절되었습니다.</p>
              </div>
            )}
          </>
        )}

        {/* Shipping Info */}
        <div className="mt-8 border-t border-gray-200 pt-6 space-y-3">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-gray-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
            <div>
              <p className="text-sm font-medium text-gray-900">무료배송</p>
              <p className="text-xs text-gray-500">50,000원 이상 구매시 무료배송 (미만시 3,000원)</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-gray-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <div>
              <p className="text-sm font-medium text-gray-900">교환/반품</p>
              <p className="text-xs text-gray-500">배송 완료 후 7일 이내 가능</p>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="mt-8 border-t border-gray-200 pt-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">상품 설명</h3>
          <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
            {product.description}
          </p>
        </div>
      </div>
    </div>
  );
}
