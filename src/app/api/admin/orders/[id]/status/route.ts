import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiHandler, successResponse } from '@/lib/api-handler';
import { requireAdmin } from '@/lib/auth-guard';
import { OrderService } from '@/application/order/order.service';
import { updateOrderStatusSchema } from '@/application/order/order.dto';

export const PUT = apiHandler(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json();
    const dto = updateOrderStatusSchema.parse(body);

    const orderService = new OrderService(prisma);
    const order = await orderService.updateOrderStatus(id, dto.status);

    return successResponse({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
    });
  },
);
