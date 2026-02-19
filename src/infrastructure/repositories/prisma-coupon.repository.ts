import type { PrismaClient, Prisma } from '@prisma/client';
import type { CouponRepository } from '@/domain/coupon/repository';
import type { CouponEntity } from '@/domain/coupon/entities';

export class PrismaCouponRepository implements CouponRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<CouponEntity | null> {
    const coupon = await this.prisma.coupon.findUnique({ where: { id } });
    return coupon ? this.toEntity(coupon) : null;
  }

  async findByCode(code: string): Promise<CouponEntity | null> {
    const coupon = await this.prisma.coupon.findUnique({ where: { code } });
    return coupon ? this.toEntity(coupon) : null;
  }

  async findMany(
    page: number,
    limit: number,
    isActive?: boolean,
  ): Promise<{ data: CouponEntity[]; total: number }> {
    const where: Prisma.CouponWhereInput = {};
    if (isActive !== undefined) where.isActive = isActive;

    const [coupons, total] = await Promise.all([
      this.prisma.coupon.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.coupon.count({ where }),
    ]);

    return { data: coupons.map((c) => this.toEntity(c)), total };
  }

  async create(data: Omit<CouponEntity, 'id' | 'usedCount' | 'createdAt'>): Promise<CouponEntity> {
    const coupon = await this.prisma.coupon.create({
      data: {
        code: data.code,
        name: data.name,
        type: data.type,
        value: data.value,
        minOrderAmount: data.minOrderAmount,
        maxDiscount: data.maxDiscount,
        validFrom: data.validFrom,
        validUntil: data.validUntil,
        maxUsageCount: data.maxUsageCount,
        isActive: data.isActive,
      },
    });
    return this.toEntity(coupon);
  }

  async update(id: string, data: Partial<CouponEntity>): Promise<CouponEntity> {
    const updateData: Prisma.CouponUpdateInput = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.value !== undefined) updateData.value = data.value;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const coupon = await this.prisma.coupon.update({ where: { id }, data: updateData });
    return this.toEntity(coupon);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.coupon.delete({ where: { id } });
  }

  private toEntity(coupon: {
    id: string;
    code: string;
    name: string;
    type: string;
    value: Prisma.Decimal;
    minOrderAmount: Prisma.Decimal | null;
    maxDiscount: Prisma.Decimal | null;
    validFrom: Date;
    validUntil: Date;
    maxUsageCount: number | null;
    usedCount: number;
    isActive: boolean;
    createdAt: Date;
  }): CouponEntity {
    return {
      id: coupon.id,
      code: coupon.code,
      name: coupon.name,
      type: coupon.type as CouponEntity['type'],
      value: Number(coupon.value),
      minOrderAmount: coupon.minOrderAmount ? Number(coupon.minOrderAmount) : null,
      maxDiscount: coupon.maxDiscount ? Number(coupon.maxDiscount) : null,
      validFrom: coupon.validFrom,
      validUntil: coupon.validUntil,
      maxUsageCount: coupon.maxUsageCount,
      usedCount: coupon.usedCount,
      isActive: coupon.isActive,
      createdAt: coupon.createdAt,
    };
  }
}
