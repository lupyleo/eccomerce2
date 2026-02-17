import CartPageClient from '@/presentation/features/cart/CartPageClient';

export const metadata = {
  title: '장바구니 - SHOP',
};

export default function CartPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">장바구니</h1>
      <CartPageClient />
    </div>
  );
}
