'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ADMIN_NAV = [
  { href: '/admin', label: '대시보드', icon: '📊' },
  { href: '/admin/products', label: '상품 관리', icon: '👕' },
  { href: '/admin/orders', label: '주문 관리', icon: '📦' },
  { href: '/admin/users', label: '회원 관리', icon: '👥' },
  { href: '/admin/coupons', label: '쿠폰 관리', icon: '🎟️' },
  { href: '/admin/promotions', label: '프로모션', icon: '🏷️' },
  { href: '/admin/returns', label: '반품 관리', icon: '↩️' },
  { href: '/admin/inventory', label: '재고 관리', icon: '📋' },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      <aside className="w-60 bg-gray-900 text-white flex-shrink-0">
        <div className="p-4 border-b border-gray-700">
          <h2 className="text-lg font-bold">관리자</h2>
        </div>
        <nav className="p-2">
          {ADMIN_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                pathname === item.href
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 bg-gray-50 p-6 overflow-auto">
        {children}
      </main>
    </div>
  );
}
