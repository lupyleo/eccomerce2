import type { PrismaClient, OrderStatus } from '@prisma/client';
import { NotFoundError, AppError } from '@/lib/errors';
import { OrderStateMachine } from '@/domain/order/state-machine';

export class OrderService {
  constructor(private readonly prisma: PrismaClient) {}

  async updateOrderStatus(orderId: string, newStatus: OrderStatus) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true, shipment: true },
    });

    if (!order) throw new NotFoundError('주문');

    OrderStateMachine.transition(order.status, newStatus);

    const data: Record<string, unknown> = { status: newStatus };

    const result = await this.prisma.order.update({
      where: { id: orderId },
      data,
      include: {
        items: true,
        payment: true,
        shipment: true,
      },
    });

    if (newStatus === 'SHIPPING' && order.shipment) {
      await this.prisma.shipment.update({
        where: { id: order.shipment.id },
        data: { status: 'SHIPPED', shippedAt: new Date() },
      });
    }

    if (newStatus === 'DELIVERED' && order.shipment) {
      await this.prisma.shipment.update({
        where: { id: order.shipment.id },
        data: { status: 'DELIVERED', deliveredAt: new Date() },
      });
    }

    return result;
  }

  async getOrdersForAdmin(
    page: number,
    limit: number,
    status?: OrderStatus,
    search?: string,
  ) {
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: { select: { id: true, name: true, email: true } },
          items: { select: { productName: true, quantity: true } },
          payment: { select: { method: true, status: true } },
          shipment: { select: { status: true, trackingNumber: true } },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return { data: orders, total };
  }
}
