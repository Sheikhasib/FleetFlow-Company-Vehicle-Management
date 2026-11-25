'use client';

import * as React from 'react';
import { Bell } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface NotificationBellProps {
  /** Number of unread notifications for the active recipient */
  count?: number;
  /** Whether the notification popover panel is currently open */
  isOpen?: boolean;
  /** Click handler to toggle the popover panel */
  onClick?: () => void;
  /** Optional custom class name */
  className?: string;
  /** Optional id attribute (defaults to 'notification-bell-trigger') */
  id?: string;
  /** Popover element ID controlled by this trigger (for aria-controls) */
  popoverId?: string;
}

/**
 * Reusable notification bell trigger button.
 * Renders a high-contrast unread counter badge when count > 0.
 * Adheres to 44x44px touch targets and full keyboard accessibility.
 */
export const NotificationBell = React.forwardRef<HTMLButtonElement, NotificationBellProps>(
  (
    {
      count = 0,
      isOpen = false,
      onClick,
      className,
      id = 'notification-bell-trigger',
      popoverId = 'notification-popover-panel',
    },
    ref
  ) => {
    const hasUnread = count > 0;
    const displayCount = count > 99 ? '99+' : count;

    // Accessible description according to unread count
    const accessibleLabel = hasUnread
      ? `Notifications, ${count} unread`
      : 'Notifications, no unread messages';

    return (
      <button
        ref={ref}
        id={id}
        type="button"
        onClick={onClick}
        aria-label={accessibleLabel}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-controls={popoverId}
        className={cn(
          // Target sizing: minimum 44x44px interactive footprint
          'relative inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg',
          'text-muted-foreground transition-colors motion-reduce:transition-none',
          'hover:bg-muted hover:text-foreground',
          // Visible keyboard focus ring
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          // Active state styling when panel is open
          isOpen && 'bg-muted text-foreground ring-1 ring-border',
          className
        )}
      >
        <Bell
          className={cn(
            'h-5 w-5 transition-transform motion-reduce:transition-none',
            hasUnread && 'text-foreground'
          )}
          aria-hidden="true"
        />

        {/* High-contrast unread count badge */}
        {hasUnread && (
          <span
            aria-hidden="true"
            className={cn(
              'absolute top-2 right-2 flex items-center justify-center',
              'min-w-[18px] h-[18px] px-1 rounded-full',
              'bg-primary text-primary-foreground font-bold text-[10px] leading-none',
              'ring-2 ring-background shadow-sm select-none pointer-events-none'
            )}
          >
            {displayCount}
          </span>
        )}
      </button>
    );
  }
);

NotificationBell.displayName = 'NotificationBell';
