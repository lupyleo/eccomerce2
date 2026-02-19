import type { ProductStatus } from '@prisma/client';

export interface ProductEntity {
  id: string;
  name: string;
  slug: string;
  description: string;
  basePrice: number;
  categoryId: string;
  brandId: string | null;
  status: ProductStatus;
  avgRating: number;
  reviewCount: number;
  salesCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductVariantEntity {
  id: string;
  productId: string;
  sku: string;
  size: string;
  color: string;
  colorCode: string | null;
  price: number;
  stock: number;
  reservedStock: number;
  isActive: boolean;
}

export interface ProductImageEntity {
  id: string;
  productId: string;
  url: string;
  alt: string | null;
  sortOrder: number;
  isPrimary: boolean;
}

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s가-힣-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

export function generateSku(
  brandSlug: string,
  productSlug: string,
  size: string,
  color: string,
): string {
  const brand = brandSlug.slice(0, 3).toUpperCase();
  const product = productSlug.slice(0, 5).toUpperCase();
  const s = size.toUpperCase();
  const c = color.slice(0, 3).toUpperCase();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${brand}-${product}-${s}-${c}-${random}`;
}
