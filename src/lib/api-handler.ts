import { NextRequest, NextResponse } from 'next/server';
import { AppError } from './errors';

export function apiHandler(
  handler: (req: NextRequest, ...args: never[]) => Promise<NextResponse>,
) {
  return async (req: NextRequest, ...args: never[]) => {
    try {
      return await handler(req, ...args);
    } catch (error) {
      if (error instanceof AppError) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: error.code,
              message: error.message,
              details: error.details,
            },
          },
          { status: error.statusCode },
        );
      }

      console.error('Unhandled error:', error);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: '서버 오류가 발생했습니다.',
          },
        },
        { status: 500 },
      );
    }
  };
}

export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function paginatedResponse<T>(
  data: T[],
  meta: { page: number; limit: number; total: number },
) {
  return NextResponse.json({
    success: true,
    data,
    meta: {
      ...meta,
      totalPages: Math.ceil(meta.total / meta.limit),
    },
  });
}
