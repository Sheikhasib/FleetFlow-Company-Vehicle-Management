'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { useFleetFlowStore } from '@/stores/fleetflow-store';
import { Badge } from '@/components/ui/badge';
import { NotificationFeed } from '@/features/notifications/components/notification-feed';
import { NotificationViewModel } from '@/features/notifications/types/view-models';
import {
  selectEmployeeNotifications,
  isValidEmployeeRequestLink,
  NotificationFilterStatus,
} from '@/features/notifications/selectors/notification-selectors';
import { notificationService } from '@/services/notification-service';

/**
 * Deduplicated mark-as-read execution helper.
 * Prevents concurrent duplicate service invocations for the same notification ID.
 * Exported for deterministic unit testing.
 */
export async function executeNotificationMarkAsRead(
  id: string,
  inFlightSet: Set<string>,
  markAsReadFn: (id: string) => Promise<boolean>
): Promise<boolean> {
  if (inFlightSet.has(id)) {
    return false;
  }
  inFlightSet.add(id);
  try {
    return await markAsReadFn(id);
  } catch (err) {
    console.error('Failed to mark notification as read:', err);
    return false;
  } finally {
    inFlightSet.delete(id);
  }
}

/**
 * Validated deep-link navigation execution helper.
 * Revalidates route pattern, marks unread notices read before navigating,
 * aborts navigation if mark-as-read fails, and navigates read items directly.
 * Exported for deterministic unit testing.
 */
export async function executeNotificationNavigation(
  link: string,
  notifications: NotificationViewModel[],
  inFlightSet: Set<string>,
  markAsReadFn: (id: string) => Promise<boolean>,
  pushFn: (targetLink: string) => void
): Promise<boolean> {
  if (!isValidEmployeeRequestLink(link)) {
    return false;
  }

  // If notification corresponding to this link is unread, mark it read first
  const unreadItem = notifications.find((n) => n.link === link && !n.read);

  if (unreadItem) {
    const success = await executeNotificationMarkAsRead(
      unreadItem.id,
      inFlightSet,
      markAsReadFn
    );
    if (!success) {
      return false; // Abort navigation if marking as read returns false or throws
    }
  }

  pushFn(link);
  return true;
}

export default function EmployeeNotificationsPage() {
  const router = useRouter();

  // Store subscriptions
  const isHydrated = useFleetFlowStore((s) => s.isHydrated);
  const currentUserId = useFleetFlowStore((s) => s.currentUserId);
  const users = useFleetFlowStore((s) => s.users);
  const notifications = useFleetFlowStore((s) => s.notifications);

  const currentUser = users.find((u) => u.id === currentUserId) || users[0];

  // Caller-owned reference instant for deterministic relative timestamp calculations
  const [referenceTime] = React.useState<Date>(() => new Date());

  // Transient local UI state for status filter ('ALL' | 'UNREAD' | 'READ')
  const [activeFilter, setActiveFilter] = React.useState<NotificationFilterStatus>('ALL');

  // In-flight guard to prevent duplicate concurrent mark-as-read calls
  const inFlightMarkAsReadRef = React.useRef<Set<string>>(new Set());

  // Complete recipient-filtered collection for the active employee
  const employeeNotifications = React.useMemo(() => {
    if (!isHydrated || !currentUser) return [];
    return selectEmployeeNotifications(notifications, currentUser.id, referenceTime);
  }, [isHydrated, currentUser, notifications, referenceTime]);

  // Stable counts based on the complete recipient-filtered collection
  const counts = React.useMemo(() => {
    const all = employeeNotifications.length;
    const unread = employeeNotifications.filter((n) => !n.read).length;
    const read = all - unread;
    return { all, unread, read };
  }, [employeeNotifications]);

  // Mark-as-read callback
  const handleMarkAsRead = React.useCallback(
    async (id: string): Promise<boolean> => {
      return executeNotificationMarkAsRead(
        id,
        inFlightMarkAsReadRef.current,
        (targetId) => notificationService.markAsRead(targetId)
      );
    },
    []
  );

  // Safe request deep-link navigation callback
  const handleNavigateRequest = React.useCallback(
    async (link: string) => {
      await executeNotificationNavigation(
        link,
        employeeNotifications,
        inFlightMarkAsReadRef.current,
        (targetId) => notificationService.markAsRead(targetId),
        (targetLink) => router.push(targetLink)
      );
    },
    [employeeNotifications, router]
  );

  // Hydration guard: show accessible loading state while store hydrates
  if (!isHydrated) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
        <p className="text-sm text-muted-foreground font-medium">Loading notifications...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Breadcrumb / Return Link */}
      <div className="flex items-center">
        <Link
          href="/employee/dashboard"
          className="inline-flex items-center text-xs font-medium text-muted-foreground hover:text-foreground transition-colors group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm py-1"
        >
          <ChevronLeft className="h-4 w-4 mr-1 transition-transform group-hover:-translate-x-0.5" aria-hidden="true" />
          <span>Back to Dashboard</span>
        </Link>
      </div>

      {/* Page Header */}
      <div className="space-y-1.5 pb-2 border-b border-border/60">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Notifications
          </h1>
          {counts.unread > 0 ? (
            <Badge variant="pending" className="font-semibold text-xs px-2.5 py-0.5">
              {counts.unread} unread
            </Badge>
          ) : (
            <Badge variant="outline" className="font-medium text-xs px-2.5 py-0.5 text-muted-foreground border-border">
              All caught up
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Review company vehicle request alerts, administrative approvals, driver assignments, and trip execution updates.
        </p>
      </div>

      {/* Main Notifications Feed */}
      <NotificationFeed
        items={employeeNotifications}
        selectedFilter={activeFilter}
        counts={counts}
        onFilterChange={setActiveFilter}
        onMarkAsRead={handleMarkAsRead}
        onNavigateRequest={handleNavigateRequest}
      />
    </div>
  );
}
