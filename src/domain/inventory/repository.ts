import type { StockLogEntity, StockInfo } from './entities';

export interface InventoryRepository {
  getStockInfo(variantId: string): Promise<StockInfo | null>;
  getLowStockAlerts(threshold: number): Promise<StockInfo[]>;
  getStockLogs(variantId?: string, page?: number, limit?: number): Promise<{ data: StockLogEntity[]; total: number }>;
  adjustStock(variantId: string, quantity: number, reason: string, referenceId?: string): Promise<void>;
}
