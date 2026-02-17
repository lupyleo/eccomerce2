import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiHandler, paginatedResponse } from '@/lib/api-handler';
import { parsePaginationParams } from '@/lib/utils';
import type { Prisma } from '@prisma/client';

export const GET = apiHandler(async (req: NextRequest) => {
  const searchParams = req.nextUrl.searchParams;
  const { page, limit, skip } = parsePaginationParams(searchParams);

  const category = searchParams.get('category');
  const brand = searchParams.get('brand');
  const minPrice = searchParams.get('minPrice');
  const maxPrice = searchParams.get('maxPrice');
  const sizes = searchParams.get('sizes');
  const colors = searchParams.get('colors');
  const search = searchParams.get('search');
  const sort = searchParams.get('sort') ?? 'newest';

  const where: Prisma.ProductWhereInput = {
    status: 'ACTIVE',
    ...(category && { category: { slug: category } }),
    ...(brand && { brand: { slug: brand } }),
    ...(minPrice && { basePrice: { gte: Number(minPrice) } }),
    ...(maxPrice && { basePrice: { lte: Number(maxPrice) } }),
    ...(sizes && {
      variants: {
        some: {
          size: { in: sizes.split(',') },
          isActive: true,
        },
      },
    }),
    ...(colors && {
      variants: {
        some: {
          color: { in: colors.split(',') },
          isActive: true,
        },
      },
    }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
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
    }),
    prisma.product.count({ where }),
  ]);

  const data = products.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    basePrice: Number(p.basePrice),
    status: p.status,
    primaryImage: p.images[0] ?? null,
    avgRating: Number(p.avgRating),
    reviewCount: p.reviewCount,
    category: p.category,
    brand: p.brand,
    availableSizes: [...new Set(p.variants.map((v) => v.size))],
    availableColors: [
      ...new Map(
        p.variants.map((v) => [v.color, { name: v.color, code: v.colorCode }]),
      ).values(),
    ],
  }));

  return paginatedResponse(data, { page, limit, total });
});
