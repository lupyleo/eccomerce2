import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { apiHandler, successResponse } from '@/lib/api-handler';
import { requireAuth } from '@/lib/auth-guard';
import { AppError } from '@/lib/errors';

const mergeSchema = z.object({
  sessionId: z.string().min(1),
});

export const POST = apiHandler(async (req: NextRequest) => {
  const session = await requireAuth();
  const body = await req.json();
  const { sessionId } = mergeSchema.parse(body);

  const result = await prisma.$transaction(async (tx) => {
    // 1. Find guest cart by sessionId
    const guestCart = await tx.cart.findUnique({
      where: { sessionId },
      include: { items: true },
    });

    if (!guestCart || guestCart.items.length === 0) {
      return { merged: 0 };
    }

    // 2. Get or create authenticated user's cart
    let userCart = await tx.cart.findUnique({
      where: { userId: session.user.id },
      include: { items: true },
    });

    if (!userCart) {
      userCart = await tx.cart.create({
        data: { userId: session.user.id },
        include: { items: true },
      });
    }

    // 3. Merge items: upsert each guest item into user cart
    let mergedCount = 0;
    for (const guestItem of guestCart.items) {
      const existingItem = userCart.items.find(
        (item) => item.variantId === guestItem.variantId,
      );

      if (existingItem) {
        // Sum quantities
        await tx.cartItem.update({
          where: { id: existingItem.id },
          data: { quantity: existingItem.quantity + guestItem.quantity },
        });
      } else {
        await tx.cartItem.create({
          data: {
            cartId: userCart.id,
            variantId: guestItem.variantId,
            quantity: guestItem.quantity,
          },
        });
      }
      mergedCount++;
    }

    // 4. Delete guest cart (cascade deletes its items)
    await tx.cart.delete({ where: { id: guestCart.id } });

    return { merged: mergedCount };
  });

  if (result.merged === 0) {
    throw new AppError('CART_EMPTY', '병합할 장바구니가 없습니다.', 404);
  }

  return successResponse({ merged: result.merged }, 200);
});
