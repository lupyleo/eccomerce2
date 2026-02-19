import { NextRequest } from 'next/server';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { prisma } from '@/lib/prisma';
import { apiHandler, successResponse } from '@/lib/api-handler';
import { AppError } from '@/lib/errors';
import { NotificationServiceFactory, passwordResetEmail } from '@/infrastructure/notification/email.service';

const requestResetSchema = z.object({
  email: z.string().email('올바른 이메일 형식이 아닙니다.'),
});

export const POST = apiHandler(async (req: NextRequest) => {
  const body = await req.json();
  const { email } = requestResetSchema.parse(body);

  const user = await prisma.user.findUnique({ where: { email } });

  // Always return success to prevent email enumeration
  if (!user || !user.passwordHash) {
    return successResponse({ message: '비밀번호 재설정 이메일이 발송되었습니다.' });
  }

  // Create verification token for password reset
  const token = randomUUID();
  const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.verificationToken.create({
    data: {
      identifier: email,
      token,
      expires,
    },
  });

  const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${token}&email=${email}`;
  const emailMessage = passwordResetEmail(resetUrl);
  emailMessage.to = email;

  const notificationService = NotificationServiceFactory.create();
  await notificationService.sendEmail(emailMessage);

  return successResponse({ message: '비밀번호 재설정 이메일이 발송되었습니다.' });
});
