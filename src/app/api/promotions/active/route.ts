import { prisma } from '@/lib/prisma';
import { apiHandler, successResponse } from '@/lib/api-handler';
import { PromotionService } from '@/application/promotion/promotion.service';

export const GET = apiHandler(async () => {
  const promotionService = new PromotionService(prisma);
  const promotions = await promotionService.getActivePromotions();

  const data = promotions.map((p) => ({
    id: p.id,
    name: p.name,
    type: p.type,
    discountRate: Number(p.discountRate),
    category: p.category,
    startDate: p.startDate,
    endDate: p.endDate,
  }));

  return successResponse(data);
});
