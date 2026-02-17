import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse } from '@/lib/api-handler';
import { requireAuth } from '@/lib/auth-guard';
import { AppError, NotFoundError } from '@/lib/errors';
import { OrderStateMachine } from '@/domain/order/state-machine';
import { PaymentGatewayFactory } from '@/infrastructure/payment/payment.factory';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id },
        include: { payment: true, items: true },
      });

      if (!order || order.userId !== session.user.id) {
        throw new NotFoundError('주문');
      }

      if (!OrderStateMachine.isCancellable(order.status)) {
        throw new AppError('CANCEL_NOT_ALLOWED', '취소할 수 없는 주문 상태입니다.');
      }

      if (order.payment && order.payment.status === 'COMPLETED') {
        const gateway = PaymentGatewayFactory.create();
        await gateway.cancel({
          paymentId: order.payment.pgPaymentId!,
          reason: '고객 주문 취소',
        });

        await tx.payment.update({
          where: { id: order.payment.id },
          data: {
            status: 'CANCELLED',
            cancelledAmount: order.payment.amount,
            cancelledAt: new Date(),
          },
        });
      }

      for (const item of order.items) {
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stock: { increment: item.quantity } },
        });

        await tx.stockLog.create({
          data: {
            variantId: item.variantId,
            type: 'RELEASE',
            quantity: item.quantity,
            reason: '주문 취소 재고 복구',
            referenceId: order.orderNumber,
          },
        });
      }

      return tx.order.update({
        where: { id },
        data: { status: 'CANCELLED' },
      });
    });

    return successResponse({
      id: result.id,
      orderNumber: result.orderNumber,
      status: result.status,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { success: false, error: { code: error.code, message: error.message } },
        { status: error.statusCode },
      );
    }
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다.' } },
      { status: 500 },
    );
  }
}
