import type { OrderStatus } from '@prisma/client';
import { OrderStateTransitionError } from '@/lib/errors';

const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['PAID', 'CANCELLED'],
  PAID: ['PREPARING', 'CANCELLED'],
  PREPARING: ['SHIPPING', 'CANCELLED'],
  SHIPPING: ['DELIVERED'],
  DELIVERED: ['CONFIRMED'],
  CONFIRMED: [],
  CANCELLED: [],
};

export class OrderStateMachine {
  static canTransition(from: OrderStatus, to: OrderStatus): boolean {
    return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
  }

  static transition(currentStatus: OrderStatus, newStatus: OrderStatus): OrderStatus {
    if (!this.canTransition(currentStatus, newStatus)) {
      throw new OrderStateTransitionError(currentStatus, newStatus);
    }
    return newStatus;
  }

  static isCancellable(status: OrderStatus): boolean {
    return ALLOWED_TRANSITIONS[status]?.includes('CANCELLED') ?? false;
  }

  static isTerminal(status: OrderStatus): boolean {
    return ALLOWED_TRANSITIONS[status]?.length === 0;
  }

  static getNextStatuses(status: OrderStatus): OrderStatus[] {
    return ALLOWED_TRANSITIONS[status] ?? [];
  }
}
