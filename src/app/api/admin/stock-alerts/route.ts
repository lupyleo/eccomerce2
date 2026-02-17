import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiHandler, successResponse } from '@/lib/api-handler';
import { requireAdmin } from '@/lib/auth-guard';

export const GET = apiHandler(async (req: NextRequest) => {
  await requireAdmin();

  const { searchParams } = new URL(req.url);
  const threshold = Math.max(0, Number(searchParams.get('threshold')) || 5);

  const lowStockVariants = await prisma.productVariant.findMany({
    where: {
      isActive: true,
      product: { status: 'ACTIVE' },
    },
    include: {
      product: { select: { id: true, name: true, slug: true } },
    },
  });

  const alerts = lowStockVariants
    .map((v) => ({
      variantId: v.id,
      sku: v.sku,
      size: v.size,
      color: v.color,
      stock: v.stock,
      reservedStock: v.reservedStock,
      availableStock: v.stock - v.reservedStock,
      product: v.product,
    }))
    .filter((v) => v.availableStock <= threshold)
    .sort((a, b) => a.availableStock - b.availableStock);

  return successResponse({
    threshold,
    totalAlerts: alerts.length,
    alerts,
  });
});
