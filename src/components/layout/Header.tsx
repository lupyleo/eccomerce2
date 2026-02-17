'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useAuth } from '@/presentation/hooks/useAuth';
import { useCartStore } from '@/presentation/hooks/useCart';

const NAV_ITEMS = [
  { href: '/', label: '홈' },
  { href: '/products', label: '전체 상품' },
  { href: '/products?category=tops', label: '상의' },
  { href: '/products?category=bottoms', label: '하의' },
  { href: '/products?category=outer', label: '아우터' },
];

export default function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const { itemCount, fetchCart } = useCartStore();

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex-shrink-0">
            <h1 className="text-xl font-bold tracking-tight text-gray-900">
              SHOP
            </h1>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm font-medium transition-colors hover:text-gray-900 ${
                  pathname === item.href
                    ? 'text-gray-900'
                    : 'text-gray-500'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-4">
            <Link
              href="/products"
              className="text-gray-500 hover:text-gray-900 transition-colors"
              aria-label="검색"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </Link>
            <Link
              href="/cart"
              className="text-gray-500 hover:text-gray-900 transition-colors relative"
              aria-label="장바구니"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              {itemCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-4 w-4 flex items-center justify-center">
                  {itemCount > 99 ? '99+' : itemCount}
                </span>
              )}
            </Link>

            {isAuthenticated ? (
              <div className="hidden md:flex items-center gap-3">
                <Link
                  href="/mypage"
                  className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  {user?.name ?? '마이페이지'}
                </Link>
                <button
                  onClick={logout}
                  className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
                >
                  로그아웃
                </button>
              </div>
            ) : (
              <Link
                href="/auth/login"
                className="text-gray-500 hover:text-gray-900 transition-colors"
                aria-label="로그인"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </Link>
            )}

            {/* Mobile menu button */}
            <button
              className="md:hidden text-gray-500 hover:text-gray-900"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="메뉴"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="md:hidden py-4 border-t border-gray-200">
            <div className="flex flex-col gap-2">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    pathname === item.href
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              <hr className="my-2 border-gray-200" />
              {isAuthenticated ? (
                <>
                  <Link
                    href="/mypage"
                    className="px-3 py-2 rounded-md text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    마이페이지
                  </Link>
                  <Link
                    href="/orders"
                    className="px-3 py-2 rounded-md text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    주문내역
                  </Link>
                  <button
                    onClick={() => { logout(); setMobileMenuOpen(false); }}
                    className="px-3 py-2 rounded-md text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-900 text-left"
                  >
                    로그아웃
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/auth/login"
                    className="px-3 py-2 rounded-md text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    로그인
                  </Link>
                  <Link
                    href="/auth/signup"
                    className="px-3 py-2 rounded-md text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    회원가입
                  </Link>
                </>
              )}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
