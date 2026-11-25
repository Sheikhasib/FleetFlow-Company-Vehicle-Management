'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { NotificationFilterStatus } from '../selectors/notification-selectors';

export interface NotificationFilterCounts {
  all: number;
  unread: number;
  read: number;
}

export interface NotificationFilterButtonsProps {
  /** Currently active filter */
  activeFilter: NotificationFilterStatus;
  /** Callback when user clicks a filter button */
  onFilterChange: (filter: NotificationFilterStatus) => void;
  /** Complete recipient-filtered counts (All, Unread, Read) */
  counts: NotificationFilterCounts;
  /** Optional custom class name */
  className?: string;
}

interface FilterOption {
  status: NotificationFilterStatus;
  label: string;
  count: number;
}

export function NotificationFilterButtons({
  activeFilter,
  onFilterChange,
  counts,
  className,
}: NotificationFilterButtonsProps) {
  const options: FilterOption[] = [
    { status: 'ALL', label: 'All', count: counts.all },
    { status: 'UNREAD', label: 'Unread', count: counts.unread },
    { status: 'READ', label: 'Read', count: counts.read },
  ];

  return (
    <div
      role="group"
      aria-label="Filter notifications by read status"
      className={cn('inline-flex flex-wrap items-center gap-1.5 sm:gap-2', className)}
    >
      {options.map((option) => {
        const isActive = activeFilter === option.status;

        return (
          <button
            key={option.status}
            type="button"
            aria-pressed={isActive}
            onClick={() => onFilterChange(option.status)}
            className={cn(
              'inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors',
              'min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              isActive
                ? 'bg-primary text-primary-foreground shadow-sm font-semibold'
                : 'bg-background text-muted-foreground hover:text-foreground hover:bg-muted border border-border'
            )}
          >
            <span>{option.label}</span>
            <span
              className={cn(
                'inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[11px] font-semibold min-w-[20px]',
                isActive
                  ? 'bg-primary-foreground/20 text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {option.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
