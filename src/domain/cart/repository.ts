import type { CartEntity, CartItemEntity } from './entities';

export interface CartRepository {
  findByUserId(userId: string): Promise<CartEntity | null>;
  findBySessionId(sessionId: string): Promise<CartEntity | null>;
  create(data: Omit<CartEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<CartEntity>;
  addItem(data: Omit<CartItemEntity, 'id'>): Promise<CartItemEntity>;
  updateItemQuantity(id: string, quantity: number): Promise<CartItemEntity>;
  removeItem(id: string): Promise<void>;
  clear(cartId: string): Promise<void>;
}
