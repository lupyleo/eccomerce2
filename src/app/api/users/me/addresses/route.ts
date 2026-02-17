import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { apiHandler, successResponse } from '@/lib/api-handler';
import { requireAuth } from '@/lib/auth-guard';

export const GET = apiHandler(async () => {
  const session = await requireAuth();

  const addresses = await prisma.address.findMany({
    where: { userId: session.user.id },
    orderBy: [{ isDefault: 'desc' }, { id: 'asc' }],
  });

  return successResponse(addresses);
});

const createSchema = z.object({
  name: z.string().min(1, '수령인 이름을 입력해주세요.'),
  phone: z.string().min(1, '연락처를 입력해주세요.'),
  zipCode: z.string().min(1, '우편번호를 입력해주세요.'),
  address1: z.string().min(1, '주소를 입력해주세요.'),
  address2: z.string().optional(),
  isDefault: z.boolean().optional(),
});

export const POST = apiHandler(async (req: NextRequest) => {
  const session = await requireAuth();
  const body = await req.json();
  const data = createSchema.parse(body);

  if (data.isDefault) {
    await prisma.address.updateMany({
      where: { userId: session.user.id, isDefault: true },
      data: { isDefault: false },
    });
  }

  const address = await prisma.address.create({
    data: {
      ...data,
      userId: session.user.id,
    },
  });

  return successResponse(address, 201);
});
