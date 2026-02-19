import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiHandler, successResponse } from '@/lib/api-handler';
import { requireAuth } from '@/lib/auth-guard';
import { NotFoundError } from '@/lib/errors';

export const GET = apiHandler(
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireAuth();
    const { id } = await params;

    const returnRecord = await prisma.return.findUnique({
      where: { id },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            userId: true,
            finalAmount: true,
          },
        },
        orderItem: {
          select: {
            id: true,
            productName: true,
            variantInfo: true,
            price: true,
            quantity: true,
            subtotal: true,
          },
        },
      },
    });

    if (!returnRecord || returnRecord.order.userId !== session.user.id) {
      throw new NotFoundError('반품 신청');
    }

    return successResponse({
      id: returnRecord.id,
      order: {
        id: returnRecord.order.id,
        orderNumber: returnRecord.order.orderNumber,
      },
      orderItem: returnRecord.orderItem,
      reason: returnRecord.reason,
      reasonDetail: returnRecord.reasonDetail,
      status: returnRecord.status,
      refundAmount: Number(returnRecord.refundAmount),
      images: returnRecord.images,
      createdAt: returnRecord.createdAt,
      updatedAt: returnRecord.updatedAt,
    });
  },
);
