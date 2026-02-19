import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiHandler, successResponse } from '@/lib/api-handler';
import { requireAdmin } from '@/lib/auth-guard';
import { NotFoundError } from '@/lib/errors';

export const GET = apiHandler(
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    await requireAdmin();
    const { id } = await params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        items: {
          include: {
            variant: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    images: { where: { isPrimary: true }, take: 1, select: { url: true } },
                  },
                },
              },
            },
          },
        },
        payment: true,
        shipment: true,
        returns: true,
        coupon: { select: { code: true, name: true } },
      },
    });

    if (!order) throw new NotFoundError('주문');

    return successResponse({
      ...order,
      totalAmount: Number(order.totalAmount),
      discountAmount: Number(order.discountAmount),
      shippingFee: Number(order.shippingFee),
      finalAmount: Number(order.finalAmount),
      items: order.items.map((i) => ({
        ...i,
        price: Number(i.price),
        subtotal: Number(i.subtotal),
      })),
      payment: order.payment
        ? {
            ...order.payment,
            amount: Number(order.payment.amount),
            cancelledAmount: Number(order.payment.cancelledAmount),
          }
        : null,
      returns: order.returns.map((r) => ({
        ...r,
        refundAmount: Number(r.refundAmount),
      })),
    });
  },
);
