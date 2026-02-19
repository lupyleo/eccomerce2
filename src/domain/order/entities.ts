import type { OrderStatus, PaymentMethod } from '@prisma/client';

export interface OrderEntity {
  id: string;
  orderNumber: string;
  userId: string;
  status: OrderStatus;
  totalAmount: number;
  discountAmount: number;
  shippingFee: number;
  finalAmount: number;
  addressSnapshot: Record<string, unknown>;
  couponId: string | null;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItemEntity {
  id: string;
  orderId: string;
  variantId: string;
  productName: string;
  variantInfo: string;
  price: number;
  quantity: number;
  subtotal: number;
}

export interface CreateOrderDto {
  addressId: string;
  couponCode?: string;
  paymentMethod: PaymentMethod;
  note?: string;
}
