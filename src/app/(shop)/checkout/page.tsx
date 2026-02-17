import CheckoutPageClient from '@/presentation/features/checkout/CheckoutPageClient';

export const metadata = {
  title: '주문/결제 - SHOP',
};

export default function CheckoutPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">주문/결제</h1>
      <CheckoutPageClient />
    </div>
  );
}
