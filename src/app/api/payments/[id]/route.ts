import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse } from '@/lib/api-handler';
import { requireAuth } from '@/lib/auth-guard';
import { AppError, NotFoundError } from '@/lib/errors';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            userId: true,
            totalAmount: true,
            discountAmount: true,
            shippingFee: true,
            finalAmount: true,
          },
        },
      },
    });

    if (!payment || payment.order.userId !== session.user.id) {
      throw new NotFoundError('결제');
    }

    return successResponse({
      id: payment.id,
      method: payment.method,
      status: payment.status,
      amount: Number(payment.amount),
      cancelledAmount: Number(payment.cancelledAmount),
      pgProvider: payment.pgProvider,
      pgPaymentId: payment.pgPaymentId,
      paidAt: payment.paidAt,
      cancelledAt: payment.cancelledAt,
      createdAt: payment.createdAt,
      order: {
        id: payment.order.id,
        orderNumber: payment.order.orderNumber,
        status: payment.order.status,
        totalAmount: Number(payment.order.totalAmount),
        discountAmount: Number(payment.order.discountAmount),
        shippingFee: Number(payment.order.shippingFee),
        finalAmount: Number(payment.order.finalAmount),
      },
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
