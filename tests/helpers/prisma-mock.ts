import { vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';

type MockPrismaModel = {
  findMany: ReturnType<typeof vi.fn>;
  findUnique: ReturnType<typeof vi.fn>;
  findFirst: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  upsert: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  count: ReturnType<typeof vi.fn>;
  groupBy: ReturnType<typeof vi.fn>;
};

function createMockModel(): MockPrismaModel {
  return {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
    groupBy: vi.fn(),
  };
}

export type MockPrismaClient = {
  [K in keyof Pick<
    PrismaClient,
    | 'product'
    | 'productVariant'
    | 'productImage'
    | 'category'
    | 'brand'
    | 'cart'
    | 'cartItem'
    | 'order'
    | 'orderItem'
    | 'payment'
    | 'user'
    | 'coupon'
    | 'promotion'
    | 'return'
    | 'shipment'
    | 'stockLog'
  >]: MockPrismaModel;
} & {
  $transaction: ReturnType<typeof vi.fn>;
};

export function createMockPrisma(): MockPrismaClient {
  return {
    product: createMockModel(),
    productVariant: createMockModel(),
    productImage: createMockModel(),
    category: createMockModel(),
    brand: createMockModel(),
    cart: createMockModel(),
    cartItem: createMockModel(),
    order: createMockModel(),
    orderItem: createMockModel(),
    payment: createMockModel(),
    user: createMockModel(),
    coupon: createMockModel(),
    promotion: createMockModel(),
    return: createMockModel(),
    shipment: createMockModel(),
    stockLog: createMockModel(),
    $transaction: vi.fn((fn) => fn()),
  };
}
