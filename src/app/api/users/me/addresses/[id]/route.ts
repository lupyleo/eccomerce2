import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { apiHandler, successResponse } from '@/lib/api-handler';
import { requireAuth } from '@/lib/auth-guard';
import { NotFoundError } from '@/lib/errors';

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().min(1).optional(),
  zipCode: z.string().min(1).optional(),
  address1: z.string().min(1).optional(),
  address2: z.string().optional(),
  isDefault: z.boolean().optional(),
});

export const PUT = apiHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await requireAuth();
  const { id } = await params;
  const body = await req.json();
  const data = updateSchema.parse(body);

  const existing = await prisma.address.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!existing) throw new NotFoundError('배송지');

  if (data.isDefault) {
    await prisma.address.updateMany({
      where: { userId: session.user.id, isDefault: true },
      data: { isDefault: false },
    });
  }

  const address = await prisma.address.update({
    where: { id },
    data,
  });

  return successResponse(address);
});

export const DELETE = apiHandler(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await requireAuth();
  const { id } = await params;

  const existing = await prisma.address.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!existing) throw new NotFoundError('배송지');

  await prisma.address.delete({ where: { id } });

  return successResponse({ deleted: true });
});
