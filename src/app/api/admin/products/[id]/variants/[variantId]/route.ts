import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiHandler, successResponse } from '@/lib/api-handler';
import { requireAdmin } from '@/lib/auth-guard';
import { ProductService } from '@/application/product/product.service';
import { updateVariantSchema } from '@/application/product/product.dto';

export const PUT = apiHandler(
  async (
    req: NextRequest,
    { params }: { params: Promise<{ id: string; variantId: string }> },
  ) => {
    await requireAdmin();
    const { variantId } = await params;
    const body = await req.json();
    const dto = updateVariantSchema.parse(body);

    const productService = new ProductService(prisma);
    const variant = await productService.updateVariant(variantId, dto);

    return successResponse(variant);
  },
);

export const DELETE = apiHandler(
  async (
    _req: NextRequest,
    { params }: { params: Promise<{ id: string; variantId: string }> },
  ) => {
    await requireAdmin();
    const { variantId } = await params;

    const productService = new ProductService(prisma);
    await productService.deleteVariant(variantId);

    return successResponse({ deleted: true });
  },
);
