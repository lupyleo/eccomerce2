import type { PaymentMethod, PaymentStatus } from '@prisma/client';

export interface PaymentEntity {
  id: string;
  orderId: string;
  method: PaymentMethod;
  status: PaymentStatus;
  amount: number;
  cancelledAmount: number;
  pgProvider: string;
  pgPaymentId: string | null;
  pgResponse: Record<string, unknown> | null;
  paidAt: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
}

export interface RefundInfo {
  paymentId: string;
  refundAmount: number;
  reason: string;
}
