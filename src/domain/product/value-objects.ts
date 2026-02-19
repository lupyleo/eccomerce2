import { AppError } from '@/lib/errors';

export class Price {
  constructor(public readonly value: number) {
    if (value < 0) {
      throw new AppError('INVALID_PRICE', '가격은 0 이상이어야 합니다.');
    }
  }

  add(other: Price): Price {
    return new Price(this.value + other.value);
  }

  multiply(quantity: number): Price {
    return new Price(this.value * quantity);
  }

  format(): string {
    return this.value.toLocaleString('ko-KR') + '원';
  }
}

export class SKU {
  constructor(public readonly value: string) {
    if (!/^[A-Z0-9-]+$/.test(value)) {
      throw new AppError('INVALID_SKU', 'SKU는 대문자, 숫자, 하이픈만 사용 가능합니다.');
    }
  }
}

export const AVAILABLE_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'FREE'] as const;
export type Size = (typeof AVAILABLE_SIZES)[number];

export function isValidSize(size: string): size is Size {
  return (AVAILABLE_SIZES as readonly string[]).includes(size);
}
