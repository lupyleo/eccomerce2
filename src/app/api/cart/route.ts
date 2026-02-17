import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiHandler, successResponse } from '@/lib/api-handler';
import { getCartIdentity, cartWhereClause } from '@/lib/cart-identity';

export const GET = apiHandler(async (req: NextRequest) => {
  const identity = await getCartIdentity(req);

  const cart = await prisma.cart.findUnique({
    where: cartWhereClause(identity),
    include: {
      items: {
        include: {
          variant: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  images: {
                    where: { isPrimary: true },
                    take: 1,
                    select: { url: true, alt: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!cart) {
    return successResponse({ items: [], totalAmount: 0, itemCount: 0 });
  }

  const items = cart.items.map((item) => ({
    id: item.id,
    variant: {
      id: item.variant.id,
      sku: item.variant.sku,
      size: item.variant.size,
      color: item.variant.color,
      colorCode: item.variant.colorCode,
      price: Number(item.variant.price),
      availableStock: item.variant.stock - item.variant.reservedStock,
      product: {
        id: item.variant.product.id,
        name: item.variant.product.name,
        slug: item.variant.product.slug,
        primaryImage: item.variant.product.images[0] ?? null,
      },
    },
    quantity: item.quantity,
    subtotal: Number(item.variant.price) * item.quantity,
  }));

  const totalAmount = items.reduce((sum, item) => sum + item.subtotal, 0);

  return successResponse({
    items,
    totalAmount,
    itemCount: items.length,
  });
});
