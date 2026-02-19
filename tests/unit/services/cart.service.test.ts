import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CartService } from '@/application/cart/cart.service';
import { createMockPrisma, type MockPrismaClient } from '../../helpers/prisma-mock';
import { fixtures } from '../../helpers/test-fixtures';
import type { PrismaClient } from '@prisma/client';

describe('CartService', () => {
  let service: CartService;
  let mockPrisma: MockPrismaClient;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    service = new CartService(mockPrisma as unknown as PrismaClient);
  });

  // ──────────────────────────────────────────
  // getCart
  // ──────────────────────────────────────────
  describe('getCart', () => {
    it('빈 카트 반환 - 카트가 없는 경우', async () => {
      mockPrisma.cart.findUnique.mockResolvedValue(null);

      const result = await service.getCart({ type: 'guest', sessionId: 'session-1' });

      expect(result).toEqual({ items: [], totalAmount: 0, itemCount: 0 });
    });

    it('게스트 세션으로 카트 조회', async () => {
      const variant = fixtures.variant.tshirtM();
      const product = fixtures.product.tshirt();
      mockPrisma.cart.findUnique.mockResolvedValue({
        ...fixtures.cart.guest(),
        items: [
          {
            ...fixtures.cartItem.guestItem1(),
            variant: {
              ...variant,
              product: {
                id: product.id,
                name: product.name,
                slug: product.slug,
                images: [{ url: '/img.jpg', alt: 'test' }],
              },
            },
          },
        ],
      });

      const result = await service.getCart({ type: 'guest', sessionId: 'guest-session-123' });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].quantity).toBe(2);
      expect(result.items[0].variant.size).toBe('M');
      expect(result.items[0].subtotal).toBe(58000); // 29000 * 2
      expect(result.totalAmount).toBe(58000);
      expect(result.itemCount).toBe(1);
    });

    it('userId로 사용자 카트 조회', async () => {
      mockPrisma.cart.findUnique.mockResolvedValue({
        ...fixtures.cart.user(),
        items: [],
      });

      const result = await service.getCart({ type: 'user', userId: fixtures.user.customer().id });

      expect(result).toEqual({ items: [], totalAmount: 0, itemCount: 0 });
      expect(mockPrisma.cart.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: fixtures.user.customer().id },
        }),
      );
    });
  });

  // ──────────────────────────────────────────
  // addItem
  // ──────────────────────────────────────────
  describe('addItem', () => {
    it('새 아이템 추가 - 카트 자동 생성', async () => {
      const variant = fixtures.variant.tshirtM();
      const product = fixtures.product.tshirt();
      mockPrisma.productVariant.findUnique.mockResolvedValue({
        ...variant,
        product: { id: product.id, name: product.name, slug: product.slug, images: [] },
      });
      mockPrisma.cart.findUnique.mockResolvedValue(null);
      mockPrisma.cart.create.mockResolvedValue(fixtures.cart.guest());
      mockPrisma.cartItem.findUnique.mockResolvedValue(null);
      mockPrisma.cartItem.upsert.mockResolvedValue({
        id: 'new-item-id',
        cartId: fixtures.cart.guest().id,
        variantId: variant.id,
        quantity: 1,
      });

      const result = await service.addItem(
        { type: 'guest', sessionId: 'guest-session-123' },
        variant.id,
        1,
      );

      expect(result.quantity).toBe(1);
      expect(result.variant.id).toBe(variant.id);
      expect(mockPrisma.cart.create).toHaveBeenCalled();
    });

    it('동일 variant 중복 추가 시 수량 합산', async () => {
      const variant = fixtures.variant.tshirtM();
      const product = fixtures.product.tshirt();
      mockPrisma.productVariant.findUnique.mockResolvedValue({
        ...variant,
        product: { id: product.id, name: product.name, slug: product.slug, images: [] },
      });
      mockPrisma.cart.findUnique.mockResolvedValue(fixtures.cart.guest());
      mockPrisma.cartItem.findUnique.mockResolvedValue({
        ...fixtures.cartItem.guestItem1(),
        quantity: 2,
      });
      mockPrisma.cartItem.upsert.mockResolvedValue({
        id: fixtures.cartItem.guestItem1().id,
        cartId: fixtures.cart.guest().id,
        variantId: variant.id,
        quantity: 3,
      });

      const result = await service.addItem(
        { type: 'guest', sessionId: 'guest-session-123' },
        variant.id,
        1,
      );

      expect(result.quantity).toBe(3); // 2 + 1
    });

    it('비활성 variant 추가 시 에러', async () => {
      mockPrisma.productVariant.findUnique.mockResolvedValue({
        ...fixtures.variant.inactive(),
      });

      await expect(
        service.addItem({ type: 'guest', sessionId: 'session-1' }, fixtures.variant.inactive().id, 1),
      ).rejects.toThrow('상품 옵션을 찾을 수 없습니다.');
    });

    it('존재하지 않는 variant 추가 시 에러', async () => {
      mockPrisma.productVariant.findUnique.mockResolvedValue(null);

      await expect(
        service.addItem({ type: 'guest', sessionId: 'session-1' }, 'nonexistent-id', 1),
      ).rejects.toThrow('상품 옵션을 찾을 수 없습니다.');
    });

    it('재고 초과 시 INSUFFICIENT_STOCK 에러', async () => {
      const variant = fixtures.variant.tshirtM(); // stock:50, reserved:5 → available:45
      mockPrisma.productVariant.findUnique.mockResolvedValue({
        ...variant,
        product: { id: 'p1', name: 'test', slug: 'test', images: [] },
      });
      mockPrisma.cart.findUnique.mockResolvedValue(fixtures.cart.guest());
      mockPrisma.cartItem.findUnique.mockResolvedValue(null);

      await expect(
        service.addItem({ type: 'guest', sessionId: 'guest-session-123' }, variant.id, 100),
      ).rejects.toThrow('재고가 부족합니다.');
    });

    it('기존 수량 + 추가 수량이 재고 초과 시 에러', async () => {
      const variant = fixtures.variant.tshirtM(); // available: 45
      mockPrisma.productVariant.findUnique.mockResolvedValue({
        ...variant,
        product: { id: 'p1', name: 'test', slug: 'test', images: [] },
      });
      mockPrisma.cart.findUnique.mockResolvedValue(fixtures.cart.guest());
      mockPrisma.cartItem.findUnique.mockResolvedValue({
        ...fixtures.cartItem.guestItem1(),
        quantity: 44,
      });

      await expect(
        service.addItem({ type: 'guest', sessionId: 'guest-session-123' }, variant.id, 2),
      ).rejects.toThrow('재고가 부족합니다.');
    });
  });

  // ──────────────────────────────────────────
  // updateItemQuantity
  // ──────────────────────────────────────────
  describe('updateItemQuantity', () => {
    it('소유자가 수량 변경 성공', async () => {
      const item = fixtures.cartItem.guestItem1();
      const variant = fixtures.variant.tshirtM();
      mockPrisma.cartItem.findUnique.mockResolvedValue({
        ...item,
        cart: fixtures.cart.guest(),
        variant,
      });
      mockPrisma.cartItem.update.mockResolvedValue({ id: item.id, quantity: 5 });

      const result = await service.updateItemQuantity(
        { type: 'guest', sessionId: 'guest-session-123' },
        item.id,
        5,
      );

      expect(result.quantity).toBe(5);
    });

    it('타인의 카트 아이템 수량 변경 차단', async () => {
      const item = fixtures.cartItem.guestItem1();
      const variant = fixtures.variant.tshirtM();
      mockPrisma.cartItem.findUnique.mockResolvedValue({
        ...item,
        cart: fixtures.cart.guest(), // sessionId: 'guest-session-123'
        variant,
      });

      await expect(
        service.updateItemQuantity(
          { type: 'guest', sessionId: 'different-session' },
          item.id,
          5,
        ),
      ).rejects.toThrow('찾을 수 없습니다');
    });

    it('존재하지 않는 아이템 수량 변경 시 에러', async () => {
      mockPrisma.cartItem.findUnique.mockResolvedValue(null);

      await expect(
        service.updateItemQuantity({ type: 'guest', sessionId: 'session-1' }, 'nonexistent', 1),
      ).rejects.toThrow('찾을 수 없습니다');
    });

    it('재고 초과 수량 변경 시 에러', async () => {
      const item = fixtures.cartItem.guestItem1();
      const variant = fixtures.variant.tshirtM(); // available: 45
      mockPrisma.cartItem.findUnique.mockResolvedValue({
        ...item,
        cart: fixtures.cart.guest(),
        variant,
      });

      await expect(
        service.updateItemQuantity(
          { type: 'guest', sessionId: 'guest-session-123' },
          item.id,
          100,
        ),
      ).rejects.toThrow('재고가 부족합니다.');
    });
  });

  // ──────────────────────────────────────────
  // removeItem
  // ──────────────────────────────────────────
  describe('removeItem', () => {
    it('소유자가 아이템 삭제 성공', async () => {
      const item = fixtures.cartItem.guestItem1();
      mockPrisma.cartItem.findUnique.mockResolvedValue({
        ...item,
        cart: fixtures.cart.guest(),
      });
      mockPrisma.cartItem.delete.mockResolvedValue(item);

      const result = await service.removeItem(
        { type: 'guest', sessionId: 'guest-session-123' },
        item.id,
      );

      expect(result.deleted).toBe(true);
      expect(mockPrisma.cartItem.delete).toHaveBeenCalledWith({ where: { id: item.id } });
    });

    it('타인의 아이템 삭제 차단', async () => {
      const item = fixtures.cartItem.guestItem1();
      mockPrisma.cartItem.findUnique.mockResolvedValue({
        ...item,
        cart: fixtures.cart.guest(),
      });

      await expect(
        service.removeItem({ type: 'guest', sessionId: 'different-session' }, item.id),
      ).rejects.toThrow('찾을 수 없습니다');
    });
  });

  // ──────────────────────────────────────────
  // mergeGuestCart
  // ──────────────────────────────────────────
  describe('mergeGuestCart', () => {
    beforeEach(() => {
      // $transaction executes the callback with the mock prisma itself
      mockPrisma.$transaction.mockImplementation((fn: (tx: MockPrismaClient) => Promise<unknown>) =>
        fn(mockPrisma),
      );
    });

    it('유저 카트 없을 때 병합 - 카트 생성 후 아이템 이동', async () => {
      const guestCart = fixtures.cart.guest();
      const guestItems = [fixtures.cartItem.guestItem1(), fixtures.cartItem.guestItem2()];

      mockPrisma.cart.findUnique
        .mockResolvedValueOnce({ ...guestCart, items: guestItems }) // guest cart
        .mockResolvedValueOnce(null); // no user cart
      mockPrisma.cart.create.mockResolvedValue({
        ...fixtures.cart.user(),
        items: [],
      });
      mockPrisma.cartItem.create.mockResolvedValue({});

      const result = await service.mergeGuestCart(fixtures.user.customer().id, 'guest-session-123');

      expect(result.merged).toBe(2);
      expect(mockPrisma.cart.create).toHaveBeenCalled();
      expect(mockPrisma.cartItem.create).toHaveBeenCalledTimes(2);
      expect(mockPrisma.cart.delete).toHaveBeenCalledWith({ where: { id: guestCart.id } });
    });

    it('유저 카트 있고 중복 variant가 있을 때 수량 합산', async () => {
      const guestCart = fixtures.cart.guest();
      const guestItems = [fixtures.cartItem.guestItem1()]; // variantId: uuid(40), qty: 2

      const userCart = fixtures.cart.user();
      const userItems = [fixtures.cartItem.userItem1()]; // same variantId: uuid(40), qty: 1

      mockPrisma.cart.findUnique
        .mockResolvedValueOnce({ ...guestCart, items: guestItems })
        .mockResolvedValueOnce({ ...userCart, items: userItems });
      mockPrisma.cartItem.update.mockResolvedValue({});

      const result = await service.mergeGuestCart(fixtures.user.customer().id, 'guest-session-123');

      expect(result.merged).toBe(1);
      expect(mockPrisma.cartItem.update).toHaveBeenCalledWith({
        where: { id: userItems[0].id },
        data: { quantity: 3 }, // 1 + 2
      });
      expect(mockPrisma.cart.delete).toHaveBeenCalled();
    });

    it('유저 카트 있고 중복 없을 때 새 아이템 생성', async () => {
      const guestCart = fixtures.cart.guest();
      const guestItems = [fixtures.cartItem.guestItem2()]; // variantId: uuid(43)

      const userCart = fixtures.cart.user();
      const userItems = [fixtures.cartItem.userItem1()]; // variantId: uuid(40)

      mockPrisma.cart.findUnique
        .mockResolvedValueOnce({ ...guestCart, items: guestItems })
        .mockResolvedValueOnce({ ...userCart, items: userItems });
      mockPrisma.cartItem.create.mockResolvedValue({});

      const result = await service.mergeGuestCart(fixtures.user.customer().id, 'guest-session-123');

      expect(result.merged).toBe(1);
      expect(mockPrisma.cartItem.create).toHaveBeenCalledWith({
        data: {
          cartId: userCart.id,
          variantId: guestItems[0].variantId,
          quantity: guestItems[0].quantity,
        },
      });
    });

    it('빈 게스트 카트 병합 시 merged: 0', async () => {
      mockPrisma.cart.findUnique.mockResolvedValueOnce({
        ...fixtures.cart.guest(),
        items: [],
      });

      const result = await service.mergeGuestCart(fixtures.user.customer().id, 'guest-session-123');

      expect(result.merged).toBe(0);
      expect(mockPrisma.cart.delete).not.toHaveBeenCalled();
    });

    it('존재하지 않는 세션 병합 시 merged: 0', async () => {
      mockPrisma.cart.findUnique.mockResolvedValueOnce(null);

      const result = await service.mergeGuestCart(fixtures.user.customer().id, 'nonexistent-session');

      expect(result.merged).toBe(0);
    });

    it('병합 후 게스트 카트 삭제 확인', async () => {
      const guestCart = fixtures.cart.guest();
      mockPrisma.cart.findUnique
        .mockResolvedValueOnce({ ...guestCart, items: [fixtures.cartItem.guestItem1()] })
        .mockResolvedValueOnce({ ...fixtures.cart.user(), items: [] });
      mockPrisma.cartItem.create.mockResolvedValue({});

      await service.mergeGuestCart(fixtures.user.customer().id, 'guest-session-123');

      expect(mockPrisma.cart.delete).toHaveBeenCalledWith({ where: { id: guestCart.id } });
    });
  });
});
