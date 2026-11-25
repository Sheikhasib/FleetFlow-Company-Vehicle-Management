/**
 * Deterministic Notification Selectors for FleetFlow.
 * Enforces recipient persona isolation, chronological sorting with ID tie-breaking,
 * deep link route validation, and pure timestamp formatting with mandatory referenceTime.
 */

import { Notification } from '@/types/domain';
import { formatDisplayDateTime } from '@/lib/utils/date';
import { NotificationViewModel } from '../types/view-models';

/**
 * Strictly validates that a navigation link belongs to an authorized
 * Employee internal request-detail route.
 * Rejects external URLs, protocol-relative links, script injection,
 * and Admin/Driver routes.
 * Approved Pattern: /employee/requests/req_[a-zA-Z0-9_-]+
 */
export function isValidEmployeeRequestLink(link?: string | null): boolean {
  if (!link || typeof link !== 'string') return false;
  const trimmed = link.trim();
  const employeeRequestRegex = /^\/employee\/requests\/req_[a-zA-Z0-9_\-]+$/;
  return employeeRequestRegex.test(trimmed);
}

/**
 * Strictly validates that a navigation link belongs to an authorized
 * Admin internal request-detail route.
 * Approved Pattern: /admin/requests/req_[a-zA-Z0-9_-]+
 */
export function isValidAdminRequestLink(link?: string | null): boolean {
  if (!link || typeof link !== 'string') return false;
  const trimmed = link.trim();
  const adminRequestRegex = /^\/admin\/requests\/req_[a-zA-Z0-9_\-]+$/;
  return adminRequestRegex.test(trimmed);
}

/**
 * Strictly validates that a navigation link belongs to an authorized
 * Driver internal trip-detail route or dashboard.
 * Approved Pattern: /driver/trips/leg_[a-zA-Z0-9_-]+, /driver/dashboard, or /driver/trips
 */
export function isValidDriverTripLink(link?: string | null): boolean {
  if (!link || typeof link !== 'string') return false;
  const trimmed = link.trim();
  const driverTripRegex = /^\/driver\/(trips\/leg_[a-zA-Z0-9_\-]+|dashboard|trips)$/;
  return driverTripRegex.test(trimmed);
}

/**
 * Deterministically computes relative time against an explicit reference instant.
 * NEVER calls Date.now() or parameterless new Date() to get the current time.
 * If referenceTime or target timestamp is invalid, returns '—' as deterministic failure policy.
 *
 * @param isoStr Target ISO 8601 date string
 * @param referenceTime Mandatory reference instant (string, Date, or timestamp number)
 */
export function calculateRelativeTime(
  isoStr: string,
  referenceTime: string | Date | number
): string {
  if (!isoStr || referenceTime == null || referenceTime === '') return '—';
  const targetDate = new Date(isoStr);
  const refDate = new Date(referenceTime);
  const targetMs = targetDate.getTime();
  const refMs = refDate.getTime();

  // Deterministic failure policy: if reference instant or target instant is unparseable
  if (isNaN(targetMs) || isNaN(refMs)) {
    return '—';
  }

  const diffMs = targetMs - refMs;
  const diffMinutes = Math.round(diffMs / (1000 * 60));
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  if (Math.abs(diffMinutes) < 1) {
    return 'just now';
  }
  if (Math.abs(diffMinutes) < 60) {
    return rtf.format(diffMinutes, 'minute');
  }
  if (Math.abs(diffHours) < 24) {
    return rtf.format(diffHours, 'hour');
  }
  return rtf.format(diffDays, 'day');
}

/**
 * Counts unread notifications strictly for the active recipient.
 *
 * @param notifications Raw notifications array from Zustand store
 * @param recipientId Active user ID (e.g. 'usr_emp_01')
 */
export function selectUnreadNotificationCount(
  notifications: Notification[],
  recipientId: string
): number {
  if (!Array.isArray(notifications) || !recipientId) return 0;
  return notifications.reduce((count, n) => {
    if (n && n.recipientId === recipientId && !n.read) {
      return count + 1;
    }
    return count;
  }, 0);
}

/**
 * Selects, filters, and transforms in-app notifications for the active employee.
 * Strictly isolates recipient notifications, orders them newest-first with
 * deterministic tie-breaking, validates deep links, and formats timestamps.
 *
 * @param notifications Raw notifications array from Zustand store
 * @param recipientId Active user ID (e.g. 'usr_emp_01')
 * @param referenceTime Mandatory reference instant for relative time calculations
 */
export function selectEmployeeNotifications(
  notifications: Notification[],
  recipientId: string,
  referenceTime: string | Date | number
): NotificationViewModel[] {
  if (!Array.isArray(notifications) || !recipientId) return [];

  // Filter strictly by recipientId (prevents Admin/Driver leakage)
  const userAlerts = notifications.filter(
    (n) => n && n.recipientId === recipientId
  );

  // Deterministic newest-first sort with ID tie-breaker
  const sorted = [...userAlerts].sort((a, b) => {
    const timeA = new Date(a.createdAt).getTime();
    const timeB = new Date(b.createdAt).getTime();
    const safeA = isNaN(timeA) ? 0 : timeA;
    const safeB = isNaN(timeB) ? 0 : timeB;
    if (safeB !== safeA) {
      return safeB - safeA;
    }
    return (b.id || '').localeCompare(a.id || '');
  });

  return sorted.map((n) => {
    const hasValidLink = isValidEmployeeRequestLink(n.link);
    const createdDate = new Date(n.createdAt);
    const isValidDate = !isNaN(createdDate.getTime());

    return {
      id: n.id,
      recipientId: n.recipientId,
      title: n.title,
      message: n.message,
      read: Boolean(n.read),
      createdAt: n.createdAt,
      relativeTime: isValidDate
        ? calculateRelativeTime(n.createdAt, referenceTime)
        : '—',
      displayDateTime: isValidDate
        ? formatDisplayDateTime(n.createdAt)
        : '—',
      link: hasValidLink ? n.link : undefined,
      hasValidLink,
    };
  });
}

/**
 * Selects, filters, and transforms in-app notifications for an active administrator.
 * Strictly isolates recipient notifications, orders them newest-first with
 * deterministic tie-breaking, validates admin deep links, and formats timestamps.
 *
 * @param notifications Raw notifications array from Zustand store
 * @param recipientId Active user ID (e.g. 'usr_adm_01')
 * @param referenceTime Mandatory reference instant for relative time calculations
 */
export function selectAdminNotifications(
  notifications: Notification[],
  recipientId: string,
  referenceTime: string | Date | number
): NotificationViewModel[] {
  if (!Array.isArray(notifications) || !recipientId) return [];

  const userAlerts = notifications.filter(
    (n) => n && n.recipientId === recipientId
  );

  const sorted = [...userAlerts].sort((a, b) => {
    const timeA = new Date(a.createdAt).getTime();
    const timeB = new Date(b.createdAt).getTime();
    const safeA = isNaN(timeA) ? 0 : timeA;
    const safeB = isNaN(timeB) ? 0 : timeB;
    if (safeB !== safeA) {
      return safeB - safeA;
    }
    return (b.id || '').localeCompare(a.id || '');
  });

  return sorted.map((n) => {
    const hasValidLink = isValidAdminRequestLink(n.link);
    const createdDate = new Date(n.createdAt);
    const isValidDate = !isNaN(createdDate.getTime());

    return {
      id: n.id,
      recipientId: n.recipientId,
      title: n.title,
      message: n.message,
      read: Boolean(n.read),
      createdAt: n.createdAt,
      relativeTime: isValidDate
        ? calculateRelativeTime(n.createdAt, referenceTime)
        : '—',
      displayDateTime: isValidDate
        ? formatDisplayDateTime(n.createdAt)
        : '—',
      link: hasValidLink ? n.link : undefined,
      hasValidLink,
    };
  });
}

/**
 * Selects, filters, and transforms in-app notifications for an active driver persona.
 * Strictly isolates recipient notifications, orders them newest-first with
 * deterministic tie-breaking, validates driver deep links, and formats timestamps.
 *
 * @param notifications Raw notifications array from Zustand store
 * @param recipientId Active user ID (e.g. 'usr_drv_01')
 * @param referenceTime Mandatory reference instant for relative time calculations
 */
export function selectDriverNotifications(
  notifications: Notification[],
  recipientId: string,
  referenceTime: string | Date | number
): NotificationViewModel[] {
  if (!Array.isArray(notifications) || !recipientId) return [];

  const userAlerts = notifications.filter(
    (n) => n && n.recipientId === recipientId
  );

  const sorted = [...userAlerts].sort((a, b) => {
    const timeA = new Date(a.createdAt).getTime();
    const timeB = new Date(b.createdAt).getTime();
    const safeA = isNaN(timeA) ? 0 : timeA;
    const safeB = isNaN(timeB) ? 0 : timeB;
    if (safeB !== safeA) {
      return safeB - safeA;
    }
    return (b.id || '').localeCompare(a.id || '');
  });

  return sorted.map((n) => {
    const hasValidLink = isValidDriverTripLink(n.link);
    const createdDate = new Date(n.createdAt);
    const isValidDate = !isNaN(createdDate.getTime());

    return {
      id: n.id,
      recipientId: n.recipientId,
      title: n.title,
      message: n.message,
      read: Boolean(n.read),
      createdAt: n.createdAt,
      relativeTime: isValidDate
        ? calculateRelativeTime(n.createdAt, referenceTime)
        : '—',
      displayDateTime: isValidDate
        ? formatDisplayDateTime(n.createdAt)
        : '—',
      link: hasValidLink ? n.link : undefined,
      hasValidLink,
    };
  });
}

/**
 * Filter status union for notification history views.
 */
export type NotificationFilterStatus = 'ALL' | 'UNREAD' | 'READ';

/**
 * Pure, deterministic helper to filter notification ViewModels by read state.
 * Preserves original ordering, returns a new array, and never mutates inputs.
 *
 * @param items Array of NotificationViewModel items
 * @param filter 'ALL' | 'UNREAD' | 'READ'
 */
export function filterNotificationsByStatus(
  items: NotificationViewModel[],
  filter: NotificationFilterStatus
): NotificationViewModel[] {
  if (!Array.isArray(items)) return [];

  if (filter === 'UNREAD') {
    return items.filter((item) => !item.read);
  }

  if (filter === 'READ') {
    return items.filter((item) => item.read);
  }

  return [...items];
}
