import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { successResponse } from '@/lib/api-handler';
import { requireAuth } from '@/lib/auth-guard';
import { AppError, NotFoundError } from '@/lib/errors';

const updateQuantitySchema = z.object({
  quantity: z.number().int().min(1),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const body = await req.json();
    const { quantity } = updateQuantitySchema.parse(body);

    const cartItem = await prisma.cartItem.findUnique({
      where: { id },
      include: { cart: true, variant: true },
    });

    if (!cartItem || cartItem.cart.userId !== session.user.id) {
      throw new NotFoundError('장바구니 항목');
    }

    const availableStock = cartItem.variant.stock - cartItem.variant.reservedStock;
    if (quantity > availableStock) {
      throw new AppError(
        'INSUFFICIENT_STOCK',
        `재고가 부족합니다. (현재 재고: ${availableStock}개)`,
      );
    }

    const updated = await prisma.cartItem.update({
      where: { id },
      data: { quantity },
    });

    return successResponse({ id: updated.id, quantity: updated.quantity });
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

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const cartItem = await prisma.cartItem.findUnique({
      where: { id },
      include: { cart: true },
    });

    if (!cartItem || cartItem.cart.userId !== session.user.id) {
      throw new NotFoundError('장바구니 항목');
    }

    await prisma.cartItem.delete({ where: { id } });

    return successResponse({ deleted: true });
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
