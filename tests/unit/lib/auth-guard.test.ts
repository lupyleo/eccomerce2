import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requireAuth, requireAdmin } from '@/lib/auth-guard';
import { auth } from '@/lib/auth';
import { fixtures } from '../../helpers/test-fixtures';

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

const mockAuth = vi.mocked(auth);

describe('requireAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('유효한 세션 → AuthSession 반환', async () => {
    mockAuth.mockResolvedValue(fixtures.session.customer());

    const session = await requireAuth();

    expect(session.user.id).toBe(fixtures.user.customer().id);
    expect(session.user.email).toBe('customer@test.com');
    expect(session.user.role).toBe('CUSTOMER');
  });

  it('세션 없음 → UnauthorizedError', async () => {
    mockAuth.mockResolvedValue(null);

    await expect(requireAuth()).rejects.toThrow('로그인이 필요합니다.');
  });

  it('user.id 없음 → UnauthorizedError', async () => {
    mockAuth.mockResolvedValue({ user: {} } as never);

    await expect(requireAuth()).rejects.toThrow('로그인이 필요합니다.');
  });
});

describe('requireAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('ADMIN 역할 → AuthSession 반환', async () => {
    mockAuth.mockResolvedValue(fixtures.session.admin());

    const session = await requireAdmin();

    expect(session.user.role).toBe('ADMIN');
  });

  it('CUSTOMER 역할 → ForbiddenError', async () => {
    mockAuth.mockResolvedValue(fixtures.session.customer());

    await expect(requireAdmin()).rejects.toThrow('관리자 권한이 필요합니다.');
  });

  it('미인증 → UnauthorizedError', async () => {
    mockAuth.mockResolvedValue(null);

    await expect(requireAdmin()).rejects.toThrow('로그인이 필요합니다.');
  });
});
