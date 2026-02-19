import type { PrismaClient, Prisma } from '@prisma/client';
import type { PaymentRepository } from '@/domain/payment/repository';
import type { PaymentEntity } from '@/domain/payment/entities';

export class PrismaPaymentRepository implements PaymentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<PaymentEntity | null> {
    const payment = await this.prisma.payment.findUnique({ where: { id } });
    return payment ? this.toEntity(payment) : null;
  }

  async findByOrderId(orderId: string): Promise<PaymentEntity | null> {
    const payment = await this.prisma.payment.findUnique({ where: { orderId } });
    return payment ? this.toEntity(payment) : null;
  }

  async findByPgPaymentId(pgPaymentId: string): Promise<PaymentEntity | null> {
    const payment = await this.prisma.payment.findFirst({ where: { pgPaymentId } });
    return payment ? this.toEntity(payment) : null;
  }

  async updateStatus(id: string, data: Partial<PaymentEntity>): Promise<PaymentEntity> {
    const updateData: Prisma.PaymentUpdateInput = {};
    if (data.status !== undefined) updateData.status = data.status;
    if (data.cancelledAmount !== undefined) updateData.cancelledAmount = data.cancelledAmount;
    if (data.cancelledAt !== undefined) updateData.cancelledAt = data.cancelledAt;

    const payment = await this.prisma.payment.update({ where: { id }, data: updateData });
    return this.toEntity(payment);
  }

  private toEntity(payment: {
    id: string;
    orderId: string;
    method: string;
    status: string;
    amount: Prisma.Decimal;
    cancelledAmount: Prisma.Decimal;
    pgProvider: string;
    pgPaymentId: string | null;
    pgResponse: Prisma.JsonValue;
    paidAt: Date | null;
    cancelledAt: Date | null;
    createdAt: Date;
  }): PaymentEntity {
    return {
      id: payment.id,
      orderId: payment.orderId,
      method: payment.method as PaymentEntity['method'],
      status: payment.status as PaymentEntity['status'],
      amount: Number(payment.amount),
      cancelledAmount: Number(payment.cancelledAmount),
      pgProvider: payment.pgProvider,
      pgPaymentId: payment.pgPaymentId,
      pgResponse: payment.pgResponse as Record<string, unknown> | null,
      paidAt: payment.paidAt,
      cancelledAt: payment.cancelledAt,
      createdAt: payment.createdAt,
    };
  }
}
