'use client';

import * as React from 'react';
import { Bell, CheckCircle2, Inbox, FolderSearch } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/shared/empty-state';
import { NotificationViewModel } from '../types/view-models';
import {
  NotificationFilterStatus,
  filterNotificationsByStatus,
} from '../selectors/notification-selectors';
import {
  NotificationFilterButtons,
  NotificationFilterCounts,
} from './notification-filter-buttons';
import { NotificationCard } from './notification-card';

export interface NotificationFeedProps {
  /** Complete recipient-filtered notification collection */
  items: NotificationViewModel[];
  /** Currently active filter */
  selectedFilter: NotificationFilterStatus;
  /** Stable counts for All, Unread, and Read filters */
  counts: NotificationFilterCounts;
  /** Callback when user changes the filter */
  onFilterChange?: (filter: NotificationFilterStatus) => void;
  /** Callback to mark an unread notification as read */
  onMarkAsRead?: (id: string) => void;
  /** Callback to navigate to an approved employee request route */
  onNavigateRequest?: (link: string) => void;
  /** Optional custom class name */
  className?: string;
}

export function NotificationFeed({
  items,
  selectedFilter,
  counts,
  onFilterChange,
  onMarkAsRead,
  onNavigateRequest,
  className,
}: NotificationFeedProps) {
  // Pure in-memory filtering preserving selector order; defends against invalid filter values
  const isValidFilter =
    selectedFilter === 'ALL' || selectedFilter === 'UNREAD' || selectedFilter === 'READ';
  const filteredItems = isValidFilter
    ? filterNotificationsByStatus(items, selectedFilter)
    : [];

  // Determine empty state scenario
  const renderEmptyState = () => {
    // Scenario 1: Total collection is empty (No notifications exist)
    if (items.length === 0) {
      return (
        <EmptyState
          icon={Bell}
          title="No Notifications Yet"
          description="You have no notifications in your history. Updates regarding your vehicle requests and trip milestones will appear here."
          className="py-12 my-4"
        />
      );
    }

    // Scenario 2: Unread filter has no results (All caught up)
    if (selectedFilter === 'UNREAD' && filteredItems.length === 0) {
      return (
        <EmptyState
          icon={CheckCircle2}
          title="No Unread Notifications"
          description="You're all caught up! You have no unread notifications to review."
          actionLabel="View All Notifications"
          onAction={() => onFilterChange?.('ALL')}
          className="py-12 my-4"
        />
      );
    }

    // Scenario 3: Read filter has no results
    if (selectedFilter === 'READ' && filteredItems.length === 0) {
      return (
        <EmptyState
          icon={Inbox}
          title="No Read Notifications"
          description="You have no notifications marked as read. Reviewed notifications will appear here."
          actionLabel="View All Notifications"
          onAction={() => onFilterChange?.('ALL')}
          className="py-12 my-4"
        />
      );
    }

    // Scenario 4: Generic fallback if filtered items are empty
    if (filteredItems.length === 0) {
      return (
        <EmptyState
          icon={FolderSearch}
          title="No Matching Notifications"
          description="No notifications match the selected filter criteria."
          actionLabel="View All Notifications"
          onAction={() => onFilterChange?.('ALL')}
          className="py-12 my-4"
        />
      );
    }

    return null;
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Top Filter Buttons Bar */}
      {onFilterChange && (
        <div className="flex items-center justify-between pb-1">
          <NotificationFilterButtons
            activeFilter={selectedFilter}
            onFilterChange={onFilterChange}
            counts={counts}
          />
        </div>
      )}

      {/* Main Feed List or Empty State */}
      {filteredItems.length === 0 ? (
        renderEmptyState()
      ) : (
        <div
          role="feed"
          aria-label="Notifications feed"
          className="space-y-3"
        >
          {filteredItems.map((item) => (
            <NotificationCard
              key={item.id}
              item={item}
              onMarkAsRead={onMarkAsRead}
              onNavigateRequest={onNavigateRequest}
            />
          ))}
        </div>
      )}
    </div>
  );
}
