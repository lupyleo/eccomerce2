import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { successResponse } from '@/lib/api-handler';
import { requireAuth } from '@/lib/auth-guard';
import { AppError, NotFoundError } from '@/lib/errors';
import { PaymentGatewayFactory } from '@/infrastructure/payment/payment.factory';

const partialCancelSchema = z.object({
  orderItemIds: z.array(z.string().uuid()).min(1),
  reason: z.string().min(1).max(500),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const body = await req.json();
    const { orderItemIds, reason } = partialCancelSchema.parse(body);

    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id },
        include: { payment: true, items: true },
      });

      if (!order || order.userId !== session.user.id) {
        throw new NotFoundError('주문');
      }

      if (order.status !== 'PAID' && order.status !== 'PREPARING') {
        throw new AppError('PARTIAL_CANCEL_NOT_ALLOWED', '부분 취소가 불가능한 주문 상태입니다.');
      }

      // Validate requested items belong to this order
      const targetItems = order.items.filter((item) =>
        orderItemIds.includes(item.id),
      );
      if (targetItems.length !== orderItemIds.length) {
        throw new AppError('INVALID_ITEMS', '유효하지 않은 주문 항목입니다.');
      }

      // Cannot cancel all items via partial cancel
      if (targetItems.length === order.items.length) {
        throw new AppError('USE_FULL_CANCEL', '전체 취소는 주문 취소를 이용해주세요.');
      }

      // Calculate refund amount
      const refundAmount = targetItems.reduce(
        (sum, item) => sum + Number(item.subtotal),
        0,
      );

      // Process partial payment cancellation
      if (order.payment && order.payment.status === 'COMPLETED') {
        const gateway = PaymentGatewayFactory.create();
        const cancelResult = await gateway.cancel({
          paymentId: order.payment.pgPaymentId!,
          amount: refundAmount,
          reason,
        });

        if (!cancelResult.success) {
          throw new AppError('CANCEL_FAILED', '결제 부분 취소에 실패했습니다.');
        }

        const newCancelledAmount = Number(order.payment.cancelledAmount) + refundAmount;
        await tx.payment.update({
          where: { id: order.payment.id },
          data: {
            status: newCancelledAmount >= Number(order.payment.amount)
              ? 'CANCELLED'
              : 'PARTIALLY_CANCELLED',
            cancelledAmount: newCancelledAmount,
            cancelledAt: new Date(),
          },
        });
      }

      // Restore stock for cancelled items
      for (const item of targetItems) {
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stock: { increment: item.quantity } },
        });

        await tx.stockLog.create({
          data: {
            variantId: item.variantId,
            type: 'RELEASE',
            quantity: item.quantity,
            reason: `부분 취소: ${reason}`,
            referenceId: order.orderNumber,
          },
        });
      }

      // Delete cancelled order items
      await tx.orderItem.deleteMany({
        where: { id: { in: orderItemIds } },
      });

      // Recalculate order amounts
      const remainingItems = await tx.orderItem.findMany({
        where: { orderId: id },
      });
      const newTotalAmount = remainingItems.reduce(
        (sum, item) => sum + Number(item.subtotal),
        0,
      );
      const newFinalAmount = newTotalAmount - Number(order.discountAmount) + Number(order.shippingFee);

      return tx.order.update({
        where: { id },
        data: {
          totalAmount: newTotalAmount,
          finalAmount: Math.max(0, newFinalAmount),
        },
        include: { items: true, payment: true },
      });
    });

    return successResponse({
      id: result.id,
      orderNumber: result.orderNumber,
      status: result.status,
      totalAmount: Number(result.totalAmount),
      finalAmount: Number(result.finalAmount),
      payment: result.payment ? {
        status: result.payment.status,
        cancelledAmount: Number(result.payment.cancelledAmount),
      } : null,
      remainingItems: result.items.length,
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
