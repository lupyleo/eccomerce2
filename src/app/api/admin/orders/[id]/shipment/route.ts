import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { apiHandler, successResponse } from '@/lib/api-handler';
import { requireAdmin } from '@/lib/auth-guard';
import { NotFoundError, AppError } from '@/lib/errors';

const updateShipmentSchema = z.object({
  carrier: z.string().min(1).optional(),
  trackingNumber: z.string().min(1).optional(),
  status: z.enum(['PREPARING', 'SHIPPED', 'IN_TRANSIT', 'DELIVERED']).optional(),
});

export const PUT = apiHandler(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    await requireAdmin();
    const { id: orderId } = await params;
    const body = await req.json();
    const dto = updateShipmentSchema.parse(body);

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { shipment: true },
    });

    if (!order) throw new NotFoundError('주문');
    if (!order.shipment) throw new AppError('NO_SHIPMENT', '배송 정보가 없습니다.');

    const data: Record<string, unknown> = {};
    if (dto.carrier) data.carrier = dto.carrier;
    if (dto.trackingNumber) data.trackingNumber = dto.trackingNumber;
    if (dto.status) {
      data.status = dto.status;
      if (dto.status === 'SHIPPED') data.shippedAt = new Date();
      if (dto.status === 'DELIVERED') data.deliveredAt = new Date();
    }

    const shipment = await prisma.shipment.update({
      where: { id: order.shipment.id },
      data,
    });

    if (dto.status === 'SHIPPED' && order.status === 'PREPARING') {
      await prisma.order.update({
        where: { id: orderId },
        data: { status: 'SHIPPING' },
      });
    }

    if (dto.status === 'DELIVERED' && order.status === 'SHIPPING') {
      await prisma.order.update({
        where: { id: orderId },
        data: { status: 'DELIVERED' },
      });
    }

    return successResponse(shipment);
  },
);
