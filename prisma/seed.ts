import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Admin user
  const adminPassword = await bcrypt.hash('Admin123!', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      name: '관리자',
      passwordHash: adminPassword,
      role: 'ADMIN',
      phone: '010-0000-0000',
    },
  });

  // Test customer
  const customerPassword = await bcrypt.hash('Test123!', 12);
  const customer = await prisma.user.upsert({
    where: { email: 'customer@example.com' },
    update: {},
    create: {
      email: 'customer@example.com',
      name: '테스트 고객',
      passwordHash: customerPassword,
      role: 'CUSTOMER',
      phone: '010-1234-5678',
    },
  });

  // Customer address
  await prisma.address.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      userId: customer.id,
      name: '테스트 고객',
      phone: '010-1234-5678',
      zipCode: '06234',
      address1: '서울특별시 강남구 테헤란로 123',
      address2: '4층 401호',
      isDefault: true,
    },
  });

  // Categories
  const tops = await prisma.category.upsert({
    where: { slug: 'tops' },
    update: {},
    create: { name: '상의', slug: 'tops', depth: 0, sortOrder: 1 },
  });

  const bottoms = await prisma.category.upsert({
    where: { slug: 'bottoms' },
    update: {},
    create: { name: '하의', slug: 'bottoms', depth: 0, sortOrder: 2 },
  });

  const outer = await prisma.category.upsert({
    where: { slug: 'outer' },
    update: {},
    create: { name: '아우터', slug: 'outer', depth: 0, sortOrder: 3 },
  });

  const tshirts = await prisma.category.upsert({
    where: { slug: 'tshirts' },
    update: {},
    create: { name: '티셔츠', slug: 'tshirts', parentId: tops.id, depth: 1, sortOrder: 1 },
  });

  const shirts = await prisma.category.upsert({
    where: { slug: 'shirts' },
    update: {},
    create: { name: '셔츠', slug: 'shirts', parentId: tops.id, depth: 1, sortOrder: 2 },
  });

  const jeans = await prisma.category.upsert({
    where: { slug: 'jeans' },
    update: {},
    create: { name: '청바지', slug: 'jeans', parentId: bottoms.id, depth: 1, sortOrder: 1 },
  });

  const slacks = await prisma.category.upsert({
    where: { slug: 'slacks' },
    update: {},
    create: { name: '슬랙스', slug: 'slacks', parentId: bottoms.id, depth: 1, sortOrder: 2 },
  });

  // Brands
  const brandA = await prisma.brand.upsert({
    where: { slug: 'modern-fit' },
    update: {},
    create: { name: 'Modern Fit', slug: 'modern-fit', description: '모던한 핏의 캐주얼 브랜드' },
  });

  const brandB = await prisma.brand.upsert({
    where: { slug: 'urban-classic' },
    update: {},
    create: { name: 'Urban Classic', slug: 'urban-classic', description: '도시적인 클래식 스타일' },
  });

  // Products
  const product1 = await prisma.product.upsert({
    where: { slug: 'basic-cotton-tshirt' },
    update: {},
    create: {
      name: '베이직 코튼 티셔츠',
      slug: 'basic-cotton-tshirt',
      description: '부드러운 100% 코튼 소재의 베이직 티셔츠입니다. 일상에서 편하게 착용할 수 있으며, 다양한 하의와 매치하기 좋습니다.',
      basePrice: 29000,
      categoryId: tshirts.id,
      brandId: brandA.id,
      status: 'ACTIVE',
    },
  });

  const product2 = await prisma.product.upsert({
    where: { slug: 'slim-fit-denim-jeans' },
    update: {},
    create: {
      name: '슬림핏 데님 진',
      slug: 'slim-fit-denim-jeans',
      description: '클래식한 슬림핏 데님 진입니다. 적당한 스트레치가 들어가 편안한 착용감을 제공합니다.',
      basePrice: 59000,
      categoryId: jeans.id,
      brandId: brandA.id,
      status: 'ACTIVE',
    },
  });

  const product3 = await prisma.product.upsert({
    where: { slug: 'oxford-button-down-shirt' },
    update: {},
    create: {
      name: '옥스포드 버튼다운 셔츠',
      slug: 'oxford-button-down-shirt',
      description: '깔끔한 옥스포드 원단의 버튼다운 셔츠입니다. 캐주얼과 비즈니스 캐주얼 모두에 적합합니다.',
      basePrice: 45000,
      categoryId: shirts.id,
      brandId: brandB.id,
      status: 'ACTIVE',
    },
  });

  const product4 = await prisma.product.upsert({
    where: { slug: 'wide-fit-cotton-slacks' },
    update: {},
    create: {
      name: '와이드핏 코튼 슬랙스',
      slug: 'wide-fit-cotton-slacks',
      description: '편안한 와이드핏 코튼 슬랙스입니다. 깔끔한 실루엣으로 다양한 스타일링이 가능합니다.',
      basePrice: 49000,
      categoryId: slacks.id,
      brandId: brandB.id,
      status: 'ACTIVE',
    },
  });

  // Variants for product1 (T-shirt)
  const sizes = ['S', 'M', 'L', 'XL'];
  const colors = [
    { name: '화이트', code: '#FFFFFF' },
    { name: '블랙', code: '#000000' },
    { name: '네이비', code: '#1B2838' },
  ];

  for (const size of sizes) {
    for (const color of colors) {
      await prisma.productVariant.upsert({
        where: {
          productId_size_color: { productId: product1.id, size, color: color.name },
        },
        update: {},
        create: {
          productId: product1.id,
          sku: `TSH-${size}-${color.name.slice(0, 2).toUpperCase()}`,
          size,
          color: color.name,
          colorCode: color.code,
          price: 29000,
          stock: 50,
          reservedStock: 0,
          isActive: true,
        },
      });
    }
  }

  // Variants for product2 (Jeans)
  const jeansSizes = ['28', '30', '32', '34'];
  const jeansColors = [
    { name: '인디고', code: '#3F51B5' },
    { name: '라이트블루', code: '#90CAF9' },
  ];

  for (const size of jeansSizes) {
    for (const color of jeansColors) {
      await prisma.productVariant.upsert({
        where: {
          productId_size_color: { productId: product2.id, size, color: color.name },
        },
        update: {},
        create: {
          productId: product2.id,
          sku: `JNS-${size}-${color.name.slice(0, 2).toUpperCase()}`,
          size,
          color: color.name,
          colorCode: color.code,
          price: 59000,
          stock: 30,
          reservedStock: 0,
          isActive: true,
        },
      });
    }
  }

  // Variants for product3 (Shirt)
  for (const size of sizes) {
    for (const color of [
      { name: '화이트', code: '#FFFFFF' },
      { name: '스카이블루', code: '#87CEEB' },
    ]) {
      await prisma.productVariant.upsert({
        where: {
          productId_size_color: { productId: product3.id, size, color: color.name },
        },
        update: {},
        create: {
          productId: product3.id,
          sku: `SHT-${size}-${color.name.slice(0, 2).toUpperCase()}`,
          size,
          color: color.name,
          colorCode: color.code,
          price: 45000,
          stock: 25,
          reservedStock: 0,
          isActive: true,
        },
      });
    }
  }

  // Variants for product4 (Slacks)
  for (const size of ['28', '30', '32', '34']) {
    for (const color of [
      { name: '블랙', code: '#000000' },
      { name: '베이지', code: '#F5DEB3' },
      { name: '차콜', code: '#36454F' },
    ]) {
      await prisma.productVariant.upsert({
        where: {
          productId_size_color: { productId: product4.id, size, color: color.name },
        },
        update: {},
        create: {
          productId: product4.id,
          sku: `SLK-${size}-${color.name.slice(0, 2).toUpperCase()}`,
          size,
          color: color.name,
          colorCode: color.code,
          price: 49000,
          stock: 20,
          reservedStock: 0,
          isActive: true,
        },
      });
    }
  }

  // Coupons
  await prisma.coupon.upsert({
    where: { code: 'WELCOME10' },
    update: {},
    create: {
      code: 'WELCOME10',
      name: '신규가입 10% 할인',
      type: 'PERCENTAGE',
      value: 10,
      minOrderAmount: 30000,
      maxDiscount: 10000,
      validFrom: new Date('2026-01-01'),
      validUntil: new Date('2026-12-31'),
      maxUsageCount: 1000,
      isActive: true,
    },
  });

  await prisma.coupon.upsert({
    where: { code: 'SAVE5000' },
    update: {},
    create: {
      code: 'SAVE5000',
      name: '5,000원 할인 쿠폰',
      type: 'FIXED',
      value: 5000,
      minOrderAmount: 50000,
      validFrom: new Date('2026-01-01'),
      validUntil: new Date('2026-12-31'),
      isActive: true,
    },
  });

  console.log('Seeding complete!');
  console.log(`Admin: admin@example.com / Admin123!`);
  console.log(`Customer: customer@example.com / Test123!`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
