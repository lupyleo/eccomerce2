import type { PrismaClient } from '@prisma/client';

export interface CreatePromotionDto {
  name: string;
  type: 'CATEGORY_DISCOUNT' | 'PERIOD_DISCOUNT';
  discountRate: number;
  categoryId?: string;
  startDate: string;
  endDate: string;
  isActive?: boolean;
}

export class PromotionService {
  constructor(private readonly prisma: PrismaClient) {}

  async getActivePromotions() {
    const now = new Date();
    return this.prisma.promotion.findMany({
      where: {
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPromotionForProduct(categoryId: string): Promise<number> {
    const now = new Date();
    const promotions = await this.prisma.promotion.findMany({
      where: {
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
        OR: [
          { type: 'PERIOD_DISCOUNT', categoryId: null },
          { type: 'CATEGORY_DISCOUNT', categoryId },
        ],
      },
      orderBy: { discountRate: 'desc' },
      take: 1,
    });

    if (promotions.length === 0) return 0;
    return Number(promotions[0].discountRate);
  }

  async applyPromotionDiscount(
    categoryId: string,
    originalPrice: number,
  ): Promise<{ discountedPrice: number; discountRate: number; promotionName: string | null }> {
    const now = new Date();
    const promotion = await this.prisma.promotion.findFirst({
      where: {
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
        OR: [
          { type: 'PERIOD_DISCOUNT', categoryId: null },
          { type: 'CATEGORY_DISCOUNT', categoryId },
        ],
      },
      orderBy: { discountRate: 'desc' },
    });

    if (!promotion) {
      return { discountedPrice: originalPrice, discountRate: 0, promotionName: null };
    }

    const discountRate = Number(promotion.discountRate);
    const discountAmount = Math.floor((originalPrice * discountRate) / 100);
    const discountedPrice = originalPrice - discountAmount;

    return {
      discountedPrice,
      discountRate,
      promotionName: promotion.name,
    };
  }
}
