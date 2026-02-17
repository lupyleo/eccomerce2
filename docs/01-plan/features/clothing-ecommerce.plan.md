# Clothing E-Commerce Planning Document

> **Summary**: PostgreSQL 기반 의류 이커머스 플랫폼. 결제사 모크를 통한 전체 비즈니스 로직 구현 및 프로덕션 수준 아키텍처.
>
> **Project**: clothing-ecommerce
> **Version**: 0.1.0
> **Author**: Developer
> **Date**: 2026-02-17
> **Status**: Draft

---

## 1. Overview

### 1.1 Purpose

의류 전문 이커머스 플랫폼을 구축한다. 상품 관리, 주문, 재고, 배송, 회원, 장바구니, 위시리스트, 리뷰, 쿠폰/프로모션 등 프로덕션 수준의 모든 비즈니스 로직을 포함하며, 결제사 연동만 모크(Mock)로 처리하여 실제 결제사 전환이 용이하도록 설계한다.

### 1.2 Background

- 실제 결제사 연동은 사업 진행 상황에 따라 추후 진행
- 결제를 제외한 모든 플로우(주문 생성 → 결제 처리 → 재고 차감 → 배송 → 반품/환불)가 실제로 동작해야 함
- RDB는 PostgreSQL을 사용하며, 데이터 정합성과 트랜잭션 처리가 핵심
- 의류 특성상 사이즈/컬러 등 상품 변형(Variant) 관리가 필수

### 1.3 Related Documents

- Design: `docs/02-design/features/clothing-ecommerce.design.md` (추후 작성)
- Schema: `docs/01-plan/schema.md` (추후 작성)

---

## 2. Scope

### 2.1 In Scope

- [ ] 회원 가입/로그인 (이메일, 소셜 로그인)
- [ ] 상품 카탈로그 (카테고리, 브랜드, 상품, 변형 관리)
- [ ] 상품 검색 및 필터링 (카테고리, 가격, 사이즈, 컬러, 브랜드)
- [ ] 장바구니 (추가, 수정, 삭제, 수량 변경)
- [ ] 위시리스트
- [ ] 주문 생성 및 관리 (주문 상태 머신)
- [ ] 결제 처리 (Mock Payment Gateway + Strategy Pattern)
- [ ] 재고 관리 (변형 단위 재고, 예약 재고, 동시성 제어)
- [ ] 배송 관리 (배송 상태 추적, 배송비 계산)
- [ ] 반품/환불 처리
- [ ] 쿠폰 및 프로모션
- [ ] 상품 리뷰 및 평점
- [ ] 주문/배송 알림 (이메일 알림 인터페이스)
- [ ] 관리자 대시보드 (상품/주문/회원/매출 관리)
- [ ] 배송지 관리 (다중 배송지)

### 2.2 Out of Scope

- 실제 결제사(PG) 연동 (토스페이먼츠, 이니시스 등) — 모크로 대체
- 실제 SMS/푸시 알림 발송 — 인터페이스만 구현
- 실시간 채팅 상담
- 추천 엔진 / ML 기반 개인화
- 다국어(i18n) 지원
- 모바일 앱

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| **회원** | | | |
| FR-01 | 이메일/비밀번호 회원가입 및 로그인 | High | Pending |
| FR-02 | 소셜 로그인 (Google, Kakao) | Medium | Pending |
| FR-03 | 비밀번호 재설정 | Medium | Pending |
| FR-04 | 회원 프로필 관리 (이름, 연락처, 프로필 이미지) | Medium | Pending |
| FR-05 | 배송지 관리 (등록, 수정, 삭제, 기본 배송지 설정) | High | Pending |
| **상품** | | | |
| FR-10 | 카테고리 트리 관리 (대/중/소 분류) | High | Pending |
| FR-11 | 브랜드 관리 | Medium | Pending |
| FR-12 | 상품 등록 (이름, 설명, 이미지, 가격, 카테고리, 브랜드) | High | Pending |
| FR-13 | 상품 변형 관리 (사이즈 × 컬러 조합별 SKU, 가격, 재고) | High | Pending |
| FR-14 | 상품 이미지 다중 업로드 및 순서 관리 | High | Pending |
| FR-15 | 상품 검색 (키워드 검색, Full-text search) | High | Pending |
| FR-16 | 상품 필터링 (카테고리, 가격 범위, 사이즈, 컬러, 브랜드) | High | Pending |
| FR-17 | 상품 정렬 (최신순, 가격순, 인기순, 평점순) | Medium | Pending |
| FR-18 | 상품 상태 관리 (판매중, 품절, 숨김, 단종) | High | Pending |
| **장바구니 / 위시리스트** | | | |
| FR-20 | 장바구니 추가/수정/삭제 (변형 단위) | High | Pending |
| FR-21 | 장바구니 수량 변경 및 재고 초과 검증 | High | Pending |
| FR-22 | 비회원 장바구니 (로그인 시 병합) | Medium | Pending |
| FR-23 | 위시리스트 추가/삭제 | Medium | Pending |
| **주문** | | | |
| FR-30 | 주문 생성 (장바구니 → 주문서 → 결제) | High | Pending |
| FR-31 | 주문 상태 머신 (대기 → 결제완료 → 준비중 → 배송중 → 배송완료 → 구매확정) | High | Pending |
| FR-32 | 주문 취소 (결제 전/후 분기) | High | Pending |
| FR-33 | 주문 상세 조회 및 이력 | High | Pending |
| FR-34 | 주문번호 생성 규칙 (날짜 기반 고유번호) | Medium | Pending |
| **결제 (Mock)** | | | |
| FR-40 | Mock Payment Gateway (Strategy Pattern) | High | Pending |
| FR-41 | 결제 요청/승인/실패 플로우 | High | Pending |
| FR-42 | 결제 취소 (전액/부분 취소) | High | Pending |
| FR-43 | 결제 웹훅 시뮬레이션 | Medium | Pending |
| FR-44 | 결제 수단 선택 UI (카드, 가상계좌, 간편결제) | Medium | Pending |
| **재고** | | | |
| FR-50 | 변형 단위 재고 관리 | High | Pending |
| FR-51 | 주문 시 재고 예약 (pessimistic locking) | High | Pending |
| FR-52 | 결제 실패/취소 시 재고 복구 | High | Pending |
| FR-53 | 재고 부족 알림 (임계값 설정) | Medium | Pending |
| FR-54 | 재고 이력 로그 | Medium | Pending |
| **배송** | | | |
| FR-60 | 배송비 계산 (무료배송 기준금액, 도서산간 추가 등) | High | Pending |
| FR-61 | 배송 상태 추적 (배송 시작 → 배송중 → 배송완료) | High | Pending |
| FR-62 | 송장번호 등록 및 관리 | Medium | Pending |
| **반품/환불** | | | |
| FR-70 | 반품 신청 (사유 선택, 이미지 첨부) | High | Pending |
| FR-71 | 반품 상태 관리 (신청 → 승인 → 수거 → 완료) | High | Pending |
| FR-72 | 환불 처리 (Mock 결제 취소 연동) | High | Pending |
| **쿠폰/프로모션** | | | |
| FR-80 | 쿠폰 생성 (정액/정률, 최소주문금액, 유효기간) | Medium | Pending |
| FR-81 | 쿠폰 적용 및 할인 계산 | Medium | Pending |
| FR-82 | 프로모션 (기간별 할인, 카테고리별 할인) | Low | Pending |
| **리뷰** | | | |
| FR-90 | 구매 확정 후 리뷰 작성 (텍스트, 별점, 이미지) | Medium | Pending |
| FR-91 | 리뷰 목록 및 평균 평점 계산 | Medium | Pending |
| **관리자** | | | |
| FR-100 | 관리자 대시보드 (매출 요약, 주문 현황, 재고 현황) | High | Pending |
| FR-101 | 상품 CRUD (관리자) | High | Pending |
| FR-102 | 주문 관리 (상태 변경, 배송 처리) | High | Pending |
| FR-103 | 회원 관리 (조회, 상태 변경) | Medium | Pending |
| FR-104 | 쿠폰 관리 | Medium | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Performance | 상품 목록 API 응답 < 300ms (100건 기준) | k6 / Artillery 부하 테스트 |
| Performance | 주문 생성 트랜잭션 < 500ms | 서버 로그 분석 |
| Scalability | 동시 주문 처리 100건 이상 (재고 동시성) | 동시성 테스트 |
| Security | OWASP Top 10 준수 | 코드 리뷰 + SAST |
| Security | 인증 토큰 관리 (JWT Access 1h / Refresh 7d) | 구현 검증 |
| Reliability | DB 트랜잭션 ACID 보장 (주문/재고/결제 연계) | 통합 테스트 |
| Maintainability | 결제사 교체 시 코드 변경 최소화 (인터페이스 분리) | 아키텍처 리뷰 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] 모든 Functional Requirements 구현 완료
- [ ] Mock Payment로 전체 주문 플로우 정상 동작
- [ ] 결제사 인터페이스 분리로 실제 PG 교체 시 PaymentGateway 구현체만 추가하면 되는 구조
- [ ] PostgreSQL 트랜잭션으로 재고-주문-결제 데이터 정합성 보장
- [ ] 관리자 대시보드에서 주문/상품/매출 관리 가능
- [ ] 코드 리뷰 완료

### 4.2 Quality Criteria

- [ ] 핵심 비즈니스 로직 테스트 커버리지 80% 이상
- [ ] Zero lint errors
- [ ] 빌드 성공
- [ ] 모든 API 엔드포인트 동작 검증

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Mock → 실제 결제사 전환 시 인터페이스 불일치 | High | Medium | Strategy Pattern + 실제 PG API 스펙 기반 인터페이스 설계 |
| 동시 주문 시 재고 정합성 깨짐 | High | High | PostgreSQL SELECT FOR UPDATE + 트랜잭션 격리 수준 관리 |
| 상품 변형 조합 폭발 (사이즈 × 컬러) | Medium | Medium | SKU 기반 관리, 변형 수 제한 정책 |
| 주문 상태 전이 오류 | High | Medium | 상태 머신 패턴 적용, 허용 전이만 정의 |
| 대량 상품 검색 성능 저하 | Medium | Medium | PostgreSQL GIN 인덱스 + Full-text search, 페이지네이션 |
| 쿠폰 중복 적용 / 악용 | Medium | Medium | 쿠폰 사용 이력 관리, 1인 1회 제한, 트랜잭션 내 검증 |

---

## 6. Architecture Considerations

### 6.1 Project Level Selection

| Level | Characteristics | Recommended For | Selected |
|-------|-----------------|-----------------|:--------:|
| **Starter** | Simple structure | Static sites, portfolios | ☐ |
| **Dynamic** | Feature-based modules, BaaS integration | Web apps with backend, SaaS MVPs | ☐ |
| **Enterprise** | Strict layer separation, DI, microservices | High-traffic systems, complex architectures | ☑ |

> **Enterprise** 선택 이유: 의류 이커머스는 도메인 복잡도가 높고(상품 변형, 재고, 주문, 결제, 배송, 반품 등 다수 도메인), 결제사 교체 등 외부 의존성 분리가 필수적이며, 트랜잭션 기반 데이터 정합성이 핵심이므로 Clean Architecture 기반 Enterprise 레벨이 적합.

### 6.2 Key Architectural Decisions

| Decision | Options | Selected | Rationale |
|----------|---------|----------|-----------|
| Framework | Next.js / React / Vue | **Next.js 15 (App Router)** | SSR/SSG로 SEO 최적화, API Routes로 백엔드 통합, RSC 지원 |
| Language | TypeScript / JavaScript | **TypeScript** | 타입 안전성, 도메인 모델 명확화 |
| ORM | Prisma / Drizzle / TypeORM | **Prisma** | PostgreSQL 최적 지원, 마이그레이션 관리, 타입 자동 생성 |
| Database | PostgreSQL / MySQL | **PostgreSQL** | 복잡 쿼리 지원, Full-text search, JSONB, 트랜잭션 |
| State Management | Zustand / Redux / Context | **Zustand** | 가볍고 직관적, 장바구니/인증 등 클라이언트 상태 관리 |
| API Client | fetch / axios + react-query | **TanStack Query + fetch** | 서버 상태 캐싱, 낙관적 업데이트, 에러/로딩 처리 |
| Form Handling | react-hook-form / formik | **react-hook-form + zod** | 비제어 컴포넌트 기반 성능, 스키마 검증 |
| Styling | Tailwind / CSS Modules | **Tailwind CSS + shadcn/ui** | 빠른 UI 개발, 일관된 디자인 시스템 |
| Authentication | NextAuth / custom | **NextAuth.js (Auth.js)** | 소셜 로그인 지원, 세션 관리, Prisma Adapter |
| Payment Pattern | Strategy / Adapter | **Strategy Pattern** | 결제사 교체 용이, 인터페이스 기반 다형성 |
| Image Storage | Local / S3 / Cloudinary | **S3 (or compatible)** | Presigned URL 업로드, CDN 연동 |
| Testing | Jest / Vitest / Playwright | **Vitest + Playwright** | 빠른 단위 테스트 + E2E 테스트 |

### 6.3 Clean Architecture Approach

```
Selected Level: Enterprise

Folder Structure:
┌─────────────────────────────────────────────────────┐
│ src/                                                │
│ ├── app/                    # Next.js App Router    │
│ │   ├── (shop)/             # 고객 페이지 그룹      │
│ │   │   ├── page.tsx        # 홈                    │
│ │   │   ├── products/       # 상품 목록/상세         │
│ │   │   ├── cart/           # 장바구니               │
│ │   │   ├── checkout/       # 주문/결제              │
│ │   │   ├── orders/         # 주문 내역              │
│ │   │   └── mypage/         # 마이페이지             │
│ │   ├── (admin)/            # 관리자 페이지 그룹      │
│ │   │   └── admin/          # 관리자 대시보드         │
│ │   ├── api/                # API Routes            │
│ │   │   ├── products/                               │
│ │   │   ├── orders/                                 │
│ │   │   ├── cart/                                   │
│ │   │   ├── payments/                               │
│ │   │   ├── reviews/                                │
│ │   │   └── admin/                                  │
│ │   └── auth/               # NextAuth 라우트       │
│ ├── domain/                 # 도메인 레이어          │
│ │   ├── product/                                    │
│ │   │   ├── entities.ts     # Product, Variant, ...│
│ │   │   ├── repository.ts   # interface            │
│ │   │   └── value-objects.ts # SKU, Price, ...     │
│ │   ├── order/                                      │
│ │   │   ├── entities.ts     # Order, OrderItem     │
│ │   │   ├── repository.ts                           │
│ │   │   ├── state-machine.ts # 주문 상태 전이       │
│ │   │   └── value-objects.ts # OrderNumber, ...    │
│ │   ├── payment/                                    │
│ │   │   ├── gateway.ts      # PaymentGateway I/F   │
│ │   │   ├── entities.ts     # Payment, Refund      │
│ │   │   └── value-objects.ts                        │
│ │   ├── inventory/                                  │
│ │   │   ├── entities.ts     # Stock, StockLog      │
│ │   │   └── repository.ts                           │
│ │   ├── shipping/                                   │
│ │   │   ├── entities.ts     # Shipment             │
│ │   │   └── repository.ts                           │
│ │   ├── user/                                       │
│ │   │   ├── entities.ts     # User, Address        │
│ │   │   └── repository.ts                           │
│ │   ├── cart/                                       │
│ │   │   ├── entities.ts     # Cart, CartItem       │
│ │   │   └── repository.ts                           │
│ │   ├── coupon/                                     │
│ │   │   ├── entities.ts     # Coupon, CouponUsage  │
│ │   │   └── repository.ts                           │
│ │   └── review/                                     │
│ │       ├── entities.ts     # Review               │
│ │       └── repository.ts                           │
│ ├── application/            # 애플리케이션 레이어    │
│ │   ├── product/                                    │
│ │   │   ├── product.service.ts                      │
│ │   │   └── product.dto.ts                          │
│ │   ├── order/                                      │
│ │   │   ├── order.service.ts  # 주문 생성/취소      │
│ │   │   ├── order.dto.ts                            │
│ │   │   └── checkout.service.ts # 체크아웃 오케스트레이션 │
│ │   ├── payment/                                    │
│ │   │   └── payment.service.ts                      │
│ │   ├── inventory/                                  │
│ │   │   └── inventory.service.ts                    │
│ │   ├── shipping/                                   │
│ │   │   └── shipping.service.ts                     │
│ │   ├── cart/                                       │
│ │   │   └── cart.service.ts                         │
│ │   ├── coupon/                                     │
│ │   │   └── coupon.service.ts                       │
│ │   └── review/                                     │
│ │       └── review.service.ts                       │
│ ├── infrastructure/         # 인프라스트럭처 레이어  │
│ │   ├── database/                                   │
│ │   │   └── prisma/                                 │
│ │   │       ├── schema.prisma                       │
│ │   │       ├── migrations/                         │
│ │   │       └── seed.ts                             │
│ │   ├── repositories/       # Repository 구현체      │
│ │   │   ├── prisma-product.repository.ts            │
│ │   │   ├── prisma-order.repository.ts              │
│ │   │   ├── prisma-inventory.repository.ts          │
│ │   │   └── ...                                     │
│ │   ├── payment/            # 결제사 구현체          │
│ │   │   ├── mock-payment.gateway.ts   # Mock       │
│ │   │   ├── toss-payment.gateway.ts   # 추후 구현   │
│ │   │   └── payment.factory.ts        # Factory    │
│ │   ├── storage/            # 파일 스토리지          │
│ │   │   └── s3-storage.service.ts                   │
│ │   └── notification/       # 알림                  │
│ │       └── email.service.ts                        │
│ ├── presentation/           # 프레젠테이션 레이어    │
│ │   ├── components/         # 공통 UI 컴포넌트      │
│ │   │   ├── ui/             # shadcn/ui 기반       │
│ │   │   ├── layout/         # Header, Footer, ...  │
│ │   │   └── common/         # Pagination, ...      │
│ │   ├── features/           # 피처별 컴포넌트        │
│ │   │   ├── product/        # 상품 관련 컴포넌트     │
│ │   │   ├── cart/                                   │
│ │   │   ├── checkout/                               │
│ │   │   ├── order/                                  │
│ │   │   ├── review/                                 │
│ │   │   └── admin/                                  │
│ │   └── hooks/              # 커스텀 훅             │
│ └── lib/                    # 유틸리티              │
│     ├── prisma.ts           # Prisma Client        │
│     ├── auth.ts             # NextAuth 설정         │
│     └── utils.ts            # 공통 유틸             │
├── prisma/                                           │
│   ├── schema.prisma                                 │
│   ├── migrations/                                   │
│   └── seed.ts                                       │
└── tests/                                            │
    ├── unit/                                         │
    ├── integration/                                  │
    └── e2e/                                          │
└─────────────────────────────────────────────────────┘
```

### 6.4 Payment Gateway Architecture (핵심)

```
결제사 교체 전략: Strategy Pattern + Factory

┌─────────────────────────────────────────────────────┐
│ Domain Layer                                        │
│                                                     │
│ interface PaymentGateway {                           │
│   charge(request: ChargeRequest): ChargeResult      │
│   cancel(paymentId, amount?): CancelResult          │
│   verify(paymentId): VerifyResult                   │
│   webhook(payload): WebhookResult                   │
│ }                                                   │
│                                                     │
│ // 결제 요청/응답은 도메인 Value Object로 정의         │
│ // PG사 스펙에 종속되지 않는 범용 인터페이스              │
└──────────────────┬──────────────────────────────────┘
                   │ implements
        ┌──────────┼──────────────┐
        ▼          ▼              ▼
┌──────────┐ ┌───────────┐ ┌──────────────┐
│ Mock PG  │ │ Toss PG   │ │ Inicis PG    │
│ (v1.0)   │ │ (추후)    │ │ (추후)       │
│          │ │           │ │              │
│ 즉시 승인 │ │ REST API  │ │ REST API     │
│ 실패 시뮬 │ │ 웹훅 처리 │ │ 웹훅 처리    │
│ 웹훅 시뮬 │ │           │ │              │
└──────────┘ └───────────┘ └──────────────┘
        ▲
        │ PaymentGatewayFactory
        │ .create(config.PAYMENT_PROVIDER)
        │
┌───────┴──────────────────────────────────────────┐
│ PaymentGatewayFactory                             │
│                                                   │
│ // 환경 변수로 결제사 전환                           │
│ PAYMENT_PROVIDER=mock  → MockPaymentGateway       │
│ PAYMENT_PROVIDER=toss  → TossPaymentGateway       │
│ PAYMENT_PROVIDER=inicis → InicisPaymentGateway    │
└───────────────────────────────────────────────────┘
```

**Mock Payment Gateway 상세 동작:**

| 시나리오 | Mock 동작 | 실제 PG 동작 (추후) |
|---------|----------|------------------|
| 결제 요청 | 즉시 성공 응답 (paymentId 생성) | PG API 호출 |
| 결제 승인 | 내부 상태 변경만 처리 | PG 승인 API 호출 |
| 결제 실패 | 특정 금액(예: 끝자리 99)으로 실패 시뮬레이션 | PG 실패 응답 처리 |
| 부분 취소 | DB 상 취소 처리 | PG 부분취소 API 호출 |
| 웹훅 | 즉시 콜백 호출 (동기) | PG 웹훅 수신 (비동기) |

---

## 7. Database Schema (Core Tables)

```
PostgreSQL Database Schema (Prisma)

┌─────────────────────────────────────────────────────┐
│ User                                                │
│ ─────                                               │
│ id            UUID PK                               │
│ email         VARCHAR UNIQUE                        │
│ name          VARCHAR                               │
│ passwordHash  VARCHAR?                              │
│ role          ENUM(CUSTOMER, ADMIN)                  │
│ phone         VARCHAR?                              │
│ createdAt     TIMESTAMP                             │
│ updatedAt     TIMESTAMP                             │
├─────────────────────────────────────────────────────┤
│ Address                                             │
│ ─────                                               │
│ id            UUID PK                               │
│ userId        UUID FK → User                        │
│ name          VARCHAR (수령인)                       │
│ phone         VARCHAR                               │
│ zipCode       VARCHAR                               │
│ address1      VARCHAR (기본 주소)                     │
│ address2      VARCHAR? (상세 주소)                    │
│ isDefault     BOOLEAN                               │
├─────────────────────────────────────────────────────┤
│ Category                                            │
│ ─────                                               │
│ id            UUID PK                               │
│ name          VARCHAR                               │
│ slug          VARCHAR UNIQUE                        │
│ parentId      UUID? FK → Category (self-ref)        │
│ depth         INT                                   │
│ sortOrder     INT                                   │
│ isActive      BOOLEAN                               │
├─────────────────────────────────────────────────────┤
│ Brand                                               │
│ ─────                                               │
│ id            UUID PK                               │
│ name          VARCHAR UNIQUE                        │
│ slug          VARCHAR UNIQUE                        │
│ logoUrl       VARCHAR?                              │
│ description   TEXT?                                 │
│ isActive      BOOLEAN                               │
├─────────────────────────────────────────────────────┤
│ Product                                             │
│ ─────                                               │
│ id            UUID PK                               │
│ name          VARCHAR                               │
│ slug          VARCHAR UNIQUE                        │
│ description   TEXT                                  │
│ basePrice     DECIMAL(10,2)                         │
│ categoryId    UUID FK → Category                    │
│ brandId       UUID? FK → Brand                      │
│ status        ENUM(ACTIVE, SOLD_OUT, HIDDEN, DISC.) │
│ avgRating     DECIMAL(2,1) DEFAULT 0                │
│ reviewCount   INT DEFAULT 0                         │
│ salesCount    INT DEFAULT 0                         │
│ createdAt     TIMESTAMP                             │
│ updatedAt     TIMESTAMP                             │
├─────────────────────────────────────────────────────┤
│ ProductVariant                                      │
│ ─────                                               │
│ id            UUID PK                               │
│ productId     UUID FK → Product                     │
│ sku           VARCHAR UNIQUE                        │
│ size          VARCHAR (S, M, L, XL, ...)            │
│ color         VARCHAR                               │
│ colorCode     VARCHAR? (#HEX)                       │
│ price         DECIMAL(10,2)                         │
│ stock         INT DEFAULT 0                         │
│ reservedStock INT DEFAULT 0                         │
│ isActive      BOOLEAN                               │
│ UNIQUE(productId, size, color)                      │
├─────────────────────────────────────────────────────┤
│ ProductImage                                        │
│ ─────                                               │
│ id            UUID PK                               │
│ productId     UUID FK → Product                     │
│ url           VARCHAR                               │
│ alt           VARCHAR?                              │
│ sortOrder     INT                                   │
│ isPrimary     BOOLEAN                               │
├─────────────────────────────────────────────────────┤
│ Cart                                                │
│ ─────                                               │
│ id            UUID PK                               │
│ userId        UUID? FK → User                       │
│ sessionId     VARCHAR? (비회원)                       │
│ createdAt     TIMESTAMP                             │
│ updatedAt     TIMESTAMP                             │
├─────────────────────────────────────────────────────┤
│ CartItem                                            │
│ ─────                                               │
│ id            UUID PK                               │
│ cartId        UUID FK → Cart                        │
│ variantId     UUID FK → ProductVariant              │
│ quantity      INT                                   │
│ UNIQUE(cartId, variantId)                           │
├─────────────────────────────────────────────────────┤
│ Order                                               │
│ ─────                                               │
│ id            UUID PK                               │
│ orderNumber   VARCHAR UNIQUE                        │
│ userId        UUID FK → User                        │
│ status        ENUM(PENDING, PAID, PREPARING,        │
│               SHIPPING, DELIVERED, CONFIRMED,       │
│               CANCELLED)                            │
│ totalAmount   DECIMAL(10,2)                         │
│ discountAmount DECIMAL(10,2) DEFAULT 0              │
│ shippingFee   DECIMAL(10,2) DEFAULT 0               │
│ finalAmount   DECIMAL(10,2)                         │
│ addressSnapshot JSONB (주문 시점 배송지 스냅샷)       │
│ couponId      UUID? FK → Coupon                     │
│ note          TEXT?                                  │
│ createdAt     TIMESTAMP                             │
│ updatedAt     TIMESTAMP                             │
├─────────────────────────────────────────────────────┤
│ OrderItem                                           │
│ ─────                                               │
│ id            UUID PK                               │
│ orderId       UUID FK → Order                       │
│ variantId     UUID FK → ProductVariant              │
│ productName   VARCHAR (스냅샷)                       │
│ variantInfo   VARCHAR (스냅샷: "M / Black")          │
│ price         DECIMAL(10,2) (스냅샷)                 │
│ quantity      INT                                   │
│ subtotal      DECIMAL(10,2)                         │
├─────────────────────────────────────────────────────┤
│ Payment                                             │
│ ─────                                               │
│ id            UUID PK                               │
│ orderId       UUID FK → Order                       │
│ method        ENUM(CARD, VIRTUAL_ACCOUNT, EASY_PAY) │
│ status        ENUM(PENDING, COMPLETED, FAILED,      │
│               CANCELLED, PARTIALLY_CANCELLED)       │
│ amount        DECIMAL(10,2)                         │
│ cancelledAmount DECIMAL(10,2) DEFAULT 0             │
│ pgProvider    VARCHAR (mock, toss, inicis)           │
│ pgPaymentId   VARCHAR? (PG사 결제 ID)               │
│ pgResponse    JSONB? (PG사 원본 응답)                │
│ paidAt        TIMESTAMP?                            │
│ cancelledAt   TIMESTAMP?                            │
│ createdAt     TIMESTAMP                             │
├─────────────────────────────────────────────────────┤
│ StockLog                                            │
│ ─────                                               │
│ id            UUID PK                               │
│ variantId     UUID FK → ProductVariant              │
│ type          ENUM(INBOUND, OUTBOUND, RESERVE,      │
│               RELEASE, ADJUSTMENT)                  │
│ quantity      INT (양수/음수)                         │
│ reason        VARCHAR                               │
│ referenceId   VARCHAR? (주문번호 등)                  │
│ createdAt     TIMESTAMP                             │
├─────────────────────────────────────────────────────┤
│ Shipment                                            │
│ ─────                                               │
│ id            UUID PK                               │
│ orderId       UUID FK → Order                       │
│ carrier       VARCHAR (배송사)                        │
│ trackingNumber VARCHAR?                             │
│ status        ENUM(PREPARING, SHIPPED, IN_TRANSIT,  │
│               DELIVERED)                            │
│ shippedAt     TIMESTAMP?                            │
│ deliveredAt   TIMESTAMP?                            │
│ createdAt     TIMESTAMP                             │
├─────────────────────────────────────────────────────┤
│ Return                                              │
│ ─────                                               │
│ id            UUID PK                               │
│ orderId       UUID FK → Order                       │
│ orderItemId   UUID? FK → OrderItem                  │
│ reason        ENUM(CHANGE_MIND, DEFECTIVE,          │
│               WRONG_ITEM, OTHER)                    │
│ reasonDetail  TEXT?                                  │
│ status        ENUM(REQUESTED, APPROVED, COLLECTING, │
│               COLLECTED, COMPLETED, REJECTED)       │
│ refundAmount  DECIMAL(10,2)                         │
│ images        TEXT[] (반품 사유 이미지)               │
│ createdAt     TIMESTAMP                             │
│ updatedAt     TIMESTAMP                             │
├─────────────────────────────────────────────────────┤
│ Coupon                                              │
│ ─────                                               │
│ id            UUID PK                               │
│ code          VARCHAR UNIQUE                        │
│ name          VARCHAR                               │
│ type          ENUM(FIXED, PERCENTAGE)               │
│ value         DECIMAL(10,2)                         │
│ minOrderAmount DECIMAL(10,2)?                       │
│ maxDiscount   DECIMAL(10,2)? (정률 시 최대 할인)     │
│ validFrom     TIMESTAMP                             │
│ validUntil    TIMESTAMP                             │
│ maxUsageCount INT?                                  │
│ usedCount     INT DEFAULT 0                         │
│ isActive      BOOLEAN                               │
│ createdAt     TIMESTAMP                             │
├─────────────────────────────────────────────────────┤
│ CouponUsage                                         │
│ ─────                                               │
│ id            UUID PK                               │
│ couponId      UUID FK → Coupon                      │
│ userId        UUID FK → User                        │
│ orderId       UUID FK → Order                       │
│ usedAt        TIMESTAMP                             │
│ UNIQUE(couponId, userId) -- 1인 1회 제한             │
├─────────────────────────────────────────────────────┤
│ Wishlist                                            │
│ ─────                                               │
│ id            UUID PK                               │
│ userId        UUID FK → User                        │
│ productId     UUID FK → Product                     │
│ createdAt     TIMESTAMP                             │
│ UNIQUE(userId, productId)                           │
├─────────────────────────────────────────────────────┤
│ Review                                              │
│ ─────                                               │
│ id            UUID PK                               │
│ userId        UUID FK → User                        │
│ productId     UUID FK → Product                     │
│ orderId       UUID FK → Order                       │
│ rating        INT (1-5)                              │
│ content       TEXT                                  │
│ images        TEXT[]                                 │
│ createdAt     TIMESTAMP                             │
│ updatedAt     TIMESTAMP                             │
│ UNIQUE(userId, orderId, productId)                  │
└─────────────────────────────────────────────────────┘

Key Indexes:
- Product: (categoryId), (brandId), (status), GIN(name, description) for FTS
- ProductVariant: (productId), (sku), UNIQUE(productId, size, color)
- Order: (userId), (status), (orderNumber), (createdAt)
- Payment: (orderId), (pgPaymentId)
- CartItem: UNIQUE(cartId, variantId)
- StockLog: (variantId), (createdAt)
```

---

## 8. Order State Machine

```
주문 상태 전이 다이어그램:

    ┌──────────┐
    │ PENDING  │ ← 주문 생성 (재고 예약)
    └────┬─────┘
         │ 결제 성공
         ▼
    ┌──────────┐      결제 실패/취소
    │   PAID   │ ─────────────────────┐
    └────┬─────┘                      ▼
         │ 상품 준비               ┌──────────┐
         ▼                        │CANCELLED │ ← 재고 복구
    ┌──────────┐                  └──────────┘
    │PREPARING │                      ▲
    └────┬─────┘                      │ 관리자 취소
         │ 배송 시작                   │ (결제 환불 처리)
         ▼                           │
    ┌──────────┐                     │
    │ SHIPPING │                     │
    └────┬─────┘                     │
         │ 배송 완료                  │
         ▼                          │
    ┌──────────┐                    │
    │DELIVERED │────────────────────┘ (반품 시)
    └────┬─────┘
         │ 구매 확정 (리뷰 가능)
         ▼
    ┌──────────┐
    │CONFIRMED │
    └──────────┘

허용되는 전이:
  PENDING    → PAID, CANCELLED
  PAID       → PREPARING, CANCELLED
  PREPARING  → SHIPPING, CANCELLED
  SHIPPING   → DELIVERED
  DELIVERED  → CONFIRMED, (RETURN 프로세스)
  CONFIRMED  → (최종 상태)
  CANCELLED  → (최종 상태)
```

---

## 9. Convention Prerequisites

### 9.1 Existing Project Conventions

- [ ] `CLAUDE.md` has coding conventions section
- [ ] `docs/01-plan/conventions.md` exists
- [ ] ESLint configuration
- [ ] Prettier configuration
- [ ] TypeScript configuration

### 9.2 Conventions to Define/Verify

| Category | Current State | To Define | Priority |
|----------|---------------|-----------|:--------:|
| **Naming** | Missing | PascalCase: 컴포넌트/타입, camelCase: 함수/변수, kebab-case: 파일/폴더 | High |
| **Folder structure** | Missing | Enterprise Clean Architecture 구조 | High |
| **Import order** | Missing | external → internal → relative → types | Medium |
| **Error handling** | Missing | AppError 클래스 + Result 패턴 | High |
| **API response** | Missing | `{ success, data, error, meta }` 통일 포맷 | High |

### 9.3 Environment Variables Needed

| Variable | Purpose | Scope | To Be Created |
|----------|---------|-------|:-------------:|
| `DATABASE_URL` | PostgreSQL 연결 문자열 | Server | ☑ |
| `NEXTAUTH_URL` | NextAuth 기본 URL | Server | ☑ |
| `NEXTAUTH_SECRET` | NextAuth 시크릿 키 | Server | ☑ |
| `PAYMENT_PROVIDER` | 결제사 선택 (mock/toss/inicis) | Server | ☑ |
| `GOOGLE_CLIENT_ID` | Google OAuth | Server | ☑ |
| `GOOGLE_CLIENT_SECRET` | Google OAuth | Server | ☑ |
| `S3_BUCKET` | 이미지 저장소 버킷 | Server | ☑ |
| `S3_REGION` | S3 리전 | Server | ☑ |
| `S3_ACCESS_KEY` | S3 접근 키 | Server | ☑ |
| `S3_SECRET_KEY` | S3 시크릿 키 | Server | ☑ |
| `SMTP_HOST` | 이메일 발송 서버 | Server | ☑ |
| `FREE_SHIPPING_THRESHOLD` | 무료배송 기준금액 | Server | ☑ |
| `DEFAULT_SHIPPING_FEE` | 기본 배송비 | Server | ☑ |

---

## 10. Tech Stack Summary

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router) | 15.x |
| Language | TypeScript | 5.x |
| Database | PostgreSQL | 16.x |
| ORM | Prisma | 6.x |
| Auth | NextAuth.js (Auth.js) | 5.x |
| State | Zustand | 5.x |
| Data Fetching | TanStack Query | 5.x |
| Forms | react-hook-form + zod | 7.x / 3.x |
| Styling | Tailwind CSS + shadcn/ui | 4.x |
| Testing | Vitest + Playwright | Latest |
| Payment | Mock → Toss/Inicis (Strategy) | - |
| File Storage | S3 Compatible | - |
| Container | Docker + docker-compose | - |

---

## 11. Implementation Priority (Phase)

| Phase | Features | Priority |
|-------|----------|----------|
| **Phase 1** | 프로젝트 설정, DB 스키마, 인증 | High |
| **Phase 2** | 상품 카탈로그, 카테고리, 브랜드 | High |
| **Phase 3** | 장바구니, 위시리스트 | High |
| **Phase 4** | 주문, 결제(Mock), 재고 관리 | High |
| **Phase 5** | 배송 관리, 반품/환불 | High |
| **Phase 6** | 쿠폰/프로모션, 리뷰 | Medium |
| **Phase 7** | 관리자 대시보드 | Medium |
| **Phase 8** | 검색 최적화, 성능 튜닝 | Medium |
| **Phase 9** | 테스트, QA, 배포 | High |

---

## 12. Next Steps

1. [ ] Design 문서 작성 (`/pdca design clothing-ecommerce`)
2. [ ] Schema 상세 정의 (Prisma schema)
3. [ ] 코딩 컨벤션 정의
4. [ ] 프로젝트 초기 설정 및 구현 시작

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-02-17 | Initial draft | Developer |
