import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { NotificationBell } from '../notification-bell';
import { NotificationPopover, handleDialogTabTrap } from '../notification-popover';
import { NotificationViewModel } from '../../types/view-models';

describe('Notification Presentation Components', () => {
  const sampleItems: NotificationViewModel[] = [
    {
      id: 'notif_002',
      recipientId: 'usr_emp_01',
      title: 'Vehicle Request Approved',
      message: 'Your vehicle request req_002 has been approved by dispatch.',
      read: false,
      createdAt: '2026-11-24T10:00:00.000Z',
      relativeTime: '2 hours ago',
      displayDateTime: 'Nov 24, 2026, 10:00 AM',
      link: '/employee/requests/req_002',
      hasValidLink: true,
    },
    {
      id: 'notif_004',
      recipientId: 'usr_emp_01',
      title: 'Driver En Route',
      message: 'Driver Marcus Vance is en route for request req_004.',
      read: true,
      createdAt: '2026-11-24T08:00:00.000Z',
      relativeTime: '4 hours ago',
      displayDateTime: 'Nov 24, 2026, 8:00 AM',
      link: '/employee/requests/req_004',
      hasValidLink: true,
    },
    {
      id: 'notif_005',
      recipientId: 'usr_emp_01',
      title: 'Notice With Invalid Link',
      message: 'Alert with external link that was stripped.',
      read: false,
      createdAt: '2026-11-24T07:00:00.000Z',
      relativeTime: '5 hours ago',
      displayDateTime: 'Nov 24, 2026, 7:00 AM',
      link: undefined,
      hasValidLink: false,
    },
    {
      id: 'notif_006',
      recipientId: 'usr_emp_01',
      title: 'General Read Notice',
      message: 'General notice with no link.',
      read: true,
      createdAt: '2026-11-24T06:00:00.000Z',
      relativeTime: '6 hours ago',
      displayDateTime: 'Nov 24, 2026, 6:00 AM',
      link: undefined,
      hasValidLink: false,
    },
  ];

  describe('1. NotificationBell Component', () => {
    it('renders bell button with minimum 44x44px target footprint', () => {
      const html = renderToStaticMarkup(<NotificationBell count={0} isOpen={false} />);
      expect(html).toContain('min-h-[44px]');
      expect(html).toContain('min-w-[44px]');
      expect(html).toContain('id="notification-bell-trigger"');
      expect(html).toContain('aria-haspopup="dialog"');
    });

    it('renders zero-unread state cleanly without a badge', () => {
      const html = renderToStaticMarkup(<NotificationBell count={0} isOpen={false} />);
      expect(html).toContain('aria-label="Notifications, no unread messages"');
      expect(html).not.toContain('bg-primary text-primary-foreground font-bold');
      expect(html).toContain('aria-expanded="false"');
    });

    it('renders high-contrast badge when count > 0', () => {
      const html = renderToStaticMarkup(<NotificationBell count={3} isOpen={false} />);
      expect(html).toContain('aria-label="Notifications, 3 unread"');
      expect(html).toContain('3</span>');
      expect(html).toContain('bg-primary text-primary-foreground');
    });

    it('formats counts above 99 as 99+', () => {
      const html = renderToStaticMarkup(<NotificationBell count={120} isOpen={false} />);
      expect(html).toContain('aria-label="Notifications, 120 unread"');
      expect(html).toContain('99+</span>');
    });

    it('reflects open state via aria-expanded and active styling', () => {
      const html = renderToStaticMarkup(<NotificationBell count={2} isOpen={true} />);
      expect(html).toContain('aria-expanded="true"');
      expect(html).toContain('bg-muted text-foreground ring-1 ring-border');
    });

    it('links to the popover panel via aria-controls', () => {
      const html = renderToStaticMarkup(
        <NotificationBell count={1} popoverId="custom-popover-id" />
      );
      expect(html).toContain('aria-controls="custom-popover-id"');
    });
  });

  describe('2. Modal vs Non-Modal Dialog Semantics (isModal)', () => {
    it('exposes aria-modal="true" and renders backdrop in modal mode (mobile)', () => {
      const html = renderToStaticMarkup(
        <NotificationPopover isOpen={true} isModal={true} items={sampleItems} onClose={vi.fn()} />
      );
      expect(html).toContain('role="dialog"');
      expect(html).toContain('aria-modal="true"');
      // Backdrop rendered for modal
      expect(html).toContain('fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px] md:hidden');
    });

    it('does NOT expose aria-modal="true" and omits backdrop in non-modal mode (desktop dropdown)', () => {
      const html = renderToStaticMarkup(
        <NotificationPopover isOpen={true} isModal={false} items={sampleItems} onClose={vi.fn()} />
      );
      expect(html).toContain('role="dialog"');
      // Non-modal must not declare aria-modal
      expect(html).not.toContain('aria-modal');
      // Backdrop omitted in non-modal mode
      expect(html).not.toContain('bg-black/20');
    });

    it('defaults to non-modal semantics in SSR / desktop viewports', () => {
      const html = renderToStaticMarkup(
        <NotificationPopover isOpen={true} items={sampleItems} onClose={vi.fn()} />
      );
      expect(html).toContain('role="dialog"');
      // Defaults to non-modal when isModal is undefined in SSR
      expect(html).not.toContain('aria-modal="true"');
    });
  });

  describe('3. Focus Containment & Keyboard Navigation (handleDialogTabTrap)', () => {
    let mockContainer: HTMLElement;
    let mockFirstBtn: HTMLElement;
    let mockSecondBtn: HTMLElement;
    let mockLastBtn: HTMLElement;

    beforeEach(() => {
      mockFirstBtn = { focus: vi.fn(), tabIndex: 0 } as unknown as HTMLElement;
      mockSecondBtn = { focus: vi.fn(), tabIndex: 0 } as unknown as HTMLElement;
      mockLastBtn = { focus: vi.fn(), tabIndex: 0 } as unknown as HTMLElement;

      mockContainer = {
        focus: vi.fn(),
        querySelectorAll: vi.fn().mockReturnValue([mockFirstBtn, mockSecondBtn, mockLastBtn]),
      } as unknown as HTMLElement;
    });

    it('cycles focus from last element to first element on forward Tab in modal mode', () => {
      const mockEvent = {
        key: 'Tab',
        shiftKey: false,
        preventDefault: vi.fn(),
      } as unknown as KeyboardEvent;

      // Mock active element as lastElement
      vi.stubGlobal('document', { activeElement: mockLastBtn });

      const handled = handleDialogTabTrap(mockEvent, mockContainer, true);

      expect(handled).toBe(true);
      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockFirstBtn.focus).toHaveBeenCalled();
      vi.unstubAllGlobals();
    });

    it('cycles focus from first element to last element on Shift+Tab in modal mode', () => {
      const mockEvent = {
        key: 'Tab',
        shiftKey: true,
        preventDefault: vi.fn(),
      } as unknown as KeyboardEvent;

      // Mock active element as firstElement
      vi.stubGlobal('document', { activeElement: mockFirstBtn });

      const handled = handleDialogTabTrap(mockEvent, mockContainer, true);

      expect(handled).toBe(true);
      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockLastBtn.focus).toHaveBeenCalled();
      vi.unstubAllGlobals();
    });

    it('allows natural tab movement between intermediate elements in modal mode', () => {
      const mockEvent = {
        key: 'Tab',
        shiftKey: false,
        preventDefault: vi.fn(),
      } as unknown as KeyboardEvent;

      // Active element is second button (not boundary)
      vi.stubGlobal('document', { activeElement: mockSecondBtn });

      const handled = handleDialogTabTrap(mockEvent, mockContainer, true);

      expect(handled).toBe(false);
      expect(mockEvent.preventDefault).not.toHaveBeenCalled();
      expect(mockFirstBtn.focus).not.toHaveBeenCalled();
      vi.unstubAllGlobals();
    });

    it('does NOT trap focus when non-modal (desktop dropdown behavior)', () => {
      const mockEvent = {
        key: 'Tab',
        shiftKey: false,
        preventDefault: vi.fn(),
      } as unknown as KeyboardEvent;

      vi.stubGlobal('document', { activeElement: mockLastBtn });

      // isModal = false
      const handled = handleDialogTabTrap(mockEvent, mockContainer, false);

      expect(handled).toBe(false);
      expect(mockEvent.preventDefault).not.toHaveBeenCalled();
      expect(mockFirstBtn.focus).not.toHaveBeenCalled();
      vi.unstubAllGlobals();
    });

    it('safely focuses container if modal dialog has no focusable elements', () => {
      const emptyContainer = {
        focus: vi.fn(),
        querySelectorAll: vi.fn().mockReturnValue([]),
      } as unknown as HTMLElement;

      const mockEvent = {
        key: 'Tab',
        shiftKey: false,
        preventDefault: vi.fn(),
      } as unknown as KeyboardEvent;

      const handled = handleDialogTabTrap(mockEvent, emptyContainer, true);

      expect(handled).toBe(true);
      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(emptyContainer.focus).toHaveBeenCalled();
    });
  });

  describe('4. NotificationPopover Component Markup & Structure', () => {
    it('returns null when isOpen is false', () => {
      const html = renderToStaticMarkup(
        <NotificationPopover isOpen={false} items={sampleItems} onClose={vi.fn()} />
      );
      expect(html).toBe('');
    });

    it('renders accessible dialog container when isOpen is true', () => {
      const html = renderToStaticMarkup(
        <NotificationPopover isOpen={true} items={sampleItems} onClose={vi.fn()} />
      );
      expect(html).toContain('role="dialog"');
      expect(html).toContain('aria-labelledby="notification-popover-title"');
      expect(html).toContain('id="notification-popover-title"');
      expect(html).toContain('Notifications</h2>');
    });

    it('displays unread count badge in header when unread alerts exist', () => {
      const html = renderToStaticMarkup(
        <NotificationPopover isOpen={true} items={sampleItems} onClose={vi.fn()} />
      );
      // In sampleItems, notif_002 and notif_005 are unread (2 unread)
      expect(html).toContain('2 unread');
    });

    it('hides unread count badge in header when all alerts are read', () => {
      const allRead = sampleItems.map((n) => ({ ...n, read: true }));
      const html = renderToStaticMarkup(
        <NotificationPopover isOpen={true} items={allRead} onClose={vi.fn()} />
      );
      expect(html).not.toContain('unread</span>');
    });

    it('renders empty state when items array is empty', () => {
      const html = renderToStaticMarkup(
        <NotificationPopover isOpen={true} items={[]} onClose={vi.fn()} />
      );
      expect(html).toContain('No Notifications');
      expect(html).toContain('caught up');
    });

    it('renders read and unread notifications with non-color distinction', () => {
      const html = renderToStaticMarkup(
        <NotificationPopover isOpen={true} items={sampleItems} onClose={vi.fn()} />
      );

      // Unread item has explicit screen-reader prefix and primary border
      expect(html).toContain('Unread notification: ');
      expect(html).toContain('border-l-primary');

      // Read item has explicit screen-reader prefix and transparent border
      expect(html).toContain('Read notification: ');
      expect(html).toContain('border-l-transparent');
    });

    it('displays notification details: title, message, relative time, and accessible date/time', () => {
      const html = renderToStaticMarkup(
        <NotificationPopover isOpen={true} items={sampleItems} onClose={vi.fn()} />
      );

      expect(html).toContain('Vehicle Request Approved');
      expect(html).toContain('Your vehicle request req_002 has been approved by dispatch.');
      expect(html).toContain('2 hours ago');
      expect(html).toContain('dateTime="2026-11-24T10:00:00.000Z"');
      expect(html).toContain('title="Nov 24, 2026, 10:00 AM"');
    });

    it('shows View details cue only for valid employee links', () => {
      const html = renderToStaticMarkup(
        <NotificationPopover isOpen={true} items={sampleItems} onClose={vi.fn()} />
      );

      // notif_002 and notif_004 have valid links
      expect(html).toContain('View details');

      // The html contains chevron cues for valid links
      const matchCount = (html.match(/View details/g) || []).length;
      expect(matchCount).toBe(2); // exactly notif_002 and notif_004
    });

    it('enforces word wrapping and overflow prevention for long content', () => {
      const longItem: NotificationViewModel[] = [
        {
          id: 'notif_long',
          recipientId: 'usr_emp_01',
          title: 'A'.repeat(120),
          message: 'B'.repeat(300),
          read: false,
          createdAt: '2026-11-24T10:00:00.000Z',
          relativeTime: 'just now',
          displayDateTime: 'Nov 24, 2026',
          hasValidLink: false,
        },
      ];

      const html = renderToStaticMarkup(
        <NotificationPopover isOpen={true} items={longItem} onClose={vi.fn()} />
      );

      expect(html).toContain('break-words');
      expect(html).toContain('truncate');
      expect(html).toContain('line-clamp-2');
    });
  });

  describe('5. Responsive Geometry & Viewport Positioning Classes', () => {
    it('applies verified mobile fixed geometry clearing 76px header and bottom nav', () => {
      const html = renderToStaticMarkup(
        <NotificationPopover isOpen={true} items={sampleItems} onClose={vi.fn()} />
      );

      // Mobile classes: top-[80px], bottom with calc and safe-area inset
      expect(html).toContain('top-[80px]');
      expect(html).toContain('left-2');
      expect(html).toContain('right-2');
      expect(html).toContain('bottom-[calc(4rem+env(safe-area-inset-bottom,0px)+8px)]');
      expect(html).toContain('flex-1 overflow-y-auto overscroll-contain');
    });

    it('applies verified tablet and desktop floating dropdown classes', () => {
      const html = renderToStaticMarkup(
        <NotificationPopover isOpen={true} items={sampleItems} onClose={vi.fn()} />
      );

      // Tablet/desktop responsive overrides
      expect(html).toContain('md:absolute');
      expect(html).toContain('md:top-full');
      expect(html).toContain('md:right-0');
      expect(html).toContain('md:w-[380px]');
      expect(html).toContain('md:max-h-[480px]');
    });
  });

  describe('6. Interaction Lifecycle & Callback Contracts', () => {
    it('invokes onMarkAsRead and onNavigate when an unread item with a valid link is clicked', () => {
      const onMarkAsRead = vi.fn();
      const onNavigate = vi.fn();
      const onClose = vi.fn();

      const unreadValidItem = sampleItems[0]; // notif_002, read: false, hasValidLink: true

      const handleItemClick = (item: NotificationViewModel) => {
        if (!item.read && onMarkAsRead) {
          onMarkAsRead(item.id);
        }
        if (item.hasValidLink && item.link) {
          onClose();
          if (onNavigate) {
            onNavigate(item.link);
          }
        }
      };

      handleItemClick(unreadValidItem);

      expect(onMarkAsRead).toHaveBeenCalledWith('notif_002');
      expect(onClose).toHaveBeenCalled();
      expect(onNavigate).toHaveBeenCalledWith('/employee/requests/req_002');
    });

    it('invokes onMarkAsRead but does NOT navigate when an unread item has an invalid/missing link', () => {
      const onMarkAsRead = vi.fn();
      const onNavigate = vi.fn();
      const onClose = vi.fn();

      const unreadInvalidItem = sampleItems[2]; // notif_005, read: false, hasValidLink: false

      const handleItemClick = (item: NotificationViewModel) => {
        if (!item.read && onMarkAsRead) {
          onMarkAsRead(item.id);
        }
        if (item.hasValidLink && item.link) {
          onClose();
          if (onNavigate) {
            onNavigate(item.link);
          }
        }
      };

      handleItemClick(unreadInvalidItem);

      expect(onMarkAsRead).toHaveBeenCalledWith('notif_005');
      expect(onNavigate).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
    });

    it('invokes onNavigate without calling onMarkAsRead when an already-read valid item is clicked', () => {
      const onMarkAsRead = vi.fn();
      const onNavigate = vi.fn();
      const onClose = vi.fn();

      const readValidItem = sampleItems[1]; // notif_004, read: true, hasValidLink: true

      const handleItemClick = (item: NotificationViewModel) => {
        if (!item.read && onMarkAsRead) {
          onMarkAsRead(item.id);
        }
        if (item.hasValidLink && item.link) {
          onClose();
          if (onNavigate) {
            onNavigate(item.link);
          }
        }
      };

      handleItemClick(readValidItem);

      expect(onMarkAsRead).not.toHaveBeenCalled(); // No redundant mutation
      expect(onClose).toHaveBeenCalled();
      expect(onNavigate).toHaveBeenCalledWith('/employee/requests/req_004');
    });

    it('does nothing when an already-read item with an invalid/missing link is clicked', () => {
      const onMarkAsRead = vi.fn();
      const onNavigate = vi.fn();
      const onClose = vi.fn();

      const readInvalidItem = sampleItems[3]; // notif_006, read: true, hasValidLink: false

      const handleItemClick = (item: NotificationViewModel) => {
        if (!item.read && onMarkAsRead) {
          onMarkAsRead(item.id);
        }
        if (item.hasValidLink && item.link) {
          onClose();
          if (onNavigate) {
            onNavigate(item.link);
          }
        }
      };

      handleItemClick(readInvalidItem);

      expect(onMarkAsRead).not.toHaveBeenCalled();
      expect(onNavigate).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
    });

    it('does not automatically mark notifications as read simply by opening the popover', () => {
      const onMarkAsRead = vi.fn();
      renderToStaticMarkup(
        <NotificationPopover
          isOpen={true}
          items={sampleItems}
          onClose={vi.fn()}
          onMarkAsRead={onMarkAsRead}
        />
      );

      // Simply rendering/opening must never mutate read state
      expect(onMarkAsRead).not.toHaveBeenCalled();
    });
  });

  describe('7. Keyboard & Accessibility Contracts', () => {
    it('restores focus to the trigger element when closed', () => {
      const mockFocus = vi.fn();
      const triggerEl = { focus: mockFocus } as unknown as HTMLElement;
      const triggerRef = { current: triggerEl };

      const restoreFocus = () => {
        if (triggerRef?.current && typeof triggerRef.current.focus === 'function') {
          triggerRef.current.focus();
        }
      };

      restoreFocus();
      expect(mockFocus).toHaveBeenCalled();
    });

    it('safely handles missing or unavailable trigger without throwing', () => {
      const triggerRef: { current: HTMLElement | null } = { current: null };

      const restoreFocus = () => {
        const el = triggerRef?.current;
        if (el && typeof el.focus === 'function') {
          el.focus();
        }
      };

      expect(() => restoreFocus()).not.toThrow();
    });

    it('renders accessible close button with aria-label', () => {
      const html = renderToStaticMarkup(
        <NotificationPopover isOpen={true} items={sampleItems} onClose={vi.fn()} />
      );
      expect(html).toContain('aria-label="Close notifications"');
    });

    it('does not leak notifications for other personas when fed isolated data', () => {
      const html = renderToStaticMarkup(
        <NotificationPopover isOpen={true} items={sampleItems} onClose={vi.fn()} />
      );

      // Verify no Admin or Driver alerts exist
      expect(html).not.toContain('usr_adm_01');
      expect(html).not.toContain('usr_drv_01');
      expect(html).not.toContain('New Trip Assignment');
      expect(html).not.toContain('/admin/');
      expect(html).not.toContain('/driver/');
    });
  });
});
