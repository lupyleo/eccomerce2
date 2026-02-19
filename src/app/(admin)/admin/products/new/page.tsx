'use client';

import { useEffect, useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const createProductSchema = z.object({
  name: z.string().min(1, '상품명은 필수입니다.').max(200),
  slug: z.string().min(1, '슬러그는 필수입니다.').max(200).regex(/^[a-z0-9-]+$/, '슬러그는 소문자, 숫자, 하이픈만 사용 가능합니다.'),
  description: z.string().min(1, '상품 설명은 필수입니다.'),
  basePrice: z.coerce.number().min(0, '가격은 0 이상이어야 합니다.'),
  categoryId: z.string().uuid('카테고리를 선택해주세요.'),
  brandId: z.string().uuid().optional().or(z.literal('')),
  status: z.enum(['ACTIVE', 'SOLD_OUT', 'HIDDEN', 'DISCONTINUED']).optional(),
});

type FormData = {
  name: string;
  slug: string;
  description: string;
  basePrice: number;
  categoryId: string;
  brandId?: string;
  status?: 'ACTIVE' | 'SOLD_OUT' | 'HIDDEN' | 'DISCONTINUED';
};

interface Category {
  id: string;
  name: string;
  children: Category[];
}

interface Brand {
  id: string;
  name: string;
}

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: '판매중' },
  { value: 'SOLD_OUT', label: '품절' },
  { value: 'HIDDEN', label: '숨김' },
  { value: 'DISCONTINUED', label: '단종' },
];

function flattenCategories(categories: Category[], depth = 0): { id: string; name: string; label: string }[] {
  const result: { id: string; name: string; label: string }[] = [];
  for (const cat of categories) {
    result.push({ id: cat.id, name: cat.name, label: '\u00a0'.repeat(depth * 4) + cat.name });
    if (cat.children?.length) {
      result.push(...flattenCategories(cat.children, depth + 1));
    }
  }
  return result;
}

export default function AdminProductNewPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [submitError, setSubmitError] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(createProductSchema) as Resolver<FormData>,
    defaultValues: {
      status: 'ACTIVE',
    },
  });

  const nameValue = watch('name');

  useEffect(() => {
    Promise.all([
      fetch('/api/categories').then((r) => r.json()),
      fetch('/api/brands').then((r) => r.json()),
    ]).then(([catJson, brandJson]) => {
      if (catJson.success) setCategories(catJson.data);
      if (brandJson.success) setBrands(brandJson.data);
    });
  }, []);

  useEffect(() => {
    if (nameValue) {
      const slug = nameValue
        .toLowerCase()
        .replace(/[^a-z0-9가-힣\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
      setValue('slug', slug);
    }
  }, [nameValue, setValue]);

  const onSubmit = async (data: FormData) => {
    setSubmitError('');
    try {
      const payload: Record<string, unknown> = {
        name: data.name,
        slug: data.slug,
        description: data.description,
        basePrice: data.basePrice,
        categoryId: data.categoryId,
        status: data.status ?? 'ACTIVE',
      };
      if (data.brandId) payload.brandId = data.brandId;

      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message ?? '상품 등록에 실패했습니다.');
      }
      router.push('/admin/products');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : '상품 등록에 실패했습니다.');
    }
  };

  const flatCategories = flattenCategories(categories);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">상품 등록</h1>
        <Link
          href="/admin/products"
          className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50"
        >
          목록으로
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow p-6 max-w-2xl">
        {submitError && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
            {submitError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-1">
              상품명 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              {...register('name')}
              placeholder="상품명을 입력하세요"
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              슬러그 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              {...register('slug')}
              placeholder="url-friendly-slug"
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.slug && <p className="mt-1 text-sm text-red-600">{errors.slug.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              상품 설명 <span className="text-red-500">*</span>
            </label>
            <textarea
              {...register('description')}
              rows={4}
              placeholder="상품 설명을 입력하세요"
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
              placeholder="0"
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
            {errors.brandId && (
              <p className="mt-1 text-sm text-red-600">{errors.brandId.message}</p>
            )}
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

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? '등록 중...' : '상품 등록'}
            </button>
            <Link
              href="/admin/products"
              className="px-6 py-2 border rounded-lg text-sm hover:bg-gray-50"
            >
              취소
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
