import { describe, it, expect, vi } from 'vitest';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { NotificationCard } from '../notification-card';
import { NotificationViewModel } from '../../types/view-models';

describe('NotificationCard Component (Step 3B.3.2)', () => {
  const unreadValidItem: NotificationViewModel = {
    id: 'notif_001',
    recipientId: 'usr_emp_01',
    title: 'Vehicle Request Approved',
    message: 'Your vehicle request req_001 has been approved by dispatch.',
    read: false,
    createdAt: '2026-11-25T08:00:00.000Z',
    relativeTime: '2 hours ago',
    displayDateTime: 'Nov 25, 2026, 8:00 AM',
    link: '/employee/requests/req_001',
    hasValidLink: true,
  };

  const readValidItem: NotificationViewModel = {
    id: 'notif_002',
    recipientId: 'usr_emp_01',
    title: 'Driver En Route',
    message: 'Driver Marcus Vance is en route for request req_002.',
    read: true,
    createdAt: '2026-11-25T06:00:00.000Z',
    relativeTime: '4 hours ago',
    displayDateTime: 'Nov 25, 2026, 6:00 AM',
    link: '/employee/requests/req_002',
    hasValidLink: true,
  };

  const unreadInvalidLinkItem: NotificationViewModel = {
    id: 'notif_003',
    recipientId: 'usr_emp_01',
    title: 'System Notice',
    message: 'General notice without a valid link.',
    read: false,
    createdAt: '2026-11-25T04:00:00.000Z',
    relativeTime: '6 hours ago',
    displayDateTime: 'Nov 25, 2026, 4:00 AM',
    link: undefined,
    hasValidLink: false,
  };

  const readInvalidLinkItem: NotificationViewModel = {
    id: 'notif_004',
    recipientId: 'usr_emp_01',
    title: 'Past Notice',
    message: 'Read notice with no navigation action.',
    read: true,
    createdAt: '2026-11-25T02:00:00.000Z',
    relativeTime: '8 hours ago',
    displayDateTime: 'Nov 25, 2026, 2:00 AM',
    link: undefined,
    hasValidLink: false,
  };

  describe('1. Content & Typography Rendering', () => {
    it('renders notification headline title and narrative message', () => {
      const html = renderToStaticMarkup(<NotificationCard item={unreadValidItem} />);
      expect(html).toContain('Vehicle Request Approved');
      expect(html).toContain('Your vehicle request req_001 has been approved by dispatch.');
    });

    it('renders formatted relative and absolute timestamps', () => {
      const html = renderToStaticMarkup(<NotificationCard item={unreadValidItem} />);
      expect(html).toContain('2 hours ago');
      expect(html).toContain('Nov 25, 2026, 8:00 AM');
      expect(html).toContain('dateTime="2026-11-25T08:00:00.000Z"');
    });
  });

  describe('2. Read vs Unread Visual Distinction', () => {
    it('visually distinguishes unread notifications with dot glyph, bold title, and unread badge', () => {
      const html = renderToStaticMarkup(<NotificationCard item={unreadValidItem} />);
      // Unread dot indicator
      expect(html).toContain('h-2.5 w-2.5 rounded-full bg-primary');
      // Unread badge text
      expect(html).toContain('Unread');
      // Unread border accent
      expect(html).toContain('border-l-primary');
      // Bold title
      expect(html).toContain('font-semibold text-foreground');
      // Screen reader announcement
      expect(html).toContain('Unread notification: ');
    });

    it('visually distinguishes read notifications with normal styling and no unread dot', () => {
      const html = renderToStaticMarkup(<NotificationCard item={readValidItem} />);
      // No unread dot
      expect(html).not.toContain('h-2.5 w-2.5 rounded-full bg-primary');
      // No unread badge
      expect(html).not.toContain('>Unread<');
      // Transparent rail
      expect(html).toContain('border-l-transparent');
      // Normal/medium weight title
      expect(html).toContain('font-medium text-foreground/85');
      // Screen reader announcement
      expect(html).toContain('Read notification: ');
    });
  });

  describe('3. Action Button Rendering & Guardrails', () => {
    it('renders "Mark as read" button ONLY when the notification is unread', () => {
      const onMarkAsRead = vi.fn();
      const unreadHtml = renderToStaticMarkup(
        <NotificationCard item={unreadValidItem} onMarkAsRead={onMarkAsRead} />
      );
      expect(unreadHtml).toContain('Mark as read');
      expect(unreadHtml).toContain('aria-label="Mark notification &quot;Vehicle Request Approved&quot; as read"');

      const readHtml = renderToStaticMarkup(
        <NotificationCard item={readValidItem} onMarkAsRead={onMarkAsRead} />
      );
      expect(readHtml).not.toContain('Mark as read');
    });

    it('renders "View details" CTA ONLY when ViewModel has a valid link', () => {
      const onNavigateRequest = vi.fn();
      const validHtml = renderToStaticMarkup(
        <NotificationCard item={unreadValidItem} onNavigateRequest={onNavigateRequest} />
      );
      expect(validHtml).toContain('View details');
      expect(validHtml).toContain('aria-label="View request details for &quot;Vehicle Request Approved&quot;"');

      const invalidHtml = renderToStaticMarkup(
        <NotificationCard item={unreadInvalidLinkItem} onNavigateRequest={onNavigateRequest} />
      );
      expect(invalidHtml).not.toContain('View details');
    });

    it('does not render an actions container if neither mark-as-read nor valid link is applicable', () => {
      const html = renderToStaticMarkup(<NotificationCard item={readInvalidLinkItem} />);
      expect(html).not.toContain('Mark as read');
      expect(html).not.toContain('View details');
    });
  });

  describe('4. Accessibility, Touch Targets & Non-Nested Interactivity', () => {
    it('ensures all action buttons satisfy the minimum 44px touch target requirement', () => {
      const html = renderToStaticMarkup(
        <NotificationCard
          item={unreadValidItem}
          onMarkAsRead={vi.fn()}
          onNavigateRequest={vi.fn()}
        />
      );
      // Both buttons must have min-h-[44px]
      const markAsReadMatch = html.match(/min-h-\[44px\]/g);
      expect(markAsReadMatch).not.toBeNull();
      expect(markAsReadMatch!.length).toBeGreaterThanOrEqual(2);
    });

    it('avoids nested interactive elements (Card is not a button or link)', () => {
      const element = <NotificationCard item={unreadValidItem} onMarkAsRead={vi.fn()} />;
      // Root element is Card (div container), not a button or anchor
      const html = renderToStaticMarkup(element);
      expect(html.startsWith('<div')).toBe(true);
    });
  });

  describe('5. Event Handler Invocations', () => {
    it('invokes onMarkAsRead with notification ID when Mark as read is clicked', () => {
      const onMarkAsRead = vi.fn();
      const element = NotificationCard({
        item: unreadValidItem,
        onMarkAsRead,
      });

      // Find Mark as read button in element tree and trigger its onClick
      const actionsContainer = element.props.children.props.children[1];
      const markAsReadButton = actionsContainer.props.children[0];
      expect(markAsReadButton.props['aria-label']).toContain('Mark notification');
      markAsReadButton.props.onClick();

      expect(onMarkAsRead).toHaveBeenCalledTimes(1);
      expect(onMarkAsRead).toHaveBeenCalledWith('notif_001');
    });

    it('invokes onNavigateRequest with target link when View details is clicked', () => {
      const onNavigateRequest = vi.fn();
      const element = NotificationCard({
        item: unreadValidItem,
        onNavigateRequest,
      });

      const actionsContainer = element.props.children.props.children[1];
      const viewDetailsButton = actionsContainer.props.children[1];
      expect(viewDetailsButton.props['aria-label']).toContain('View request details');
      viewDetailsButton.props.onClick();

      expect(onNavigateRequest).toHaveBeenCalledTimes(1);
      expect(onNavigateRequest).toHaveBeenCalledWith('/employee/requests/req_001');
    });
  });
});
