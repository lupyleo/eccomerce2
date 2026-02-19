import type { StockLogType } from '@prisma/client';

export interface StockLogEntity {
  id: string;
  variantId: string;
  type: StockLogType;
  quantity: number;
  reason: string;
  referenceId: string | null;
  createdAt: Date;
}

export interface StockInfo {
  variantId: string;
  sku: string;
  productName: string;
  size: string;
  color: string;
  stock: number;
  reservedStock: number;
  availableStock: number;
}

export function calculateAvailableStock(stock: number, reservedStock: number): number {
  return Math.max(0, stock - reservedStock);
}
