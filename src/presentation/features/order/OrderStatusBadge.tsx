import { Badge } from '@/presentation/components/ui';

const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'info' }> = {
  PENDING: { label: '결제대기', variant: 'warning' },
  PAID: { label: '결제완료', variant: 'info' },
  PREPARING: { label: '상품준비중', variant: 'info' },
  SHIPPING: { label: '배송중', variant: 'info' },
  DELIVERED: { label: '배송완료', variant: 'success' },
  CONFIRMED: { label: '구매확정', variant: 'success' },
  CANCELLED: { label: '주문취소', variant: 'destructive' },
};

interface OrderStatusBadgeProps {
  status: string;
}

export default function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  const config = STATUS_MAP[status] ?? { label: status, variant: 'secondary' as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
