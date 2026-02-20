# Social Login Planning Document

> **Summary**: Google, Kakao, Naver OAuth 소셜 로그인 연동
>
> **Project**: clothing-ecommerce
> **Version**: 0.1.0
> **Author**: AI
> **Date**: 2026-02-20
> **Status**: Draft

---

## 1. Overview

### 1.1 Purpose

사용자가 별도 회원가입 없이 기존 소셜 계정(Google, Kakao, Naver)으로 간편하게 로그인할 수 있도록 한다. 이를 통해 가입 전환율을 높이고 비밀번호 관리 부담을 줄인다.

### 1.2 Background

- 현재 이메일/비밀번호 기반 Credentials 로그인만 존재
- NextAuth v5 + PrismaAdapter가 이미 구성되어 있고, Google/Kakao 프로바이더 코드가 존재하나 실제 OAuth 키가 미설정
- Naver 프로바이더는 코드 자체가 없음
- 로그인 UI에 소셜 로그인 버튼이 없음

### 1.3 Related Documents

- Design: `docs/02-design/features/social-login.design.md` (작성 예정)
- 기존 Auth 설정: `src/lib/auth.ts`
- Prisma Schema: `prisma/schema.prisma` (Account, Session 모델 존재)

---

## 2. Scope

### 2.1 In Scope

- [x] Google OAuth 2.0 연동
- [x] Kakao OAuth 연동
- [x] Naver OAuth 연동
- [x] 각 플랫폼 개발자 콘솔 설정 가이드
- [x] 로그인/회원가입 UI에 소셜 로그인 버튼 추가
- [x] 기존 이메일 계정과 소셜 계정 자동 연결 (동일 이메일 기준)
- [x] 환경변수 설정 및 `.env.example` 업데이트

### 2.2 Out of Scope

- 소셜 로그인 후 추가 정보 입력 폼 (전화번호 등)
- 마이페이지에서 소셜 계정 연결/해제 관리
- Apple 로그인
- 소셜 프로필 이미지 동기화

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | Google 계정으로 로그인/회원가입 | High | Pending |
| FR-02 | Kakao 계정으로 로그인/회원가입 | High | Pending |
| FR-03 | Naver 계정으로 로그인/회원가입 | High | Pending |
| FR-04 | 소셜 로그인 시 동일 이메일 사용자가 있으면 계정 자동 연결 | High | Pending |
| FR-05 | 로그인 페이지에 소셜 로그인 버튼 3개 표시 | High | Pending |
| FR-06 | 회원가입 페이지에 소셜 로그인 버튼 3개 표시 | Medium | Pending |
| FR-07 | 소셜 로그인 실패 시 에러 메시지 표시 | Medium | Pending |
| FR-08 | 소셜 로그인 후 게스트 장바구니 병합 | High | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Performance | OAuth 콜백 처리 < 2초 | 네트워크 로그 측정 |
| Security | CSRF 토큰 검증 (NextAuth 내장) | NextAuth 기본 설정 확인 |
| Security | OAuth state 파라미터 검증 | NextAuth 기본 설정 확인 |
| UX | 소셜 로그인 버튼 클릭 후 3단계 이내 완료 | 수동 테스트 |

---

## 4. Platform Setup Guide (개발자 콘솔 설정)

### 4.1 Google OAuth 설정

**Google Cloud Console** (https://console.cloud.google.com)

1. **프로젝트 생성/선택**
   - Google Cloud Console 접속
   - 상단 프로젝트 선택 > "새 프로젝트" 클릭
   - 프로젝트 이름 입력 후 만들기

2. **OAuth 동의 화면 구성**
   - 좌측 메뉴: API 및 서비스 > OAuth 동의 화면
   - User Type: "외부" 선택
   - 앱 이름, 사용자 지원 이메일, 개발자 연락처 입력
   - 범위(Scopes): `email`, `profile`, `openid` 추가
   - 테스트 사용자 추가 (개발 중)

3. **OAuth 클라이언트 ID 생성**
   - 좌측 메뉴: API 및 서비스 > 사용자 인증 정보
   - "+ 사용자 인증 정보 만들기" > "OAuth 클라이언트 ID"
   - 애플리케이션 유형: "웹 애플리케이션"
   - 승인된 JavaScript 원본:
     - `http://localhost:3000` (개발)
     - `https://your-domain.com` (운영)
   - 승인된 리디렉션 URI:
     - `http://localhost:3000/api/auth/callback/google` (개발)
     - `https://your-domain.com/api/auth/callback/google` (운영)
   - 만들기 클릭 후 **Client ID**, **Client Secret** 복사

4. **환경변수 설정**
   ```
   GOOGLE_CLIENT_ID=복사한_클라이언트_ID
   GOOGLE_CLIENT_SECRET=복사한_클라이언트_시크릿
   ```

### 4.2 Kakao OAuth 설정

**Kakao Developers** (https://developers.kakao.com)

1. **애플리케이션 생성**
   - Kakao Developers 접속 > 로그인
   - 내 애플리케이션 > "애플리케이션 추가하기"
   - 앱 이름, 사업자명 입력 후 저장

2. **플랫폼 등록**
   - 앱 설정 > 플랫폼
   - Web 플랫폼 등록
   - 사이트 도메인:
     - `http://localhost:3000` (개발)
     - `https://your-domain.com` (운영)

3. **카카오 로그인 활성화**
   - 제품 설정 > 카카오 로그인
   - "활성화 설정" ON
   - Redirect URI 등록:
     - `http://localhost:3000/api/auth/callback/kakao` (개발)
     - `https://your-domain.com/api/auth/callback/kakao` (운영)

4. **동의 항목 설정**
   - 제품 설정 > 카카오 로그인 > 동의항목
   - 닉네임: 필수 동의
   - 카카오계정(이메일): 필수 동의 (비즈앱 전환 필요)
   - **주의**: 이메일 필수 동의를 위해 비즈앱 전환이 필요함

5. **키 확인**
   - 앱 설정 > 앱 키
   - **REST API 키** = Client ID
   - 제품 설정 > 카카오 로그인 > 보안 > **Client Secret** 생성 및 활성화

6. **환경변수 설정**
   ```
   KAKAO_CLIENT_ID=REST_API_키
   KAKAO_CLIENT_SECRET=생성한_Client_Secret
   ```

### 4.3 Naver OAuth 설정

**Naver Developers** (https://developers.naver.com)

1. **애플리케이션 등록**
   - Naver Developers 접속 > 로그인
   - Application > 애플리케이션 등록
   - 애플리케이션 이름 입력

2. **사용 API 선택**
   - "네이버 로그인" 선택
   - 제공 정보 선택:
     - 회원이름 (필수)
     - 이메일 주소 (필수)
     - 프로필 사진 (선택)

3. **환경 설정**
   - 환경 추가: "PC 웹"
   - 서비스 URL:
     - `http://localhost:3000` (개발)
   - 네이버 로그인 Callback URL:
     - `http://localhost:3000/api/auth/callback/naver` (개발)
     - `https://your-domain.com/api/auth/callback/naver` (운영)

4. **키 확인**
   - 애플리케이션 정보에서 **Client ID**, **Client Secret** 확인

5. **환경변수 설정**
   ```
   NAVER_CLIENT_ID=복사한_클라이언트_ID
   NAVER_CLIENT_SECRET=복사한_클라이언트_시크릿
   ```

---

## 5. Technical Analysis (현재 코드 분석)

### 5.1 이미 구현된 부분

| 항목 | 파일 | 상태 |
|------|------|------|
| NextAuth v5 설정 | `src/lib/auth.ts` | Google, Kakao 프로바이더 코드 존재 |
| PrismaAdapter 연결 | `src/lib/auth.ts` | 완료 |
| Account 모델 | `prisma/schema.prisma` | 완료 (provider, providerAccountId 등) |
| Session 모델 | `prisma/schema.prisma` | 완료 |
| JWT 전략 | `src/lib/auth.ts` | 완료 |
| Auth Guard | `src/lib/auth-guard.ts` | 완료 (requireAuth, requireAdmin) |
| 로그인 페이지 | `src/app/auth/login/page.tsx` | Credentials만 존재 |
| useAuth 훅 | `src/presentation/hooks/useAuth.ts` | Credentials login만 지원 |
| 장바구니 병합 | `useAuth.ts` > `mergeGuestCart()` | Credentials 로그인 시 동작 |

### 5.2 추가 구현 필요

| 항목 | 작업 내용 |
|------|-----------|
| Naver 프로바이더 | `next-auth/providers/naver` 또는 커스텀 프로바이더 추가 |
| 소셜 로그인 버튼 UI | LoginForm, SignupForm에 소셜 버튼 추가 |
| 계정 연결 로직 | `allowDangerousEmailAccountLinking` 또는 커스텀 signIn 콜백 |
| 소셜 로그인 후 장바구니 병합 | signIn 콜백 또는 세션 이벤트에서 처리 |
| 환경변수 | `.env`, `.env.example`에 Naver 키 추가 |

---

## 6. Success Criteria

### 6.1 Definition of Done

- [ ] Google 로그인으로 신규 가입 및 재로그인 성공
- [ ] Kakao 로그인으로 신규 가입 및 재로그인 성공
- [ ] Naver 로그인으로 신규 가입 및 재로그인 성공
- [ ] 동일 이메일로 Credentials + 소셜 계정 연결 정상 동작
- [ ] 소셜 로그인 후 장바구니 병합 정상 동작
- [ ] 로그인/회원가입 페이지에 소셜 버튼 표시
- [ ] 에러 발생 시 사용자에게 적절한 메시지 표시

### 6.2 Quality Criteria

- [ ] 각 프로바이더별 로그인 플로우 수동 테스트 통과
- [ ] 기존 Credentials 로그인 정상 동작 확인 (회귀 테스트)
- [ ] 환경변수 미설정 시 해당 소셜 버튼 비활성화/숨김 처리
- [ ] 빌드 에러 없음

---

## 7. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Kakao 이메일 필수 동의에 비즈앱 전환 필요 | High | High | 비즈앱 전환 절차 선행, 개발 중에는 테스트 계정으로 진행 |
| NextAuth v5 beta 버전 불안정 | Medium | Medium | 공식 문서 및 GitHub Issues 참고, 버전 고정 |
| Naver의 NextAuth 공식 프로바이더 부재 가능성 | Medium | Low | NextAuth v5에 Naver 프로바이더 포함 확인, 없으면 커스텀 프로바이더 작성 |
| 동일 이메일 계정 연결 시 보안 이슈 | High | Low | 이메일 인증 완료된 프로바이더만 자동 연결, 미인증 이메일은 수동 확인 |
| 소셜 로그인 후 장바구니 병합 타이밍 이슈 | Medium | Medium | NextAuth events.signIn 콜백에서 서버사이드 병합 처리 |

---

## 8. Architecture Considerations

### 8.1 Project Level Selection

| Level | Characteristics | Recommended For | Selected |
|-------|-----------------|-----------------|:--------:|
| **Starter** | Simple structure | Static sites | |
| **Dynamic** | Feature-based modules, BaaS | Web apps with backend | |
| **Enterprise** | Strict layer separation, DI | High-traffic systems | **O** |

### 8.2 Key Architectural Decisions

| Decision | Options | Selected | Rationale |
|----------|---------|----------|-----------|
| Auth Library | NextAuth v5 | NextAuth v5 | 이미 프로젝트에 설치 및 구성됨 |
| Session Strategy | JWT / Database | JWT | 기존 설정 유지, Stateless |
| Naver Provider | 공식 / 커스텀 | 확인 후 결정 | NextAuth v5 공식 지원 여부에 따라 |
| 계정 연결 | allowDangerousEmailAccountLinking / 커스텀 | allowDangerousEmailAccountLinking | NextAuth 내장 기능 활용, 간단한 구현 |

---

## 9. Environment Variables

| Variable | Purpose | Scope | Status |
|----------|---------|-------|:------:|
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | Server | 기존 (값 미설정) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | Server | 기존 (값 미설정) |
| `KAKAO_CLIENT_ID` | Kakao REST API Key | Server | 기존 (값 미설정) |
| `KAKAO_CLIENT_SECRET` | Kakao Client Secret | Server | 기존 (값 미설정) |
| `NAVER_CLIENT_ID` | Naver Client ID | Server | **신규** |
| `NAVER_CLIENT_SECRET` | Naver Client Secret | Server | **신규** |

---

## 10. Implementation Order (예상)

1. 각 플랫폼 개발자 콘솔에서 OAuth 앱 생성 및 키 발급 (사용자 작업)
2. `.env` 환경변수 설정
3. Naver 프로바이더 추가 (`src/lib/auth.ts`)
4. 계정 자동 연결 설정 추가
5. 소셜 로그인 버튼 컴포넌트 생성
6. LoginForm, SignupForm에 소셜 버튼 통합
7. 소셜 로그인 후 장바구니 병합 처리
8. 에러 핸들링 및 UX 개선
9. 수동 테스트 (각 프로바이더별)

---

## 11. Next Steps

1. [ ] Design 문서 작성 (`/pdca design social-login`)
2. [ ] 각 플랫폼 개발자 콘솔에서 OAuth 앱 생성 (사용자)
3. [ ] 구현 시작

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-02-20 | Initial draft | AI |
