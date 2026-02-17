import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { apiHandler, successResponse } from '@/lib/api-handler';
import { requireAuth } from '@/lib/auth-guard';
import { AppError } from '@/lib/errors';

const validateSchema = z.object({
  code: z.string().min(1, '쿠폰 코드를 입력해주세요.'),
  orderAmount: z.number().min(0),
});

export const POST = apiHandler(async (req: NextRequest) => {
  const session = await requireAuth();
  const body = await req.json();
  const { code, orderAmount } = validateSchema.parse(body);

  const coupon = await prisma.coupon.findUnique({ where: { code } });
  if (!coupon) throw new AppError('COUPON_NOT_FOUND', '존재하지 않는 쿠폰입니다.', 404);
  if (!coupon.isActive) throw new AppError('COUPON_INACTIVE', '비활성화된 쿠폰입니다.');

  const now = new Date();
  if (now < coupon.validFrom || now > coupon.validUntil) {
    throw new AppError('COUPON_EXPIRED', '유효기간이 지난 쿠폰입니다.');
  }

  if (coupon.maxUsageCount && coupon.usedCount >= coupon.maxUsageCount) {
    throw new AppError('COUPON_LIMIT_REACHED', '쿠폰 사용 한도에 도달했습니다.');
  }

  const used = await prisma.couponUsage.findUnique({
    where: { couponId_userId: { couponId: coupon.id, userId: session.user.id } },
  });
  if (used) throw new AppError('COUPON_ALREADY_USED', '이미 사용한 쿠폰입니다.');

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
  discount = Math.min(discount, orderAmount);

  return successResponse({
    couponId: coupon.id,
    code: coupon.code,
    name: coupon.name,
    type: coupon.type,
    discount,
  });
});
