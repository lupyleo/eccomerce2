import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiHandler, paginatedResponse } from '@/lib/api-handler';
import { requireAdmin } from '@/lib/auth-guard';

export const GET = apiHandler(async (req: NextRequest) => {
  await requireAdmin();

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 20));
  const variantId = searchParams.get('variantId');
  const type = searchParams.get('type');

  const where = {
    ...(variantId ? { variantId } : {}),
    ...(type ? { type: type as 'INBOUND' | 'OUTBOUND' | 'RESERVE' | 'RELEASE' | 'ADJUSTMENT' } : {}),
  };

  const [logs, total] = await Promise.all([
    prisma.stockLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        variant: {
          select: {
            id: true,
            sku: true,
            size: true,
            color: true,
            stock: true,
            reservedStock: true,
            product: { select: { id: true, name: true } },
          },
        },
      },
    }),
    prisma.stockLog.count({ where }),
  ]);

  const data = logs.map((log) => ({
    id: log.id,
    type: log.type,
    quantity: log.quantity,
    reason: log.reason,
    referenceId: log.referenceId,
    createdAt: log.createdAt,
    variant: {
      id: log.variant.id,
      sku: log.variant.sku,
      size: log.variant.size,
      color: log.variant.color,
      currentStock: log.variant.stock,
      reservedStock: log.variant.reservedStock,
      productName: log.variant.product.name,
    },
  }));

  return paginatedResponse(data, { page, limit, total });
});
