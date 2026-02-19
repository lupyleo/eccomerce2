import type { ShipmentStatus } from '@prisma/client';

export interface ShipmentEntity {
  id: string;
  orderId: string;
  carrier: string;
  trackingNumber: string | null;
  status: ShipmentStatus;
  shippedAt: Date | null;
  deliveredAt: Date | null;
  createdAt: Date;
}

const ALLOWED_SHIPMENT_TRANSITIONS: Record<ShipmentStatus, ShipmentStatus[]> = {
  PREPARING: ['SHIPPED'],
  SHIPPED: ['IN_TRANSIT'],
  IN_TRANSIT: ['DELIVERED'],
  DELIVERED: [],
};

export class ShipmentStateMachine {
  static canTransition(from: ShipmentStatus, to: ShipmentStatus): boolean {
    return ALLOWED_SHIPMENT_TRANSITIONS[from]?.includes(to) ?? false;
  }

  static getNextStatuses(status: ShipmentStatus): ShipmentStatus[] {
    return ALLOWED_SHIPMENT_TRANSITIONS[status] ?? [];
  }
}
