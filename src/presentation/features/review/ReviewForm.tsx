'use client';

import { useState, useRef } from 'react';
import { Button } from '@/presentation/components/ui';
import { Alert, AlertDescription } from '@/presentation/components/ui';
import StarRating from '@/presentation/components/common/StarRating';

interface ReviewFormProps {
  productId: string;
  orderId: string;
  onSubmit?: () => void;
}

const MAX_IMAGES = 5;

export default function ReviewForm({ productId, orderId, onSubmit }: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [content, setContent] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const remaining = MAX_IMAGES - images.length;
    const toAdd = files.slice(0, remaining);

    setImages((prev) => [...prev, ...toAdd]);
    const newPreviews = toAdd.map((file) => URL.createObjectURL(file));
    setPreviews((prev) => [...prev, ...newPreviews]);

    // Reset file input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (index: number) => {
    URL.revokeObjectURL(previews[index]);
    setImages((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      setError('별점을 선택해주세요.');
      return;
    }
    if (content.trim().length < 10) {
      setError('리뷰 내용을 10자 이상 입력해주세요.');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('productId', productId);
      formData.append('orderId', orderId);
      formData.append('rating', String(rating));
      formData.append('content', content.trim());
      images.forEach((img) => formData.append('images', img));

      const res = await fetch('/api/reviews', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error?.message ?? '리뷰 등록에 실패했습니다.');
      }

      onSubmit?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : '리뷰 등록에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Star rating */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">별점</label>
        <div className="flex items-center gap-3">
          <StarRating
            rating={rating}
            size="lg"
            interactive
            onChange={setRating}
          />
          <span className="text-sm text-gray-500">
            {rating > 0 ? `${rating}점` : '별점을 선택해주세요'}
          </span>
        </div>
      </div>

      {/* Content */}
      <div>
        <label htmlFor="review-content" className="block text-sm font-medium text-foreground mb-1.5">
          리뷰 내용
        </label>
        <textarea
          id="review-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={5}
          placeholder="상품에 대한 솔직한 리뷰를 작성해주세요. (최소 10자)"
          className="flex w-full rounded-md border border-input-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
        />
        <p className="mt-1 text-xs text-gray-400 text-right">{content.length}자</p>
      </div>

      {/* Image upload */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          사진 첨부 <span className="text-gray-400 font-normal">(선택, 최대 {MAX_IMAGES}장)</span>
        </label>

        <div className="flex flex-wrap gap-2">
          {previews.map((src, index) => (
            <div
              key={src}
              className="relative w-20 h-20 rounded-md overflow-hidden border border-gray-200"
            >
              <img src={src} alt={`첨부 이미지 ${index + 1}`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute top-0.5 right-0.5 w-5 h-5 bg-gray-900/70 text-white rounded-full flex items-center justify-center hover:bg-gray-900 transition-colors"
                aria-label={`이미지 ${index + 1} 삭제`}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}

          {images.length < MAX_IMAGES && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-md flex flex-col items-center justify-center text-gray-400 hover:border-gray-400 hover:text-gray-500 transition-colors"
              aria-label="이미지 추가"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-xs mt-1">{images.length}/{MAX_IMAGES}</span>
            </button>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleImageChange}
          className="hidden"
          aria-hidden="true"
        />
      </div>

      <Button type="submit" loading={submitting} className="w-full">
        리뷰 등록
      </Button>
    </form>
  );
}
