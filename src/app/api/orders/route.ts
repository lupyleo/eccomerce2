import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { apiHandler, successResponse, paginatedResponse } from '@/lib/api-handler';
import { requireAuth } from '@/lib/auth-guard';
import { parsePaginationParams } from '@/lib/utils';
import { CheckoutService } from '@/application/order/checkout.service';
import { PaymentGatewayFactory } from '@/infrastructure/payment/payment.factory';

const createOrderSchema = z.object({
  addressId: z.string().uuid(),
  couponCode: z.string().optional(),
  paymentMethod: z.enum(['CARD', 'VIRTUAL_ACCOUNT', 'EASY_PAY']),
  note: z.string().optional(),
});

export const POST = apiHandler(async (req: NextRequest) => {
  const session = await requireAuth();
  const body = await req.json();
  const dto = createOrderSchema.parse(body);

  const paymentGateway = PaymentGatewayFactory.create();
  const checkoutService = new CheckoutService(prisma, paymentGateway);

  const order = await checkoutService.createOrder(session.user.id, dto);

  return successResponse(order, 201);
});

export const GET = apiHandler(async (req: NextRequest) => {
  const session = await requireAuth();
  const { page, limit, skip } = parsePaginationParams(req.nextUrl.searchParams);
  const status = req.nextUrl.searchParams.get('status');

  const where = {
    userId: session.user.id,
    ...(status && { status: status as never }),
  };

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: {
                  select: {
                    images: { where: { isPrimary: true }, take: 1, select: { url: true } },
                  },
                },
              },
            },
          },
        },
        payment: { select: { method: true, status: true } },
        shipment: { select: { status: true, trackingNumber: true } },
      },
    }),
    prisma.order.count({ where }),
  ]);

  const data = orders.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    status: o.status,
    finalAmount: Number(o.finalAmount),
    itemCount: o.items.length,
    firstItem: o.items[0]
      ? {
          productName: o.items[0].productName,
          image: o.items[0].variant.product.images[0]?.url ?? null,
        }
      : null,
    payment: o.payment,
    shipment: o.shipment,
    createdAt: o.createdAt,
  }));

  return paginatedResponse(data, { page, limit, total });
});
