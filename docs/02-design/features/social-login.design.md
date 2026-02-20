# Social Login Design Document

> **Summary**: Google, Kakao, Naver OAuth 소셜 로그인 상세 설계
>
> **Project**: clothing-ecommerce
> **Version**: 0.1.0
> **Author**: AI
> **Date**: 2026-02-20
> **Status**: Draft
> **Plan Reference**: `docs/01-plan/features/social-login.plan.md`

---

## 1. Overview

### 1.1 Design Goals

- 기존 NextAuth v5 + PrismaAdapter 인프라를 최대한 활용
- 최소한의 코드 변경으로 3개 소셜 프로바이더 연동
- 기존 Credentials 로그인과 자연스럽게 공존하는 UI/UX
- Enterprise 아키텍처(presentation/domain/infrastructure) 패턴 준수

### 1.2 Design Principles

- **기존 코드 우선**: 이미 작동하는 구조를 최대한 재활용
- **점진적 추가**: Naver 프로바이더 추가 + UI 버튼만 신규 작성
- **안전한 계정 연결**: `allowDangerousEmailAccountLinking` 사용 (Google, Kakao, Naver 모두 이메일 인증된 프로바이더)
- **서버사이드 장바구니 병합**: NextAuth `events.signIn`에서 처리

---

## 2. Architecture

### 2.1 OAuth Flow Diagram

```
┌──────────┐     ┌──────────────┐     ┌──────────────────┐     ┌──────────┐
│  Client   │     │   NextAuth   │     │  OAuth Provider   │     │  Prisma  │
│  (React)  │     │   (Server)   │     │ Google/Kakao/Naver│     │   (DB)   │
└────┬─────┘     └──────┬───────┘     └────────┬─────────┘     └────┬─────┘
     │                   │                      │                    │
     │ 1. Click social   │                      │                    │
     │    login button   │                      │                    │
     │──signIn("google")─▶                      │                    │
     │                   │                      │                    │
     │                   │ 2. Redirect to       │                    │
     │                   │    OAuth provider     │                    │
     │                   │─────────────────────▶│                    │
     │                   │                      │                    │
     │                   │ 3. User authorizes   │                    │
     │                   │    & callback         │                    │
     │                   │◀─────────────────────│                    │
     │                   │                      │                    │
     │                   │ 4. PrismaAdapter:                         │
     │                   │    Find/Create User                       │
     │                   │    & Link Account    ────────────────────▶│
     │                   │                                           │
     │                   │ 5. JWT callback:                          │
     │                   │    Add id, role      ◀────────────────────│
     │                   │    to token                               │
     │                   │                      │                    │
     │                   │ 6. events.signIn:    │                    │
     │                   │    Merge guest cart  ────────────────────▶│
     │                   │                                           │
     │ 7. Redirect to    │                      │                    │
     │    home (/)       │                      │                    │
     │◀──────────────────│                      │                    │
```

### 2.2 Component Architecture

```
src/
├── lib/
│   └── auth.ts                          # [수정] Naver 프로바이더 추가, 계정 연결 설정, events 추가
│
├── presentation/
│   ├── features/
│   │   └── auth/
│   │       ├── LoginForm.tsx            # [수정] 소셜 버튼 추가
│   │       ├── SignupForm.tsx           # [수정] 소셜 버튼 추가
│   │       └── SocialLoginButtons.tsx   # [신규] 소셜 로그인 버튼 컴포넌트
│   │
│   └── hooks/
│       └── useAuth.ts                   # [유지] 기존 코드 변경 불필요
│
├── app/
│   ├── auth/
│   │   ├── login/page.tsx              # [유지]
│   │   ├── signup/page.tsx             # [유지]
│   │   └── error/page.tsx              # [신규] 소셜 로그인 에러 페이지
│   │
│   └── api/auth/
│       └── [...nextauth]/route.ts      # [유지] 이미 handlers 연결됨
```

---

## 3. Detailed Design

### 3.1 `src/lib/auth.ts` 수정

**변경 사항:**
1. Naver 프로바이더 추가
2. `allowDangerousEmailAccountLinking: true` 설정 (각 프로바이더)
3. `events.signIn` 콜백에서 장바구니 병합
4. `pages.error` 에러 페이지 지정

```typescript
// src/lib/auth.ts - 수정 후 구조

import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import Kakao from 'next-auth/providers/kakao';
import Naver from 'next-auth/providers/naver';      // 추가
import { PrismaAdapter } from '@auth/prisma-adapter';
import bcrypt from 'bcryptjs';
import { prisma } from './prisma';

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/auth/login',
    error: '/auth/error',                            // 추가
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,       // 추가
    }),
    Kakao({
      clientId: process.env.KAKAO_CLIENT_ID!,
      clientSecret: process.env.KAKAO_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,       // 추가
    }),
    Naver({                                          // 신규 블록
      clientId: process.env.NAVER_CLIENT_ID!,
      clientSecret: process.env.NAVER_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
    Credentials({
      // ... 기존 코드 유지
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // 기존 코드 유지
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? 'CUSTOMER';
      }
      return token;
    },
    async session({ session, token }) {
      // 기존 코드 유지
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as { role?: string }).role = token.role as string;
      }
      return session;
    },
  },
  events: {                                          // 신규 블록
    async signIn({ user, account }) {
      // 소셜 로그인 시 장바구니 병합은 클라이언트에서 처리
      // (서버 events에서는 sessionId 접근 불가)
    },
  },
});
```

**Naver 프로바이더 확인사항:**
- NextAuth v5에 `next-auth/providers/naver`가 공식 포함되어 있음
- Naver API 응답: `response.email`, `response.name`, `response.profile_image`
- NextAuth가 자동으로 profile 매핑 처리

### 3.2 `SocialLoginButtons.tsx` (신규 컴포넌트)

```typescript
// src/presentation/features/auth/SocialLoginButtons.tsx

'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';

interface SocialLoginButtonsProps {
  callbackUrl?: string;
}

const providers = [
  {
    id: 'google',
    name: 'Google',
    bgColor: 'bg-white border border-gray-300 hover:bg-gray-50',
    textColor: 'text-gray-700',
    icon: GoogleIcon,     // SVG 컴포넌트
  },
  {
    id: 'kakao',
    name: '카카오',
    bgColor: 'bg-[#FEE500] hover:bg-[#FDD800]',
    textColor: 'text-[#191919]',
    icon: KakaoIcon,      // SVG 컴포넌트
  },
  {
    id: 'naver',
    name: '네이버',
    bgColor: 'bg-[#03C75A] hover:bg-[#02B350]',
    textColor: 'text-white',
    icon: NaverIcon,      // SVG 컴포넌트
  },
];

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
          onClick={() => handleSocialLogin(provider.id)}
          disabled={loadingProvider !== null}
          className={`w-full h-11 flex items-center justify-center gap-3 rounded-md
            font-medium text-sm transition-colors
            disabled:opacity-50 disabled:cursor-not-allowed
            ${provider.bgColor} ${provider.textColor}`}
        >
          <provider.icon className="w-5 h-5" />
          {provider.name}로 계속하기
        </button>
      ))}
    </div>
  );
}
```

### 3.3 LoginForm.tsx 수정

**변경 사항:** 기존 폼 아래에 구분선 + SocialLoginButtons 추가

```
┌─────────────────────────────────────┐
│            로그인                     │
│                                      │
│  ┌──────────────────────────────┐   │
│  │ 이메일                         │   │
│  └──────────────────────────────┘   │
│  ┌──────────────────────────────┐   │
│  │ 비밀번호                       │   │
│  └──────────────────────────────┘   │
│  ┌──────────────────────────────┐   │
│  │         로그인 버튼             │   │
│  └──────────────────────────────┘   │
│                                      │
│  ────────── 또는 ──────────         │
│                                      │
│  ┌─ G ─ Google로 계속하기 ──────┐   │
│  └──────────────────────────────┘   │
│  ┌─ K ─ 카카오로 계속하기 ──────┐   │
│  └──────────────────────────────┘   │
│  ┌─ N ─ 네이버로 계속하기 ──────┐   │
│  └──────────────────────────────┘   │
│                                      │
│      계정이 없으신가요? 회원가입      │
└─────────────────────────────────────┘
```

**코드 변경 위치:** `LoginForm.tsx`의 `</Button>` 뒤, 회원가입 링크 앞에 삽입

```tsx
{/* 기존 로그인 버튼 아래 */}

<div className="relative my-6">
  <div className="absolute inset-0 flex items-center">
    <span className="w-full border-t" />
  </div>
  <div className="relative flex justify-center text-xs uppercase">
    <span className="bg-background px-2 text-muted-foreground">또는</span>
  </div>
</div>

<SocialLoginButtons callbackUrl="/" />

{/* 기존 회원가입 링크 */}
```

### 3.4 SignupForm.tsx 수정

LoginForm과 동일한 패턴으로 폼 상단(에러 메시지 아래)에 소셜 버튼 + 구분선 추가.
사용자가 소셜 로그인으로 바로 가입할 수 있도록 안내.

```
┌─────────────────────────────────────┐
│            회원가입                   │
│                                      │
│  ┌─ G ─ Google로 계속하기 ──────┐   │
│  ┌─ K ─ 카카오로 계속하기 ──────┐   │
│  ┌─ N ─ 네이버로 계속하기 ──────┐   │
│                                      │
│  ────────── 또는 ──────────         │
│                                      │
│  이름 / 이메일 / 비밀번호 ...       │
│  회원가입 버튼                       │
└─────────────────────────────────────┘
```

### 3.5 Auth Error Page (신규)

```typescript
// src/app/auth/error/page.tsx

// NextAuth 에러 코드별 한국어 메시지 매핑
const errorMessages: Record<string, string> = {
  Configuration: '서버 설정 오류가 발생했습니다.',
  AccessDenied: '접근이 거부되었습니다.',
  Verification: '인증 링크가 만료되었습니다.',
  OAuthSignin: '소셜 로그인 시작에 실패했습니다.',
  OAuthCallback: '소셜 로그인 처리 중 오류가 발생했습니다.',
  OAuthAccountNotLinked: '이미 다른 방법으로 가입된 이메일입니다. 기존 로그인 방식을 이용해주세요.',
  Default: '로그인 중 오류가 발생했습니다.',
};
```

---

## 4. Data Model

### 4.1 기존 스키마 활용 (변경 없음)

Prisma 스키마의 `Account`, `Session`, `VerificationToken` 모델이 이미 NextAuth + PrismaAdapter 호환 구조로 작성되어 있어 **스키마 변경이 필요 없음**.

```
User (1) ──── (N) Account
  │                  ├── provider: "google" | "kakao" | "naver" | "credentials"
  │                  ├── providerAccountId: OAuth 고유 ID
  │                  ├── access_token
  │                  └── refresh_token
  │
  └──── (1) Cart
              └──── (N) CartItem
```

**계정 연결 시나리오:**

| 시나리오 | 동작 |
|----------|------|
| 신규 소셜 로그인 (이메일 미존재) | User 생성 + Account 생성 |
| 신규 소셜 로그인 (동일 이메일 존재) | 기존 User에 Account 연결 (`allowDangerousEmailAccountLinking`) |
| 재로그인 (Account 존재) | 기존 Account로 인증, 토큰 갱신 |

### 4.2 JWT 토큰 구조 (기존 유지)

```typescript
// JWT Token에 포함되는 커스텀 필드
interface CustomJWT {
  id: string;     // User UUID
  role: string;   // "CUSTOMER" | "ADMIN"
  email: string;  // 이메일
  name: string;   // 이름
}
```

---

## 5. Environment Variables

### 5.1 `.env.example` 업데이트

```env
# 기존 (값만 설정 필요)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
KAKAO_CLIENT_ID="your-kakao-client-id"
KAKAO_CLIENT_SECRET="your-kakao-client-secret"

# 신규 추가
NAVER_CLIENT_ID="your-naver-client-id"
NAVER_CLIENT_SECRET="your-naver-client-secret"
```

### 5.2 `.env` 설정

```env
# 각 플랫폼 개발자 콘솔에서 발급받은 키 입력
GOOGLE_CLIENT_ID=실제_발급받은_ID
GOOGLE_CLIENT_SECRET=실제_발급받은_Secret
KAKAO_CLIENT_ID=실제_REST_API_키
KAKAO_CLIENT_SECRET=실제_Client_Secret
NAVER_CLIENT_ID=실제_Client_ID
NAVER_CLIENT_SECRET=실제_Client_Secret
```

---

## 6. Social Login Button Icons

각 프로바이더의 브랜드 가이드라인을 준수하는 아이콘 SVG:

| Provider | 배경색 | 텍스트색 | 아이콘 |
|----------|--------|----------|--------|
| Google | `#FFFFFF` (흰색 + 테두리) | `#374151` (gray-700) | Google "G" 로고 SVG |
| Kakao | `#FEE500` (카카오 옐로) | `#191919` (거의 블랙) | 카카오 말풍선 SVG |
| Naver | `#03C75A` (네이버 그린) | `#FFFFFF` (흰색) | 네이버 "N" 로고 SVG |

---

## 7. Error Handling

### 7.1 에러 시나리오

| 시나리오 | NextAuth Error Code | 사용자 메시지 | 처리 |
|----------|---------------------|---------------|------|
| OAuth 제공자 연결 실패 | `OAuthSignin` | 소셜 로그인 시작에 실패했습니다. | `/auth/error` 페이지로 리디렉트 |
| OAuth 콜백 처리 실패 | `OAuthCallback` | 소셜 로그인 처리 중 오류가 발생했습니다. | `/auth/error` 페이지로 리디렉트 |
| 계정 연결 불가 | `OAuthAccountNotLinked` | 이미 다른 방법으로 가입된 이메일입니다. | `/auth/error` 페이지로 리디렉트 |
| 사용자가 권한 거부 | `AccessDenied` | 접근이 거부되었습니다. | `/auth/error` 페이지로 리디렉트 |
| 환경변수 미설정 | 서버 시작 실패 없음 | (버튼 자체를 숨기지 않음 - 클릭 시 에러 발생) | 에러 페이지에서 안내 |

### 7.2 에러 페이지 UX

```
┌─────────────────────────────────────┐
│                                      │
│       ⚠ 로그인 오류                  │
│                                      │
│  {에러 메시지}                       │
│                                      │
│  ┌──────────────────────────────┐   │
│  │      로그인으로 돌아가기       │   │
│  └──────────────────────────────┘   │
│                                      │
└─────────────────────────────────────┘
```

---

## 8. Cart Merge Strategy

### 8.1 소셜 로그인 후 장바구니 병합

**문제**: 기존 Credentials 로그인은 `useAuth` 훅에서 `mergeGuestCart()`를 호출하지만, 소셜 로그인은 OAuth 리디렉트로 진행되어 클라이언트 훅에서 직접 병합 호출이 어려움.

**해결 방안**: NextAuth의 `events.signIn`에서 서버사이드 병합 처리

```typescript
events: {
  async signIn({ user, account }) {
    // 소셜 로그인의 경우에만 (credentials는 기존 로직 유지)
    // 서버사이드에서는 sessionId를 알 수 없으므로,
    // 클라이언트에서 리디렉트 후 처리하는 방식 유지
  },
},
```

**최종 결정**: 소셜 로그인 후 리디렉트 시 클라이언트에서 자동 병합

1. 소셜 로그인 완료 → 홈(`/`)으로 리디렉트
2. 페이지 로드 시 `useAuth` 훅의 `session` 변경 감지
3. `useCart` 훅에서 세션 변경 시 `mergeGuestCart()` 자동 호출

**구현 위치**: `src/presentation/hooks/useCart.ts`에 세션 변경 감지 로직 추가

```typescript
// useCart.ts 내부
useEffect(() => {
  if (session?.user && sessionId) {
    // 로그인 상태 + 게스트 sessionId가 있으면 병합 시도
    mergeGuestCart();
  }
}, [session?.user?.id]);
```

---

## 9. Security Considerations

- [x] CSRF 보호: NextAuth v5 기본 제공 (state 파라미터, CSRF 토큰)
- [x] OAuth state 검증: NextAuth 기본 제공
- [x] HTTPS: 운영 환경에서 필수 (OAuth 리디렉트 URI 요구)
- [x] 계정 연결 보안: Google/Kakao/Naver 모두 이메일 인증 완료된 프로바이더 → `allowDangerousEmailAccountLinking` 안전
- [x] JWT 시크릿: `NEXTAUTH_SECRET` 환경변수로 서명
- [x] 토큰 탈취 방지: HttpOnly 쿠키 (NextAuth 기본)

---

## 10. Test Plan

### 10.1 테스트 범위

| 구분 | 항목 | 방법 |
|------|------|------|
| 수동 테스트 | Google 로그인 플로우 | 브라우저에서 직접 테스트 |
| 수동 테스트 | Kakao 로그인 플로우 | 브라우저에서 직접 테스트 |
| 수동 테스트 | Naver 로그인 플로우 | 브라우저에서 직접 테스트 |
| 수동 테스트 | 동일 이메일 계정 연결 | 같은 이메일로 Credentials + 소셜 로그인 |
| 수동 테스트 | 장바구니 병합 | 비로그인 상태에서 장바구니에 상품 추가 후 소셜 로그인 |
| 수동 테스트 | 에러 페이지 | OAuth 연결 끊기 후 재시도 |
| 회귀 테스트 | Credentials 로그인 | 기존 이메일/비밀번호 로그인 정상 동작 확인 |

### 10.2 주요 테스트 케이스

| TC | 시나리오 | 기대 결과 |
|----|----------|-----------|
| TC-01 | Google 버튼 클릭 → 계정 선택 → 콜백 | 로그인 성공, 홈으로 리디렉트 |
| TC-02 | Kakao 버튼 클릭 → 동의 → 콜백 | 로그인 성공, 홈으로 리디렉트 |
| TC-03 | Naver 버튼 클릭 → 동의 → 콜백 | 로그인 성공, 홈으로 리디렉트 |
| TC-04 | Credentials로 가입 후 같은 이메일의 Google로 로그인 | 계정 연결, 로그인 성공 |
| TC-05 | 소셜 로그인 상태에서 로그아웃 → 재로그인 | 재로그인 성공 |
| TC-06 | 비로그인 장바구니에 상품 추가 → 소셜 로그인 | 장바구니 병합됨 |
| TC-07 | OAuth 동의 거부 | 에러 페이지 표시 |
| TC-08 | 기존 Credentials 로그인 | 정상 동작 (회귀 없음) |

---

## 11. Implementation Guide

### 11.1 파일 구조 (변경/신규 파일만)

```
eccomerce2/
├── .env.example                                    # [수정] NAVER 환경변수 추가
├── .env                                            # [수정] NAVER 환경변수 추가
├── src/
│   ├── lib/
│   │   └── auth.ts                                # [수정] Naver 추가, 계정 연결, error 페이지
│   ├── presentation/
│   │   └── features/
│   │       └── auth/
│   │           ├── LoginForm.tsx                   # [수정] 소셜 버튼 + 구분선 추가
│   │           ├── SignupForm.tsx                  # [수정] 소셜 버튼 + 구분선 추가
│   │           └── SocialLoginButtons.tsx          # [신규] 소셜 로그인 버튼 컴포넌트
│   └── app/
│       └── auth/
│           └── error/
│               └── page.tsx                        # [신규] 인증 에러 페이지
```

### 11.2 Implementation Order (구현 순서)

```
Step 1: 환경변수 설정
  ├── .env.example에 NAVER 변수 추가
  └── .env에 실제 키 설정 (사용자 작업)

Step 2: auth.ts 수정 (백엔드 핵심)
  ├── Naver 프로바이더 import 및 추가
  ├── 각 프로바이더에 allowDangerousEmailAccountLinking 추가
  └── pages.error 설정 추가

Step 3: SocialLoginButtons 컴포넌트 생성 (UI 핵심)
  ├── 컴포넌트 구조 작성
  ├── 각 프로바이더 SVG 아이콘
  ├── signIn 호출 로직
  └── 로딩 상태 처리

Step 4: LoginForm 수정
  ├── SocialLoginButtons import
  ├── 구분선 (Divider) 추가
  └── SocialLoginButtons 배치

Step 5: SignupForm 수정
  ├── SocialLoginButtons import
  ├── 구분선 (Divider) 추가
  └── SocialLoginButtons 배치

Step 6: Auth Error 페이지 생성
  ├── 에러 코드별 메시지 매핑
  ├── 에러 표시 UI
  └── 로그인 페이지 복귀 링크

Step 7: 장바구니 병합 확인
  └── 소셜 로그인 후 세션 변경 시 mergeGuestCart 동작 확인

Step 8: 수동 테스트
  ├── 각 프로바이더별 로그인 테스트
  ├── 계정 연결 테스트
  ├── 장바구니 병합 테스트
  └── 회귀 테스트 (Credentials 로그인)
```

### 11.3 Dependencies

```
필요한 패키지: 없음 (모두 기존 설치된 next-auth에 포함)
- next-auth/providers/google    ✅ 설치됨
- next-auth/providers/kakao     ✅ 설치됨
- next-auth/providers/naver     ✅ 설치됨 (next-auth에 포함)
- next-auth/react (signIn)      ✅ 설치됨
```

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-02-20 | Initial design | AI |
