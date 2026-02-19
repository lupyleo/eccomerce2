import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiHandler, successResponse } from '@/lib/api-handler';
import { requireAuth } from '@/lib/auth-guard';
import { ShippingService } from '@/application/shipping/shipping.service';

const calculateSchema = z.object({
  orderAmount: z.number().min(0, '주문 금액은 0원 이상이어야 합니다.'),
});

export const POST = apiHandler(async (req: NextRequest) => {
  await requireAuth();
  const body = await req.json();
  const { orderAmount } = calculateSchema.parse(body);

  const shippingService = new ShippingService();
  const shippingFee = shippingService.calculateFee(orderAmount);
  const freeShippingThreshold = Number(process.env.FREE_SHIPPING_THRESHOLD ?? 50000);
  const isFreeShipping = shippingFee === 0;

  return successResponse({
    shippingFee,
    freeShippingThreshold,
    isFreeShipping,
  });
});
