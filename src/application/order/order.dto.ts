import { z } from 'zod';

export const updateOrderStatusSchema = z.object({
  status: z.enum([
    'PENDING',
    'PAID',
    'PREPARING',
    'SHIPPING',
    'DELIVERED',
    'CONFIRMED',
    'CANCELLED',
  ]),
});
