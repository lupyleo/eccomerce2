import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import ProductDetailClient from './ProductDetailClient';

interface ProductDetailPageProps {
  params: Promise<{ slug: string }>;
}

async function getProduct(slug: string) {
  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
          parent: { select: { id: true, name: true, slug: true } },
        },
      },
      brand: {
        select: { id: true, name: true, slug: true, logoUrl: true },
      },
      images: {
        orderBy: { sortOrder: 'asc' },
        select: { id: true, url: true, alt: true, sortOrder: true, isPrimary: true },
      },
      variants: {
        where: { isActive: true },
        orderBy: [{ color: 'asc' }, { size: 'asc' }],
        select: {
          id: true,
          sku: true,
          size: true,
          color: true,
          colorCode: true,
          price: true,
          stock: true,
          reservedStock: true,
          isActive: true,
        },
      },
    },
  });

  if (!product || product.status === 'HIDDEN') return null;

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    basePrice: Number(product.basePrice),
    status: product.status,
    category: product.category,
    brand: product.brand,
    images: product.images,
    variants: product.variants.map((v) => ({
      id: v.id,
      sku: v.sku,
      size: v.size,
      color: v.color,
      colorCode: v.colorCode,
      price: Number(v.price),
      availableStock: v.stock - v.reservedStock,
      isActive: v.isActive,
    })),
    avgRating: Number(product.avgRating),
    reviewCount: product.reviewCount,
    salesCount: product.salesCount,
  };
}

export async function generateMetadata({ params }: ProductDetailPageProps) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return { title: '상품을 찾을 수 없습니다' };
  return {
    title: `${product.name} - SHOP`,
    description: product.description.slice(0, 160),
  };
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) notFound();

  // Build breadcrumb
  const breadcrumb = [];
  if (product.category.parent) {
    breadcrumb.push(product.category.parent);
  }
  breadcrumb.push({ id: product.category.id, name: product.category.name, slug: product.category.slug });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-8">
        <Link href="/" className="hover:text-gray-900">홈</Link>
        {breadcrumb.map((item) => (
          <span key={item.id} className="flex items-center gap-2">
            <span>/</span>
            <Link href={`/products?category=${item.slug}`} className="hover:text-gray-900">
              {item.name}
            </Link>
          </span>
        ))}
        <span>/</span>
        <span className="text-gray-900">{product.name}</span>
      </nav>

      <ProductDetailClient product={product} />
    </div>
  );
}
