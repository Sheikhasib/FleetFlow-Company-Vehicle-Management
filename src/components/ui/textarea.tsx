import * as React from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, 'aria-invalid': ariaInvalid, ...props }, ref) => {
    const isInvalid = error || ariaInvalid === true || ariaInvalid === 'true';

    return (
      <textarea
        className={cn(
          'flex min-h-[88px] w-full rounded-md border border-input bg-background px-3.5 py-2 text-sm shadow-sm transition-colors leading-relaxed',
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
Textarea.displayName = 'Textarea';

export { Textarea };
