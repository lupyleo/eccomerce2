import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiHandler, paginatedResponse } from '@/lib/api-handler';
import { requireAdmin } from '@/lib/auth-guard';
import { parsePaginationParams } from '@/lib/utils';
import { OrderService } from '@/application/order/order.service';

export const GET = apiHandler(async (req: NextRequest) => {
  await requireAdmin();
  const { page, limit } = parsePaginationParams(req.nextUrl.searchParams);
  const status = req.nextUrl.searchParams.get('status') as never;
  const search = req.nextUrl.searchParams.get('search') ?? undefined;

  const orderService = new OrderService(prisma);
  const { data, total } = await orderService.getOrdersForAdmin(page, limit, status, search);

  const formatted = data.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    status: o.status,
    totalAmount: Number(o.totalAmount),
    finalAmount: Number(o.finalAmount),
    user: o.user,
    itemCount: o.items.length,
    items: o.items.map((i) => ({ productName: i.productName, quantity: i.quantity })),
    payment: o.payment,
    shipment: o.shipment,
    createdAt: o.createdAt,
  }));

  return paginatedResponse(formatted, { page, limit, total });
});
