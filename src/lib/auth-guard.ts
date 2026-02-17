import { auth } from './auth';
import { UnauthorizedError, ForbiddenError } from './errors';

export interface AuthSession {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

export async function requireAuth(): Promise<AuthSession> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new UnauthorizedError();
  }
  return {
    user: {
      id: session.user.id as string,
      email: session.user.email as string,
      name: session.user.name as string,
      role: (session.user as { role?: string }).role ?? 'CUSTOMER',
    },
  };
}

export async function requireAdmin(): Promise<AuthSession> {
  const session = await requireAuth();
  if (session.user.role !== 'ADMIN') {
    throw new ForbiddenError('관리자 권한이 필요합니다.');
  }
  return session;
}
