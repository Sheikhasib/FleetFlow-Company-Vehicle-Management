/**
 * Date utility functions for FleetFlow.
 * Handles datetime-local form inputs, display formatting, and timezone-safe ISO conversions.
 */

/**
 * Converts a datetime-local input string (YYYY-MM-DDTHH:mm) to an ISO 8601 UTC string.
 * Uses the local browser timezone to construct the Date instant before converting to ISO.
 * NEVER appends 'Z' directly to the local input value.
 */
export function localDateTimeToIso(dateTimeLocalStr: string): string {
  if (!dateTimeLocalStr) return '';
  const [datePart, timePart] = dateTimeLocalStr.split('T');
  if (!datePart || !timePart) {
    const parsed = new Date(dateTimeLocalStr);
    return isNaN(parsed.getTime()) ? '' : parsed.toISOString();
  }
  const [year, month, day] = datePart.split('-').map(Number);
  const [hours, minutes] = timePart.split(':').map(Number);
  const localDate = new Date(year, month - 1, day, hours, minutes, 0, 0);
  return isNaN(localDate.getTime()) ? '' : localDate.toISOString();
}

/**
 * Converts an ISO 8601 UTC string to a datetime-local input string (YYYY-MM-DDTHH:mm)
 * represented in the user's local timezone.
 */
export function isoToLocalDateTime(isoStr: string): string {
  if (!isoStr) return '';
  const date = new Date(isoStr);
  if (isNaN(date.getTime())) return '';
  const pad = (n: number) => n.toString().padStart(2, '0');
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const h = pad(date.getHours());
  const min = pad(date.getMinutes());
  return `${y}-${m}-${d}T${h}:${min}`;
}

/**
 * Formats an ISO string for human display (e.g. "Nov 24, 2026, 2:30 PM").
 */
export function formatDisplayDateTime(isoStr: string): string {
  if (!isoStr) return '—';
  const date = new Date(isoStr);
  if (isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

/**
 * Formats date only (e.g. "Nov 24, 2026").
 */
export function formatDisplayDate(isoStr: string): string {
  if (!isoStr) return '—';
  const date = new Date(isoStr);
  if (isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

/**
 * Formats time only (e.g. "2:30 PM").
 */
export function formatDisplayTime(isoStr: string): string {
  if (!isoStr) return '—';
  const date = new Date(isoStr);
  if (isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

/**
 * Relative time helper (e.g. "in 2 hours", "3 days ago").
 */
export function formatRelativeTime(isoStr: string): string {
  if (!isoStr) return '—';
  const date = new Date(isoStr);
  if (isNaN(date.getTime())) return '—';
  const diffMs = date.getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / (1000 * 60));
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  if (Math.abs(diffMinutes) < 60) {
    return rtf.format(diffMinutes, 'minute');
  }
  if (Math.abs(diffHours) < 24) {
    return rtf.format(diffHours, 'hour');
  }
  return rtf.format(diffDays, 'day');
}
