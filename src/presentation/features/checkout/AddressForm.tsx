'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Input } from '@/presentation/components/ui';

const addressSchema = z.object({
  name: z.string().min(1, '수령인 이름을 입력해주세요.'),
  phone: z.string().min(1, '연락처를 입력해주세요.'),
  zipCode: z.string().min(1, '우편번호를 입력해주세요.'),
  address1: z.string().min(1, '주소를 입력해주세요.'),
  address2: z.string().optional(),
  isDefault: z.boolean().optional(),
});

type AddressFormData = z.infer<typeof addressSchema>;

interface AddressFormProps {
  defaultValues?: Partial<AddressFormData>;
  onSubmit: (data: AddressFormData) => Promise<void>;
  onCancel?: () => void;
}

export default function AddressForm({ defaultValues, onSubmit, onCancel }: AddressFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AddressFormData>({
    resolver: zodResolver(addressSchema),
    defaultValues,
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Input
          id="addr-name"
          label="수령인"
          placeholder="홍길동"
          error={errors.name?.message}
          {...register('name')}
        />
        <Input
          id="addr-phone"
          label="연락처"
          placeholder="010-1234-5678"
          error={errors.phone?.message}
          {...register('phone')}
        />
      </div>
      <Input
        id="addr-zip"
        label="우편번호"
        placeholder="12345"
        error={errors.zipCode?.message}
        {...register('zipCode')}
      />
      <Input
        id="addr-address1"
        label="주소"
        placeholder="서울시 강남구 ..."
        error={errors.address1?.message}
        {...register('address1')}
      />
      <Input
        id="addr-address2"
        label="상세주소"
        placeholder="101동 1001호"
        error={errors.address2?.message}
        {...register('address2')}
      />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" {...register('isDefault')} className="rounded border-gray-300" />
        기본 배송지로 설정
      </label>
      <div className="flex gap-2 pt-2">
        <Button type="submit" loading={isSubmitting} size="sm">
          저장
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>
            취소
          </Button>
        )}
      </div>
    </form>
  );
}
