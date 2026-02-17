import OrderDetailClient from '@/presentation/features/order/OrderDetailClient';

export const metadata = {
  title: '주문 상세 - SHOP',
};

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">주문 상세</h1>
      <OrderDetailClient orderId={id} />
    </div>
  );
}
