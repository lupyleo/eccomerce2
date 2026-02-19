import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { apiHandler, successResponse, paginatedResponse } from '@/lib/api-handler';
import { requireAuth } from '@/lib/auth-guard';
import { parsePaginationParams } from '@/lib/utils';
import { NotFoundError, AppError } from '@/lib/errors';

const createReturnSchema = z.object({
  orderId: z.string().uuid(),
  orderItemId: z.string().uuid().optional(),
  reason: z.enum(['CHANGE_MIND', 'DEFECTIVE', 'WRONG_ITEM', 'OTHER']),
  reasonDetail: z.string().max(500).optional(),
  images: z.array(z.string().url()).max(5).optional(),
});

export const POST = apiHandler(async (req: NextRequest) => {
  const session = await requireAuth();
  const body = await req.json();
  const dto = createReturnSchema.parse(body);

  const order = await prisma.order.findUnique({
    where: { id: dto.orderId },
    include: { items: true, payment: true },
  });

  if (!order || order.userId !== session.user.id) {
    throw new NotFoundError('주문');
  }

  if (order.status !== 'DELIVERED' && order.status !== 'CONFIRMED') {
    throw new AppError('RETURN_NOT_ALLOWED', '배송 완료 또는 구매 확정된 주문만 반품 신청이 가능합니다.');
  }

  let refundAmount: number;

  if (dto.orderItemId) {
    const orderItem = order.items.find((item) => item.id === dto.orderItemId);
    if (!orderItem) throw new NotFoundError('주문 상품');
    refundAmount = Number(orderItem.subtotal);
  } else {
    refundAmount = Number(order.finalAmount);
  }

  const existingReturn = await prisma.return.findFirst({
    where: {
      orderId: dto.orderId,
      orderItemId: dto.orderItemId ?? null,
      status: { notIn: ['REJECTED', 'COMPLETED'] },
    },
  });

  if (existingReturn) {
    throw new AppError('RETURN_ALREADY_EXISTS', '이미 반품 신청이 진행 중입니다.');
  }

  const returnRecord = await prisma.return.create({
    data: {
      orderId: dto.orderId,
      orderItemId: dto.orderItemId,
      reason: dto.reason,
      reasonDetail: dto.reasonDetail,
      refundAmount,
      images: dto.images ?? [],
    },
    include: {
      order: { select: { orderNumber: true } },
      orderItem: { select: { productName: true, variantInfo: true } },
    },
  });

  return successResponse(returnRecord, 201);
});

export const GET = apiHandler(async (req: NextRequest) => {
  const session = await requireAuth();
  const { page, limit, skip } = parsePaginationParams(req.nextUrl.searchParams);

  const where = {
    order: { userId: session.user.id },
  };

  const [returns, total] = await Promise.all([
    prisma.return.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        order: { select: { id: true, orderNumber: true } },
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
