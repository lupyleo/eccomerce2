import { randomUUID } from 'crypto';
import type {
  PaymentGateway,
  ChargeRequest,
  ChargeResult,
  CancelRequest,
  CancelResult,
  VerifyResult,
  WebhookPayload,
  WebhookResult,
} from '@/domain/payment/gateway';

export class MockPaymentGateway implements PaymentGateway {
  readonly provider = 'mock';

  async charge(request: ChargeRequest): Promise<ChargeResult> {
    // Simulate failure: amounts ending in 99 fail
    if (request.amount % 100 === 99) {
      return {
        success: false,
        paymentId: `mock_${randomUUID()}`,
        status: 'failed',
        failReason: 'Mock: 결제 실패 시뮬레이션 (금액 끝자리 99)',
        rawResponse: { simulated: true, reason: 'amount_ends_in_99' },
      };
    }

    const paymentId = `mock_${Date.now()}_${randomUUID().slice(0, 8)}`;
    return {
      success: true,
      paymentId,
      status: 'completed',
      paidAt: new Date(),
      rawResponse: {
        provider: 'mock',
        paymentId,
        amount: request.amount,
        method: request.method,
        simulated: true,
      },
    };
  }

  async cancel(request: CancelRequest): Promise<CancelResult> {
    return {
      success: true,
      cancelledAmount: request.amount ?? 0,
      remainingAmount: 0,
      cancelledAt: new Date(),
      rawResponse: { simulated: true, reason: request.reason },
    };
  }

  async verify(_paymentId: string): Promise<VerifyResult> {
    return {
      success: true,
      status: 'COMPLETED',
      amount: 0,
      paidAt: new Date(),
    };
  }

  async handleWebhook(payload: WebhookPayload): Promise<WebhookResult> {
    return {
      verified: true,
      paymentId: payload.data.paymentId as string,
      status: 'COMPLETED',
      amount: payload.data.amount as number,
    };
  }
}
