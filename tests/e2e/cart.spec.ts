import { test, expect } from '@playwright/test';

test.describe('장바구니', () => {
  test('비회원 장바구니 API - 세션 ID로 빈 카트 조회', async ({ request }) => {
    const sessionId = `test-session-${Date.now()}`;

    const res = await request.get('/api/cart', {
      headers: { 'x-session-id': sessionId },
    });
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.items).toEqual([]);
    expect(json.data.totalAmount).toBe(0);
    expect(json.data.itemCount).toBe(0);
  });

  test('세션 없이 카트 조회 시 401', async ({ request }) => {
    const res = await request.get('/api/cart');
    expect(res.status()).toBe(401);
  });

  test('장바구니 페이지 접근', async ({ page }) => {
    await page.goto('/cart');
    await expect(page.locator('main')).toBeVisible();
  });

  test('카트 병합 API - 미인증 시 401', async ({ request }) => {
    const res = await request.post('/api/cart/merge', {
      data: { sessionId: 'test-session-123' },
    });
    expect(res.status()).toBe(401);
  });
});
