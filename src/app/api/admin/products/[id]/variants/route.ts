import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiHandler, successResponse } from '@/lib/api-handler';
import { requireAdmin } from '@/lib/auth-guard';
import { ProductService } from '@/application/product/product.service';
import { createVariantSchema } from '@/application/product/product.dto';

export const POST = apiHandler(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json();
    const dto = createVariantSchema.parse(body);

    const productService = new ProductService(prisma);
    const variant = await productService.addVariant(id, dto);

    return successResponse(variant, 201);
  },
);
