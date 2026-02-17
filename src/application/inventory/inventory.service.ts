import type { Prisma, ProductVariant } from '@prisma/client';
import { AppError } from '@/lib/errors';

export interface CartItemWithVariant {
  variantId: string;
  quantity: number;
  variant: {
    product: { id: string; name: string };
    size: string;
    color: string;
    price: Prisma.Decimal;
  };
}

export interface ReservedItem {
  variantId: string;
  productId: string;
  productName: string;
  size: string;
  color: string;
  price: number;
  quantity: number;
}

type PrismaTransaction = Prisma.TransactionClient;

export class InventoryService {
  async reserveStock(
    tx: PrismaTransaction,
    items: CartItemWithVariant[],
  ): Promise<ReservedItem[]> {
    const reserved: ReservedItem[] = [];

    for (const item of items) {
      // SELECT FOR UPDATE: block concurrent access
      const [variant] = await tx.$queryRaw<
        (ProductVariant & { product_id: string })[]
      >`
        SELECT * FROM product_variants
        WHERE id = ${item.variantId}::uuid
        FOR UPDATE
      `;

      if (!variant) {
        throw new AppError('VARIANT_NOT_FOUND', '상품 옵션을 찾을 수 없습니다.');
      }

      const availableStock = variant.stock - variant.reservedStock;
      if (availableStock < item.quantity) {
        throw new AppError(
          'INSUFFICIENT_STOCK',
          `재고가 부족합니다. (${item.variant.size}/${item.variant.color}: 현재 ${availableStock}개)`,
        );
      }

      await tx.productVariant.update({
        where: { id: item.variantId },
        data: { reservedStock: { increment: item.quantity } },
      });

      await tx.stockLog.create({
        data: {
          variantId: item.variantId,
          type: 'RESERVE',
          quantity: item.quantity,
          reason: '주문 재고 예약',
        },
      });

      reserved.push({
        variantId: item.variantId,
        productId: item.variant.product.id,
        productName: item.variant.product.name,
        size: item.variant.size,
        color: item.variant.color,
        price: Number(item.variant.price),
        quantity: item.quantity,
      });
    }

    return reserved;
  }

  async confirmReservation(
    tx: PrismaTransaction,
    items: ReservedItem[],
    orderNumber: string,
  ): Promise<void> {
    for (const item of items) {
      await tx.productVariant.update({
        where: { id: item.variantId },
        data: {
          stock: { decrement: item.quantity },
          reservedStock: { decrement: item.quantity },
        },
      });

      await tx.stockLog.create({
        data: {
          variantId: item.variantId,
          type: 'OUTBOUND',
          quantity: -item.quantity,
          reason: '주문 확정 출고',
          referenceId: orderNumber,
        },
      });

      // Check if all variants are out of stock
      const variant = await tx.productVariant.findUnique({
        where: { id: item.variantId },
        include: { product: { include: { variants: true } } },
      });

      if (variant) {
        const allOutOfStock = variant.product.variants.every(
          (v) => v.stock - v.reservedStock <= 0,
        );
        if (allOutOfStock) {
          await tx.product.update({
            where: { id: item.productId },
            data: { status: 'SOLD_OUT' },
          });
        }
      }
    }
  }

  async releaseStock(
    tx: PrismaTransaction,
    items: ReservedItem[],
  ): Promise<void> {
    for (const item of items) {
      await tx.productVariant.update({
        where: { id: item.variantId },
        data: { reservedStock: { decrement: item.quantity } },
      });

      await tx.stockLog.create({
        data: {
          variantId: item.variantId,
          type: 'RELEASE',
          quantity: item.quantity,
          reason: '결제 실패/취소 재고 복구',
        },
      });
    }
  }
}
