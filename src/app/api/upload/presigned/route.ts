import { NextRequest } from 'next/server';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { apiHandler, successResponse } from '@/lib/api-handler';
import { requireAuth } from '@/lib/auth-guard';
import { StorageServiceFactory } from '@/infrastructure/storage/s3-storage.service';

const presignedUrlSchema = z.object({
  filename: z.string().min(1),
  contentType: z.string().regex(/^image\/(jpeg|png|webp|gif)$/, '지원하지 않는 이미지 형식입니다.'),
  folder: z.enum(['products', 'reviews', 'profiles']).optional(),
});

export const POST = apiHandler(async (req: NextRequest) => {
  await requireAuth();
  const body = await req.json();
  const dto = presignedUrlSchema.parse(body);

  const ext = dto.filename.split('.').pop();
  const folder = dto.folder ?? 'uploads';
  const key = `${folder}/${randomUUID()}.${ext}`;

  const storageService = StorageServiceFactory.create();
  const uploadUrl = await storageService.generatePresignedUploadUrl(key, dto.contentType);
  const publicUrl = storageService.getPublicUrl(key);

  return successResponse({
    uploadUrl,
    publicUrl,
    key,
  });
});
