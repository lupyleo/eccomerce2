export interface CartEntity {
  id: string;
  userId: string | null;
  sessionId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CartItemEntity {
  id: string;
  cartId: string;
  variantId: string;
  quantity: number;
}
