import type { PrismaClient, Prisma } from '@prisma/client';
import type { InventoryRepository } from '@/domain/inventory/repository';
import type { StockLogEntity, StockInfo } from '@/domain/inventory/entities';

export class PrismaInventoryRepository implements InventoryRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async getStockInfo(variantId: string): Promise<StockInfo | null> {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
      include: { product: { select: { name: true } } },
    });

    if (!variant) return null;

    return {
      variantId: variant.id,
      sku: variant.sku,
      productName: variant.product.name,
      size: variant.size,
      color: variant.color,
      stock: variant.stock,
      reservedStock: variant.reservedStock,
      availableStock: variant.stock - variant.reservedStock,
    };
  }

  async getLowStockAlerts(threshold: number): Promise<StockInfo[]> {
    const variants = await this.prisma.productVariant.findMany({
      where: { isActive: true },
      include: { product: { select: { name: true } } },
    });

    return variants
      .map((v) => ({
        variantId: v.id,
        sku: v.sku,
        productName: v.product.name,
        size: v.size,
        color: v.color,
        stock: v.stock,
        reservedStock: v.reservedStock,
        availableStock: v.stock - v.reservedStock,
      }))
      .filter((s) => s.availableStock <= threshold);
  }

  async getStockLogs(
    variantId?: string,
    page = 1,
    limit = 20,
  ): Promise<{ data: StockLogEntity[]; total: number }> {
    const where: Prisma.StockLogWhereInput = {};
    if (variantId) where.variantId = variantId;

    const [logs, total] = await Promise.all([
      this.prisma.stockLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.stockLog.count({ where }),
    ]);

    return {
      data: logs.map((l) => ({
        id: l.id,
        variantId: l.variantId,
        type: l.type,
        quantity: l.quantity,
        reason: l.reason,
        referenceId: l.referenceId,
        createdAt: l.createdAt,
      })),
      total,
    };
  }

  async adjustStock(
    variantId: string,
    quantity: number,
    reason: string,
    referenceId?: string,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.productVariant.update({
        where: { id: variantId },
        data: { stock: { increment: quantity } },
      });

      await tx.stockLog.create({
        data: {
          variantId,
          type: quantity > 0 ? 'INBOUND' : 'OUTBOUND',
          quantity,
          reason,
          referenceId,
        },
      });
    });
  }
}
