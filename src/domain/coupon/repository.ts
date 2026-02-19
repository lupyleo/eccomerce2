import type { CouponEntity } from './entities';

export interface CouponRepository {
  findById(id: string): Promise<CouponEntity | null>;
  findByCode(code: string): Promise<CouponEntity | null>;
  findMany(page: number, limit: number, isActive?: boolean): Promise<{ data: CouponEntity[]; total: number }>;
  create(data: Omit<CouponEntity, 'id' | 'usedCount' | 'createdAt'>): Promise<CouponEntity>;
  update(id: string, data: Partial<CouponEntity>): Promise<CouponEntity>;
  delete(id: string): Promise<void>;
}
