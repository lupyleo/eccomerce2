import { NextRequest } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { apiHandler, successResponse } from '@/lib/api-handler';
import { AppError } from '@/lib/errors';

const confirmResetSchema = z.object({
  email: z.string().email(),
  token: z.string().uuid(),
  newPassword: z
    .string()
    .min(8, '비밀번호는 8자 이상이어야 합니다.')
    .regex(/[A-Z]/, '대문자를 포함해야 합니다.')
    .regex(/[a-z]/, '소문자를 포함해야 합니다.')
    .regex(/[0-9]/, '숫자를 포함해야 합니다.')
    .regex(/[^A-Za-z0-9]/, '특수문자를 포함해야 합니다.'),
});

export const POST = apiHandler(async (req: NextRequest) => {
  const body = await req.json();
  const { email, token, newPassword } = confirmResetSchema.parse(body);

  const verificationToken = await prisma.verificationToken.findUnique({
    where: { identifier_token: { identifier: email, token } },
  });

  if (!verificationToken) {
    throw new AppError('INVALID_TOKEN', '유효하지 않은 토큰입니다.');
  }

  if (verificationToken.expires < new Date()) {
    await prisma.verificationToken.delete({
      where: { identifier_token: { identifier: email, token } },
    });
    throw new AppError('TOKEN_EXPIRED', '토큰이 만료되었습니다. 다시 요청해주세요.');
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: { email },
    data: { passwordHash },
  });

  await prisma.verificationToken.delete({
    where: { identifier_token: { identifier: email, token } },
  });

  return successResponse({ message: '비밀번호가 변경되었습니다.' });
});
