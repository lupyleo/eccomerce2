import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiHandler, successResponse } from '@/lib/api-handler';
import { requireAdmin } from '@/lib/auth-guard';
import { NotFoundError } from '@/lib/errors';
import { ProductService } from '@/application/product/product.service';
import { updateProductSchema } from '@/application/product/product.dto';

export const GET = apiHandler(
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    await requireAdmin();
    const { id } = await params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true } },
        brand: { select: { id: true, name: true } },
        variants: {
          orderBy: [{ size: 'asc' }, { color: 'asc' }],
        },
        images: { orderBy: { sortOrder: 'asc' } },
        _count: { select: { reviews: true, wishlists: true } },
      },
    });

    if (!product) throw new NotFoundError('상품');

    return successResponse({
      ...product,
      basePrice: Number(product.basePrice),
      avgRating: Number(product.avgRating),
      variants: product.variants.map((v) => ({
        ...v,
        price: Number(v.price),
      })),
    });
  },
);

export const PUT = apiHandler(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json();
    const dto = updateProductSchema.parse(body);

    const productService = new ProductService(prisma);
    const product = await productService.updateProduct(id, dto);

    return successResponse(product);
  },
);

export const DELETE = apiHandler(
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    await requireAdmin();
    const { id } = await params;

    const productService = new ProductService(prisma);
    await productService.deleteProduct(id);

    return successResponse({ deleted: true });
  },
);
