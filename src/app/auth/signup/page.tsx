import SignupForm from '@/presentation/features/auth/SignupForm';

export const metadata = {
  title: '회원가입 - SHOP',
};

export default function SignupPage() {
  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">회원가입</h1>
          <p className="mt-2 text-sm text-gray-500">
            회원가입하고 다양한 혜택을 받아보세요.
          </p>
        </div>
        <SignupForm />
      </div>
    </div>
  );
}
