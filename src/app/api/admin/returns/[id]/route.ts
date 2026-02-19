import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { apiHandler, successResponse } from '@/lib/api-handler';
import { requireAdmin } from '@/lib/auth-guard';
import { NotFoundError, AppError } from '@/lib/errors';
import { PaymentGatewayFactory } from '@/infrastructure/payment/payment.factory';
import { PaymentService } from '@/application/payment/payment.service';

const updateReturnSchema = z.object({
  status: z.enum(['APPROVED', 'COLLECTING', 'COLLECTED', 'COMPLETED', 'REJECTED']),
});

export const PUT = apiHandler(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json();
    const dto = updateReturnSchema.parse(body);

    const returnRecord = await prisma.return.findUnique({
      where: { id },
      include: {
        order: { include: { payment: true, items: true } },
        orderItem: true,
      },
    });

    if (!returnRecord) throw new NotFoundError('반품 신청');

    const validTransitions: Record<string, string[]> = {
      REQUESTED: ['APPROVED', 'REJECTED'],
      APPROVED: ['COLLECTING'],
      COLLECTING: ['COLLECTED'],
      COLLECTED: ['COMPLETED'],
    };

    const allowed = validTransitions[returnRecord.status];
    if (!allowed || !allowed.includes(dto.status)) {
      throw new AppError(
        'INVALID_RETURN_TRANSITION',
        `반품 상태를 ${returnRecord.status}에서 ${dto.status}(으)로 변경할 수 없습니다.`,
      );
    }

    const updated = await prisma.return.update({
      where: { id },
      data: { status: dto.status },
    });

    if (dto.status === 'COMPLETED' && returnRecord.order.payment) {
      const gateway = PaymentGatewayFactory.create();
      const paymentService = new PaymentService(prisma, gateway);
      await paymentService.refund(
        returnRecord.order.payment.id,
        Number(returnRecord.refundAmount),
        `반품 환불 - ${returnRecord.reason}`,
      );

      if (returnRecord.orderItem) {
        await prisma.productVariant.update({
          where: { id: returnRecord.orderItem.variantId },
          data: { stock: { increment: returnRecord.orderItem.quantity } },
        });

        await prisma.stockLog.create({
          data: {
            variantId: returnRecord.orderItem.variantId,
            type: 'INBOUND',
            quantity: returnRecord.orderItem.quantity,
            reason: '반품 재고 복구',
            referenceId: returnRecord.order.orderNumber,
          },
        });
      }
    }

    return successResponse({
      id: updated.id,
      status: updated.status,
      refundAmount: Number(updated.refundAmount),
    });
  },
);
