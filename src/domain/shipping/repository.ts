import type { ShipmentEntity } from './entities';

export interface ShipmentRepository {
  findByOrderId(orderId: string): Promise<ShipmentEntity | null>;
  updateTrackingNumber(id: string, carrier: string, trackingNumber: string): Promise<ShipmentEntity>;
  updateStatus(id: string, status: string): Promise<ShipmentEntity>;
}
