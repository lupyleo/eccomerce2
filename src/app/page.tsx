import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import ProductCard from '@/components/product/ProductCard';

async function getFeaturedProducts() {
  const products = await prisma.product.findMany({
    where: { status: 'ACTIVE' },
    orderBy: { salesCount: 'desc' },
    take: 8,
    include: {
      category: { select: { id: true, name: true } },
      brand: { select: { id: true, name: true } },
      images: {
        where: { isPrimary: true },
        take: 1,
        select: { url: true, alt: true },
      },
      variants: {
        where: { isActive: true },
        select: { size: true, color: true, colorCode: true },
      },
    },
  });

  return products.map((p) => ({
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
  }));
}

async function getCategories() {
  return prisma.category.findMany({
    where: { isActive: true, depth: 0 },
    orderBy: { sortOrder: 'asc' },
    select: { id: true, name: true, slug: true },
  });
}

async function getNewProducts() {
  const products = await prisma.product.findMany({
    where: { status: 'ACTIVE' },
    orderBy: { createdAt: 'desc' },
    take: 4,
    include: {
      category: { select: { id: true, name: true } },
      brand: { select: { id: true, name: true } },
      images: {
        where: { isPrimary: true },
        take: 1,
        select: { url: true, alt: true },
      },
      variants: {
        where: { isActive: true },
        select: { size: true, color: true, colorCode: true },
      },
    },
  });

  return products.map((p) => ({
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
  }));
}

export default async function HomePage() {
  const [featuredProducts, categories, newProducts] = await Promise.all([
    getFeaturedProducts(),
    getCategories(),
    getNewProducts(),
  ]);

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
            2026 S/S Collection
          </h2>
          <p className="text-lg text-gray-300 mb-8 max-w-2xl mx-auto">
            새로운 시즌, 새로운 스타일. 트렌디한 의류를 합리적인 가격에 만나보세요.
          </p>
          <Link
            href="/products"
            className="inline-block bg-white text-gray-900 px-8 py-3 rounded-full font-medium hover:bg-gray-100 transition-colors"
          >
            쇼핑하기
          </Link>
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">카테고리</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/products?category=${category.slug}`}
              className="group relative bg-gray-100 rounded-xl overflow-hidden aspect-[4/3] flex items-center justify-center hover:bg-gray-200 transition-colors"
            >
              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-900 group-hover:text-gray-700 transition-colors">
                  {category.name}
                </h3>
                <p className="text-sm text-gray-500 mt-2">바로가기 &rarr;</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Products */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-gray-900">인기 상품</h2>
          <Link href="/products?sort=popular" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
            더보기 &rarr;
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
          {featuredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* New Arrivals */}
      <section className="bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-gray-900">신상품</h2>
            <Link href="/products?sort=newest" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
              더보기 &rarr;
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {newProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* Promo Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-gray-900 rounded-2xl p-8 sm:p-12 text-center text-white">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">신규 회원 10% 할인</h2>
          <p className="text-gray-300 mb-6">
            쿠폰코드: <span className="font-mono font-bold text-white">WELCOME10</span>
          </p>
          <Link
            href="/auth/signup"
            className="inline-block bg-white text-gray-900 px-8 py-3 rounded-full font-medium hover:bg-gray-100 transition-colors"
          >
            회원가입
          </Link>
        </div>
      </section>
    </div>
  );
}
