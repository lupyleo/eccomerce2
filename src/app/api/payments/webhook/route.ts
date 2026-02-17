import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { apiHandler, successResponse } from '@/lib/api-handler';
import { AppError } from '@/lib/errors';
import { PaymentGatewayFactory } from '@/infrastructure/payment/payment.factory';

const webhookSchema = z.object({
  provider: z.string(),
  event: z.enum(['payment.completed', 'payment.failed', 'payment.cancelled']),
  data: z.object({
    paymentId: z.string(),
    amount: z.number(),
    orderId: z.string().optional(),
  }).passthrough(),
});

export const POST = apiHandler(async (req: NextRequest) => {
  const body = await req.json();
  const payload = webhookSchema.parse(body);

  const gateway = PaymentGatewayFactory.create(payload.provider);
  const result = await gateway.handleWebhook(payload);

  if (!result.verified) {
    throw new AppError('WEBHOOK_VERIFICATION_FAILED', '웹훅 검증에 실패했습니다.', 400);
  }

  // Find payment by pgPaymentId
  const payment = await prisma.payment.findFirst({
    where: { pgPaymentId: result.paymentId },
    include: { order: true },
  });

  if (!payment) {
    throw new AppError('PAYMENT_NOT_FOUND', '결제 정보를 찾을 수 없습니다.', 404);
  }

  // Update payment and order based on webhook event
  switch (payload.event) {
    case 'payment.completed': {
      if (payment.status === 'PENDING') {
        await prisma.$transaction([
          prisma.payment.update({
            where: { id: payment.id },
            data: { status: 'COMPLETED', paidAt: new Date() },
          }),
          prisma.order.update({
            where: { id: payment.orderId },
            data: { status: 'PAID' },
          }),
        ]);
      }
      break;
    }
    case 'payment.failed': {
      if (payment.status === 'PENDING') {
        await prisma.$transaction([
          prisma.payment.update({
            where: { id: payment.id },
            data: { status: 'FAILED' },
          }),
          prisma.order.update({
            where: { id: payment.orderId },
            data: { status: 'CANCELLED' },
          }),
        ]);
      }
      break;
    }
    case 'payment.cancelled': {
      if (payment.status === 'COMPLETED') {
        await prisma.$transaction([
          prisma.payment.update({
            where: { id: payment.id },
            data: {
              status: 'CANCELLED',
              cancelledAmount: payment.amount,
              cancelledAt: new Date(),
            },
          }),
          prisma.order.update({
            where: { id: payment.orderId },
            data: { status: 'CANCELLED' },
          }),
        ]);
      }
      break;
    }
  }

  return successResponse({
    received: true,
    event: payload.event,
    paymentId: result.paymentId,
  });
});
