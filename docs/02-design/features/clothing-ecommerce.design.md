# Clothing E-Commerce Design Document

> **Summary**: 의류 이커머스 플랫폼의 상세 기술 설계. Clean Architecture + Strategy Pattern 기반 결제 모크 + PostgreSQL 트랜잭션 설계.
>
> **Project**: clothing-ecommerce
> **Version**: 0.1.0
> **Author**: Developer
> **Date**: 2026-02-17
> **Status**: Draft
> **Planning Doc**: [clothing-ecommerce.plan.md](../01-plan/features/clothing-ecommerce.plan.md)

### Pipeline References

| Phase | Document | Status |
|-------|----------|--------|
| Phase 1 | Schema Definition | N/A |
| Phase 2 | Coding Conventions | N/A |
| Phase 3 | Mockup | N/A |
| Phase 4 | API Spec | Inline (this doc) |

---

## 1. Overview

### 1.1 Design Goals

- 결제사 교체가 환경변수 하나로 가능한 인터페이스 분리 아키텍처
- PostgreSQL 트랜잭션으로 주문-재고-결제 데이터 정합성 100% 보장
- 의류 특화 상품 변형(사이즈 x 컬러) 관리 체계
- 주문 상태 머신을 통한 안전한 상태 전이
- 프로덕션 수준의 비즈니스 로직 (재고 예약, 쿠폰 검증, 배송비 계산, 반품/환불)

### 1.2 Design Principles

- **Dependency Inversion**: 도메인 레이어는 외부 의존성 없이 순수 타입/로직만 포함
- **Strategy Pattern**: 결제사 인터페이스를 도메인에 정의하고, 구현체는 infrastructure에 위치
- **State Machine**: 주문 상태 전이를 명시적으로 정의하여 불법 전이 차단
- **Transactional Consistency**: 재고 예약/차감/복구를 반드시 트랜잭션 내에서 처리
- **Snapshot Pattern**: 주문 시점의 상품/배송지 정보를 스냅샷으로 보존

---

## 2. Architecture

### 2.1 System Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        Client (Browser)                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────────┐  │
│  │ 상품목록  │  │ 장바구니  │  │ 체크아웃  │  │ 관리자 대시보드 │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────┬─────────┘  │
│       │              │             │               │            │
│  ┌────┴──────────────┴─────────────┴───────────────┴─────────┐  │
│  │              Zustand (Client State)                        │  │
│  │         TanStack Query (Server State Cache)               │  │
│  └────────────────────────┬──────────────────────────────────┘  │
└───────────────────────────┼──────────────────────────────────────┘
                            │ HTTP (fetch)
┌───────────────────────────┼──────────────────────────────────────┐
│                   Next.js Server                                 │
│  ┌────────────────────────┴──────────────────────────────────┐   │
│  │               API Routes (app/api/)                        │   │
│  │    /products  /orders  /cart  /payments  /admin  /auth     │   │
│  └────────────────────────┬──────────────────────────────────┘   │
│  ┌────────────────────────┴──────────────────────────────────┐   │
│  │            Application Layer (Services)                    │   │
│  │  ProductService  OrderService  CheckoutService             │   │
│  │  CartService  PaymentService  InventoryService             │   │
│  │  ShippingService  CouponService  ReviewService             │   │
│  └────────────────────────┬──────────────────────────────────┘   │
│  ┌────────────────────────┴──────────────────────────────────┐   │
│  │              Domain Layer (Pure Logic)                      │   │
│  │  Entities  Value Objects  Repository Interfaces             │   │
│  │  PaymentGateway Interface  State Machine                    │   │
│  └────────────────────────┬──────────────────────────────────┘   │
│  ┌────────────────────────┴──────────────────────────────────┐   │
│  │           Infrastructure Layer (Implementations)           │   │
│  │  Prisma Repositories  MockPaymentGateway                   │   │
│  │  S3 Storage  Email Service  NextAuth                       │   │
│  └────────────────────────┬──────────────────────────────────┘   │
└───────────────────────────┼──────────────────────────────────────┘
                            │
                   ┌────────┴────────┐
                   │   PostgreSQL    │
                   │   (Primary DB)  │
                   └─────────────────┘
```

### 2.2 Clean Architecture Layer Flow

```
Request Flow (주문 생성 예시):

  POST /api/orders
       │
       ▼
  API Route Handler (app/api/orders/route.ts)
       │  - Request validation (zod)
       │  - Auth check (NextAuth session)
       │  - Call service
       ▼
  CheckoutService.createOrder(dto)                    [Application]
       │  - Orchestrate multiple domain operations
       │  - Begin transaction
       ▼
  ┌─── Transaction ────────────────────────────────┐
  │ 1. CartRepository.getCartWithItems(userId)      │  [Infrastructure]
  │ 2. InventoryService.reserveStock(items)         │  [Application]
  │    └→ ProductVariant SELECT FOR UPDATE          │  [Infrastructure]
  │    └→ StockLog.create(RESERVE)                  │  [Infrastructure]
  │ 3. CouponService.validateAndApply(couponId)     │  [Application]
  │    └→ CouponUsage UNIQUE check                  │  [Infrastructure]
  │ 4. ShippingService.calculateFee(address, total) │  [Application]
  │ 5. Order.create(snapshot data)                  │  [Domain → Infra]
  │ 6. OrderItem.createMany(snapshot items)         │  [Infrastructure]
  │ 7. PaymentService.initiate(order)               │  [Application]
  │    └→ PaymentGateway.charge(request)            │  [Infrastructure]
  │ 8. OrderStateMachine.transition(PENDING→PAID)   │  [Domain]
  │ 9. InventoryService.confirmReservation(items)   │  [Application]
  │ 10. CartRepository.clearCart(userId)             │  [Infrastructure]
  └────────────────────────────────────────────────┘
       │
       ▼
  Return OrderResponse DTO
```

### 2.3 Dependencies

| Component | Depends On | Purpose |
|-----------|-----------|---------|
| API Routes | Application Services | Request → Service 위임 |
| Application Services | Domain Entities + Repository Interfaces | 비즈니스 로직 오케스트레이션 |
| Domain Layer | Nothing (pure) | 엔티티, 인터페이스 정의 |
| Infrastructure | Domain Interfaces | 구현체 제공 (Prisma, Mock PG) |
| Presentation | Application (via API) | UI 렌더링 |

---

## 3. Data Model

### 3.1 Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================
// User & Auth
// ============================================

enum UserRole {
  CUSTOMER
  ADMIN
}

model User {
  id           String    @id @default(uuid()) @db.Uuid
  email        String    @unique
  name         String
  passwordHash String?   @map("password_hash")
  role         UserRole  @default(CUSTOMER)
  phone        String?
  profileImage String?   @map("profile_image")
  createdAt    DateTime  @default(now()) @map("created_at")
  updatedAt    DateTime  @updatedAt @map("updated_at")

  addresses    Address[]
  orders       Order[]
  reviews      Review[]
  wishlists    Wishlist[]
  cart         Cart?
  couponUsages CouponUsage[]
  accounts     Account[]
  sessions     Session[]

  @@map("users")
}

model Account {
  id                String  @id @default(uuid()) @db.Uuid
  userId            String  @map("user_id") @db.Uuid
  type              String
  provider          String
  providerAccountId String  @map("provider_account_id")
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@map("accounts")
}

model Session {
  id           String   @id @default(uuid()) @db.Uuid
  sessionToken String   @unique @map("session_token")
  userId       String   @map("user_id") @db.Uuid
  expires      DateTime

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("sessions")
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
  @@map("verification_tokens")
}

model Address {
  id        String  @id @default(uuid()) @db.Uuid
  userId    String  @map("user_id") @db.Uuid
  name      String
  phone     String
  zipCode   String  @map("zip_code")
  address1  String
  address2  String?
  isDefault Boolean @default(false) @map("is_default")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("addresses")
}

// ============================================
// Product Catalog
// ============================================

model Category {
  id        String    @id @default(uuid()) @db.Uuid
  name      String
  slug      String    @unique
  parentId  String?   @map("parent_id") @db.Uuid
  depth     Int       @default(0)
  sortOrder Int       @default(0) @map("sort_order")
  isActive  Boolean   @default(true) @map("is_active")

  parent   Category?  @relation("CategoryTree", fields: [parentId], references: [id])
  children Category[] @relation("CategoryTree")
  products Product[]

  @@map("categories")
}

model Brand {
  id          String  @id @default(uuid()) @db.Uuid
  name        String  @unique
  slug        String  @unique
  logoUrl     String? @map("logo_url")
  description String? @db.Text
  isActive    Boolean @default(true) @map("is_active")

  products Product[]

  @@map("brands")
}

enum ProductStatus {
  ACTIVE
  SOLD_OUT
  HIDDEN
  DISCONTINUED
}

model Product {
  id          String        @id @default(uuid()) @db.Uuid
  name        String
  slug        String        @unique
  description String        @db.Text
  basePrice   Decimal       @map("base_price") @db.Decimal(10, 2)
  categoryId  String        @map("category_id") @db.Uuid
  brandId     String?       @map("brand_id") @db.Uuid
  status      ProductStatus @default(ACTIVE)
  avgRating   Decimal       @default(0) @map("avg_rating") @db.Decimal(2, 1)
  reviewCount Int           @default(0) @map("review_count")
  salesCount  Int           @default(0) @map("sales_count")
  createdAt   DateTime      @default(now()) @map("created_at")
  updatedAt   DateTime      @updatedAt @map("updated_at")

  category  Category        @relation(fields: [categoryId], references: [id])
  brand     Brand?          @relation(fields: [brandId], references: [id])
  variants  ProductVariant[]
  images    ProductImage[]
  reviews   Review[]
  wishlists Wishlist[]

  @@index([categoryId])
  @@index([brandId])
  @@index([status])
  @@index([salesCount(sort: Desc)])
  @@map("products")
}

model ProductVariant {
  id            String  @id @default(uuid()) @db.Uuid
  productId     String  @map("product_id") @db.Uuid
  sku           String  @unique
  size          String
  color         String
  colorCode     String? @map("color_code")
  price         Decimal @db.Decimal(10, 2)
  stock         Int     @default(0)
  reservedStock Int     @default(0) @map("reserved_stock")
  isActive      Boolean @default(true) @map("is_active")

  product    Product     @relation(fields: [productId], references: [id], onDelete: Cascade)
  cartItems  CartItem[]
  orderItems OrderItem[]
  stockLogs  StockLog[]

  @@unique([productId, size, color])
  @@index([productId])
  @@map("product_variants")
}

model ProductImage {
  id        String  @id @default(uuid()) @db.Uuid
  productId String  @map("product_id") @db.Uuid
  url       String
  alt       String?
  sortOrder Int     @default(0) @map("sort_order")
  isPrimary Boolean @default(false) @map("is_primary")

  product Product @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@index([productId])
  @@map("product_images")
}

// ============================================
// Cart
// ============================================

model Cart {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String?  @unique @map("user_id") @db.Uuid
  sessionId String?  @unique @map("session_id")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  user  User?      @relation(fields: [userId], references: [id], onDelete: Cascade)
  items CartItem[]

  @@map("carts")
}

model CartItem {
  id        String @id @default(uuid()) @db.Uuid
  cartId    String @map("cart_id") @db.Uuid
  variantId String @map("variant_id") @db.Uuid
  quantity  Int

  cart    Cart           @relation(fields: [cartId], references: [id], onDelete: Cascade)
  variant ProductVariant @relation(fields: [variantId], references: [id])

  @@unique([cartId, variantId])
  @@map("cart_items")
}

// ============================================
// Order
// ============================================

enum OrderStatus {
  PENDING
  PAID
  PREPARING
  SHIPPING
  DELIVERED
  CONFIRMED
  CANCELLED
}

model Order {
  id              String      @id @default(uuid()) @db.Uuid
  orderNumber     String      @unique @map("order_number")
  userId          String      @map("user_id") @db.Uuid
  status          OrderStatus @default(PENDING)
  totalAmount     Decimal     @map("total_amount") @db.Decimal(10, 2)
  discountAmount  Decimal     @default(0) @map("discount_amount") @db.Decimal(10, 2)
  shippingFee     Decimal     @default(0) @map("shipping_fee") @db.Decimal(10, 2)
  finalAmount     Decimal     @map("final_amount") @db.Decimal(10, 2)
  addressSnapshot Json        @map("address_snapshot")
  couponId        String?     @map("coupon_id") @db.Uuid
  note            String?     @db.Text
  createdAt       DateTime    @default(now()) @map("created_at")
  updatedAt       DateTime    @updatedAt @map("updated_at")

  user     User        @relation(fields: [userId], references: [id])
  coupon   Coupon?     @relation(fields: [couponId], references: [id])
  items    OrderItem[]
  payment  Payment?
  shipment Shipment?
  returns  Return[]
  reviews  Review[]

  @@index([userId])
  @@index([status])
  @@index([createdAt(sort: Desc)])
  @@map("orders")
}

model OrderItem {
  id          String  @id @default(uuid()) @db.Uuid
  orderId     String  @map("order_id") @db.Uuid
  variantId   String  @map("variant_id") @db.Uuid
  productName String  @map("product_name")
  variantInfo String  @map("variant_info")
  price       Decimal @db.Decimal(10, 2)
  quantity    Int
  subtotal    Decimal @db.Decimal(10, 2)

  order   Order          @relation(fields: [orderId], references: [id], onDelete: Cascade)
  variant ProductVariant @relation(fields: [variantId], references: [id])
  returns Return[]

  @@map("order_items")
}

// ============================================
// Payment
// ============================================

enum PaymentMethod {
  CARD
  VIRTUAL_ACCOUNT
  EASY_PAY
}

enum PaymentStatus {
  PENDING
  COMPLETED
  FAILED
  CANCELLED
  PARTIALLY_CANCELLED
}

model Payment {
  id              String        @id @default(uuid()) @db.Uuid
  orderId         String        @unique @map("order_id") @db.Uuid
  method          PaymentMethod
  status          PaymentStatus @default(PENDING)
  amount          Decimal       @db.Decimal(10, 2)
  cancelledAmount Decimal       @default(0) @map("cancelled_amount") @db.Decimal(10, 2)
  pgProvider      String        @map("pg_provider")
  pgPaymentId     String?       @map("pg_payment_id")
  pgResponse      Json?         @map("pg_response")
  paidAt          DateTime?     @map("paid_at")
  cancelledAt     DateTime?     @map("cancelled_at")
  createdAt       DateTime      @default(now()) @map("created_at")

  order Order @relation(fields: [orderId], references: [id])

  @@index([pgPaymentId])
  @@map("payments")
}

// ============================================
// Inventory
// ============================================

enum StockLogType {
  INBOUND
  OUTBOUND
  RESERVE
  RELEASE
  ADJUSTMENT
}

model StockLog {
  id          String       @id @default(uuid()) @db.Uuid
  variantId   String       @map("variant_id") @db.Uuid
  type        StockLogType
  quantity    Int
  reason      String
  referenceId String?      @map("reference_id")
  createdAt   DateTime     @default(now()) @map("created_at")

  variant ProductVariant @relation(fields: [variantId], references: [id])

  @@index([variantId])
  @@index([createdAt(sort: Desc)])
  @@map("stock_logs")
}

// ============================================
// Shipping
// ============================================

enum ShipmentStatus {
  PREPARING
  SHIPPED
  IN_TRANSIT
  DELIVERED
}

model Shipment {
  id             String         @id @default(uuid()) @db.Uuid
  orderId        String         @unique @map("order_id") @db.Uuid
  carrier        String
  trackingNumber String?        @map("tracking_number")
  status         ShipmentStatus @default(PREPARING)
  shippedAt      DateTime?      @map("shipped_at")
  deliveredAt    DateTime?      @map("delivered_at")
  createdAt      DateTime       @default(now()) @map("created_at")

  order Order @relation(fields: [orderId], references: [id])

  @@map("shipments")
}

// ============================================
// Return & Refund
// ============================================

enum ReturnReason {
  CHANGE_MIND
  DEFECTIVE
  WRONG_ITEM
  OTHER
}

enum ReturnStatus {
  REQUESTED
  APPROVED
  COLLECTING
  COLLECTED
  COMPLETED
  REJECTED
}

model Return {
  id           String       @id @default(uuid()) @db.Uuid
  orderId      String       @map("order_id") @db.Uuid
  orderItemId  String?      @map("order_item_id") @db.Uuid
  reason       ReturnReason
  reasonDetail String?      @map("reason_detail") @db.Text
  status       ReturnStatus @default(REQUESTED)
  refundAmount Decimal      @map("refund_amount") @db.Decimal(10, 2)
  images       String[]
  createdAt    DateTime     @default(now()) @map("created_at")
  updatedAt    DateTime     @updatedAt @map("updated_at")

  order     Order      @relation(fields: [orderId], references: [id])
  orderItem OrderItem? @relation(fields: [orderItemId], references: [id])

  @@map("returns")
}

// ============================================
// Coupon
// ============================================

enum CouponType {
  FIXED
  PERCENTAGE
}

model Coupon {
  id             String     @id @default(uuid()) @db.Uuid
  code           String     @unique
  name           String
  type           CouponType
  value          Decimal    @db.Decimal(10, 2)
  minOrderAmount Decimal?   @map("min_order_amount") @db.Decimal(10, 2)
  maxDiscount    Decimal?   @map("max_discount") @db.Decimal(10, 2)
  validFrom      DateTime   @map("valid_from")
  validUntil     DateTime   @map("valid_until")
  maxUsageCount  Int?       @map("max_usage_count")
  usedCount      Int        @default(0) @map("used_count")
  isActive       Boolean    @default(true) @map("is_active")
  createdAt      DateTime   @default(now()) @map("created_at")

  orders  Order[]
  usages  CouponUsage[]

  @@map("coupons")
}

model CouponUsage {
  id       String   @id @default(uuid()) @db.Uuid
  couponId String   @map("coupon_id") @db.Uuid
  userId   String   @map("user_id") @db.Uuid
  orderId  String   @map("order_id") @db.Uuid
  usedAt   DateTime @default(now()) @map("used_at")

  coupon Coupon @relation(fields: [couponId], references: [id])
  user   User   @relation(fields: [userId], references: [id])

  @@unique([couponId, userId])
  @@map("coupon_usages")
}

// ============================================
// Wishlist
// ============================================

model Wishlist {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String   @map("user_id") @db.Uuid
  productId String   @map("product_id") @db.Uuid
  createdAt DateTime @default(now()) @map("created_at")

  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  product Product @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@unique([userId, productId])
  @@map("wishlists")
}

// ============================================
// Review
// ============================================

model Review {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String   @map("user_id") @db.Uuid
  productId String   @map("product_id") @db.Uuid
  orderId   String   @map("order_id") @db.Uuid
  rating    Int
  content   String   @db.Text
  images    String[]
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  user    User    @relation(fields: [userId], references: [id])
  product Product @relation(fields: [productId], references: [id])
  order   Order   @relation(fields: [orderId], references: [id])

  @@unique([userId, orderId, productId])
  @@map("reviews")
}
```

### 3.2 Entity Relationships

```
[User] 1 ── N [Address]
  │ 1
  ├── 1 [Cart] 1 ── N [CartItem] N ── 1 [ProductVariant]
  ├── N [Order] 1 ── N [OrderItem] N ── 1 [ProductVariant]
  │       │ 1
  │       ├── 1 [Payment]
  │       ├── 1 [Shipment]
  │       ├── N [Return]
  │       └── N [Review]
  ├── N [Wishlist] N ── 1 [Product]
  ├── N [CouponUsage] N ── 1 [Coupon]
  └── N [Review]

[Category] 1 ── N [Category] (self-ref tree)
  └── 1 ── N [Product]

[Brand] 1 ── N [Product]

[Product] 1 ── N [ProductVariant]
  │         └── 1 ── N [StockLog]
  ├── 1 ── N [ProductImage]
  ├── 1 ── N [Review]
  └── 1 ── N [Wishlist]
```

---

## 4. API Specification

### 4.1 API Response Format (공통)

```typescript
// 성공 응답
interface ApiResponse<T> {
  success: true;
  data: T;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// 에러 응답
interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
}
```

### 4.2 Auth API

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | /api/auth/signup | 이메일 회원가입 | Public |
| POST | /api/auth/[...nextauth] | NextAuth 핸들러 (로그인, 소셜) | Public |
| GET | /api/auth/session | 현재 세션 조회 | Public |
| POST | /api/auth/reset-password | 비밀번호 재설정 요청 | Public |
| PUT | /api/auth/reset-password | 비밀번호 재설정 확인 | Public |

#### `POST /api/auth/signup`

```typescript
// Request
{
  email: string;       // 이메일 (unique)
  password: string;    // 비밀번호 (최소 8자, 영문+숫자+특수문자)
  name: string;        // 이름
  phone?: string;      // 전화번호
}

// Response 201
{
  success: true,
  data: {
    id: string;
    email: string;
    name: string;
  }
}

// Error 409
{
  success: false,
  error: { code: "EMAIL_ALREADY_EXISTS", message: "이미 가입된 이메일입니다." }
}
```

### 4.3 Product API

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /api/products | 상품 목록 (필터/검색/정렬/페이지네이션) | Public |
| GET | /api/products/:slug | 상품 상세 (변형, 이미지 포함) | Public |
| GET | /api/categories | 카테고리 트리 | Public |
| GET | /api/brands | 브랜드 목록 | Public |

#### `GET /api/products`

```typescript
// Query Parameters
{
  page?: number;           // default: 1
  limit?: number;          // default: 20, max: 100
  category?: string;       // 카테고리 slug
  brand?: string;          // 브랜드 slug
  minPrice?: number;
  maxPrice?: number;
  sizes?: string;          // 쉼표 구분 (S,M,L)
  colors?: string;         // 쉼표 구분
  search?: string;         // Full-text search 키워드
  sort?: 'newest' | 'price_asc' | 'price_desc' | 'popular' | 'rating';
  status?: ProductStatus;  // admin only
}

// Response 200
{
  success: true,
  data: [
    {
      id: string;
      name: string;
      slug: string;
      basePrice: number;
      status: ProductStatus;
      primaryImage: { url: string; alt: string } | null;
      avgRating: number;
      reviewCount: number;
      category: { id: string; name: string };
      brand: { id: string; name: string } | null;
      availableSizes: string[];
      availableColors: { name: string; code: string }[];
      isWishlisted: boolean;  // 로그인 시
    }
  ],
  meta: { page, limit, total, totalPages }
}
```

#### `GET /api/products/:slug`

```typescript
// Response 200
{
  success: true,
  data: {
    id: string;
    name: string;
    slug: string;
    description: string;
    basePrice: number;
    status: ProductStatus;
    category: { id, name, slug, breadcrumb: Category[] };
    brand: { id, name, slug, logoUrl } | null;
    images: { id, url, alt, sortOrder, isPrimary }[];
    variants: {
      id: string;
      sku: string;
      size: string;
      color: string;
      colorCode: string | null;
      price: number;
      availableStock: number;  // stock - reservedStock
      isActive: boolean;
    }[];
    avgRating: number;
    reviewCount: number;
    salesCount: number;
    isWishlisted: boolean;
  }
}
```

### 4.4 Cart API

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /api/cart | 장바구니 조회 | Required |
| POST | /api/cart/items | 장바구니 추가 | Required |
| PATCH | /api/cart/items/:id | 수량 변경 | Required |
| DELETE | /api/cart/items/:id | 항목 삭제 | Required |
| POST | /api/cart/merge | 비회원 → 회원 장바구니 병합 | Required |

#### `POST /api/cart/items`

```typescript
// Request
{
  variantId: string;
  quantity: number;    // 1 이상
}

// Response 201
{
  success: true,
  data: {
    id: string;
    variant: {
      id, sku, size, color, colorCode, price,
      availableStock: number;
      product: { id, name, slug, primaryImage }
    };
    quantity: number;
  }
}

// Error 400 - 재고 초과
{
  success: false,
  error: {
    code: "INSUFFICIENT_STOCK",
    message: "재고가 부족합니다. (현재 재고: 3개)"
  }
}
```

### 4.5 Order API

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | /api/orders | 주문 생성 (체크아웃) | Required |
| GET | /api/orders | 주문 목록 | Required |
| GET | /api/orders/:id | 주문 상세 | Required |
| POST | /api/orders/:id/cancel | 주문 취소 | Required |
| POST | /api/orders/:id/confirm | 구매 확정 | Required |

#### `POST /api/orders`

```typescript
// Request
{
  addressId: string;           // 배송지 ID
  couponCode?: string;         // 쿠폰 코드
  paymentMethod: PaymentMethod;
  note?: string;               // 배송 메모
}

// Response 201
{
  success: true,
  data: {
    id: string;
    orderNumber: string;
    status: "PAID";
    totalAmount: number;
    discountAmount: number;
    shippingFee: number;
    finalAmount: number;
    items: OrderItemResponse[];
    payment: {
      id: string;
      method: PaymentMethod;
      status: "COMPLETED";
      pgPaymentId: string;
    };
    createdAt: string;
  }
}

// Error 400
{
  success: false,
  error: { code: "CART_EMPTY", message: "장바구니가 비어있습니다." }
}

// Error 400
{
  success: false,
  error: {
    code: "STOCK_CHANGED",
    message: "일부 상품의 재고가 변경되었습니다.",
    details: {
      items: [{ variantId, requested: 3, available: 1 }]
    }
  }
}
```

### 4.6 Payment API

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | /api/payments/webhook | 결제 웹훅 수신 (Mock/PG) | Webhook Secret |
| POST | /api/payments/:id/cancel | 결제 취소 (전액/부분) | Required |
| GET | /api/payments/:id | 결제 상세 조회 | Required |

#### `POST /api/payments/:id/cancel`

```typescript
// Request
{
  amount?: number;   // 생략 시 전액 취소
  reason: string;
}

// Response 200
{
  success: true,
  data: {
    id: string;
    status: "CANCELLED" | "PARTIALLY_CANCELLED";
    cancelledAmount: number;
    remainingAmount: number;
  }
}
```

### 4.7 Shipping API

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /api/orders/:id/shipment | 배송 정보 조회 | Required |
| POST | /api/shipping/calculate | 배송비 계산 | Required |

### 4.8 Return API

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | /api/orders/:id/returns | 반품 신청 | Required |
| GET | /api/orders/:id/returns | 반품 정보 조회 | Required |

#### `POST /api/orders/:id/returns`

```typescript
// Request
{
  orderItemId?: string;      // 특정 상품만 반품 (생략 시 전체)
  reason: ReturnReason;
  reasonDetail?: string;
  images?: string[];         // 이미지 URL
}

// Response 201
{
  success: true,
  data: {
    id: string;
    status: "REQUESTED";
    refundAmount: number;
    reason: ReturnReason;
  }
}
```

### 4.9 Coupon API

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | /api/coupons/validate | 쿠폰 유효성 검증 + 할인 금액 미리보기 | Required |
| GET | /api/coupons/my | 사용 가능한 내 쿠폰 목록 | Required |

#### `POST /api/coupons/validate`

```typescript
// Request
{
  code: string;
  orderAmount: number;
}

// Response 200
{
  success: true,
  data: {
    couponId: string;
    name: string;
    type: CouponType;
    discountAmount: number;   // 계산된 할인 금액
    finalAmount: number;      // 할인 적용 후 금액
  }
}

// Error 400
{
  success: false,
  error: { code: "COUPON_EXPIRED", message: "만료된 쿠폰입니다." }
}
```

### 4.10 Review API

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /api/products/:slug/reviews | 상품 리뷰 목록 | Public |
| POST | /api/reviews | 리뷰 작성 | Required |
| PUT | /api/reviews/:id | 리뷰 수정 | Required |
| DELETE | /api/reviews/:id | 리뷰 삭제 | Required |

### 4.11 Wishlist API

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /api/wishlists | 위시리스트 목록 | Required |
| POST | /api/wishlists | 위시리스트 추가 | Required |
| DELETE | /api/wishlists/:productId | 위시리스트 삭제 | Required |

### 4.12 User API

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /api/users/me | 내 정보 조회 | Required |
| PUT | /api/users/me | 내 정보 수정 | Required |
| GET | /api/users/me/addresses | 배송지 목록 | Required |
| POST | /api/users/me/addresses | 배송지 추가 | Required |
| PUT | /api/users/me/addresses/:id | 배송지 수정 | Required |
| DELETE | /api/users/me/addresses/:id | 배송지 삭제 | Required |

### 4.13 Admin API

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /api/admin/dashboard | 대시보드 통계 | Admin |
| GET | /api/admin/products | 상품 관리 목록 | Admin |
| POST | /api/admin/products | 상품 등록 | Admin |
| PUT | /api/admin/products/:id | 상품 수정 | Admin |
| DELETE | /api/admin/products/:id | 상품 삭제 (soft) | Admin |
| GET | /api/admin/orders | 주문 관리 목록 | Admin |
| PATCH | /api/admin/orders/:id/status | 주문 상태 변경 | Admin |
| POST | /api/admin/orders/:id/ship | 배송 처리 (송장 등록) | Admin |
| GET | /api/admin/orders/:id/returns | 반품 목록 | Admin |
| PATCH | /api/admin/returns/:id | 반품 상태 변경 | Admin |
| GET | /api/admin/users | 회원 목록 | Admin |
| GET | /api/admin/coupons | 쿠폰 목록 | Admin |
| POST | /api/admin/coupons | 쿠폰 생성 | Admin |
| PUT | /api/admin/coupons/:id | 쿠폰 수정 | Admin |
| GET | /api/admin/inventory | 재고 현황 | Admin |
| PATCH | /api/admin/inventory/:variantId | 재고 수동 조정 | Admin |

#### `GET /api/admin/dashboard`

```typescript
// Response 200
{
  success: true,
  data: {
    todaySales: number;
    todayOrders: number;
    pendingOrders: number;         // 처리 대기 주문
    pendingReturns: number;        // 반품 신청 대기
    lowStockVariants: number;      // 재고 부족 변형 수
    monthlySales: { date: string; amount: number }[];  // 최근 30일
    topProducts: { id, name, salesCount, revenue }[];  // 상위 10개
    orderStatusSummary: Record<OrderStatus, number>;
  }
}
```

---

## 5. Core Business Logic Design

### 5.1 Payment Gateway Interface & Mock

```typescript
// src/domain/payment/gateway.ts

export interface ChargeRequest {
  orderId: string;
  orderNumber: string;
  amount: number;
  method: PaymentMethod;
  customerEmail: string;
  customerName: string;
  orderName: string;  // "상품명 외 N건"
}

export interface ChargeResult {
  success: boolean;
  paymentId: string;        // PG 측 결제 ID
  status: 'completed' | 'failed';
  paidAt?: Date;
  failReason?: string;
  rawResponse: Record<string, unknown>;  // PG 원본 응답 저장용
}

export interface CancelRequest {
  paymentId: string;
  amount?: number;     // 생략 시 전액
  reason: string;
}

export interface CancelResult {
  success: boolean;
  cancelledAmount: number;
  remainingAmount: number;
  cancelledAt?: Date;
  rawResponse: Record<string, unknown>;
}

export interface VerifyResult {
  success: boolean;
  status: PaymentStatus;
  amount: number;
  paidAt?: Date;
}

export interface WebhookPayload {
  provider: string;
  event: string;
  data: Record<string, unknown>;
}

export interface WebhookResult {
  verified: boolean;
  paymentId: string;
  status: PaymentStatus;
  amount: number;
}

export interface PaymentGateway {
  readonly provider: string;

  charge(request: ChargeRequest): Promise<ChargeResult>;
  cancel(request: CancelRequest): Promise<CancelResult>;
  verify(paymentId: string): Promise<VerifyResult>;
  handleWebhook(payload: WebhookPayload): Promise<WebhookResult>;
}
```

```typescript
// src/infrastructure/payment/mock-payment.gateway.ts

export class MockPaymentGateway implements PaymentGateway {
  readonly provider = 'mock';

  async charge(request: ChargeRequest): Promise<ChargeResult> {
    // 실패 시뮬레이션: 금액 끝자리가 99이면 실패
    if (request.amount % 100 === 99) {
      return {
        success: false,
        paymentId: `mock_${crypto.randomUUID()}`,
        status: 'failed',
        failReason: 'Mock: 결제 실패 시뮬레이션 (금액 끝자리 99)',
        rawResponse: { simulated: true },
      };
    }

    const paymentId = `mock_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
    return {
      success: true,
      paymentId,
      status: 'completed',
      paidAt: new Date(),
      rawResponse: {
        provider: 'mock',
        paymentId,
        amount: request.amount,
        method: request.method,
        simulated: true,
      },
    };
  }

  async cancel(request: CancelRequest): Promise<CancelResult> {
    return {
      success: true,
      cancelledAmount: request.amount ?? 0,
      remainingAmount: 0,
      cancelledAt: new Date(),
      rawResponse: { simulated: true },
    };
  }

  async verify(paymentId: string): Promise<VerifyResult> {
    return {
      success: true,
      status: 'COMPLETED',
      amount: 0,  // 실제 구현에서는 저장된 금액 조회
      paidAt: new Date(),
    };
  }

  async handleWebhook(payload: WebhookPayload): Promise<WebhookResult> {
    // Mock: 웹훅 페이로드를 그대로 반환
    return {
      verified: true,
      paymentId: payload.data.paymentId as string,
      status: 'COMPLETED',
      amount: payload.data.amount as number,
    };
  }
}
```

```typescript
// src/infrastructure/payment/payment.factory.ts

export class PaymentGatewayFactory {
  static create(provider?: string): PaymentGateway {
    const selected = provider ?? process.env.PAYMENT_PROVIDER ?? 'mock';

    switch (selected) {
      case 'mock':
        return new MockPaymentGateway();
      // 추후 추가:
      // case 'toss':
      //   return new TossPaymentGateway();
      // case 'inicis':
      //   return new InicisPaymentGateway();
      default:
        throw new Error(`Unknown payment provider: ${selected}`);
    }
  }
}
```

### 5.2 Order State Machine

```typescript
// src/domain/order/state-machine.ts

const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING:   ['PAID', 'CANCELLED'],
  PAID:      ['PREPARING', 'CANCELLED'],
  PREPARING: ['SHIPPING', 'CANCELLED'],
  SHIPPING:  ['DELIVERED'],
  DELIVERED: ['CONFIRMED'],
  CONFIRMED: [],  // terminal
  CANCELLED: [],  // terminal
};

export class OrderStateMachine {
  static canTransition(from: OrderStatus, to: OrderStatus): boolean {
    return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
  }

  static transition(currentStatus: OrderStatus, newStatus: OrderStatus): OrderStatus {
    if (!this.canTransition(currentStatus, newStatus)) {
      throw new OrderStateTransitionError(currentStatus, newStatus);
    }
    return newStatus;
  }

  static isCancellable(status: OrderStatus): boolean {
    return ALLOWED_TRANSITIONS[status]?.includes('CANCELLED') ?? false;
  }

  static isTerminal(status: OrderStatus): boolean {
    return ALLOWED_TRANSITIONS[status]?.length === 0;
  }

  static getNextStatuses(status: OrderStatus): OrderStatus[] {
    return ALLOWED_TRANSITIONS[status] ?? [];
  }
}
```

### 5.3 Checkout Service (핵심 트랜잭션)

```typescript
// src/application/order/checkout.service.ts

export class CheckoutService {
  constructor(
    private prisma: PrismaClient,
    private paymentGateway: PaymentGateway,
    private inventoryService: InventoryService,
    private couponService: CouponService,
    private shippingService: ShippingService,
  ) {}

  async createOrder(userId: string, dto: CreateOrderDto): Promise<OrderResponse> {
    return this.prisma.$transaction(async (tx) => {
      // 1. 장바구니 조회
      const cart = await tx.cart.findUnique({
        where: { userId },
        include: { items: { include: { variant: { include: { product: true } } } } },
      });
      if (!cart || cart.items.length === 0) {
        throw new AppError('CART_EMPTY', '장바구니가 비어있습니다.');
      }

      // 2. 재고 예약 (SELECT FOR UPDATE)
      const reservedItems = await this.inventoryService.reserveStock(tx, cart.items);

      // 3. 금액 계산
      const totalAmount = reservedItems.reduce(
        (sum, item) => sum + item.price * item.quantity, 0
      );

      // 4. 쿠폰 적용
      let discountAmount = 0;
      if (dto.couponCode) {
        discountAmount = await this.couponService.validateAndCalculate(
          tx, dto.couponCode, userId, totalAmount
        );
      }

      // 5. 배송비 계산
      const shippingFee = this.shippingService.calculateFee(totalAmount - discountAmount);

      // 6. 최종 금액
      const finalAmount = totalAmount - discountAmount + shippingFee;

      // 7. 배송지 스냅샷
      const address = await tx.address.findUniqueOrThrow({
        where: { id: dto.addressId },
      });

      // 8. 주문 생성
      const orderNumber = generateOrderNumber(); // ORD-20260217-XXXX
      const order = await tx.order.create({
        data: {
          orderNumber,
          userId,
          status: 'PENDING',
          totalAmount,
          discountAmount,
          shippingFee,
          finalAmount,
          addressSnapshot: {
            name: address.name,
            phone: address.phone,
            zipCode: address.zipCode,
            address1: address.address1,
            address2: address.address2,
          },
          couponId: dto.couponCode
            ? (await tx.coupon.findUnique({ where: { code: dto.couponCode } }))?.id
            : undefined,
          note: dto.note,
          items: {
            create: reservedItems.map((item) => ({
              variantId: item.variantId,
              productName: item.productName,
              variantInfo: `${item.size} / ${item.color}`,
              price: item.price,
              quantity: item.quantity,
              subtotal: item.price * item.quantity,
            })),
          },
        },
      });

      // 9. 결제 처리
      const chargeResult = await this.paymentGateway.charge({
        orderId: order.id,
        orderNumber: order.orderNumber,
        amount: Number(finalAmount),
        method: dto.paymentMethod,
        customerEmail: '', // from session
        customerName: address.name,
        orderName: this.buildOrderName(reservedItems),
      });

      if (!chargeResult.success) {
        // 결제 실패 → 재고 복구 (트랜잭션 내)
        await this.inventoryService.releaseStock(tx, reservedItems);
        await tx.order.update({
          where: { id: order.id },
          data: { status: 'CANCELLED' },
        });
        throw new AppError('PAYMENT_FAILED', chargeResult.failReason ?? '결제에 실패했습니다.');
      }

      // 10. 결제 정보 저장
      await tx.payment.create({
        data: {
          orderId: order.id,
          method: dto.paymentMethod,
          status: 'COMPLETED',
          amount: finalAmount,
          pgProvider: this.paymentGateway.provider,
          pgPaymentId: chargeResult.paymentId,
          pgResponse: chargeResult.rawResponse,
          paidAt: chargeResult.paidAt,
        },
      });

      // 11. 주문 상태 → PAID
      await tx.order.update({
        where: { id: order.id },
        data: { status: 'PAID' },
      });

      // 12. 재고 확정 (reservedStock → stock 차감)
      await this.inventoryService.confirmReservation(tx, reservedItems, order.orderNumber);

      // 13. 쿠폰 사용 처리
      if (dto.couponCode) {
        await this.couponService.markUsed(tx, dto.couponCode, userId, order.id);
      }

      // 14. 장바구니 비우기
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      // 15. 판매 수량 업데이트
      for (const item of reservedItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: { salesCount: { increment: item.quantity } },
        });
      }

      // 16. 배송 정보 생성
      await tx.shipment.create({
        data: {
          orderId: order.id,
          carrier: '',
          status: 'PREPARING',
        },
      });

      return this.toOrderResponse(order, reservedItems);
    }, {
      isolationLevel: 'ReadCommitted',
      timeout: 10000,
    });
  }

  private buildOrderName(items: ReservedItem[]): string {
    if (items.length === 1) return items[0].productName;
    return `${items[0].productName} 외 ${items.length - 1}건`;
  }
}
```

### 5.4 Inventory Service (재고 동시성 제어)

```typescript
// src/application/inventory/inventory.service.ts

export class InventoryService {
  /**
   * SELECT FOR UPDATE로 재고 예약
   * 트랜잭션 내에서 호출해야 함
   */
  async reserveStock(
    tx: PrismaTransaction,
    items: CartItemWithVariant[]
  ): Promise<ReservedItem[]> {
    const reserved: ReservedItem[] = [];

    for (const item of items) {
      // SELECT FOR UPDATE: 동시 접근 차단
      const [variant] = await tx.$queryRaw<ProductVariant[]>`
        SELECT * FROM product_variants
        WHERE id = ${item.variantId}::uuid
        FOR UPDATE
      `;

      const availableStock = variant.stock - variant.reserved_stock;
      if (availableStock < item.quantity) {
        throw new AppError(
          'INSUFFICIENT_STOCK',
          `재고가 부족합니다. (${variant.size}/${variant.color}: 현재 ${availableStock}개)`,
        );
      }

      // reservedStock 증가
      await tx.productVariant.update({
        where: { id: item.variantId },
        data: { reservedStock: { increment: item.quantity } },
      });

      // 재고 로그
      await tx.stockLog.create({
        data: {
          variantId: item.variantId,
          type: 'RESERVE',
          quantity: item.quantity,
          reason: '주문 재고 예약',
        },
      });

      reserved.push({
        variantId: item.variantId,
        productId: variant.product_id,
        productName: item.variant.product.name,
        size: variant.size,
        color: variant.color,
        price: Number(variant.price),
        quantity: item.quantity,
      });
    }

    return reserved;
  }

  /**
   * 재고 확정: 예약 → 실제 차감
   */
  async confirmReservation(
    tx: PrismaTransaction,
    items: ReservedItem[],
    orderNumber: string,
  ): Promise<void> {
    for (const item of items) {
      await tx.productVariant.update({
        where: { id: item.variantId },
        data: {
          stock: { decrement: item.quantity },
          reservedStock: { decrement: item.quantity },
        },
      });

      await tx.stockLog.create({
        data: {
          variantId: item.variantId,
          type: 'OUTBOUND',
          quantity: -item.quantity,
          reason: '주문 확정 출고',
          referenceId: orderNumber,
        },
      });

      // 재고 0이면 상품 상태 변경
      const variant = await tx.productVariant.findUnique({
        where: { id: item.variantId },
        include: { product: { include: { variants: true } } },
      });
      if (variant) {
        const allOutOfStock = variant.product.variants.every(
          (v) => v.stock - v.reservedStock <= 0
        );
        if (allOutOfStock) {
          await tx.product.update({
            where: { id: item.productId },
            data: { status: 'SOLD_OUT' },
          });
        }
      }
    }
  }

  /**
   * 결제 실패/취소 시 재고 복구
   */
  async releaseStock(
    tx: PrismaTransaction,
    items: ReservedItem[],
  ): Promise<void> {
    for (const item of items) {
      await tx.productVariant.update({
        where: { id: item.variantId },
        data: { reservedStock: { decrement: item.quantity } },
      });

      await tx.stockLog.create({
        data: {
          variantId: item.variantId,
          type: 'RELEASE',
          quantity: item.quantity,
          reason: '결제 실패/취소 재고 복구',
        },
      });
    }
  }
}
```

### 5.5 Coupon Service

```typescript
// src/application/coupon/coupon.service.ts

export class CouponService {
  async validateAndCalculate(
    tx: PrismaTransaction,
    code: string,
    userId: string,
    orderAmount: number,
  ): Promise<number> {
    const coupon = await tx.coupon.findUnique({ where: { code } });

    if (!coupon) throw new AppError('COUPON_NOT_FOUND', '존재하지 않는 쿠폰입니다.');
    if (!coupon.isActive) throw new AppError('COUPON_INACTIVE', '비활성화된 쿠폰입니다.');

    const now = new Date();
    if (now < coupon.validFrom || now > coupon.validUntil) {
      throw new AppError('COUPON_EXPIRED', '유효기간이 지난 쿠폰입니다.');
    }

    if (coupon.maxUsageCount && coupon.usedCount >= coupon.maxUsageCount) {
      throw new AppError('COUPON_LIMIT_REACHED', '쿠폰 사용 한도에 도달했습니다.');
    }

    // 1인 1회 검증
    const existingUsage = await tx.couponUsage.findUnique({
      where: { couponId_userId: { couponId: coupon.id, userId } },
    });
    if (existingUsage) {
      throw new AppError('COUPON_ALREADY_USED', '이미 사용한 쿠폰입니다.');
    }

    // 최소 주문 금액
    if (coupon.minOrderAmount && orderAmount < Number(coupon.minOrderAmount)) {
      throw new AppError(
        'COUPON_MIN_ORDER',
        `최소 주문금액 ${Number(coupon.minOrderAmount).toLocaleString()}원 이상 주문 시 사용 가능합니다.`,
      );
    }

    // 할인 금액 계산
    let discount = 0;
    if (coupon.type === 'FIXED') {
      discount = Number(coupon.value);
    } else {
      // PERCENTAGE
      discount = Math.floor(orderAmount * Number(coupon.value) / 100);
      if (coupon.maxDiscount) {
        discount = Math.min(discount, Number(coupon.maxDiscount));
      }
    }

    return Math.min(discount, orderAmount); // 할인이 주문금액 초과 불가
  }

  async markUsed(
    tx: PrismaTransaction,
    code: string,
    userId: string,
    orderId: string,
  ): Promise<void> {
    const coupon = await tx.coupon.findUniqueOrThrow({ where: { code } });

    await tx.couponUsage.create({
      data: { couponId: coupon.id, userId, orderId },
    });

    await tx.coupon.update({
      where: { id: coupon.id },
      data: { usedCount: { increment: 1 } },
    });
  }
}
```

### 5.6 Shipping Fee Calculation

```typescript
// src/application/shipping/shipping.service.ts

export class ShippingService {
  private readonly FREE_SHIPPING_THRESHOLD = Number(
    process.env.FREE_SHIPPING_THRESHOLD ?? 50000
  );
  private readonly DEFAULT_SHIPPING_FEE = Number(
    process.env.DEFAULT_SHIPPING_FEE ?? 3000
  );

  calculateFee(orderAmount: number): number {
    if (orderAmount >= this.FREE_SHIPPING_THRESHOLD) {
      return 0;
    }
    return this.DEFAULT_SHIPPING_FEE;
  }
}
```

### 5.7 Order Number Generation

```typescript
// src/domain/order/value-objects.ts

export function generateOrderNumber(): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `ORD-${dateStr}-${random}`;
  // e.g., ORD-20260217-A3F2K9
}
```

### 5.8 Return & Refund Flow

```typescript
// src/application/order/return.service.ts

export class ReturnService {
  constructor(
    private prisma: PrismaClient,
    private paymentGateway: PaymentGateway,
    private inventoryService: InventoryService,
  ) {}

  async requestReturn(userId: string, orderId: string, dto: CreateReturnDto): Promise<Return> {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUniqueOrThrow({
        where: { id: orderId },
        include: { items: true, payment: true },
      });

      if (order.userId !== userId) {
        throw new AppError('FORBIDDEN', '접근 권한이 없습니다.');
      }

      if (order.status !== 'DELIVERED' && order.status !== 'CONFIRMED') {
        throw new AppError('INVALID_ORDER_STATUS', '반품 신청이 불가능한 주문 상태입니다.');
      }

      // 환불 금액 계산
      let refundAmount: number;
      if (dto.orderItemId) {
        const item = order.items.find((i) => i.id === dto.orderItemId);
        if (!item) throw new AppError('ITEM_NOT_FOUND', '주문 항목을 찾을 수 없습니다.');
        refundAmount = Number(item.subtotal);
      } else {
        refundAmount = Number(order.finalAmount);
      }

      return tx.return.create({
        data: {
          orderId,
          orderItemId: dto.orderItemId,
          reason: dto.reason,
          reasonDetail: dto.reasonDetail,
          status: 'REQUESTED',
          refundAmount,
          images: dto.images ?? [],
        },
      });
    });
  }

  async approveReturn(returnId: string): Promise<void> {
    await this.prisma.return.update({
      where: { id: returnId },
      data: { status: 'APPROVED' },
    });
  }

  async completeReturn(returnId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const returnRecord = await tx.return.findUniqueOrThrow({
        where: { id: returnId },
        include: {
          order: { include: { payment: true, items: true } },
          orderItem: true,
        },
      });

      // 환불 처리
      if (returnRecord.order.payment) {
        await this.paymentGateway.cancel({
          paymentId: returnRecord.order.payment.pgPaymentId!,
          amount: Number(returnRecord.refundAmount),
          reason: `반품 환불: ${returnRecord.reason}`,
        });

        const newCancelledAmount =
          Number(returnRecord.order.payment.cancelledAmount) +
          Number(returnRecord.refundAmount);
        const fullyCancelled =
          newCancelledAmount >= Number(returnRecord.order.payment.amount);

        await tx.payment.update({
          where: { id: returnRecord.order.payment.id },
          data: {
            status: fullyCancelled ? 'CANCELLED' : 'PARTIALLY_CANCELLED',
            cancelledAmount: newCancelledAmount,
            cancelledAt: new Date(),
          },
        });
      }

      // 재고 복구
      const itemsToRestore = returnRecord.orderItem
        ? [returnRecord.orderItem]
        : returnRecord.order.items;

      for (const item of itemsToRestore) {
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stock: { increment: item.quantity } },
        });

        await tx.stockLog.create({
          data: {
            variantId: item.variantId,
            type: 'INBOUND',
            quantity: item.quantity,
            reason: `반품 재입고`,
            referenceId: returnRecord.order.orderNumber,
          },
        });
      }

      // 반품 완료
      await tx.return.update({
        where: { id: returnId },
        data: { status: 'COMPLETED' },
      });
    });
  }
}
```

---

## 6. UI/UX Design

### 6.1 Page Structure

```
┌─────────────────────────────────────────────────────────┐
│  (shop) Route Group - 고객 페이지                        │
├─────────────────────────────────────────────────────────┤
│  /                    홈 (베스트 상품, 신상품, 카테고리)   │
│  /products            상품 목록 (필터 사이드바)           │
│  /products/:slug      상품 상세 (이미지, 변형, 리뷰)     │
│  /cart                장바구니                           │
│  /checkout            주문서/결제                        │
│  /orders              주문 내역 목록                     │
│  /orders/:id          주문 상세                         │
│  /mypage              마이페이지 (프로필, 배송지)         │
│  /mypage/wishlist     위시리스트                         │
│  /mypage/reviews      내 리뷰 관리                      │
│  /auth/login          로그인                            │
│  /auth/signup         회원가입                           │
├─────────────────────────────────────────────────────────┤
│  (admin) Route Group - 관리자 페이지                     │
├─────────────────────────────────────────────────────────┤
│  /admin               대시보드                           │
│  /admin/products      상품 관리                         │
│  /admin/products/new  상품 등록                         │
│  /admin/products/:id  상품 수정                         │
│  /admin/orders        주문 관리                         │
│  /admin/orders/:id    주문 상세/상태 변경                │
│  /admin/users         회원 관리                         │
│  /admin/coupons       쿠폰 관리                         │
│  /admin/inventory     재고 관리                         │
│  /admin/returns       반품 관리                         │
└─────────────────────────────────────────────────────────┘
```

### 6.2 Key User Flows

```
[상품 검색/구매 Flow]
홈 → 카테고리/검색 → 상품 목록 (필터) → 상품 상세
  → 사이즈/컬러 선택 → 장바구니 추가
  → 장바구니 → 수량 확인 → 주문하기
  → 배송지 선택 → 쿠폰 적용 → 결제 수단 선택 → 결제
  → 주문 완료 → 주문 내역

[반품/환불 Flow]
주문 내역 → 주문 상세 (배송완료) → 반품 신청
  → 사유 선택 → 이미지 첨부 → 신청 완료
  → (관리자 승인) → 수거 → 환불 완료

[관리자 주문 처리 Flow]
대시보드 → 주문 관리 → 미처리 주문
  → 상태 변경 (PAID → PREPARING)
  → 송장번호 등록 → 배송 처리 (PREPARING → SHIPPING)
```

### 6.3 Component List (Key)

| Component | Location | Responsibility |
|-----------|----------|----------------|
| `ProductCard` | `presentation/features/product/` | 상품 카드 (이미지, 가격, 평점) |
| `ProductGallery` | `presentation/features/product/` | 상품 이미지 갤러리 (썸네일 네비게이션) |
| `VariantSelector` | `presentation/features/product/` | 사이즈/컬러 선택 매트릭스 |
| `ProductFilters` | `presentation/features/product/` | 필터 사이드바 (카테고리, 가격, 사이즈, 컬러) |
| `CartItemRow` | `presentation/features/cart/` | 장바구니 항목 (수량 변경, 삭제) |
| `CartSummary` | `presentation/features/cart/` | 장바구니 요약 (합계, 배송비) |
| `CheckoutForm` | `presentation/features/checkout/` | 주문서 폼 (배송지, 쿠폰, 결제) |
| `AddressSelector` | `presentation/features/checkout/` | 배송지 선택/추가 |
| `PaymentMethodSelector` | `presentation/features/checkout/` | 결제 수단 선택 |
| `OrderStatusBadge` | `presentation/features/order/` | 주문 상태 뱃지 |
| `OrderTimeline` | `presentation/features/order/` | 주문 상태 타임라인 |
| `ReviewForm` | `presentation/features/review/` | 리뷰 작성 (별점, 텍스트, 이미지) |
| `StarRating` | `presentation/components/common/` | 별점 표시/입력 |
| `AdminSidebar` | `presentation/features/admin/` | 관리자 사이드바 네비게이션 |
| `DashboardStats` | `presentation/features/admin/` | 대시보드 통계 카드 |
| `DataTable` | `presentation/components/common/` | 관리자 데이터 테이블 (정렬, 페이지네이션) |

---

## 7. Error Handling

### 7.1 Error Class Hierarchy

```typescript
// src/lib/errors.ts

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

// 사전 정의 에러
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
```

### 7.2 API Error Handler

```typescript
// src/lib/api-handler.ts

export function apiHandler(handler: Function) {
  return async (req: NextRequest, context?: { params: Promise<Record<string, string>> }) => {
    try {
      return await handler(req, context);
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
```

---

## 8. Security Considerations

- [x] 입력 검증: zod 스키마로 모든 API 입력 검증 (XSS, Injection 방지)
- [x] 인증/인가: NextAuth 세션 기반 + Admin 역할 검증 미들웨어
- [x] 비밀번호: bcrypt 해싱 (salt rounds: 12)
- [x] HTTPS: 프로덕션 환경 강제
- [x] Rate Limiting: next-rate-limit 또는 upstash/ratelimit
- [x] CSRF: NextAuth 내장 CSRF 토큰
- [x] SQL Injection: Prisma ORM parameterized queries
- [x] 민감 데이터: 환경변수 관리, pgResponse 내 민감 정보 마스킹

---

## 9. Test Plan

### 9.1 Test Scope

| Type | Target | Tool |
|------|--------|------|
| Unit Test | Domain 로직 (State Machine, Value Objects, Coupon 계산) | Vitest |
| Unit Test | Application Services (mock repositories) | Vitest |
| Integration Test | API Routes + Database | Vitest + TestContainers (PostgreSQL) |
| E2E Test | 주문 플로우, 관리자 플로우 | Playwright |

### 9.2 Test Cases (Key)

**Domain Layer:**
- [x] OrderStateMachine: 허용된 전이만 성공
- [x] OrderStateMachine: 불법 전이 시 에러
- [x] generateOrderNumber: 고유 번호 생성
- [x] 쿠폰 할인 계산 (정액/정률/최대할인)

**Application Layer:**
- [x] CheckoutService: 정상 주문 생성 플로우
- [x] CheckoutService: 재고 부족 시 에러
- [x] CheckoutService: 결제 실패 시 재고 복구
- [x] InventoryService: SELECT FOR UPDATE 동시성 테스트
- [x] CouponService: 중복 사용 방지
- [x] CouponService: 만료/비활성 쿠폰 거부
- [x] ReturnService: 반품 후 재고 복구 + 환불

**API Layer:**
- [x] 인증되지 않은 요청 → 401
- [x] Admin API에 일반 유저 접근 → 403
- [x] 잘못된 입력 → 400 + zod 에러 상세

**E2E:**
- [x] 회원가입 → 로그인 → 상품 탐색 → 장바구니 → 주문 → 주문 확인
- [x] 관리자 로그인 → 주문 상태 변경 → 배송 처리

---

## 10. Clean Architecture

### 10.1 Layer Structure

| Layer | Responsibility | Location |
|-------|---------------|----------|
| **Presentation** | UI 컴포넌트, 커스텀 훅, 페이지 | `src/presentation/`, `src/app/` |
| **Application** | 서비스, 비즈니스 오케스트레이션, DTO | `src/application/` |
| **Domain** | 엔티티, Value Object, 인터페이스, 상태 머신 | `src/domain/` |
| **Infrastructure** | Prisma Repository, Mock PG, S3, Email | `src/infrastructure/` |

### 10.2 Dependency Rules

```
┌─────────────────────────────────────────────────────────────┐
│                    Dependency Direction                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   Presentation ──→ Application ──→ Domain ←── Infrastructure│
│                                                             │
│   - Domain: 순수 TypeScript (Prisma, Next.js 의존 없음)      │
│   - Application: Domain 타입 + Repository 인터페이스 사용     │
│   - Infrastructure: Domain 인터페이스 구현                    │
│   - Presentation: Application 서비스 호출 (API 경유)         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 10.3 File Import Rules

| From | Can Import | Cannot Import |
|------|-----------|---------------|
| `src/app/` (API Routes) | Application Services, Domain Types | Infrastructure directly |
| `src/application/` | Domain (entities, interfaces) | Presentation, Infrastructure (via interface) |
| `src/domain/` | Nothing external | All external layers |
| `src/infrastructure/` | Domain interfaces | Application, Presentation |
| `src/presentation/` | Domain types (for UI) | Application (via API), Infrastructure |

---

## 11. Coding Convention

### 11.1 Naming Conventions

| Target | Rule | Example |
|--------|------|---------|
| Components | PascalCase | `ProductCard`, `CheckoutForm` |
| Functions/Methods | camelCase | `calculateFee()`, `reserveStock()` |
| Constants | UPPER_SNAKE_CASE | `FREE_SHIPPING_THRESHOLD` |
| Types/Interfaces | PascalCase | `ChargeRequest`, `OrderStatus` |
| Files (component) | PascalCase.tsx | `ProductCard.tsx` |
| Files (service) | kebab-case.ts | `checkout.service.ts` |
| Folders | kebab-case | `product-variants/` |
| DB columns | snake_case | `created_at`, `order_number` |
| API paths | kebab-case | `/api/cart/items` |

### 11.2 Import Order

```typescript
// 1. External libraries
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// 2. Domain layer
import type { PaymentGateway, ChargeRequest } from '@/domain/payment/gateway';
import { OrderStateMachine } from '@/domain/order/state-machine';

// 3. Application layer
import { CheckoutService } from '@/application/order/checkout.service';

// 4. Infrastructure
import { prisma } from '@/lib/prisma';

// 5. Presentation (components only import other components/hooks)
import { Button } from '@/presentation/components/ui/button';
```

### 11.3 Environment Variables

| Prefix | Purpose | Scope |
|--------|---------|-------|
| `DATABASE_` | DB 연결 | Server |
| `NEXTAUTH_` | 인증 | Server |
| `PAYMENT_` | 결제 설정 | Server |
| `S3_` | 파일 스토리지 | Server |
| `NEXT_PUBLIC_` | 클라이언트 노출 | Client |

---

## 12. Implementation Guide

### 12.1 Implementation Order

```
Phase 1: Foundation
1. [x] Next.js 프로젝트 초기화 + TypeScript + Tailwind
2. [x] Prisma 설정 + schema.prisma 작성
3. [x] PostgreSQL Docker 구성
4. [x] DB 마이그레이션 실행
5. [x] NextAuth 설정 (이메일 + 소셜)
6. [x] 에러 핸들링 (AppError, apiHandler)
7. [x] shadcn/ui 초기화

Phase 2: Product Catalog
8. [ ] Domain: Product, Variant, Category 엔티티/인터페이스
9. [ ] Infrastructure: Prisma Product Repository
10. [ ] Application: ProductService
11. [ ] API: /api/products, /api/categories, /api/brands
12. [ ] UI: 상품 목록, 상품 상세, 카테고리 필터

Phase 3: Cart & Wishlist
13. [ ] Domain: Cart, CartItem 엔티티
14. [ ] Application: CartService (재고 검증 포함)
15. [ ] API: /api/cart
16. [ ] UI: 장바구니 페이지
17. [ ] Wishlist API + UI

Phase 4: Order & Payment (Core)
18. [ ] Domain: Order, Payment 엔티티 + State Machine
19. [ ] Domain: PaymentGateway 인터페이스
20. [ ] Infrastructure: MockPaymentGateway + Factory
21. [ ] Application: CheckoutService (트랜잭션)
22. [ ] Application: InventoryService (재고 예약/확정/복구)
23. [ ] API: /api/orders, /api/payments
24. [ ] UI: 체크아웃 페이지, 주문 확인

Phase 5: Shipping & Returns
25. [ ] Application: ShippingService
26. [ ] Application: ReturnService
27. [ ] API: /api/orders/:id/shipment, /api/orders/:id/returns
28. [ ] UI: 주문 상세 (배송 추적), 반품 신청

Phase 6: Coupon & Review
29. [ ] Application: CouponService
30. [ ] Application: ReviewService
31. [ ] API: /api/coupons, /api/reviews
32. [ ] UI: 쿠폰 적용, 리뷰 작성/목록

Phase 7: Admin Dashboard
33. [ ] API: /api/admin/*
34. [ ] UI: 대시보드, 상품 관리, 주문 관리
35. [ ] UI: 쿠폰 관리, 재고 관리, 반품 관리

Phase 8: Polish
36. [ ] 상품 검색 (Full-text search)
37. [ ] 페이지네이션 최적화
38. [ ] 이미지 업로드 (S3)
39. [ ] Seed 데이터

Phase 9: Testing & QA
40. [ ] Unit tests (Domain + Application)
41. [ ] Integration tests (API + DB)
42. [ ] E2E tests (주문 플로우)
```

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-02-17 | Initial draft | Developer |
