import { test, expect } from '@playwright/test';

test.describe('상품', () => {
  test('상품 목록 API 응답', async ({ request }) => {
    const res = await request.get('/api/products');
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
  });

  test('상품 목록 페이지 로딩', async ({ page }) => {
    await page.goto('/products');
    await expect(page.locator('main')).toBeVisible();
  });

  test('카테고리 필터링 API', async ({ request }) => {
    const res = await request.get('/api/products?category=shirts');
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  test('브랜드 필터링 API', async ({ request }) => {
    const res = await request.get('/api/products?brand=nike');
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  test('가격 정렬 API', async ({ request }) => {
    const res = await request.get('/api/products?sort=price_asc');
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json.success).toBe(true);
    if (json.data.length >= 2) {
      expect(json.data[0].basePrice).toBeLessThanOrEqual(json.data[1].basePrice);
    }
  });

  test('상품 검색 API', async ({ request }) => {
    const res = await request.get('/api/products?search=test');
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  test('페이지네이션 API', async ({ request }) => {
    const res = await request.get('/api/products?page=1&limit=5');
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json.meta).toHaveProperty('page');
    expect(json.meta).toHaveProperty('totalPages');
    expect(json.meta.page).toBe(1);
    expect(json.data.length).toBeLessThanOrEqual(5);
  });

  test('카테고리 API - 트리 구조', async ({ request }) => {
    const res = await request.get('/api/categories');
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
    // Check tree structure - each item should have children array
    if (json.data.length > 0) {
      expect(json.data[0]).toHaveProperty('children');
    }
  });

  test('브랜드 API - 목록', async ({ request }) => {
    const res = await request.get('/api/brands');
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
  });
});
