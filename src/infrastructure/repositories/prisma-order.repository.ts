import type { PrismaClient, Prisma } from '@prisma/client';
import type { OrderEntity, OrderItemEntity } from '@/domain/order/entities';

export interface OrderWithItems extends OrderEntity {
  items: OrderItemEntity[];
}

export class PrismaOrderRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<OrderWithItems | null> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });
    return order ? this.toEntity(order) : null;
  }

  async findByOrderNumber(orderNumber: string): Promise<OrderWithItems | null> {
    const order = await this.prisma.order.findUnique({
      where: { orderNumber },
      include: { items: true },
    });
    return order ? this.toEntity(order) : null;
  }

  async findByUserId(
    userId: string,
    page: number,
    limit: number,
    status?: string,
  ): Promise<{ data: OrderWithItems[]; total: number }> {
    const where: Prisma.OrderWhereInput = { userId };
    if (status) where.status = status as never;

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: { items: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    return { data: orders.map((o) => this.toEntity(o)), total };
  }

  async updateStatus(id: string, status: string): Promise<OrderEntity> {
    const order = await this.prisma.order.update({
      where: { id },
      data: { status: status as never },
    });
    return this.toEntityBase(order);
  }

  private toEntity(order: {
    id: string;
    orderNumber: string;
    userId: string;
    status: string;
    totalAmount: Prisma.Decimal;
    discountAmount: Prisma.Decimal;
    shippingFee: Prisma.Decimal;
    finalAmount: Prisma.Decimal;
    addressSnapshot: Prisma.JsonValue;
    couponId: string | null;
    note: string | null;
    createdAt: Date;
    updatedAt: Date;
    items: Array<{
      id: string;
      orderId: string;
      variantId: string;
      productName: string;
      variantInfo: string;
      price: Prisma.Decimal;
      quantity: number;
      subtotal: Prisma.Decimal;
    }>;
  }): OrderWithItems {
    return {
      ...this.toEntityBase(order),
      items: order.items.map((item) => ({
        id: item.id,
        orderId: item.orderId,
        variantId: item.variantId,
        productName: item.productName,
        variantInfo: item.variantInfo,
        price: Number(item.price),
        quantity: item.quantity,
        subtotal: Number(item.subtotal),
      })),
    };
  }

  private toEntityBase(order: {
    id: string;
    orderNumber: string;
    userId: string;
    status: string;
    totalAmount: Prisma.Decimal;
    discountAmount: Prisma.Decimal;
    shippingFee: Prisma.Decimal;
    finalAmount: Prisma.Decimal;
    addressSnapshot: Prisma.JsonValue;
    couponId: string | null;
    note: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): OrderEntity {
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      userId: order.userId,
      status: order.status as OrderEntity['status'],
      totalAmount: Number(order.totalAmount),
      discountAmount: Number(order.discountAmount),
      shippingFee: Number(order.shippingFee),
      finalAmount: Number(order.finalAmount),
      addressSnapshot: order.addressSnapshot as Record<string, unknown>,
      couponId: order.couponId,
      note: order.note,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }
}
