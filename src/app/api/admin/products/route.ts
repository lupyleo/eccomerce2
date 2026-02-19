import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiHandler, successResponse, paginatedResponse } from '@/lib/api-handler';
import { requireAdmin } from '@/lib/auth-guard';
import { parsePaginationParams } from '@/lib/utils';
import { ProductService } from '@/application/product/product.service';
import { createProductSchema } from '@/application/product/product.dto';

export const GET = apiHandler(async (req: NextRequest) => {
  await requireAdmin();
  const { page, limit, skip } = parsePaginationParams(req.nextUrl.searchParams);
  const status = req.nextUrl.searchParams.get('status');
  const search = req.nextUrl.searchParams.get('search');
  const categoryId = req.nextUrl.searchParams.get('categoryId');

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (categoryId) where.categoryId = categoryId;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { slug: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        category: { select: { id: true, name: true } },
        brand: { select: { id: true, name: true } },
        variants: { select: { id: true, size: true, color: true, stock: true, reservedStock: true, price: true } },
        images: { where: { isPrimary: true }, take: 1, select: { url: true } },
        _count: { select: { reviews: true } },
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
    category: p.category,
    brand: p.brand,
    primaryImage: p.images[0]?.url ?? null,
    variantCount: p.variants.length,
    totalStock: p.variants.reduce((sum, v) => sum + v.stock, 0),
    reviewCount: p._count.reviews,
    salesCount: p.salesCount,
    createdAt: p.createdAt,
  }));

  return paginatedResponse(data, { page, limit, total });
});

export const POST = apiHandler(async (req: NextRequest) => {
  await requireAdmin();
  const body = await req.json();
  const dto = createProductSchema.parse(body);

  const productService = new ProductService(prisma);
  const product = await productService.createProduct(dto);

  return successResponse(product, 201);
});
