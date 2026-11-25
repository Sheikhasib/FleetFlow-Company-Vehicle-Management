import { describe, it, expect, vi } from 'vitest';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { NotificationFeed } from '../notification-feed';
import { NotificationViewModel } from '../../types/view-models';
import { NotificationFilterCounts } from '../notification-filter-buttons';

describe('NotificationFeed Component (Step 3B.3.2)', () => {
  const mixedItems: NotificationViewModel[] = [
    {
      id: 'notif_001',
      recipientId: 'usr_emp_01',
      title: 'Vehicle Request Approved',
      message: 'Your vehicle request req_001 has been approved by dispatch.',
      read: false,
      createdAt: '2026-11-25T10:00:00.000Z',
      relativeTime: '2 hours ago',
      displayDateTime: 'Nov 25, 2026, 10:00 AM',
      link: '/employee/requests/req_001',
      hasValidLink: true,
    },
    {
      id: 'notif_002',
      recipientId: 'usr_emp_01',
      title: 'Driver En Route',
      message: 'Driver Marcus Vance is en route for request req_002.',
      read: true,
      createdAt: '2026-11-25T08:00:00.000Z',
      relativeTime: '4 hours ago',
      displayDateTime: 'Nov 25, 2026, 8:00 AM',
      link: '/employee/requests/req_002',
      hasValidLink: true,
    },
    {
      id: 'notif_003',
      recipientId: 'usr_emp_01',
      title: 'Assignment Completed',
      message: 'Trip leg completed successfully.',
      read: true,
      createdAt: '2026-11-25T06:00:00.000Z',
      relativeTime: '6 hours ago',
      displayDateTime: 'Nov 25, 2026, 6:00 AM',
      link: '/employee/requests/req_003',
      hasValidLink: true,
    },
  ];

  const allReadItems: NotificationViewModel[] = mixedItems.map((item) => ({
    ...item,
    read: true,
  }));

  const allUnreadItems: NotificationViewModel[] = mixedItems.map((item) => ({
    ...item,
    read: false,
  }));

  const counts: NotificationFilterCounts = {
    all: 3,
    unread: 1,
    read: 2,
  };

  describe('1. Feed List & Filtering Behavior', () => {
    it('renders all notifications when selectedFilter is ALL', () => {
      const html = renderToStaticMarkup(
        <NotificationFeed
          items={mixedItems}
          selectedFilter="ALL"
          counts={counts}
          onFilterChange={vi.fn()}
        />
      );

      expect(html).toContain('Vehicle Request Approved');
      expect(html).toContain('Driver En Route');
      expect(html).toContain('Assignment Completed');
      expect(html).toContain('role="feed"');
    });

    it('renders only unread notifications when selectedFilter is UNREAD', () => {
      const html = renderToStaticMarkup(
        <NotificationFeed
          items={mixedItems}
          selectedFilter="UNREAD"
          counts={counts}
          onFilterChange={vi.fn()}
        />
      );

      expect(html).toContain('Vehicle Request Approved');
      expect(html).not.toContain('Driver En Route');
      expect(html).not.toContain('Assignment Completed');
    });

    it('renders only read notifications when selectedFilter is READ', () => {
      const html = renderToStaticMarkup(
        <NotificationFeed
          items={mixedItems}
          selectedFilter="READ"
          counts={counts}
          onFilterChange={vi.fn()}
        />
      );

      expect(html).not.toContain('Vehicle Request Approved');
      expect(html).toContain('Driver En Route');
      expect(html).toContain('Assignment Completed');
    });

    it('preserves the original chronological order established by the selector', () => {
      const html = renderToStaticMarkup(
        <NotificationFeed
          items={mixedItems}
          selectedFilter="ALL"
          counts={counts}
          onFilterChange={vi.fn()}
        />
      );

      const idx1 = html.indexOf('Vehicle Request Approved');
      const idx2 = html.indexOf('Driver En Route');
      const idx3 = html.indexOf('Assignment Completed');

      expect(idx1).toBeLessThan(idx2);
      expect(idx2).toBeLessThan(idx3);
    });
  });

  describe('2. Four Distinct Empty States', () => {
    it('Scenario 1: renders "No Notifications Yet" when complete items collection is empty', () => {
      const html = renderToStaticMarkup(
        <NotificationFeed
          items={[]}
          selectedFilter="ALL"
          counts={{ all: 0, unread: 0, read: 0 }}
          onFilterChange={vi.fn()}
        />
      );

      expect(html).toContain('No Notifications Yet');
      expect(html).toContain(
        'You have no notifications in your history. Updates regarding your vehicle requests and trip milestones will appear here.'
      );
      expect(html).not.toContain('role="feed"');
    });

    it('Scenario 2: renders "No Unread Notifications" (All caught up) when unread filter has no results', () => {
      const html = renderToStaticMarkup(
        <NotificationFeed
          items={allReadItems}
          selectedFilter="UNREAD"
          counts={{ all: 3, unread: 0, read: 3 }}
          onFilterChange={vi.fn()}
        />
      );

      expect(html).toContain('No Unread Notifications');
      expect(html).toContain("You&#x27;re all caught up! You have no unread notifications to review.");
      expect(html).toContain('View All Notifications');
    });

    it('Scenario 3: renders "No Read Notifications" when read filter has no results', () => {
      const html = renderToStaticMarkup(
        <NotificationFeed
          items={allUnreadItems}
          selectedFilter="READ"
          counts={{ all: 3, unread: 3, read: 0 }}
          onFilterChange={vi.fn()}
        />
      );

      expect(html).toContain('No Read Notifications');
      expect(html).toContain(
        'You have no notifications marked as read. Reviewed notifications will appear here.'
      );
      expect(html).toContain('View All Notifications');
    });

    it('Scenario 4: renders generic fallback empty state if a filter returns empty for non-standard cases', () => {
      const html = renderToStaticMarkup(
        <NotificationFeed
          items={mixedItems}
          selectedFilter={'OTHER' as any}
          counts={counts}
          onFilterChange={vi.fn()}
        />
      );

      expect(html).toContain('No Matching Notifications');
      expect(html).toContain('No notifications match the selected filter criteria.');
    });

    it('empty state action "View All Notifications" switches filter to ALL', () => {
      const onFilterChange = vi.fn();
      const element = NotificationFeed({
        items: allReadItems,
        selectedFilter: 'UNREAD',
        counts: { all: 3, unread: 0, read: 3 },
        onFilterChange,
      });

      // The empty state is the second child in element.props.children
      const emptyState = element.props.children[1];
      expect(emptyState.props.actionLabel).toBe('View All Notifications');
      emptyState.props.onAction();

      expect(onFilterChange).toHaveBeenCalledWith('ALL');
    });
  });

  describe('3. Callback Delegation to Child NotificationCards', () => {
    it('passes onMarkAsRead and onNavigateRequest to child cards', () => {
      const onMarkAsRead = vi.fn();
      const onNavigateRequest = vi.fn();

      const element = NotificationFeed({
        items: mixedItems,
        selectedFilter: 'ALL',
        counts,
        onFilterChange: vi.fn(),
        onMarkAsRead,
        onNavigateRequest,
      });

      const cardsContainer = element.props.children[1];
      const cards = cardsContainer.props.children;
      expect(cards).toHaveLength(3);

      expect(cards[0].props.onMarkAsRead).toBe(onMarkAsRead);
      expect(cards[0].props.onNavigateRequest).toBe(onNavigateRequest);
    });
  });
});
