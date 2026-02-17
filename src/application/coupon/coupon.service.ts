import type { Prisma } from '@prisma/client';
import { AppError } from '@/lib/errors';

type PrismaTransaction = Prisma.TransactionClient;

export class CouponService {
  async validateAndCalculate(
    tx: PrismaTransaction,
    code: string,
    userId: string,
    orderAmount: number,
  ): Promise<number> {
    const coupon = await tx.coupon.findUnique({ where: { code } });

    if (!coupon) throw new AppError('COUPON_NOT_FOUND', '존재하지 않는 쿠폰입니다.');
    if (!coupon.isActive) throw new AppError('COUPON_INACTIVE', '비활성화된 쿠폰입니다.');

    const now = new Date();
    if (now < coupon.validFrom || now > coupon.validUntil) {
      throw new AppError('COUPON_EXPIRED', '유효기간이 지난 쿠폰입니다.');
    }

    if (coupon.maxUsageCount && coupon.usedCount >= coupon.maxUsageCount) {
      throw new AppError('COUPON_LIMIT_REACHED', '쿠폰 사용 한도에 도달했습니다.');
    }

    const existingUsage = await tx.couponUsage.findUnique({
      where: { couponId_userId: { couponId: coupon.id, userId } },
    });
    if (existingUsage) {
      throw new AppError('COUPON_ALREADY_USED', '이미 사용한 쿠폰입니다.');
    }

    if (coupon.minOrderAmount && orderAmount < Number(coupon.minOrderAmount)) {
      throw new AppError(
        'COUPON_MIN_ORDER',
        `최소 주문금액 ${Number(coupon.minOrderAmount).toLocaleString()}원 이상 주문 시 사용 가능합니다.`,
      );
    }

    let discount = 0;
    if (coupon.type === 'FIXED') {
      discount = Number(coupon.value);
    } else {
      discount = Math.floor((orderAmount * Number(coupon.value)) / 100);
      if (coupon.maxDiscount) {
        discount = Math.min(discount, Number(coupon.maxDiscount));
      }
    }

    return Math.min(discount, orderAmount);
  }

  async markUsed(
    tx: PrismaTransaction,
    code: string,
    userId: string,
    orderId: string,
  ): Promise<void> {
    const coupon = await tx.coupon.findUniqueOrThrow({ where: { code } });

    await tx.couponUsage.create({
      data: { couponId: coupon.id, userId, orderId },
    });

    await tx.coupon.update({
      where: { id: coupon.id },
      data: { usedCount: { increment: 1 } },
    });
  }
}
