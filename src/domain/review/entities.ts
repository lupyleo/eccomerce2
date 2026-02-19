import { AppError } from '@/lib/errors';

export interface ReviewEntity {
  id: string;
  userId: string;
  productId: string;
  orderId: string;
  rating: number;
  content: string;
  images: string[];
  createdAt: Date;
  updatedAt: Date;
}

export function validateRating(rating: number): void {
  if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
    throw new AppError('INVALID_RATING', '평점은 1~5 사이의 정수여야 합니다.');
  }
}
