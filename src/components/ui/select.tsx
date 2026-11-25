import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, 'aria-invalid': ariaInvalid, children, ...props }, ref) => {
    const isInvalid = error || ariaInvalid === true || ariaInvalid === 'true';

    return (
      <select
        ref={ref}
        className={cn(
          'flex h-11 min-h-[44px] w-full rounded-md border border-input bg-background px-3.5 py-2 text-sm shadow-sm transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
          'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted/50',
          isInvalid && 'border-destructive ring-1 ring-destructive focus-visible:ring-destructive text-foreground',
          className
        )}
        aria-invalid={isInvalid ? 'true' : undefined}
        {...props}
      >
        {children}
      </select>
    );
  }
);
Select.displayName = 'Select';

export { Select };
