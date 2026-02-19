import type { CouponType } from '@prisma/client';

export interface CouponEntity {
  id: string;
  code: string;
  name: string;
  type: CouponType;
  value: number;
  minOrderAmount: number | null;
  maxDiscount: number | null;
  validFrom: Date;
  validUntil: Date;
  maxUsageCount: number | null;
  usedCount: number;
  isActive: boolean;
  createdAt: Date;
}

export interface CouponUsageEntity {
  id: string;
  couponId: string;
  userId: string;
  orderId: string;
  usedAt: Date;
}

export function generateCouponCode(prefix = 'COUPON'): string {
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${random}`;
}
