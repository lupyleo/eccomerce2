import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { successResponse } from '@/lib/api-handler';
import { requireAuth } from '@/lib/auth-guard';
import { AppError, NotFoundError } from '@/lib/errors';
import { PaymentGatewayFactory } from '@/infrastructure/payment/payment.factory';
import { PaymentService } from '@/application/payment/payment.service';

const cancelSchema = z.object({
  amount: z.number().positive().optional(),
  reason: z.string().min(1, '취소 사유를 입력해주세요.'),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const body = await req.json();
    const dto = cancelSchema.parse(body);

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        order: { select: { userId: true } },
      },
    });

    if (!payment || payment.order.userId !== session.user.id) {
      throw new NotFoundError('결제');
    }

    const refundAmount = dto.amount ?? Number(payment.amount) - Number(payment.cancelledAmount);

    const gateway = PaymentGatewayFactory.create();
    const paymentService = new PaymentService(prisma, gateway);
    const result = await paymentService.refund(id, refundAmount, dto.reason);

    return successResponse(result);
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
