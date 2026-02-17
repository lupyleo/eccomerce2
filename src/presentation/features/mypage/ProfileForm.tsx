'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Input } from '@/presentation/components/ui';
import { Alert, AlertDescription } from '@/presentation/components/ui';

const profileSchema = z.object({
  name: z.string().min(1, '이름을 입력해주세요.').max(50),
  phone: z.string().max(20).optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function ProfileForm() {
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
  });

  useEffect(() => {
    const fetchProfile = async () => {
      const res = await fetch('/api/users/me');
      if (res.ok) {
        const json = await res.json();
        setEmail(json.data.email);
        reset({ name: json.data.name, phone: json.data.phone ?? '' });
      }
    };
    fetchProfile();
  }, [reset]);

  const onSubmit = async (data: ProfileFormData) => {
    setError('');
    setSuccess(false);
    try {
      const res = await fetch('/api/users/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error?.message ?? '프로필 수정에 실패했습니다.');
      }
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '프로필 수정에 실패했습니다.');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {success && (
        <Alert variant="success">
          <AlertDescription>프로필이 수정되었습니다.</AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">이메일</label>
        <p className="text-sm text-gray-500 bg-gray-50 rounded-md px-3 py-2">{email}</p>
      </div>

      <Input
        id="name"
        label="이름"
        error={errors.name?.message}
        {...register('name')}
      />

      <Input
        id="phone"
        label="연락처"
        error={errors.phone?.message}
        {...register('phone')}
      />

      <Button type="submit" loading={isSubmitting}>
        저장
      </Button>
    </form>
  );
}
