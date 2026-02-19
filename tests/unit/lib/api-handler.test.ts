import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { apiHandler, successResponse, paginatedResponse } from '@/lib/api-handler';
import { AppError, NotFoundError, UnauthorizedError, ForbiddenError } from '@/lib/errors';

describe('apiHandler', () => {
  it('정상 응답 반환', async () => {
    const handler = apiHandler(async () => {
      return successResponse({ message: 'ok' });
    });

    const req = new NextRequest('http://localhost:3000/api/test');
    const res = await handler(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.message).toBe('ok');
  });

  it('AppError 발생 시 적절한 에러 응답', async () => {
    const handler = apiHandler(async () => {
      throw new AppError('CUSTOM_ERROR', '커스텀 에러 메시지', 422);
    });

    const req = new NextRequest('http://localhost:3000/api/test');
    const res = await handler(req);
    const body = await res.json();

    expect(res.status).toBe(422);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('CUSTOM_ERROR');
    expect(body.error.message).toBe('커스텀 에러 메시지');
  });

  it('NotFoundError → 404 응답', async () => {
    const handler = apiHandler(async () => {
      throw new NotFoundError('상품');
    });

    const req = new NextRequest('http://localhost:3000/api/test');
    const res = await handler(req);
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('UnauthorizedError → 401 응답', async () => {
    const handler = apiHandler(async () => {
      throw new UnauthorizedError();
    });

    const req = new NextRequest('http://localhost:3000/api/test');
    const res = await handler(req);

    expect(res.status).toBe(401);
  });

  it('ForbiddenError → 403 응답', async () => {
    const handler = apiHandler(async () => {
      throw new ForbiddenError();
    });

    const req = new NextRequest('http://localhost:3000/api/test');
    const res = await handler(req);

    expect(res.status).toBe(403);
  });

  it('미처리 에러 → 500 INTERNAL_ERROR', async () => {
    const handler = apiHandler(async () => {
      throw new Error('unexpected');
    });

    const req = new NextRequest('http://localhost:3000/api/test');
    const res = await handler(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error.code).toBe('INTERNAL_ERROR');
    expect(body.error.message).toBe('서버 오류가 발생했습니다.');
  });
});

describe('successResponse', () => {
  it('기본 200 상태 코드', async () => {
    const res = successResponse({ id: '1' });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ success: true, data: { id: '1' } });
  });

  it('커스텀 상태 코드', async () => {
    const res = successResponse({ created: true }, 201);

    expect(res.status).toBe(201);
  });
});

describe('paginatedResponse', () => {
  it('페이지네이션 메타데이터 포함', async () => {
    const data = [{ id: '1' }, { id: '2' }];
    const res = paginatedResponse(data, { page: 1, limit: 20, total: 42 });
    const body = await res.json();

    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(2);
    expect(body.meta).toEqual({
      page: 1,
      limit: 20,
      total: 42,
      totalPages: 3, // ceil(42/20) = 3
    });
  });

  it('totalPages 올림 계산', async () => {
    const res = paginatedResponse([], { page: 1, limit: 10, total: 1 });
    const body = await res.json();

    expect(body.meta.totalPages).toBe(1);
  });
});
