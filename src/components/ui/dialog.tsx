import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  'aria-label'?: string;
  'aria-labelledby'?: string;
}

export function Dialog({
  open,
  onOpenChange,
  children,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
}: DialogProps) {
  const contentRef = React.useRef<HTMLDivElement>(null);
  const previousActiveElementRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (open) {
      // 1. Capture previously focused element to return focus upon close
      previousActiveElementRef.current = document.activeElement as HTMLElement | null;
      document.body.style.overflow = 'hidden';

      // 2. Move focus into dialog on next tick
      const focusTimer = setTimeout(() => {
        if (!contentRef.current) return;
        const focusableElements = contentRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length > 0) {
          focusableElements[0].focus();
        } else {
          contentRef.current.focus();
        }
      }, 50);

      // 3. Keyboard handlers: Escape to close and Tab/Shift-Tab focus trap
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          onOpenChange(false);
          return;
        }

        if (e.key === 'Tab' && contentRef.current) {
          const focusableElements = contentRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          );

          // Safe handling when dialog has no focusable children
          if (focusableElements.length === 0) {
            e.preventDefault();
            contentRef.current.focus();
            return;
          }

          const firstElement = focusableElements[0];
          const lastElement = focusableElements[focusableElements.length - 1];

          if (e.shiftKey) {
            // Backward tab: from first element (or container) loop to last element
            if (
              document.activeElement === firstElement ||
              document.activeElement === contentRef.current
            ) {
              e.preventDefault();
              lastElement.focus();
            }
          } else {
            // Forward tab: from last element (or container) loop to first element
            if (
              document.activeElement === lastElement ||
              document.activeElement === contentRef.current
            ) {
              e.preventDefault();
              firstElement.focus();
            }
          }
        }
      };

      window.addEventListener('keydown', handleKeyDown);

      return () => {
        clearTimeout(focusTimer);
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handleKeyDown);

        // 4. Return focus to triggering element when dialog closes
        if (
          previousActiveElementRef.current &&
          typeof previousActiveElementRef.current.focus === 'function' &&
          document.contains(previousActiveElementRef.current)
        ) {
          previousActiveElementRef.current.focus();
        }
      };
    }
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={ariaLabel ? undefined : (ariaLabelledBy || 'fleetflow-dialog-title')}
      aria-label={ariaLabel}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />
      {/* Content wrapper */}
      <div
        ref={contentRef}
        tabIndex={-1}
        className="relative z-50 w-full max-w-lg outline-none animate-in fade-in-0 zoom-in-95 duration-200"
      >
        {children}
      </div>
    </div>
  );
}

export function DialogContent({
  className,
  children,
  onClose,
}: {
  className?: string;
  children: React.ReactNode;
  onClose?: () => void;
}) {
  return (
    <div
      className={cn(
        'relative w-full rounded-lg border border-border bg-card p-6 text-card-foreground shadow-elevation-4',
        className
      )}
    >
      {onClose && (
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-sm p-1 text-muted-foreground opacity-70 transition-opacity hover:opacity-100 hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          aria-label="Close dialog"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
      {children}
    </div>
  );
}

export function DialogHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex flex-col space-y-1.5 text-center sm:text-left mb-4', className)}
      {...props}
    />
  );
}

export function DialogTitle({
  id = 'fleetflow-dialog-title',
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      id={id}
      className={cn('text-lg font-semibold leading-none tracking-tight text-foreground', className)}
      {...props}
    />
  );
}

export function DialogDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn('text-sm text-muted-foreground leading-relaxed', className)}
      {...props}
    />
  );
}

export function DialogFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-6 gap-2 sm:gap-0',
        className
      )}
      {...props}
    />
  );
}
