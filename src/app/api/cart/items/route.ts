import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { apiHandler, successResponse } from '@/lib/api-handler';
import { getCartIdentity, cartWhereClause, cartCreateData } from '@/lib/cart-identity';
import { AppError } from '@/lib/errors';

const addToCartSchema = z.object({
  variantId: z.string().uuid(),
  quantity: z.number().int().min(1),
});

export const POST = apiHandler(async (req: NextRequest) => {
  const identity = await getCartIdentity(req);
  const body = await req.json();
  const { variantId, quantity } = addToCartSchema.parse(body);

  // Check variant exists and stock
  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    include: {
      product: {
        select: { id: true, name: true, slug: true, images: { where: { isPrimary: true }, take: 1 } },
      },
    },
  });

  if (!variant || !variant.isActive) {
    throw new AppError('VARIANT_NOT_FOUND', '상품 옵션을 찾을 수 없습니다.');
  }

  const availableStock = variant.stock - variant.reservedStock;
  if (availableStock < quantity) {
    throw new AppError(
      'INSUFFICIENT_STOCK',
      `재고가 부족합니다. (현재 재고: ${availableStock}개)`,
    );
  }

  // Get or create cart
  let cart = await prisma.cart.findUnique({ where: cartWhereClause(identity) });
  if (!cart) {
    cart = await prisma.cart.create({ data: cartCreateData(identity) });
  }

  // Upsert cart item
  const existingItem = await prisma.cartItem.findUnique({
    where: { cartId_variantId: { cartId: cart.id, variantId } },
  });

  const newQuantity = existingItem ? existingItem.quantity + quantity : quantity;
  if (newQuantity > availableStock) {
    throw new AppError(
      'INSUFFICIENT_STOCK',
      `재고가 부족합니다. (현재 재고: ${availableStock}개, 장바구니: ${existingItem?.quantity ?? 0}개)`,
    );
  }

  const cartItem = await prisma.cartItem.upsert({
    where: { cartId_variantId: { cartId: cart.id, variantId } },
    create: { cartId: cart.id, variantId, quantity },
    update: { quantity: newQuantity },
  });

  return successResponse(
    {
      id: cartItem.id,
      variant: {
        id: variant.id,
        sku: variant.sku,
        size: variant.size,
        color: variant.color,
        colorCode: variant.colorCode,
        price: Number(variant.price),
        availableStock,
        product: {
          id: variant.product.id,
          name: variant.product.name,
          slug: variant.product.slug,
          primaryImage: variant.product.images[0] ?? null,
        },
      },
      quantity: newQuantity,
    },
    201,
  );
});
