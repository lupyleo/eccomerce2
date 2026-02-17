import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse } from '@/lib/api-handler';
import { requireAuth } from '@/lib/auth-guard';
import { AppError, NotFoundError } from '@/lib/errors';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            variant: {
              select: {
                sku: true,
                product: {
                  select: {
                    slug: true,
                    images: { where: { isPrimary: true }, take: 1 },
                  },
                },
              },
            },
          },
        },
        payment: true,
        shipment: true,
        returns: true,
      },
    });

    if (!order || order.userId !== session.user.id) {
      throw new NotFoundError('주문');
    }

    return successResponse({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      totalAmount: Number(order.totalAmount),
      discountAmount: Number(order.discountAmount),
      shippingFee: Number(order.shippingFee),
      finalAmount: Number(order.finalAmount),
      addressSnapshot: order.addressSnapshot,
      note: order.note,
      items: order.items.map((item) => ({
        id: item.id,
        productName: item.productName,
        variantInfo: item.variantInfo,
        price: Number(item.price),
        quantity: item.quantity,
        subtotal: Number(item.subtotal),
        productSlug: item.variant.product.slug,
        image: item.variant.product.images[0]?.url ?? null,
      })),
      payment: order.payment
        ? {
            id: order.payment.id,
            method: order.payment.method,
            status: order.payment.status,
            amount: Number(order.payment.amount),
            paidAt: order.payment.paidAt,
          }
        : null,
      shipment: order.shipment
        ? {
            status: order.shipment.status,
            carrier: order.shipment.carrier,
            trackingNumber: order.shipment.trackingNumber,
            shippedAt: order.shipment.shippedAt,
            deliveredAt: order.shipment.deliveredAt,
          }
        : null,
      returns: order.returns.map((r) => ({
        id: r.id,
        status: r.status,
        reason: r.reason,
        refundAmount: Number(r.refundAmount),
        createdAt: r.createdAt,
      })),
      createdAt: order.createdAt,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { success: false, error: { code: error.code, message: error.message } },
        { status: error.statusCode },
      );
    }
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다.' } },
      { status: 500 },
    );
  }
}
