export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 400,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super('NOT_FOUND', `${resource}을(를) 찾을 수 없습니다.`, 404);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = '로그인이 필요합니다.') {
    super('UNAUTHORIZED', message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = '접근 권한이 없습니다.') {
    super('FORBIDDEN', message, 403);
  }
}

export class OrderStateTransitionError extends AppError {
  constructor(from: string, to: string) {
    super(
      'INVALID_STATE_TRANSITION',
      `주문 상태를 ${from}에서 ${to}(으)로 변경할 수 없습니다.`,
    );
  }
}
