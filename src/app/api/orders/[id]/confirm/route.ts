import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse } from '@/lib/api-handler';
import { requireAuth } from '@/lib/auth-guard';
import { AppError, NotFoundError } from '@/lib/errors';
import { OrderStateMachine } from '@/domain/order/state-machine';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const order = await prisma.order.findUnique({ where: { id } });

    if (!order || order.userId !== session.user.id) {
      throw new NotFoundError('주문');
    }

    OrderStateMachine.transition(order.status, 'CONFIRMED');

    const updated = await prisma.order.update({
      where: { id },
      data: { status: 'CONFIRMED' },
    });

    return successResponse({
      id: updated.id,
      orderNumber: updated.orderNumber,
      status: updated.status,
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
