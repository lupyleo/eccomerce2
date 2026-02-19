import type { PrismaClient } from '@prisma/client';
import { NotFoundError, AppError } from '@/lib/errors';
import type { PaymentGateway } from '@/domain/payment/gateway';

export class PaymentService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly gateway: PaymentGateway,
  ) {}

  async refund(paymentId: string, amount: number, reason: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { order: true },
    });

    if (!payment) throw new NotFoundError('결제');

    if (payment.status !== 'COMPLETED' && payment.status !== 'PARTIALLY_CANCELLED') {
      throw new AppError('REFUND_NOT_ALLOWED', '환불할 수 없는 결제 상태입니다.');
    }

    const refundableAmount = Number(payment.amount) - Number(payment.cancelledAmount);
    if (amount > refundableAmount) {
      throw new AppError('REFUND_EXCEEDS', `환불 가능 금액(${refundableAmount}원)을 초과했습니다.`);
    }

    const cancelResult = await this.gateway.cancel({
      paymentId: payment.pgPaymentId!,
      amount,
      reason,
    });

    if (!cancelResult.success) {
      throw new AppError('REFUND_FAILED', '환불 처리에 실패했습니다.');
    }

    const newCancelledAmount = Number(payment.cancelledAmount) + amount;
    const isFullyRefunded = newCancelledAmount >= Number(payment.amount);

    await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: isFullyRefunded ? 'CANCELLED' : 'PARTIALLY_CANCELLED',
        cancelledAmount: newCancelledAmount,
        cancelledAt: new Date(),
      },
    });

    return {
      refundedAmount: amount,
      totalCancelledAmount: newCancelledAmount,
      remainingAmount: Number(payment.amount) - newCancelledAmount,
      isFullyRefunded,
    };
  }
}
