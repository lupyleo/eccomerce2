import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { apiHandler, successResponse } from '@/lib/api-handler';
import { requireAdmin } from '@/lib/auth-guard';
import { NotFoundError } from '@/lib/errors';

const adjustStockSchema = z.object({
  variantId: z.string().uuid(),
  quantity: z.number().int(),
  reason: z.string().min(1, '사유는 필수입니다.'),
  type: z.enum(['INBOUND', 'OUTBOUND', 'ADJUSTMENT']),
});

export const POST = apiHandler(async (req: NextRequest) => {
  await requireAdmin();
  const body = await req.json();
  const dto = adjustStockSchema.parse(body);

  const variant = await prisma.productVariant.findUnique({
    where: { id: dto.variantId },
    include: { product: { select: { name: true } } },
  });

  if (!variant) throw new NotFoundError('상품 옵션');

  const stockChange = dto.type === 'OUTBOUND' ? -Math.abs(dto.quantity) : dto.quantity;

  await prisma.$transaction(async (tx) => {
    await tx.productVariant.update({
      where: { id: dto.variantId },
      data: { stock: { increment: stockChange } },
    });

    await tx.stockLog.create({
      data: {
        variantId: dto.variantId,
        type: dto.type,
        quantity: stockChange,
        reason: dto.reason,
      },
    });

    if (dto.type === 'INBOUND') {
      const updatedVariant = await tx.productVariant.findUnique({
        where: { id: dto.variantId },
        include: { product: true },
      });

      if (updatedVariant && updatedVariant.product.status === 'SOLD_OUT') {
        const allVariants = await tx.productVariant.findMany({
          where: { productId: updatedVariant.productId },
        });
        const hasStock = allVariants.some((v) => v.stock - v.reservedStock > 0);
        if (hasStock) {
          await tx.product.update({
            where: { id: updatedVariant.productId },
            data: { status: 'ACTIVE' },
          });
        }
      }
    }
  });

  return successResponse({
    variantId: dto.variantId,
    productName: variant.product.name,
    sku: variant.sku,
    adjustment: stockChange,
    type: dto.type,
    reason: dto.reason,
  });
});
