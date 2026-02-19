'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

interface ProductImage {
  id: string;
  url: string;
  alt: string | null;
  sortOrder: number;
  isPrimary: boolean;
}

interface ProductGalleryProps {
  images: ProductImage[];
}

export default function ProductGallery({ images }: ProductGalleryProps) {
  const sorted = [...images].sort((a, b) => a.sortOrder - b.sortOrder);
  const initial = sorted.find((img) => img.isPrimary) ?? sorted[0] ?? null;
  const [activeImage, setActiveImage] = useState<ProductImage | null>(initial);

  if (sorted.length === 0) {
    return (
      <div className="aspect-[3/4] bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
        <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Main image */}
      <div className="aspect-[3/4] bg-gray-100 rounded-lg overflow-hidden">
        {activeImage && (
          <img
            src={activeImage.url}
            alt={activeImage.alt ?? '상품 이미지'}
            className="w-full h-full object-cover"
          />
        )}
      </div>

      {/* Thumbnail strip */}
      {sorted.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {sorted.map((img) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setActiveImage(img)}
              className={cn(
                'flex-shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                activeImage?.id === img.id
                  ? 'border-gray-900'
                  : 'border-transparent hover:border-gray-300',
              )}
              aria-label={img.alt ?? `이미지 ${img.sortOrder + 1}`}
              aria-pressed={activeImage?.id === img.id}
            >
              <img
                src={img.url}
                alt={img.alt ?? ''}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
