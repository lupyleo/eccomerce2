import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiHandler, paginatedResponse } from '@/lib/api-handler';
import { requireAdmin } from '@/lib/auth-guard';
import { parsePaginationParams } from '@/lib/utils';

export const GET = apiHandler(async (req: NextRequest) => {
  await requireAdmin();
  const { page, limit, skip } = parsePaginationParams(req.nextUrl.searchParams);
  const status = req.nextUrl.searchParams.get('status');

  const where: Record<string, unknown> = {};
  if (status) where.status = status;

  const [returns, total] = await Promise.all([
    prisma.return.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            user: { select: { id: true, name: true, email: true } },
          },
        },
        orderItem: { select: { productName: true, variantInfo: true, quantity: true } },
      },
    }),
    prisma.return.count({ where }),
  ]);

  const data = returns.map((r) => ({
    id: r.id,
    order: r.order,
    orderItem: r.orderItem,
    reason: r.reason,
    reasonDetail: r.reasonDetail,
    status: r.status,
    refundAmount: Number(r.refundAmount),
    images: r.images,
    createdAt: r.createdAt,
  }));

  return paginatedResponse(data, { page, limit, total });
});
