import { cn } from '@/lib/utils';

type OrderStatus =
  | 'PENDING'
  | 'PAID'
  | 'PREPARING'
  | 'SHIPPING'
  | 'DELIVERED'
  | 'CONFIRMED'
  | 'CANCELLED';

interface OrderTimelineProps {
  currentStatus: OrderStatus;
  timestamps?: { status: string; date: string }[];
}

const STEPS: { status: OrderStatus; label: string }[] = [
  { status: 'PENDING', label: '결제대기' },
  { status: 'PAID', label: '결제완료' },
  { status: 'PREPARING', label: '상품준비중' },
  { status: 'SHIPPING', label: '배송중' },
  { status: 'DELIVERED', label: '배송완료' },
  { status: 'CONFIRMED', label: '구매확정' },
];

const STATUS_ORDER: Record<string, number> = {
  PENDING: 0,
  PAID: 1,
  PREPARING: 2,
  SHIPPING: 3,
  DELIVERED: 4,
  CONFIRMED: 5,
};

export default function OrderTimeline({ currentStatus, timestamps }: OrderTimelineProps) {
  if (currentStatus === 'CANCELLED') {
    return (
      <div className="flex items-center justify-center py-4">
        <span className="inline-flex items-center gap-2 text-sm text-destructive font-medium">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          주문 취소됨
        </span>
      </div>
    );
  }

  const currentIndex = STATUS_ORDER[currentStatus] ?? -1;

  const getTimestamp = (status: string) => {
    const entry = timestamps?.find((t) => t.status === status);
    if (!entry) return null;
    return new Date(entry.date).toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="relative">
      {/* Connector line */}
      <div className="absolute top-4 left-4 right-4 h-0.5 bg-gray-200" aria-hidden="true" />

      <ol className="relative flex justify-between">
        {STEPS.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const timestamp = getTimestamp(step.status);

          return (
            <li key={step.status} className="flex flex-col items-center gap-2 flex-1">
              {/* Step circle */}
              <div
                className={cn(
                  'relative z-10 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors',
                  isCompleted
                    ? 'bg-gray-900 border-gray-900 text-white'
                    : isCurrent
                      ? 'bg-white border-gray-900 text-gray-900'
                      : 'bg-white border-gray-200 text-gray-400',
                )}
                aria-current={isCurrent ? 'step' : undefined}
              >
                {isCompleted ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span className="w-2 h-2 rounded-full bg-current" aria-hidden="true" />
                )}
              </div>

              {/* Label */}
              <div className="flex flex-col items-center text-center">
                <span
                  className={cn(
                    'text-xs font-medium leading-tight',
                    isCurrent ? 'text-gray-900' : isCompleted ? 'text-gray-600' : 'text-gray-400',
                  )}
                >
                  {step.label}
                </span>
                {timestamp && (
                  <span className="text-xs text-gray-400 mt-0.5 whitespace-nowrap">{timestamp}</span>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
