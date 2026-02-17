import { cn } from '@/lib/utils';
import type { HTMLAttributes } from 'react';

const variantStyles = {
  default: 'bg-background text-foreground border-border',
  success: 'bg-green-50 text-green-900 border-green-200',
  warning: 'bg-yellow-50 text-yellow-900 border-yellow-200',
  destructive: 'bg-red-50 text-red-900 border-red-200',
  info: 'bg-blue-50 text-blue-900 border-blue-200',
};

interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: keyof typeof variantStyles;
}

export function Alert({ className, variant = 'default', ...props }: AlertProps) {
  return (
    <div
      role="alert"
      className={cn(
        'relative w-full rounded-lg border p-4 text-sm',
        variantStyles[variant],
        className,
      )}
      {...props}
    />
  );
}

export function AlertTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h5 className={cn('mb-1 font-medium leading-none tracking-tight', className)} {...props} />;
}

export function AlertDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm [&_p]:leading-relaxed', className)} {...props} />;
}
