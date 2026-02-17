import type { PaymentMethod, PaymentStatus } from '@prisma/client';

export interface ChargeRequest {
  orderId: string;
  orderNumber: string;
  amount: number;
  method: PaymentMethod;
  customerEmail: string;
  customerName: string;
  orderName: string;
}

export interface ChargeResult {
  success: boolean;
  paymentId: string;
  status: 'completed' | 'failed';
  paidAt?: Date;
  failReason?: string;
  rawResponse: Record<string, unknown>;
}

export interface CancelRequest {
  paymentId: string;
  amount?: number;
  reason: string;
}

export interface CancelResult {
  success: boolean;
  cancelledAmount: number;
  remainingAmount: number;
  cancelledAt?: Date;
  rawResponse: Record<string, unknown>;
}

export interface VerifyResult {
  success: boolean;
  status: PaymentStatus;
  amount: number;
  paidAt?: Date;
}

export interface WebhookPayload {
  provider: string;
  event: string;
  data: Record<string, unknown>;
}

export interface WebhookResult {
  verified: boolean;
  paymentId: string;
  status: PaymentStatus;
  amount: number;
}

export interface PaymentGateway {
  readonly provider: string;

  charge(request: ChargeRequest): Promise<ChargeResult>;
  cancel(request: CancelRequest): Promise<CancelResult>;
  verify(paymentId: string): Promise<VerifyResult>;
  handleWebhook(payload: WebhookPayload): Promise<WebhookResult>;
}
