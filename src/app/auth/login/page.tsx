import LoginForm from '@/presentation/features/auth/LoginForm';

export const metadata = {
  title: '로그인 - SHOP',
};

export default function LoginPage() {
  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">로그인</h1>
          <p className="mt-2 text-sm text-gray-500">
            계정에 로그인하여 쇼핑을 시작하세요.
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
