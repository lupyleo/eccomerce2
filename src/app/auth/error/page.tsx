'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';
import { Button } from '@/presentation/components/ui';

const errorMessages: Record<string, string> = {
  Configuration: '소셜 로그인 처리 중 오류가 발생했습니다. 서버 로그를 확인해주세요.',
  AccessDenied: '접근이 거부되었습니다.',
  Verification: '인증 링크가 만료되었습니다.',
  OAuthSignin: '소셜 로그인 시작에 실패했습니다.',
  OAuthCallback: '소셜 로그인 처리 중 오류가 발생했습니다.',
  OAuthCreateAccount: '소셜 계정으로 회원가입에 실패했습니다.',
  OAuthAccountNotLinked:
    '이미 다른 방법으로 가입된 이메일입니다. 기존 로그인 방식을 이용해주세요.',
  CallbackRouteError: '소셜 로그인 콜백 처리 중 오류가 발생했습니다.',
  Default: '로그인 중 오류가 발생했습니다.',
};

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const errorCode = searchParams.get('error') ?? 'Default';
  const message = errorMessages[errorCode] ?? errorMessages.Default;

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <svg
              className="w-8 h-8 text-destructive"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">로그인 오류</h1>
          <p className="mt-3 text-sm text-gray-500">{message}</p>
        </div>
        <Link href="/auth/login">
          <Button variant="primary" className="w-full">
            로그인으로 돌아가기
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[calc(100vh-200px)] flex items-center justify-center">
          <p className="text-gray-500">로딩 중...</p>
        </div>
      }
    >
      <AuthErrorContent />
    </Suspense>
  );
}
