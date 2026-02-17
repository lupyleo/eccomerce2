'use client';

import { useState } from 'react';
import Link from 'next/link';
import ProfileForm from './ProfileForm';
import AddressList from './AddressList';

const TABS = [
  { key: 'profile', label: '프로필' },
  { key: 'address', label: '배송지 관리' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

export default function MyPageClient() {
  const [activeTab, setActiveTab] = useState<TabKey>('profile');

  return (
    <div>
      {/* Quick Links */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <Link
          href="/orders"
          className="p-4 border border-gray-200 rounded-lg text-center hover:border-gray-300 transition-colors"
        >
          <span className="text-2xl">📦</span>
          <p className="text-sm font-medium mt-1">주문내역</p>
        </Link>
        <Link
          href="/mypage/wishlist"
          className="p-4 border border-gray-200 rounded-lg text-center hover:border-gray-300 transition-colors"
        >
          <span className="text-2xl">❤️</span>
          <p className="text-sm font-medium mt-1">위시리스트</p>
        </Link>
        <Link
          href="/mypage/reviews"
          className="p-4 border border-gray-200 rounded-lg text-center hover:border-gray-300 transition-colors"
        >
          <span className="text-2xl">⭐</span>
          <p className="text-sm font-medium mt-1">리뷰관리</p>
        </Link>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-6">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'profile' && <ProfileForm />}
      {activeTab === 'address' && <AddressList />}
    </div>
  );
}
