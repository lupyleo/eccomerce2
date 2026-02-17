import { Suspense } from 'react';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import ProductCard from '@/components/product/ProductCard';
import ProductFilters from '@/components/product/ProductFilters';
import SortSelector from '@/components/product/SortSelector';
import Pagination from '@/components/product/Pagination';
import type { Prisma } from '@prisma/client';

interface ProductsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

async function getFilterData() {
  const [categoriesRaw, brands, sizes, colors] = await Promise.all([
    prisma.category.findMany({
      where: { isActive: true },
      orderBy: [{ depth: 'asc' }, { sortOrder: 'asc' }],
      select: { id: true, name: true, slug: true, parentId: true, depth: true },
    }),
    prisma.brand.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, slug: true },
    }),
    prisma.productVariant.findMany({
      where: { isActive: true },
      select: { size: true },
      distinct: ['size'],
    }),
    prisma.productVariant.findMany({
      where: { isActive: true },
      select: { color: true, colorCode: true },
      distinct: ['color'],
    }),
  ]);

  // Build category tree
  type CategoryNode = (typeof categoriesRaw)[number] & { children: CategoryNode[] };
  const map = new Map<string, CategoryNode>();
  const roots: CategoryNode[] = [];
  for (const cat of categoriesRaw) {
    map.set(cat.id, { ...cat, children: [] });
  }
  for (const cat of categoriesRaw) {
    const node = map.get(cat.id)!;
    if (cat.parentId) {
      map.get(cat.parentId)?.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return {
    categories: roots,
    brands,
    availableSizes: sizes.map((s) => s.size),
    availableColors: colors.map((c) => ({ name: c.color, code: c.colorCode })),
  };
}

async function getProducts(params: Record<string, string | string[] | undefined>) {
  const page = Math.max(1, Number(params.page ?? 1));
  const limit = Math.min(100, Math.max(1, Number(params.limit ?? 20)));
  const skip = (page - 1) * limit;

  const category = typeof params.category === 'string' ? params.category : undefined;
  const brand = typeof params.brand === 'string' ? params.brand : undefined;
  const minPrice = typeof params.minPrice === 'string' ? params.minPrice : undefined;
  const maxPrice = typeof params.maxPrice === 'string' ? params.maxPrice : undefined;
  const sizes = typeof params.sizes === 'string' ? params.sizes : undefined;
  const colors = typeof params.colors === 'string' ? params.colors : undefined;
  const search = typeof params.search === 'string' ? params.search : undefined;
  const sort = typeof params.sort === 'string' ? params.sort : 'newest';

  const where: Prisma.ProductWhereInput = {
    status: 'ACTIVE',
    ...(category && {
      OR: [
        { category: { slug: category } },
        { category: { parent: { slug: category } } },
      ],
    }),
    ...(brand && { brand: { slug: brand } }),
    ...(minPrice && { basePrice: { gte: Number(minPrice) } }),
    ...(maxPrice && { basePrice: { ...((minPrice ? { gte: Number(minPrice) } : {}) as object), lte: Number(maxPrice) } }),
    ...(sizes && {
      variants: { some: { size: { in: sizes.split(',') }, isActive: true } },
    }),
    ...(colors && {
      variants: { some: { color: { in: colors.split(',') }, isActive: true } },
    }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' as const } },
        { description: { contains: search, mode: 'insensitive' as const } },
      ],
    }),
  };

  const orderBy: Prisma.ProductOrderByWithRelationInput = (() => {
    switch (sort) {
      case 'price_asc': return { basePrice: 'asc' as const };
      case 'price_desc': return { basePrice: 'desc' as const };
      case 'popular': return { salesCount: 'desc' as const };
      case 'rating': return { avgRating: 'desc' as const };
      default: return { createdAt: 'desc' as const };
    }
  })();

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: {
        category: { select: { id: true, name: true } },
        brand: { select: { id: true, name: true } },
        images: { where: { isPrimary: true }, take: 1, select: { url: true, alt: true } },
        variants: {
          where: { isActive: true },
          select: { size: true, color: true, colorCode: true },
        },
      },
    }),
    prisma.product.count({ where }),
  ]);

  return {
    products: products.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      basePrice: Number(p.basePrice),
      primaryImage: p.images[0] ?? null,
      avgRating: Number(p.avgRating),
      reviewCount: p.reviewCount,
      category: p.category,
      brand: p.brand,
      availableSizes: [...new Set(p.variants.map((v) => v.size))],
      availableColors: [
        ...new Map(
          p.variants.map((v) => [v.color, { name: v.color, code: v.colorCode }])
        ).values(),
      ],
    })),
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = await searchParams;
  const [filterData, productData] = await Promise.all([
    getFilterData(),
    getProducts(params),
  ]);

  const search = typeof params.search === 'string' ? params.search : undefined;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Search Bar */}
      <div className="mb-8">
        <form action="/products" method="GET" className="max-w-lg mx-auto">
          <div className="relative">
            <input
              type="text"
              name="search"
              defaultValue={search}
              placeholder="상품 검색..."
              className="w-full border border-gray-300 rounded-full px-5 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
            <button
              type="submit"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-900"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>
        </form>
      </div>

      <div className="flex gap-8">
        {/* Sidebar Filters */}
        <div className="hidden lg:block w-64 flex-shrink-0">
          <Suspense fallback={<div>Loading...</div>}>
            <ProductFilters {...filterData} />
          </Suspense>
        </div>

        {/* Product Grid */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-gray-500">
              {productData.total > 0
                ? `${productData.total}개의 상품`
                : '검색 결과가 없습니다.'}
            </p>
            <Suspense fallback={null}>
              <SortSelector />
            </Suspense>
          </div>

          {productData.products.length > 0 ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                {productData.products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {productData.totalPages > 1 && (
                <div className="mt-12">
                  <Suspense fallback={null}>
                    <Pagination
                      currentPage={productData.page}
                      totalPages={productData.totalPages}
                    />
                  </Suspense>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-24">
              <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <p className="text-gray-500 mb-2">조건에 맞는 상품이 없습니다.</p>
              <Link href="/products" className="text-sm text-gray-900 underline hover:no-underline">
                전체 상품 보기
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
