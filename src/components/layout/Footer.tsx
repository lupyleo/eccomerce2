import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-white text-lg font-bold mb-4">SHOP</h3>
            <p className="text-sm">
              트렌디한 의류를 합리적인 가격에 만나보세요.
            </p>
          </div>
          <div>
            <h4 className="text-white text-sm font-semibold mb-4">쇼핑</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/products?category=tops" className="hover:text-white transition-colors">상의</Link></li>
              <li><Link href="/products?category=bottoms" className="hover:text-white transition-colors">하의</Link></li>
              <li><Link href="/products?category=outer" className="hover:text-white transition-colors">아우터</Link></li>
              <li><Link href="/products" className="hover:text-white transition-colors">전체 상품</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white text-sm font-semibold mb-4">고객 서비스</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/orders" className="hover:text-white transition-colors">주문 조회</Link></li>
              <li><Link href="/mypage" className="hover:text-white transition-colors">마이페이지</Link></li>
              <li><span className="cursor-default">교환/반품 안내</span></li>
              <li><span className="cursor-default">배송 안내</span></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white text-sm font-semibold mb-4">고객센터</h4>
            <p className="text-sm mb-2">평일 10:00 - 18:00</p>
            <p className="text-sm mb-2">점심시간 12:30 - 13:30</p>
            <p className="text-sm">주말/공휴일 휴무</p>
          </div>
        </div>
        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm">
          <p>&copy; 2026 SHOP. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
