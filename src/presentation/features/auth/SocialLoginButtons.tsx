'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

function KakaoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        d="M12 3C6.48 3 2 6.48 2 10.8c0 2.76 1.84 5.18 4.6 6.56-.2.72-.72 2.6-.82 3-.14.52.18.52.4.38.16-.1 2.6-1.76 3.64-2.48.7.1 1.44.14 2.18.14 5.52 0 10-3.48 10-7.8S17.52 3 12 3z"
        fill="#191919"
      />
    </svg>
  );
}

function NaverIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        d="M16.27 3H7.73A4.73 4.73 0 0 0 3 7.73v8.54A4.73 4.73 0 0 0 7.73 21h8.54A4.73 4.73 0 0 0 21 16.27V7.73A4.73 4.73 0 0 0 16.27 3zm.23 12.97h-2.66l-3.41-4.64v4.64H7.77V8.03h2.66l3.41 4.64V8.03h2.66v7.94z"
        fill="white"
      />
    </svg>
  );
}

const providers = [
  {
    id: 'google',
    name: 'Google',
    bgColor: 'bg-white border border-gray-300 hover:bg-gray-50',
    textColor: 'text-gray-700',
    Icon: GoogleIcon,
  },
  {
    id: 'kakao',
    name: '카카오',
    bgColor: 'bg-[#FEE500] hover:bg-[#FDD800]',
    textColor: 'text-[#191919]',
    Icon: KakaoIcon,
  },
  {
    id: 'naver',
    name: '네이버',
    bgColor: 'bg-[#03C75A] hover:bg-[#02B350]',
    textColor: 'text-white',
    Icon: NaverIcon,
  },
] as const;

interface SocialLoginButtonsProps {
  callbackUrl?: string;
}

export default function SocialLoginButtons({ callbackUrl = '/' }: SocialLoginButtonsProps) {
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);

  const handleSocialLogin = async (providerId: string) => {
    setLoadingProvider(providerId);
    await signIn(providerId, { callbackUrl });
  };

  return (
    <div className="space-y-3">
      {providers.map((provider) => (
        <button
          key={provider.id}
          type="button"
          onClick={() => handleSocialLogin(provider.id)}
          disabled={loadingProvider !== null}
          className={`w-full h-11 flex items-center justify-center gap-3 rounded-md font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${provider.bgColor} ${provider.textColor}`}
        >
          <provider.Icon className="w-5 h-5" />
          {loadingProvider === provider.id ? '연결 중...' : `${provider.name}로 계속하기`}
        </button>
      ))}
    </div>
  );
}
