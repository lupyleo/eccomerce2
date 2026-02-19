import type { PrismaClient } from '@prisma/client';
import { AppError, NotFoundError } from '@/lib/errors';
import type { CartIdentity } from '@/lib/cart-identity';
import { cartWhereClause, cartCreateData } from '@/lib/cart-identity';

export class CartService {
  constructor(private readonly prisma: PrismaClient) {}

  async getCart(identity: CartIdentity) {
    const cart = await this.prisma.cart.findUnique({
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
      return { items: [], totalAmount: 0, itemCount: 0 };
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

    return { items, totalAmount, itemCount: items.length };
  }

  async addItem(identity: CartIdentity, variantId: string, quantity: number) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            images: { where: { isPrimary: true }, take: 1 },
          },
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

    let cart = await this.prisma.cart.findUnique({ where: cartWhereClause(identity) });
    if (!cart) {
      cart = await this.prisma.cart.create({ data: cartCreateData(identity) });
    }

    const existingItem = await this.prisma.cartItem.findUnique({
      where: { cartId_variantId: { cartId: cart.id, variantId } },
    });

    const newQuantity = existingItem ? existingItem.quantity + quantity : quantity;
    if (newQuantity > availableStock) {
      throw new AppError(
        'INSUFFICIENT_STOCK',
        `재고가 부족합니다. (현재 재고: ${availableStock}개, 장바구니: ${existingItem?.quantity ?? 0}개)`,
      );
    }

    const cartItem = await this.prisma.cartItem.upsert({
      where: { cartId_variantId: { cartId: cart.id, variantId } },
      create: { cartId: cart.id, variantId, quantity },
      update: { quantity: newQuantity },
    });

    return {
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
    };
  }

  async updateItemQuantity(identity: CartIdentity, itemId: string, quantity: number) {
    const cartItem = await this.prisma.cartItem.findUnique({
      where: { id: itemId },
      include: { cart: true, variant: true },
    });

    if (!cartItem) throw new NotFoundError('장바구니 항목');

    const isOwner =
      identity.type === 'user'
        ? cartItem.cart.userId === identity.userId
        : cartItem.cart.sessionId === identity.sessionId;

    if (!isOwner) throw new NotFoundError('장바구니 항목');

    const availableStock = cartItem.variant.stock - cartItem.variant.reservedStock;
    if (quantity > availableStock) {
      throw new AppError(
        'INSUFFICIENT_STOCK',
        `재고가 부족합니다. (현재 재고: ${availableStock}개)`,
      );
    }

    const updated = await this.prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity },
    });

    return { id: updated.id, quantity: updated.quantity };
  }

  async removeItem(identity: CartIdentity, itemId: string) {
    const cartItem = await this.prisma.cartItem.findUnique({
      where: { id: itemId },
      include: { cart: true },
    });

    if (!cartItem) throw new NotFoundError('장바구니 항목');

    const isOwner =
      identity.type === 'user'
        ? cartItem.cart.userId === identity.userId
        : cartItem.cart.sessionId === identity.sessionId;

    if (!isOwner) throw new NotFoundError('장바구니 항목');

    await this.prisma.cartItem.delete({ where: { id: itemId } });
    return { deleted: true };
  }

  async mergeGuestCart(userId: string, sessionId: string) {
    return this.prisma.$transaction(async (tx) => {
      const guestCart = await tx.cart.findUnique({
        where: { sessionId },
        include: { items: true },
      });

      if (!guestCart || guestCart.items.length === 0) {
        return { merged: 0 };
      }

      let userCart = await tx.cart.findUnique({
        where: { userId },
        include: { items: true },
      });

      if (!userCart) {
        userCart = await tx.cart.create({
          data: { userId },
          include: { items: true },
        });
      }

      let mergedCount = 0;
      for (const guestItem of guestCart.items) {
        const existingItem = userCart.items.find(
          (item) => item.variantId === guestItem.variantId,
        );

        if (existingItem) {
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

      await tx.cart.delete({ where: { id: guestCart.id } });
      return { merged: mergedCount };
    });
  }
}
