import { NextRequest } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { apiHandler, successResponse } from '@/lib/api-handler';
import { AppError } from '@/lib/errors';

const signupSchema = z.object({
  email: z.string().email('올바른 이메일 형식이 아닙니다.'),
  password: z
    .string()
    .min(8, '비밀번호는 최소 8자 이상이어야 합니다.')
    .regex(
      /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[!@#$%^&*])/,
      '비밀번호는 영문, 숫자, 특수문자를 포함해야 합니다.',
    ),
  name: z.string().min(1, '이름을 입력해주세요.').max(50),
  phone: z.string().optional(),
});

export const POST = apiHandler(async (req: NextRequest) => {
  const body = await req.json();
  const data = signupSchema.parse(body);

  const existing = await prisma.user.findUnique({
    where: { email: data.email },
  });
  if (existing) {
    throw new AppError('EMAIL_ALREADY_EXISTS', '이미 가입된 이메일입니다.', 409);
  }

  const passwordHash = await bcrypt.hash(data.password, 12);

  const user = await prisma.user.create({
    data: {
      email: data.email,
      name: data.name,
      passwordHash,
      phone: data.phone,
      role: 'CUSTOMER',
    },
    select: { id: true, email: true, name: true },
  });

  return successResponse(user, 201);
});
