/**
 * Notification feature view models.
 * Used for presentation across notification bell, badge, and popover components.
 */

export interface NotificationViewModel {
  /** Unique notification ID (e.g. 'notif_001') */
  id: string;
  /** Recipient user ID (e.g. 'usr_emp_01') */
  recipientId: string;
  /** Notification headline title */
  title: string;
  /** Narrative message detail */
  message: string;
  /** Read state boolean flag */
  read: boolean;
  /** ISO 8601 creation timestamp string */
  createdAt: string;
  /** Formatted relative time string (e.g. "2 hours ago", "yesterday") or '—' */
  relativeTime: string;
  /** Formatted absolute date and time string (e.g. "Nov 24, 2026, 2:30 PM") or '—' */
  displayDateTime: string;
  /** Deep link route if valid, or undefined */
  link?: string;
  /** Whether the link points to an approved Employee request detail route */
  hasValidLink: boolean;
}
