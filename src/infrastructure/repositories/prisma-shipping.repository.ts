import type { PrismaClient } from '@prisma/client';
import type { ShipmentRepository } from '@/domain/shipping/repository';
import type { ShipmentEntity } from '@/domain/shipping/entities';

export class PrismaShippingRepository implements ShipmentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByOrderId(orderId: string): Promise<ShipmentEntity | null> {
    const shipment = await this.prisma.shipment.findUnique({ where: { orderId } });
    return shipment ? this.toEntity(shipment) : null;
  }

  async updateTrackingNumber(
    id: string,
    carrier: string,
    trackingNumber: string,
  ): Promise<ShipmentEntity> {
    const shipment = await this.prisma.shipment.update({
      where: { id },
      data: { carrier, trackingNumber },
    });
    return this.toEntity(shipment);
  }

  async updateStatus(id: string, status: string): Promise<ShipmentEntity> {
    const data: Record<string, unknown> = { status };
    if (status === 'SHIPPED') data.shippedAt = new Date();
    if (status === 'DELIVERED') data.deliveredAt = new Date();

    const shipment = await this.prisma.shipment.update({
      where: { id },
      data,
    });
    return this.toEntity(shipment);
  }

  private toEntity(shipment: {
    id: string;
    orderId: string;
    carrier: string;
    trackingNumber: string | null;
    status: string;
    shippedAt: Date | null;
    deliveredAt: Date | null;
    createdAt: Date;
  }): ShipmentEntity {
    return {
      id: shipment.id,
      orderId: shipment.orderId,
      carrier: shipment.carrier,
      trackingNumber: shipment.trackingNumber,
      status: shipment.status as ShipmentEntity['status'],
      shippedAt: shipment.shippedAt,
      deliveredAt: shipment.deliveredAt,
      createdAt: shipment.createdAt,
    };
  }
}
