'use client';

const METHODS = [
  { value: 'CARD', label: '신용/체크카드', icon: '💳' },
  { value: 'EASY_PAY', label: '간편결제', icon: '📱' },
  { value: 'VIRTUAL_ACCOUNT', label: '가상계좌', icon: '🏦' },
] as const;

interface PaymentMethodSelectorProps {
  value: string;
  onChange: (method: string) => void;
}

export default function PaymentMethodSelector({ value, onChange }: PaymentMethodSelectorProps) {
  return (
    <div>
      <h3 className="font-medium mb-3">결제 수단</h3>
      <div className="grid grid-cols-3 gap-2">
        {METHODS.map((method) => (
          <label
            key={method.value}
            className={`flex flex-col items-center gap-1 p-3 rounded-lg border cursor-pointer transition-colors text-center ${
              value === method.value
                ? 'border-gray-900 bg-gray-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <input
              type="radio"
              name="paymentMethod"
              value={method.value}
              checked={value === method.value}
              onChange={() => onChange(method.value)}
              className="sr-only"
            />
            <span className="text-xl">{method.icon}</span>
            <span className="text-xs font-medium">{method.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
