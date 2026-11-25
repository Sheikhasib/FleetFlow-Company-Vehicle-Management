import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, 'aria-invalid': ariaInvalid, ...props }, ref) => {
    const isInvalid = error || ariaInvalid === true || ariaInvalid === 'true';

    return (
      <input
        type={type}
        className={cn(
          'flex h-11 min-h-[44px] w-full rounded-md border border-input bg-background px-3.5 py-2 text-sm shadow-sm transition-colors',
          'file:border-0 file:bg-transparent file:text-sm file:font-medium',
          'placeholder:text-muted-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
          'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted/50',
          isInvalid && 'border-destructive ring-1 ring-destructive focus-visible:ring-destructive text-foreground',
          className
        )}
        ref={ref}
        aria-invalid={isInvalid ? 'true' : undefined}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
