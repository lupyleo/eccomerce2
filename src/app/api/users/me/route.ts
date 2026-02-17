import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { apiHandler, successResponse } from '@/lib/api-handler';
import { requireAuth } from '@/lib/auth-guard';

export const GET = apiHandler(async () => {
  const session = await requireAuth();

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      profileImage: true,
      role: true,
      createdAt: true,
    },
  });

  return successResponse(user);
});

const updateSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  phone: z.string().max(20).optional(),
});

export const PUT = apiHandler(async (req: NextRequest) => {
  const session = await requireAuth();
  const body = await req.json();
  const data = updateSchema.parse(body);

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data,
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      profileImage: true,
    },
  });

  return successResponse(user);
});
