'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/presentation/hooks/useAuth';
import { Button, Input } from '@/presentation/components/ui';
import { Alert, AlertDescription } from '@/presentation/components/ui';
import SocialLoginButtons from './SocialLoginButtons';

const signupSchema = z
  .object({
    name: z.string().min(1, '이름을 입력해주세요.').max(50),
    email: z.string().email('올바른 이메일 형식이 아닙니다.'),
    password: z
      .string()
      .min(8, '비밀번호는 최소 8자 이상이어야 합니다.')
      .regex(
        /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[!@#$%^&*])/,
        '영문, 숫자, 특수문자를 포함해야 합니다.',
      ),
    confirmPassword: z.string(),
    phone: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: '비밀번호가 일치하지 않습니다.',
    path: ['confirmPassword'],
  });

type SignupFormData = z.infer<typeof signupSchema>;

export default function SignupForm() {
  const router = useRouter();
  const { login } = useAuth();
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = async (data: SignupFormData) => {
    setError('');
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          password: data.password,
          phone: data.phone,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message ?? '회원가입에 실패했습니다.');
      }
      await login(data.email, data.password);
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : '회원가입에 실패했습니다.');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <SocialLoginButtons callbackUrl="/" />

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">또는 이메일로 가입</span>
        </div>
      </div>

      <Input
        id="name"
        label="이름"
        placeholder="홍길동"
        error={errors.name?.message}
        {...register('name')}
      />

      <Input
        id="email"
        type="email"
        label="이메일"
        placeholder="example@email.com"
        error={errors.email?.message}
        {...register('email')}
      />

      <Input
        id="password"
        type="password"
        label="비밀번호"
        placeholder="영문, 숫자, 특수문자 포함 8자 이상"
        error={errors.password?.message}
        {...register('password')}
      />

      <Input
        id="confirmPassword"
        type="password"
        label="비밀번호 확인"
        placeholder="비밀번호를 다시 입력하세요"
        error={errors.confirmPassword?.message}
        {...register('confirmPassword')}
      />

      <Input
        id="phone"
        type="tel"
        label="연락처 (선택)"
        placeholder="010-1234-5678"
        error={errors.phone?.message}
        {...register('phone')}
      />

      <Button type="submit" className="w-full" loading={isSubmitting}>
        회원가입
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        이미 계정이 있으신가요?{' '}
        <Link href="/auth/login" className="text-primary font-medium hover:underline">
          로그인
        </Link>
      </p>
    </form>
  );
}
