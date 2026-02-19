import type { ReviewEntity } from './entities';

export interface ReviewRepository {
  findByProductId(productId: string, page: number, limit: number): Promise<{ data: ReviewEntity[]; total: number }>;
  findByUserId(userId: string, page: number, limit: number): Promise<{ data: ReviewEntity[]; total: number }>;
  create(data: Omit<ReviewEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<ReviewEntity>;
  update(id: string, data: Partial<ReviewEntity>): Promise<ReviewEntity>;
  delete(id: string): Promise<void>;
}
