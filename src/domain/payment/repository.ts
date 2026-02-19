import type { PaymentEntity } from './entities';

export interface PaymentRepository {
  findById(id: string): Promise<PaymentEntity | null>;
  findByOrderId(orderId: string): Promise<PaymentEntity | null>;
  findByPgPaymentId(pgPaymentId: string): Promise<PaymentEntity | null>;
  updateStatus(id: string, data: Partial<PaymentEntity>): Promise<PaymentEntity>;
}
