import MyPageClient from '@/presentation/features/mypage/MyPageClient';

export const metadata = {
  title: '마이페이지 - SHOP',
};

export default function MyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">마이페이지</h1>
      <MyPageClient />
    </div>
  );
}
