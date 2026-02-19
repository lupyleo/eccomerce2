'use client';

import { useEffect, useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

const updateProductSchema = z.object({
  name: z.string().min(1, '상품명은 필수입니다.').max(200),
  description: z.string().min(1, '상품 설명은 필수입니다.'),
  basePrice: z.coerce.number().min(0, '가격은 0 이상이어야 합니다.'),
  categoryId: z.string().uuid('카테고리를 선택해주세요.'),
  brandId: z.string().optional(),
  status: z.enum(['ACTIVE', 'SOLD_OUT', 'HIDDEN', 'DISCONTINUED']),
});

type ProductFormData = {
  name: string;
  description: string;
  basePrice: number;
  categoryId: string;
  brandId?: string;
  status: 'ACTIVE' | 'SOLD_OUT' | 'HIDDEN' | 'DISCONTINUED';
};

const addVariantSchema = z.object({
  size: z.string().min(1, '사이즈는 필수입니다.'),
  color: z.string().min(1, '색상은 필수입니다.'),
  colorCode: z.string().optional(),
  price: z.coerce.number().min(0, '가격은 0 이상이어야 합니다.'),
  stock: z.coerce.number().int().min(0, '재고는 0 이상이어야 합니다.'),
  sku: z.string().optional(),
});

type VariantFormData = {
  size: string;
  color: string;
  colorCode?: string;
  price: number;
  stock: number;
  sku?: string;
};

interface Variant {
  id: string;
  size: string;
  color: string;
  colorCode: string | null;
  price: number;
  stock: number;
  sku: string | null;
}

interface ProductImage {
  id: string;
  url: string;
  alt: string | null;
  isPrimary: boolean;
  sortOrder: number;
}

interface Category {
  id: string;
  name: string;
  children: Category[];
}

interface Brand {
  id: string;
  name: string;
}

interface ProductDetail {
  id: string;
  name: string;
  slug: string;
  description: string;
  basePrice: number;
  status: string;
  category: { id: string; name: string } | null;
  brand: { id: string; name: string } | null;
  variants: Variant[];
  images: ProductImage[];
}

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: '판매중' },
  { value: 'SOLD_OUT', label: '품절' },
  { value: 'HIDDEN', label: '숨김' },
  { value: 'DISCONTINUED', label: '단종' },
];

function flattenCategories(cats: Category[], depth = 0): { id: string; label: string }[] {
  const result: { id: string; label: string }[] = [];
  for (const cat of cats) {
    result.push({ id: cat.id, label: '\u00a0'.repeat(depth * 4) + cat.name });
    if (cat.children?.length) {
      result.push(...flattenCategories(cat.children, depth + 1));
    }
  }
  return result;
}

export default function AdminProductEditPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const [showAddVariant, setShowAddVariant] = useState(false);
  const [variantError, setVariantError] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageAlt, setImageAlt] = useState('');
  const [imageError, setImageError] = useState('');
  const [addingImage, setAddingImage] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormData>({
    resolver: zodResolver(updateProductSchema) as Resolver<ProductFormData>,
  });

  const {
    register: registerVariant,
    handleSubmit: handleVariantSubmit,
    reset: resetVariant,
    formState: { errors: variantErrors, isSubmitting: isVariantSubmitting },
  } = useForm<VariantFormData>({
    resolver: zodResolver(addVariantSchema) as Resolver<VariantFormData>,
  });

  const fetchProduct = async () => {
    const res = await fetch(`/api/admin/products/${productId}`);
    const json = await res.json();
    if (json.success) {
      const p = json.data;
      setProduct(p);
      reset({
        name: p.name,
        description: p.description,
        basePrice: p.basePrice,
        categoryId: p.category?.id ?? '',
        brandId: p.brand?.id ?? '',
        status: p.status,
      });
    }
  };

  useEffect(() => {
    Promise.all([
      fetchProduct(),
      fetch('/api/categories').then((r) => r.json()),
      fetch('/api/brands').then((r) => r.json()),
    ])
      .then(([, catJson, brandJson]) => {
        if (catJson.success) setCategories(catJson.data);
        if (brandJson.success) setBrands(brandJson.data);
      })
      .finally(() => setLoading(false));
  }, [productId]);

  const onSubmit = async (data: ProductFormData) => {
    setSubmitError('');
    setSubmitSuccess(false);
    try {
      const payload: Record<string, unknown> = {
        name: data.name,
        description: data.description,
        basePrice: data.basePrice,
        categoryId: data.categoryId,
        status: data.status,
        brandId: data.brandId || null,
      };
      const res = await fetch(`/api/admin/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? '수정에 실패했습니다.');
      setSubmitSuccess(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : '수정에 실패했습니다.');
    }
  };

  const onAddVariant = async (data: VariantFormData) => {
    setVariantError('');
    try {
      const res = await fetch(`/api/admin/products/${productId}/variants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? '옵션 추가에 실패했습니다.');
      resetVariant();
      setShowAddVariant(false);
      await fetchProduct();
    } catch (err) {
      setVariantError(err instanceof Error ? err.message : '옵션 추가에 실패했습니다.');
    }
  };

  const handleDeleteVariant = async (variantId: string) => {
    if (!confirm('이 옵션을 삭제하시겠습니까?')) return;
    const res = await fetch(`/api/admin/products/${productId}/variants/${variantId}`, {
      method: 'DELETE',
    });
    const json = await res.json();
    if (json.success) await fetchProduct();
    else alert(json.error?.message ?? '삭제 실패');
  };

  const handleAddImage = async () => {
    if (!imageUrl) return;
    setImageError('');
    setAddingImage(true);
    try {
      const res = await fetch(`/api/admin/products/${productId}/images`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: imageUrl, alt: imageAlt || undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? '이미지 추가 실패');
      setImageUrl('');
      setImageAlt('');
      await fetchProduct();
    } catch (err) {
      setImageError(err instanceof Error ? err.message : '이미지 추가 실패');
    } finally {
      setAddingImage(false);
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!confirm('이 이미지를 삭제하시겠습니까?')) return;
    const res = await fetch(`/api/admin/products/${productId}/images/${imageId}`, {
      method: 'DELETE',
    });
    const json = await res.json();
    if (json.success) await fetchProduct();
    else alert(json.error?.message ?? '삭제 실패');
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-500">로딩 중...</div>;
  }

  if (!product) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">상품을 찾을 수 없습니다.</p>
        <Link href="/admin/products" className="text-blue-600 hover:underline">
          목록으로
        </Link>
      </div>
    );
  }

  const flatCategories = flattenCategories(categories);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">상품 수정</h1>
        <Link href="/admin/products" className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">
          목록으로
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Info Form */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">기본 정보</h2>

          {submitSuccess && (
            <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg text-sm">
              상품이 수정되었습니다.
            </div>
          )}
          {submitError && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
              {submitError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                상품명 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...register('name')}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                상품 설명 <span className="text-red-500">*</span>
              </label>
              <textarea
                {...register('description')}
                rows={4}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                기본 가격 (원) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                {...register('basePrice')}
                min={0}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.basePrice && (
                <p className="mt-1 text-sm text-red-600">{errors.basePrice.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                카테고리 <span className="text-red-500">*</span>
              </label>
              <select
                {...register('categoryId')}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">카테고리 선택</option>
                {flatCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </select>
              {errors.categoryId && (
                <p className="mt-1 text-sm text-red-600">{errors.categoryId.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">브랜드</label>
              <select
                {...register('brandId')}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">브랜드 없음</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">상태</label>
              <select
                {...register('status')}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? '저장 중...' : '저장'}
            </button>
          </form>
        </div>

        <div className="space-y-6">
          {/* Variants Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">옵션 관리</h2>
              <button
                onClick={() => setShowAddVariant(!showAddVariant)}
                className="px-3 py-1.5 bg-gray-800 text-white rounded-lg text-sm hover:bg-gray-700"
              >
                옵션 추가
              </button>
            </div>

            {showAddVariant && (
              <form onSubmit={handleVariantSubmit(onAddVariant)} className="mb-4 p-4 bg-gray-50 rounded-lg space-y-3">
                <h3 className="text-sm font-medium">새 옵션 추가</h3>
                {variantError && (
                  <p className="text-sm text-red-600">{variantError}</p>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium mb-1">사이즈 *</label>
                    <input
                      type="text"
                      {...registerVariant('size')}
                      placeholder="S, M, L, XL"
                      className="w-full px-2 py-1.5 border rounded text-sm"
                    />
                    {variantErrors.size && (
                      <p className="text-xs text-red-600">{variantErrors.size.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">색상 *</label>
                    <input
                      type="text"
                      {...registerVariant('color')}
                      placeholder="블랙, 화이트"
                      className="w-full px-2 py-1.5 border rounded text-sm"
                    />
                    {variantErrors.color && (
                      <p className="text-xs text-red-600">{variantErrors.color.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">색상코드</label>
                    <input
                      type="text"
                      {...registerVariant('colorCode')}
                      placeholder="#000000"
                      className="w-full px-2 py-1.5 border rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">SKU</label>
                    <input
                      type="text"
                      {...registerVariant('sku')}
                      placeholder="SKU-001"
                      className="w-full px-2 py-1.5 border rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">가격 (원) *</label>
                    <input
                      type="number"
                      {...registerVariant('price')}
                      min={0}
                      className="w-full px-2 py-1.5 border rounded text-sm"
                    />
                    {variantErrors.price && (
                      <p className="text-xs text-red-600">{variantErrors.price.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">재고 *</label>
                    <input
                      type="number"
                      {...registerVariant('stock')}
                      min={0}
                      className="w-full px-2 py-1.5 border rounded text-sm"
                    />
                    {variantErrors.stock && (
                      <p className="text-xs text-red-600">{variantErrors.stock.message}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={isVariantSubmitting}
                    className="px-4 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isVariantSubmitting ? '추가 중...' : '추가'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowAddVariant(false); resetVariant(); }}
                    className="px-4 py-1.5 border rounded text-sm hover:bg-gray-50"
                  >
                    취소
                  </button>
                </div>
              </form>
            )}

            {product.variants.length === 0 ? (
              <p className="text-sm text-gray-400">등록된 옵션이 없습니다.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 text-gray-500">
                    <tr>
                      <th className="px-3 py-2 text-left">사이즈</th>
                      <th className="px-3 py-2 text-left">색상</th>
                      <th className="px-3 py-2 text-right">가격</th>
                      <th className="px-3 py-2 text-right">재고</th>
                      <th className="px-3 py-2 text-center">삭제</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {product.variants.map((v) => (
                      <tr key={v.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2">{v.size}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1">
                            {v.colorCode && (
                              <span
                                className="w-3 h-3 rounded-full border border-gray-200 inline-block"
                                style={{ backgroundColor: v.colorCode }}
                              />
                            )}
                            {v.color}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right">{v.price.toLocaleString()}원</td>
                        <td className="px-3 py-2 text-right">{v.stock}</td>
                        <td className="px-3 py-2 text-center">
                          <button
                            onClick={() => handleDeleteVariant(v.id)}
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
            )}
          </div>

          {/* Images Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">이미지 관리</h2>

            {imageError && (
              <p className="mb-2 text-sm text-red-600">{imageError}</p>
            )}

            <div className="mb-4 space-y-2">
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="이미지 URL"
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
              <input
                type="text"
                value={imageAlt}
                onChange={(e) => setImageAlt(e.target.value)}
                placeholder="이미지 설명 (선택)"
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
              <button
                onClick={handleAddImage}
                disabled={!imageUrl || addingImage}
                className="w-full py-2 bg-gray-800 text-white rounded-lg text-sm hover:bg-gray-700 disabled:opacity-50"
              >
                {addingImage ? '추가 중...' : '이미지 추가'}
              </button>
            </div>

            {product.images.length === 0 ? (
              <p className="text-sm text-gray-400">등록된 이미지가 없습니다.</p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {product.images.map((img) => (
                  <div key={img.id} className="relative group">
                    <div className="aspect-square bg-gray-100 rounded overflow-hidden relative">
                      <Image src={img.url} alt={img.alt ?? ''} fill className="object-cover" sizes="120px" />
                    </div>
                    {img.isPrimary && (
                      <span className="absolute top-1 left-1 px-1 py-0.5 bg-blue-600 text-white text-xs rounded">
                        대표
                      </span>
                    )}
                    <button
                      onClick={() => handleDeleteImage(img.id)}
                      className="absolute top-1 right-1 w-5 h-5 bg-red-600 text-white rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    >
                      x
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
