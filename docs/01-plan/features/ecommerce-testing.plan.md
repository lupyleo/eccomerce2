# Plan: E-Commerce 테스트 코드 구축

## 1. 개요

### 목적
이커머스 플랫폼의 핵심 기능들이 사용자 관점에서 정상적으로 동작하는지 검증하고, 추후 코드 변경 시 회귀(regression)를 방지하는 안전망을 구축한다.

### 배경
- 현재 기본적인 E2E 스모크 테스트(5개 파일, 약 92줄)만 존재
- 비즈니스 로직에 대한 단위 테스트가 전무
- API 엔드포인트의 다양한 시나리오(필터링, 페이지네이션, 에러 케이스)가 검증되지 않음
- 장바구니 병합, 주문 생성, 재고 관리 등 복잡한 트랜잭션 로직이 테스트 없이 운용 중

### 범위
- **포함**: API 통합 테스트, 서비스 단위 테스트, E2E 사용자 시나리오 테스트
- **제외**: UI 스냅샷 테스트, 성능 테스트, 부하 테스트

---

## 2. 테스트 전략

### 2.1 테스트 피라미드

```
        ┌──────────┐
        │   E2E    │  Playwright (핵심 사용자 흐름)
        │  ~15개   │
       ─┼──────────┼─
       │  Integration │  Vitest (API 엔드포인트 + DB)
       │   ~40개      │
      ─┼──────────────┼─
      │     Unit        │  Vitest (서비스 로직, 유틸리티)
      │    ~30개        │
     ─┼────────────────┼─
```

### 2.2 기술 스택

| 도구 | 용도 | 비고 |
|------|------|------|
| **Vitest** | 단위/통합 테스트 | 이미 devDependencies에 설치됨 |
| **@testing-library/react** | 컴포넌트 테스트 | 이미 설치됨 |
| **Playwright** | E2E 테스트 | 이미 설정됨 |
| **Prisma** | 테스트 DB 격리 | 트랜잭션 롤백 패턴 활용 |

### 2.3 테스트 데이터 전략

- **단위 테스트**: 모킹(Prisma Client mock)
- **통합 테스트**: 테스트 전용 DB + 시드 데이터 + 트랜잭션 롤백
- **E2E 테스트**: 실제 서버 + 시드된 DB

---

## 3. 테스트 대상 및 우선순위

### P0 (필수 - 핵심 비즈니스 로직)

#### 3.1 상품 조회 API (`/api/products`)
| 테스트 케이스 | 유형 | 검증 포인트 |
|--------------|------|------------|
| 상품 목록 기본 조회 | 통합 | `success: true`, 페이지네이션 메타, 상품 데이터 구조 |
| 카테고리 slug 필터링 | 통합 | `?category=shirts` → 해당 카테고리 상품만 반환 |
| 브랜드 slug 필터링 | 통합 | `?brand=nike` → 해당 브랜드 상품만 반환 |
| 카테고리 + 브랜드 복합 필터링 | 통합 | 두 필터 AND 조건 동작 |
| 가격 범위 필터링 | 통합 | `?minPrice=10000&maxPrice=50000` |
| 사이즈 필터링 | 통합 | `?sizes=M,L` → 해당 사이즈 variant 있는 상품만 |
| 색상 필터링 | 통합 | `?colors=Black,White` |
| 텍스트 검색 | 통합 | `?search=티셔츠` → name/description 부분 일치 |
| 정렬 옵션 (newest/price_asc/price_desc/popular/rating) | 통합 | 각 정렬 기준별 순서 검증 |
| ACTIVE 상태만 노출 | 통합 | HIDDEN, DISCONTINUED 상품 제외 확인 |
| 빈 결과 처리 | 통합 | 존재하지 않는 카테고리 → 빈 배열, 정상 응답 |

#### 3.2 카테고리/브랜드 API
| 테스트 케이스 | 유형 | 검증 포인트 |
|--------------|------|------------|
| 카테고리 트리 구조 반환 | 통합 | 부모-자식 계층 구조 올바르게 빌드 |
| 비활성 카테고리 제외 | 통합 | `isActive: false` 카테고리 미포함 |
| 브랜드 목록 반환 | 통합 | 활성 브랜드만 이름 순 정렬 |
| 브랜드 데이터 구조 | 통합 | id, name, slug, logoUrl, description 포함 |

#### 3.3 장바구니 서비스 (`CartService`)
| 테스트 케이스 | 유형 | 검증 포인트 |
|--------------|------|------------|
| 게스트 카트 조회 (빈 카트) | 단위 | `{ items: [], totalAmount: 0, itemCount: 0 }` |
| 게스트 카트 아이템 추가 | 단위 | 카트 자동 생성 + 아이템 추가 |
| 동일 variant 중복 추가 시 수량 합산 | 단위 | upsert로 quantity 누적 |
| 재고 초과 추가 시 에러 | 단위 | `INSUFFICIENT_STOCK` 에러 코드 |
| 수량 변경 | 단위 | 소유자 검증 후 수량 업데이트 |
| 타인 카트 아이템 수량 변경 차단 | 단위 | NotFoundError 발생 |
| 아이템 삭제 | 단위 | 소유자 검증 후 삭제 |
| totalAmount 계산 정확성 | 단위 | price * quantity 합산 검증 |
| 사용자 카트 조회 | 단위 | userId로 카트 조회 |

#### 3.4 장바구니 병합 로직 (`mergeGuestCart`)
| 테스트 케이스 | 유형 | 검증 포인트 |
|--------------|------|------------|
| 게스트→유저 카트 병합 (유저 카트 없음) | 단위 | 유저 카트 생성 + 모든 아이템 이동 |
| 게스트→유저 카트 병합 (유저 카트 있음, 중복 variant 없음) | 단위 | 아이템 추가, 게스트 카트 삭제 |
| 게스트→유저 카트 병합 (중복 variant 있음) | 단위 | 수량 합산 검증 |
| 빈 게스트 카트 병합 시도 | 단위 | `{ merged: 0 }` 반환 |
| 존재하지 않는 sessionId 병합 | 단위 | `{ merged: 0 }` 반환 |
| 병합 후 게스트 카트 삭제 확인 | 단위 | cascade delete 동작 검증 |
| 병합 API 인증 필수 | 통합 | 비인증 시 401 |

#### 3.5 장바구니 API 엔드포인트
| 테스트 케이스 | 유형 | 검증 포인트 |
|--------------|------|------------|
| GET /api/cart (게스트, x-session-id 헤더) | 통합 | 세션 기반 카트 반환 |
| GET /api/cart (인증 사용자) | 통합 | userId 기반 카트 반환 |
| GET /api/cart (세션 없음, 미인증) | 통합 | 401 에러 |
| POST /api/cart/items (아이템 추가) | 통합 | variant 추가, 응답 데이터 구조 |
| PATCH /api/cart/items/[id] (수량 변경) | 통합 | 수량 업데이트 확인 |
| DELETE /api/cart/items/[id] (아이템 삭제) | 통합 | 삭제 확인 |
| POST /api/cart/merge (인증 필수) | 통합 | 병합 성공 + 게스트 카트 정리 |

### P1 (높음 - 어드민 기능)

#### 3.6 어드민 대시보드 API (`/api/admin/dashboard`)
| 테스트 케이스 | 유형 | 검증 포인트 |
|--------------|------|------------|
| 미인증 시 401 | 통합 | UnauthorizedError |
| 일반 사용자(CUSTOMER) 접근 시 403 | 통합 | ForbiddenError |
| 대시보드 데이터 구조 | 통합 | todaySales, todayOrders, pendingOrders, pendingReturns, lowStockVariants, monthlySales, topProducts, orderStatusSummary |
| 오늘 매출 집계 정확성 | 통합 | 취소 주문 제외, finalAmount 합산 |
| 월간 매출 추이 데이터 | 통합 | 30일간 일별 집계, 날짜순 정렬 |
| 인기 상품 TOP 10 | 통합 | salesCount 기준 내림차순, revenue 계산 |

#### 3.7 어드민 상품 관리 API (`/api/admin/products`)
| 테스트 케이스 | 유형 | 검증 포인트 |
|--------------|------|------------|
| 상품 목록 조회 (페이지네이션) | 통합 | 페이지, 한도, 전체 수 |
| 상품 생성 | 통합 | 필수 필드 검증, 생성 결과 확인 |
| 상품 수정 | 통합 | 필드 업데이트 반영 |
| 상품 삭제 | 통합 | 삭제 또는 상태 변경 확인 |
| variant 추가/수정/삭제 | 통합 | 사이즈/색상/가격/재고 관리 |

#### 3.8 어드민 주문 관리 API (`/api/admin/orders`)
| 테스트 케이스 | 유형 | 검증 포인트 |
|--------------|------|------------|
| 주문 목록 조회 | 통합 | 상태 필터, 페이지네이션 |
| 주문 상세 조회 | 통합 | 아이템, 결제, 배송 정보 포함 |
| 주문 상태 변경 | 통합 | 유효한 상태 전환만 허용 |

#### 3.9 어드민 인증/권한 가드
| 테스트 케이스 | 유형 | 검증 포인트 |
|--------------|------|------------|
| requireAuth - 유효한 세션 | 단위 | AuthSession 반환 |
| requireAuth - 세션 없음 | 단위 | UnauthorizedError |
| requireAdmin - ADMIN 역할 | 단위 | AuthSession 반환 |
| requireAdmin - CUSTOMER 역할 | 단위 | ForbiddenError |
| 모든 admin API 엔드포인트 미인증 거부 | 통합 | 10개 API 모두 401 |

### P2 (중간 - 보조 기능)

#### 3.10 어드민 쿠폰/프로모션 관리
| 테스트 케이스 | 유형 | 검증 포인트 |
|--------------|------|------------|
| 쿠폰 CRUD | 통합 | 생성/조회/수정/삭제 |
| 프로모션 CRUD | 통합 | 카테고리 기반 할인 관리 |

#### 3.11 어드민 재고/반품 관리
| 테스트 케이스 | 유형 | 검증 포인트 |
|--------------|------|------------|
| 재고 조회 | 통합 | 재고 부족 알림 포함 |
| 재고 로그 조회 | 통합 | 이력 추적 |
| 반품 처리 | 통합 | 상태 워크플로우 |

#### 3.12 API 공통 패턴
| 테스트 케이스 | 유형 | 검증 포인트 |
|--------------|------|------------|
| apiHandler 에러 처리 | 단위 | AppError → JSON 응답 변환 |
| apiHandler 미처리 에러 | 단위 | 500 INTERNAL_ERROR |
| successResponse 포맷 | 단위 | `{ success: true, data }` |
| paginatedResponse 포맷 | 단위 | meta.totalPages 계산 |
| CartIdentity 결정 로직 | 단위 | 인증 사용자 → user, 미인증 → guest, 둘 다 없음 → 에러 |

### P3 (E2E 사용자 시나리오)

#### 3.13 핵심 사용자 플로우
| 테스트 케이스 | 유형 | 검증 포인트 |
|--------------|------|------------|
| 홈페이지 → 상품 목록 → 필터링 → 상품 상세 | E2E | 페이지 이동, 데이터 로딩 |
| 비회원 장바구니 → 로그인 → 카트 병합 | E2E | 게스트 아이템 유지 |
| 상품 상세 → 옵션 선택 → 장바구니 추가 → 장바구니 확인 | E2E | 전체 플로우 |
| 어드민 로그인 → 대시보드 확인 | E2E | 통계 데이터 표시 |
| 어드민 상품 관리 → 상품 생성 → 목록 확인 | E2E | CRUD 플로우 |

---

## 4. 테스트 인프라 구성

### 4.1 Vitest 설정 (신규 생성)

```
eccomerce2/
├── vitest.config.ts                    # Vitest 설정
├── tests/
│   ├── e2e/                           # 기존 Playwright 테스트
│   ├── setup.ts                       # 글로벌 테스트 설정
│   ├── helpers/
│   │   ├── prisma-mock.ts             # Prisma Client 모킹 유틸
│   │   ├── test-fixtures.ts           # 테스트 데이터 팩토리
│   │   └── api-test-helpers.ts        # API 테스트 헬퍼
│   ├── unit/
│   │   ├── services/
│   │   │   └── cart.service.test.ts    # CartService 단위 테스트
│   │   └── lib/
│   │       ├── api-handler.test.ts     # apiHandler 테스트
│   │       ├── auth-guard.test.ts      # 인증 가드 테스트
│   │       └── cart-identity.test.ts   # CartIdentity 테스트
│   └── integration/
│       ├── api/
│       │   ├── products.test.ts        # 상품 API 통합 테스트
│       │   ├── categories.test.ts      # 카테고리 API 통합 테스트
│       │   ├── brands.test.ts          # 브랜드 API 통합 테스트
│       │   ├── cart.test.ts            # 장바구니 API 통합 테스트
│       │   └── cart-merge.test.ts      # 장바구니 병합 API 통합 테스트
│       └── admin/
│           ├── dashboard.test.ts       # 대시보드 API 통합 테스트
│           ├── products.test.ts        # 어드민 상품 관리 테스트
│           ├── orders.test.ts          # 어드민 주문 관리 테스트
│           └── auth-guard.test.ts      # 어드민 권한 일괄 테스트
```

### 4.2 테스트 DB 전략

**통합 테스트용 DB 격리 방식**: 트랜잭션 롤백 패턴

```typescript
// 각 테스트 전: 트랜잭션 시작
// 각 테스트 후: 롤백으로 데이터 원상복구
// → DB 상태 오염 없이 독립적 테스트 가능
```

### 4.3 npm 스크립트 추가

```json
{
  "test": "vitest run",
  "test:watch": "vitest",
  "test:unit": "vitest run tests/unit",
  "test:integration": "vitest run tests/integration",
  "test:coverage": "vitest run --coverage",
  "test:e2e": "npx playwright test"
}
```

---

## 5. 구현 순서

### Phase 1: 테스트 인프라 구축 (토대)
1. `vitest.config.ts` 생성 (경로 별칭, 타임아웃, 테스트 환경 설정)
2. `tests/setup.ts` 글로벌 설정
3. `tests/helpers/` 테스트 유틸리티 작성 (Prisma mock, fixtures, API helpers)
4. `package.json` 테스트 스크립트 추가

### Phase 2: 단위 테스트 (P0 비즈니스 로직)
1. `cart.service.test.ts` - CartService 전체 테스트 (~15개 케이스)
2. `api-handler.test.ts` - API 핸들러/응답 포맷 (~5개 케이스)
3. `auth-guard.test.ts` - 인증/권한 가드 (~4개 케이스)
4. `cart-identity.test.ts` - CartIdentity 로직 (~4개 케이스)

### Phase 3: 통합 테스트 - 사용자 API
1. `products.test.ts` - 상품 조회 + 필터링 + 정렬 (~11개 케이스)
2. `categories.test.ts` - 카테고리 트리 (~2개 케이스)
3. `brands.test.ts` - 브랜드 목록 (~2개 케이스)
4. `cart.test.ts` - 장바구니 CRUD API (~7개 케이스)
5. `cart-merge.test.ts` - 병합 API (~3개 케이스)

### Phase 4: 통합 테스트 - 어드민 API
1. `admin/auth-guard.test.ts` - 어드민 API 인증 일괄 검증 (~10개 케이스)
2. `admin/dashboard.test.ts` - 대시보드 데이터 (~6개 케이스)
3. `admin/products.test.ts` - 상품 CRUD (~5개 케이스)
4. `admin/orders.test.ts` - 주문 관리 (~3개 케이스)

### Phase 5: E2E 테스트 확장
1. 기존 5개 E2E 테스트 보강
2. 핵심 사용자 시나리오 3개 추가
3. 어드민 시나리오 2개 추가

---

## 6. 성공 기준

| 항목 | 목표 |
|------|------|
| P0 테스트 커버리지 | 100% (모든 P0 케이스 통과) |
| P1 테스트 커버리지 | 90% 이상 |
| 전체 테스트 실행 시간 | 단위+통합 30초 이내 |
| E2E 테스트 실행 시간 | 2분 이내 |
| CI 환경 실행 가능 | Docker 기반 테스트 DB 포함 |

---

## 7. 리스크 및 의사결정

### 의사결정 사항

| 결정 | 선택 | 근거 |
|------|------|------|
| 테스트 프레임워크 | Vitest | 이미 설치됨, Vite 생태계 호환, 빠른 실행 |
| 단위 테스트 DB 접근 | Prisma Mock | 외부 의존성 없이 빠른 실행 |
| 통합 테스트 DB 격리 | 트랜잭션 롤백 | 테스트 간 독립성 보장 |
| E2E 확장 범위 | 핵심 5개 시나리오만 | 유지보수 비용 vs 효과 균형 |

### 리스크

| 리스크 | 영향 | 대응 |
|--------|------|------|
| Next.js API Route 테스트 어려움 | 중 | next-test-api-route-handler 또는 직접 함수 호출 패턴 사용 |
| 테스트 DB 세팅 복잡도 | 중 | Docker compose 테스트 프로파일 활용 |
| 인증 모킹 복잡도 | 중 | next-auth mock 유틸리티 공통 작성 |

---

## 8. 예상 산출물

- `vitest.config.ts` - 테스트 설정 파일
- `tests/setup.ts` - 글로벌 테스트 환경 설정
- `tests/helpers/` - 3개 헬퍼 파일
- `tests/unit/` - 4개 단위 테스트 파일 (~28개 케이스)
- `tests/integration/` - 9개 통합 테스트 파일 (~49개 케이스)
- `tests/e2e/` - 기존 5개 보강 + 5개 신규 (~15개 케이스)
- **총 약 85-90개 테스트 케이스**
