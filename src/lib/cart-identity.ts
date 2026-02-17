import { NextRequest } from 'next/server';
import { auth } from './auth';
import { AppError } from './errors';

export type CartIdentity =
  | { type: 'user'; userId: string }
  | { type: 'guest'; sessionId: string };

export async function getCartIdentity(req: NextRequest): Promise<CartIdentity> {
  const session = await auth();
  if (session?.user?.id) {
    return { type: 'user', userId: session.user.id as string };
  }

  const sessionId = req.headers.get('x-session-id');
  if (!sessionId) {
    throw new AppError('SESSION_REQUIRED', '로그인하거나 세션 ID가 필요합니다.', 401);
  }

  return { type: 'guest', sessionId };
}

export function cartWhereClause(identity: CartIdentity) {
  return identity.type === 'user'
    ? { userId: identity.userId }
    : { sessionId: identity.sessionId };
}

export function cartCreateData(identity: CartIdentity) {
  return identity.type === 'user'
    ? { userId: identity.userId }
    : { sessionId: identity.sessionId };
}
