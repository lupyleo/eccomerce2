'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

interface Category {
  id: string;
  name: string;
  slug: string;
  children?: Category[];
}

interface Brand {
  id: string;
  name: string;
  slug: string;
}

interface ProductFiltersProps {
  categories: Category[];
  brands: Brand[];
  availableSizes: string[];
  availableColors: { name: string; code: string | null }[];
}

export default function ProductFilters({
  categories,
  brands,
  availableSizes,
  availableColors,
}: ProductFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentCategory = searchParams.get('category');
  const currentBrand = searchParams.get('brand');
  const currentSizes = searchParams.get('sizes')?.split(',') ?? [];
  const currentColors = searchParams.get('colors')?.split(',') ?? [];
  const currentMinPrice = searchParams.get('minPrice') ?? '';
  const currentMaxPrice = searchParams.get('maxPrice') ?? '';

  const updateParams = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete('page');
      router.push(`/products?${params.toString()}`);
    },
    [router, searchParams],
  );

  const toggleArrayParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      const current = params.get(key)?.split(',').filter(Boolean) ?? [];
      const updated = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      if (updated.length > 0) {
        params.set(key, updated.join(','));
      } else {
        params.delete(key);
      }
      params.delete('page');
      router.push(`/products?${params.toString()}`);
    },
    [router, searchParams],
  );

  const clearAll = useCallback(() => {
    router.push('/products');
  }, [router]);

  const hasFilters =
    currentCategory || currentBrand || currentSizes.length > 0 || currentColors.length > 0 || currentMinPrice || currentMaxPrice;

  return (
    <aside className="space-y-6">
      {hasFilters && (
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">필터</h3>
          <button
            onClick={clearAll}
            className="text-xs text-gray-500 hover:text-gray-900 underline"
          >
            초기화
          </button>
        </div>
      )}

      {/* Categories */}
      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-3">카테고리</h4>
        <ul className="space-y-1">
          <li>
            <button
              onClick={() => updateParams('category', null)}
              className={`block w-full text-left text-sm py-1.5 px-2 rounded ${
                !currentCategory ? 'bg-gray-100 font-medium text-gray-900' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              전체
            </button>
          </li>
          {categories.map((cat) => (
            <li key={cat.id}>
              <button
                onClick={() => updateParams('category', cat.slug)}
                className={`block w-full text-left text-sm py-1.5 px-2 rounded ${
                  currentCategory === cat.slug ? 'bg-gray-100 font-medium text-gray-900' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {cat.name}
              </button>
              {cat.children && cat.children.length > 0 && (
                <ul className="ml-3 mt-1 space-y-1">
                  {cat.children.map((child) => (
                    <li key={child.id}>
                      <button
                        onClick={() => updateParams('category', child.slug)}
                        className={`block w-full text-left text-sm py-1 px-2 rounded ${
                          currentCategory === child.slug ? 'bg-gray-100 font-medium text-gray-900' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                        }`}
                      >
                        {child.name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* Brands */}
      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-3">브랜드</h4>
        <ul className="space-y-1">
          <li>
            <button
              onClick={() => updateParams('brand', null)}
              className={`block w-full text-left text-sm py-1.5 px-2 rounded ${
                !currentBrand ? 'bg-gray-100 font-medium text-gray-900' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              전체
            </button>
          </li>
          {brands.map((brand) => (
            <li key={brand.id}>
              <button
                onClick={() => updateParams('brand', brand.slug)}
                className={`block w-full text-left text-sm py-1.5 px-2 rounded ${
                  currentBrand === brand.slug ? 'bg-gray-100 font-medium text-gray-900' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {brand.name}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Sizes */}
      {availableSizes.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-3">사이즈</h4>
          <div className="flex flex-wrap gap-2">
            {availableSizes.map((size) => (
              <button
                key={size}
                onClick={() => toggleArrayParam('sizes', size)}
                className={`px-3 py-1.5 text-xs rounded border ${
                  currentSizes.includes(size)
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'border-gray-300 text-gray-600 hover:border-gray-900'
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Colors */}
      {availableColors.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-3">컬러</h4>
          <div className="flex flex-wrap gap-2">
            {availableColors.map((color) => (
              <button
                key={color.name}
                onClick={() => toggleArrayParam('colors', color.name)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded border ${
                  currentColors.includes(color.name)
                    ? 'border-gray-900 bg-gray-50'
                    : 'border-gray-300 hover:border-gray-900'
                }`}
              >
                <span
                  className="w-3 h-3 rounded-full border border-gray-300"
                  style={{ backgroundColor: color.code ?? '#ccc' }}
                />
                {color.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Price Range */}
      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-3">가격대</h4>
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="최소"
            defaultValue={currentMinPrice}
            onBlur={(e) => updateParams('minPrice', e.target.value || null)}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
          />
          <span className="text-gray-400">~</span>
          <input
            type="number"
            placeholder="최대"
            defaultValue={currentMaxPrice}
            onBlur={(e) => updateParams('maxPrice', e.target.value || null)}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
          />
        </div>
      </div>
    </aside>
  );
}
