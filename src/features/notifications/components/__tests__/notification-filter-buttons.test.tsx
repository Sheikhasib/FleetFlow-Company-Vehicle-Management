import { describe, it, expect, vi } from 'vitest';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  NotificationFilterButtons,
  NotificationFilterCounts,
} from '../notification-filter-buttons';

describe('NotificationFilterButtons Component (Step 3B.3.2)', () => {
  const counts: NotificationFilterCounts = {
    all: 10,
    unread: 3,
    read: 7,
  };

  describe('1. Filter Choices & Stable Counts Rendering', () => {
    it('renders All, Unread, and Read button labels with exact counts', () => {
      const html = renderToStaticMarkup(
        <NotificationFilterButtons
          activeFilter="ALL"
          onFilterChange={vi.fn()}
          counts={counts}
        />
      );

      expect(html).toContain('All</span>');
      expect(html).toContain('>10</span>');
      expect(html).toContain('Unread</span>');
      expect(html).toContain('>3</span>');
      expect(html).toContain('Read</span>');
      expect(html).toContain('>7</span>');
    });

    it('counts remain stable based on complete recipient collection regardless of active filter', () => {
      const htmlUnread = renderToStaticMarkup(
        <NotificationFilterButtons
          activeFilter="UNREAD"
          onFilterChange={vi.fn()}
          counts={counts}
        />
      );

      // Counts remain 10, 3, 7 even when UNREAD is active
      expect(htmlUnread).toContain('>10</span>');
      expect(htmlUnread).toContain('>3</span>');
      expect(htmlUnread).toContain('>7</span>');
    });
  });

  describe('2. Accessibility & ARIA Semantics', () => {
    it('uses role="group" and does NOT implement an ARIA tablist', () => {
      const html = renderToStaticMarkup(
        <NotificationFilterButtons
          activeFilter="ALL"
          onFilterChange={vi.fn()}
          counts={counts}
        />
      );

      expect(html).toContain('role="group"');
      expect(html).toContain('aria-label="Filter notifications by read status"');
      expect(html).not.toContain('role="tablist"');
      expect(html).not.toContain('role="tab"');
    });

    it('sets aria-pressed="true" strictly on the active filter and "false" on inactive filters', () => {
      const htmlAll = renderToStaticMarkup(
        <NotificationFilterButtons
          activeFilter="ALL"
          onFilterChange={vi.fn()}
          counts={counts}
        />
      );
      // All is pressed
      expect(htmlAll).toMatch(/aria-pressed="true"[^>]*><span>All/);
      expect(htmlAll).toMatch(/aria-pressed="false"[^>]*><span>Unread/);
      expect(htmlAll).toMatch(/aria-pressed="false"[^>]*><span>Read/);

      const htmlUnread = renderToStaticMarkup(
        <NotificationFilterButtons
          activeFilter="UNREAD"
          onFilterChange={vi.fn()}
          counts={counts}
        />
      );
      expect(htmlUnread).toMatch(/aria-pressed="false"[^>]*><span>All/);
      expect(htmlUnread).toMatch(/aria-pressed="true"[^>]*><span>Unread/);
      expect(htmlUnread).toMatch(/aria-pressed="false"[^>]*><span>Read/);

      const htmlRead = renderToStaticMarkup(
        <NotificationFilterButtons
          activeFilter="READ"
          onFilterChange={vi.fn()}
          counts={counts}
        />
      );
      expect(htmlRead).toMatch(/aria-pressed="false"[^>]*><span>All/);
      expect(htmlRead).toMatch(/aria-pressed="false"[^>]*><span>Unread/);
      expect(htmlRead).toMatch(/aria-pressed="true"[^>]*><span>Read/);
    });

    it('enforces minimum 44px touch target on all filter buttons', () => {
      const html = renderToStaticMarkup(
        <NotificationFilterButtons
          activeFilter="ALL"
          onFilterChange={vi.fn()}
          counts={counts}
        />
      );

      const matches = html.match(/min-h-\[44px\]/g);
      expect(matches).not.toBeNull();
      expect(matches!.length).toBe(3);
    });
  });

  describe('3. Event Handler Invocations', () => {
    it('invokes onFilterChange with corresponding status when buttons are clicked', () => {
      const onFilterChange = vi.fn();
      const element = NotificationFilterButtons({
        activeFilter: 'ALL',
        onFilterChange,
        counts,
      });

      const buttons = element.props.children;
      expect(buttons).toHaveLength(3);

      // Click Unread button (index 1)
      buttons[1].props.onClick();
      expect(onFilterChange).toHaveBeenCalledWith('UNREAD');

      // Click Read button (index 2)
      buttons[2].props.onClick();
      expect(onFilterChange).toHaveBeenCalledWith('READ');

      // Click All button (index 0)
      buttons[0].props.onClick();
      expect(onFilterChange).toHaveBeenCalledWith('ALL');
    });
  });
});
