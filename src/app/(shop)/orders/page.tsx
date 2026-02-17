import OrderListClient from '@/presentation/features/order/OrderListClient';

export const metadata = {
  title: '주문내역 - SHOP',
};

export default function OrdersPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">주문내역</h1>
      <OrderListClient />
    </div>
  );
}
