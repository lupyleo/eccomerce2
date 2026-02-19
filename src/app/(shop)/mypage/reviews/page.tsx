'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Review {
  id: string;
  rating: number;
  content: string;
  images: string[];
  createdAt: string;
  product: {
    id: string;
    name: string;
    slug: string;
  };
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <svg
          key={i}
          className={`w-4 h-4 ${i < rating ? 'text-yellow-400' : 'text-gray-200'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

interface EditingReview {
  id: string;
  rating: number;
  content: string;
}

export default function MyReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingReview, setEditingReview] = useState<EditingReview | null>(null);
  const [editError, setEditError] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchReviews = async () => {
    const res = await fetch('/api/reviews?sort=newest&limit=50');
    const json = await res.json();
    if (json.success) {
      const sessionRes = await fetch('/api/users/me');
      const sessionJson = await sessionRes.json();
      if (sessionJson.data?.id) {
        const myReviews = json.data.filter(
          (r: Review & { user: { id: string } }) => r.user?.id === sessionJson.data.id
        );
        setReviews(myReviews);
      } else {
        setReviews(json.data);
      }
    }
  };

  useEffect(() => {
    fetchReviews().finally(() => setLoading(false));
  }, []);

  const handleEditSave = async () => {
    if (!editingReview) return;
    setEditError('');
    setEditSubmitting(true);
    try {
      const res = await fetch(`/api/reviews/${editingReview.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating: editingReview.rating,
          content: editingReview.content,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? '수정에 실패했습니다.');
      setEditingReview(null);
      await fetchReviews();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : '수정에 실패했습니다.');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDelete = async (reviewId: string) => {
    if (!confirm('리뷰를 삭제하시겠습니까?')) return;
    setDeletingId(reviewId);
    try {
      const res = await fetch(`/api/reviews/${reviewId}`, { method: 'DELETE' });
      if (res.ok) {
        setReviews((prev) => prev.filter((r) => r.id !== reviewId));
      } else {
        const json = await res.json();
        alert(json.error?.message ?? '삭제에 실패했습니다.');
      }
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">리뷰 관리</h1>
        <Link
          href="/mypage"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          마이페이지로
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">로딩 중...</div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-400 text-lg mb-2">작성한 리뷰가 없습니다.</p>
          <p className="text-gray-400 text-sm mb-6">구매한 상품에 리뷰를 남겨보세요.</p>
          <Link
            href="/orders"
            className="inline-block px-6 py-2.5 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-700"
          >
            주문내역 보기
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">{reviews.length}개 리뷰</p>
          {reviews.map((review) => (
            <div
              key={review.id}
              className="p-5 bg-white border border-gray-200 rounded-lg"
            >
              {editingReview?.id === review.id ? (
                /* Edit Mode */
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">상품</p>
                    <Link
                      href={`/products/${review.product.slug}`}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      {review.product.name}
                    </Link>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">별점</p>
                    <div className="flex gap-1">
                      {Array.from({ length: 5 }, (_, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() =>
                            setEditingReview((prev) => prev ? { ...prev, rating: i + 1 } : prev)
                          }
                          className="focus:outline-none"
                        >
                          <svg
                            className={`w-6 h-6 ${i < editingReview.rating ? 'text-yellow-400' : 'text-gray-200'} hover:text-yellow-300 transition-colors`}
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">내용</p>
                    <textarea
                      value={editingReview.content}
                      onChange={(e) =>
                        setEditingReview((prev) => prev ? { ...prev, content: e.target.value } : prev)
                      }
                      rows={4}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                    />
                  </div>

                  {editError && <p className="text-sm text-red-600">{editError}</p>}

                  <div className="flex gap-2">
                    <button
                      onClick={handleEditSave}
                      disabled={editSubmitting}
                      className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-700 disabled:opacity-50"
                    >
                      {editSubmitting ? '저장 중...' : '저장'}
                    </button>
                    <button
                      onClick={() => { setEditingReview(null); setEditError(''); }}
                      className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50"
                    >
                      취소
                    </button>
                  </div>
                </div>
              ) : (
                /* View Mode */
                <>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link
                        href={`/products/${review.product.slug}`}
                        className="text-sm font-medium text-gray-900 hover:underline line-clamp-1"
                      >
                        {review.product.name}
                      </Link>
                      <div className="flex items-center gap-2 mt-1">
                        <StarRating rating={review.rating} />
                        <span className="text-xs text-gray-400">
                          {new Date(review.createdAt).toLocaleDateString('ko-KR')}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() =>
                          setEditingReview({
                            id: review.id,
                            rating: review.rating,
                            content: review.content,
                          })
                        }
                        className="text-sm text-blue-600 hover:underline"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => handleDelete(review.id)}
                        disabled={deletingId === review.id}
                        className="text-sm text-red-600 hover:underline disabled:opacity-50"
                      >
                        삭제
                      </button>
                    </div>
                  </div>

                  <p className="mt-3 text-sm text-gray-700 whitespace-pre-line">{review.content}</p>

                  {review.images.length > 0 && (
                    <div className="flex gap-2 mt-3 flex-wrap">
                      {review.images.map((url, idx) => (
                        <a
                          key={idx}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block w-16 h-16 bg-gray-100 rounded overflow-hidden relative border border-gray-200 hover:border-gray-300"
                        >
                          <img src={url} alt="" className="w-full h-full object-cover" />
                        </a>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
