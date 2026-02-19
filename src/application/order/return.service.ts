import type { PrismaClient, Prisma, ReturnReason } from '@prisma/client';
import type { PaymentGateway } from '@/domain/payment/gateway';
import { AppError, NotFoundError } from '@/lib/errors';

interface CreateReturnDto {
  orderItemId?: string;
  reason: ReturnReason;
  reasonDetail?: string;
  images?: string[];
}

type PrismaTransaction = Prisma.TransactionClient;

export class ReturnService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly paymentGateway: PaymentGateway,
  ) {}

  async requestReturn(userId: string, orderId: string, dto: CreateReturnDto) {
    return this.prisma.$transaction(async (tx: PrismaTransaction) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true, payment: true },
      });

      if (!order || order.userId !== userId) {
        throw new NotFoundError('주문');
      }

      if (order.status !== 'DELIVERED' && order.status !== 'CONFIRMED') {
        throw new AppError(
          'RETURN_NOT_ALLOWED',
          '배송 완료 또는 구매 확정된 주문만 반품 신청이 가능합니다.',
        );
      }

      let refundAmount: number;

      if (dto.orderItemId) {
        const orderItem = order.items.find((item) => item.id === dto.orderItemId);
        if (!orderItem) throw new NotFoundError('주문 상품');
        refundAmount = Number(orderItem.subtotal);
      } else {
        refundAmount = Number(order.finalAmount);
      }

      const existingReturn = await tx.return.findFirst({
        where: {
          orderId,
          orderItemId: dto.orderItemId ?? null,
          status: { notIn: ['REJECTED', 'COMPLETED'] },
        },
      });

      if (existingReturn) {
        throw new AppError('RETURN_ALREADY_EXISTS', '이미 반품 신청이 진행 중입니다.');
      }

      const returnRecord = await tx.return.create({
        data: {
          orderId,
          orderItemId: dto.orderItemId,
          reason: dto.reason,
          reasonDetail: dto.reasonDetail,
          refundAmount,
          images: dto.images ?? [],
        },
        include: {
          order: { select: { orderNumber: true } },
          orderItem: { select: { productName: true, variantInfo: true } },
        },
      });

      return returnRecord;
    });
  }

  async approveReturn(returnId: string) {
    const returnRecord = await this.prisma.return.findUnique({
      where: { id: returnId },
    });

    if (!returnRecord) throw new NotFoundError('반품 신청');

    if (returnRecord.status !== 'REQUESTED') {
      throw new AppError(
        'INVALID_RETURN_TRANSITION',
        `반품 상태를 ${returnRecord.status}에서 APPROVED(으)로 변경할 수 없습니다.`,
      );
    }

    return this.prisma.return.update({
      where: { id: returnId },
      data: { status: 'APPROVED' },
    });
  }

  async completeReturn(returnId: string) {
    return this.prisma.$transaction(async (tx: PrismaTransaction) => {
      const returnRecord = await tx.return.findUnique({
        where: { id: returnId },
        include: {
          order: {
            include: {
              payment: true,
              items: true,
            },
          },
          orderItem: true,
        },
      });

      if (!returnRecord) throw new NotFoundError('반품 신청');

      if (returnRecord.status !== 'COLLECTED') {
        throw new AppError(
          'INVALID_RETURN_TRANSITION',
          `반품 상태를 ${returnRecord.status}에서 COMPLETED(으)로 변경할 수 없습니다.`,
        );
      }

      const { order } = returnRecord;

      if (order.payment) {
        const cancelResult = await this.paymentGateway.cancel({
          paymentId: order.payment.pgPaymentId!,
          amount: Number(returnRecord.refundAmount),
          reason: `반품 환불 - ${returnRecord.reason}`,
        });

        if (!cancelResult.success) {
          throw new AppError('REFUND_FAILED', '환불 처리에 실패했습니다.');
        }

        const newCancelledAmount =
          Number(order.payment.cancelledAmount) + Number(returnRecord.refundAmount);
        const isFullyRefunded = newCancelledAmount >= Number(order.payment.amount);

        await tx.payment.update({
          where: { id: order.payment.id },
          data: {
            status: isFullyRefunded ? 'CANCELLED' : 'PARTIALLY_CANCELLED',
            cancelledAmount: newCancelledAmount,
            cancelledAt: new Date(),
          },
        });
      }

      // Determine which items need stock restoration
      const itemsToRestore = returnRecord.orderItem
        ? [returnRecord.orderItem]
        : order.items;

      for (const item of itemsToRestore) {
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stock: { increment: item.quantity } },
        });

        await tx.stockLog.create({
          data: {
            variantId: item.variantId,
            type: 'INBOUND',
            quantity: item.quantity,
            reason: '반품 재고 복구',
            referenceId: order.orderNumber,
          },
        });
      }

      return tx.return.update({
        where: { id: returnId },
        data: { status: 'COMPLETED' },
      });
    });
  }
}
