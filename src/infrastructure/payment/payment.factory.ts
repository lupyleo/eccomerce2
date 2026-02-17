import type { PaymentGateway } from '@/domain/payment/gateway';
import { MockPaymentGateway } from './mock-payment.gateway';

export class PaymentGatewayFactory {
  static create(provider?: string): PaymentGateway {
    const selected = provider ?? process.env.PAYMENT_PROVIDER ?? 'mock';

    switch (selected) {
      case 'mock':
        return new MockPaymentGateway();
      // Future implementations:
      // case 'toss':
      //   return new TossPaymentGateway();
      // case 'inicis':
      //   return new InicisPaymentGateway();
      default:
        throw new Error(`Unknown payment provider: ${selected}`);
    }
  }
}
