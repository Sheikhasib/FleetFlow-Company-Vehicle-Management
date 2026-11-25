import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import EmployeeNotificationsPage, {
  executeNotificationMarkAsRead,
  executeNotificationNavigation,
} from '@/app/employee/notifications/page';
import EmployeeLayout from '@/app/employee/layout';
import { useFleetFlowStore } from '@/stores/fleetflow-store';
import { notificationService } from '@/services/notification-service';
import { initialSeedData } from '@/data/seed/seed-data';
import { Notification } from '@/types/domain';
import { NotificationViewModel } from '@/features/notifications/types/view-models';
import { isValidEmployeeRequestLink } from '@/features/notifications/selectors/notification-selectors';

// Mock next/navigation
const mockPush = vi.fn();
const mockReplace = vi.fn();
vi.mock('next/navigation', () => ({
  usePathname: () => '/employee/notifications',
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
}));

// Mock useFleetFlowStore to evaluate selectors against current store state in Node SSR
vi.mock('@/stores/fleetflow-store', async () => {
  const actual = await vi.importActual<any>('@/stores/fleetflow-store');
  const store = actual.useFleetFlowStore;
  const useFleetFlowStoreMock = (selector?: any) => {
    return selector ? selector(store.getState()) : store.getState();
  };
  Object.assign(useFleetFlowStoreMock, store);
  return {
    useFleetFlowStore: useFleetFlowStoreMock,
  };
});

describe('EmployeeNotificationsPage Integration (Step 3B.3.3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useFleetFlowStore.setState({
      users: initialSeedData.users,
      vehicles: initialSeedData.vehicles,
      drivers: initialSeedData.drivers,
      requests: initialSeedData.requests,
      tripLegs: initialSeedData.tripLegs,
      assignments: initialSeedData.assignments,
      passengers: initialSeedData.passengers,
      activityLogs: initialSeedData.activityLogs,
      notifications: initialSeedData.notifications,
      currentUserId: 'usr_emp_01',
      isHydrated: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Hydration Safety & Loading State', () => {
    it('renders accessible loading state and suppresses notification list before hydration', () => {
      useFleetFlowStore.setState({ isHydrated: false });

      const html = renderToStaticMarkup(<EmployeeNotificationsPage />);

      expect(html).toContain('Loading notifications...');
      expect(html).toContain('animate-spin');
      expect(html).not.toContain('role="feed"');
      expect(html).not.toContain('Notifications</h1>');
    });

    it('renders full notifications page once store is hydrated', () => {
      useFleetFlowStore.setState({ isHydrated: true });

      const html = renderToStaticMarkup(<EmployeeNotificationsPage />);

      expect(html).toContain('Notifications</h1>');
      expect(html).toContain('Back to Dashboard');
      expect(html).toContain('role="group"');
    });
  });

  describe('2. Recipient Isolation', () => {
    it('employee sees strictly their own notifications, excluding admin and other employee alerts', () => {
      const customNotifications: Notification[] = [
        {
          id: 'notif_sarah_1',
          recipientId: 'usr_emp_01',
          title: 'Sarah Request Approved',
          message: 'Vehicle allocation approved for Sarah.',
          read: false,
          createdAt: '2026-11-25T08:00:00.000Z',
          link: '/employee/requests/req_001',
        },
        {
          id: 'notif_david_1',
          recipientId: 'usr_emp_02',
          title: 'David Driver Assigned',
          message: 'Driver Marcus assigned for David.',
          read: false,
          createdAt: '2026-11-25T07:00:00.000Z',
          link: '/employee/requests/req_002',
        },
        {
          id: 'notif_admin_1',
          recipientId: 'usr_adm_01',
          title: 'Admin Conflict Detected',
          message: 'Conflicting request detected in pool.',
          read: false,
          createdAt: '2026-11-25T06:00:00.000Z',
        },
      ];

      useFleetFlowStore.setState({
        notifications: customNotifications,
        currentUserId: 'usr_emp_01',
        isHydrated: true,
      });

      const html = renderToStaticMarkup(<EmployeeNotificationsPage />);

      // Sarah sees Sarah's notice
      expect(html).toContain('Sarah Request Approved');
      // Sarah NEVER sees David's or Admin's notice
      expect(html).not.toContain('David Driver Assigned');
      expect(html).not.toContain('Admin Conflict Detected');
    });
  });

  describe('3. Filter Choices & Stable Counts', () => {
    it('computes stable complete-collection counts regardless of filter', () => {
      const customNotifications: Notification[] = [
        {
          id: 'notif_1',
          recipientId: 'usr_emp_01',
          title: 'Notice 1',
          message: 'Unread notice 1',
          read: false,
          createdAt: '2026-11-25T08:00:00.000Z',
        },
        {
          id: 'notif_2',
          recipientId: 'usr_emp_01',
          title: 'Notice 2',
          message: 'Unread notice 2',
          read: false,
          createdAt: '2026-11-25T07:00:00.000Z',
        },
        {
          id: 'notif_3',
          recipientId: 'usr_emp_01',
          title: 'Notice 3',
          message: 'Read notice 3',
          read: true,
          createdAt: '2026-11-25T06:00:00.000Z',
        },
      ];

      useFleetFlowStore.setState({
        notifications: customNotifications,
        currentUserId: 'usr_emp_01',
        isHydrated: true,
      });

      const html = renderToStaticMarkup(<EmployeeNotificationsPage />);

      // All count: 3, Unread count: 2, Read count: 1
      expect(html).toContain('All</span>');
      expect(html).toContain('>3</span>');
      expect(html).toContain('Unread</span>');
      expect(html).toContain('>2</span>');
      expect(html).toContain('Read</span>');
      expect(html).toContain('>1</span>');
      // Header unread badge pill
      expect(html).toContain('2 unread');
    });

    it('displays "All caught up" badge when unread count is 0', () => {
      const allReadNotifications: Notification[] = [
        {
          id: 'notif_read_1',
          recipientId: 'usr_emp_01',
          title: 'Read Notice',
          message: 'Already read',
          read: true,
          createdAt: '2026-11-25T08:00:00.000Z',
        },
      ];

      useFleetFlowStore.setState({
        notifications: allReadNotifications,
        currentUserId: 'usr_emp_01',
        isHydrated: true,
      });

      const html = renderToStaticMarkup(<EmployeeNotificationsPage />);

      expect(html).toContain('All caught up');
      expect(html).not.toContain('unread</');
    });
  });

  describe('4. Mark as Read & UI Reaction', () => {
    it('shows Mark as read only on unread notifications and omits it for read items', () => {
      const mixedNotifications: Notification[] = [
        {
          id: 'notif_unread',
          recipientId: 'usr_emp_01',
          title: 'Unread Item',
          message: 'Needs attention',
          read: false,
          createdAt: '2026-11-25T08:00:00.000Z',
        },
        {
          id: 'notif_read',
          recipientId: 'usr_emp_01',
          title: 'Read Item',
          message: 'Already reviewed',
          read: true,
          createdAt: '2026-11-25T06:00:00.000Z',
        },
      ];

      useFleetFlowStore.setState({
        notifications: mixedNotifications,
        currentUserId: 'usr_emp_01',
        isHydrated: true,
      });

      const html = renderToStaticMarkup(<EmployeeNotificationsPage />);

      // Exactly one "Mark as read" button rendered (for the unread item)
      const matches = html.match(/Mark as read/g);
      expect(matches).not.toBeNull();
      expect(matches).toHaveLength(1);
      expect(html).toContain('aria-label="Mark notification &quot;Unread Item&quot; as read"');
    });

    it('calling notificationService.markAsRead updates Zustand store and decrements unread count', async () => {
      const customNotifications: Notification[] = [
        {
          id: 'notif_target',
          recipientId: 'usr_emp_01',
          title: 'Target Unread',
          message: 'Will be marked as read',
          read: false,
          createdAt: '2026-11-25T08:00:00.000Z',
        },
      ];

      useFleetFlowStore.setState({
        notifications: customNotifications,
        currentUserId: 'usr_emp_01',
        isHydrated: true,
      });

      expect(useFleetFlowStore.getState().notifications[0].read).toBe(false);

      // Execute mark as read via service
      const success = await notificationService.markAsRead('notif_target');
      expect(success).toBe(true);

      // Verify store updated reactively
      const updated = useFleetFlowStore.getState().notifications.find((n) => n.id === 'notif_target');
      expect(updated?.read).toBe(true);
    });
  });

  describe('5. Safe Deep-Link Navigation & Guardrails', () => {
    const sampleViewModels: NotificationViewModel[] = [
      {
        id: 'notif_unread_valid',
        recipientId: 'usr_emp_01',
        title: 'Trip Approved',
        message: 'Your trip was approved',
        read: false,
        createdAt: '2026-11-25T08:00:00.000Z',
        relativeTime: '2 hours ago',
        displayDateTime: 'Nov 25, 2026, 8:00 AM',
        link: '/employee/requests/req_001',
        hasValidLink: true,
      },
      {
        id: 'notif_read_valid',
        recipientId: 'usr_emp_01',
        title: 'Driver En Route',
        message: 'Driver Marcus Vance is en route',
        read: true,
        createdAt: '2026-11-25T06:00:00.000Z',
        relativeTime: '4 hours ago',
        displayDateTime: 'Nov 25, 2026, 6:00 AM',
        link: '/employee/requests/req_002',
        hasValidLink: true,
      },
    ];

    it('validates internal employee request links and rejects malformed/external links', () => {
      expect(isValidEmployeeRequestLink('/employee/requests/req_001')).toBe(true);
      expect(isValidEmployeeRequestLink('/employee/requests/req_abc_123')).toBe(true);
      expect(isValidEmployeeRequestLink('/admin/requests/req_001')).toBe(false);
      expect(isValidEmployeeRequestLink('/driver/trips/trip_001')).toBe(false);
      expect(isValidEmployeeRequestLink('https://external-phish.com')).toBe(false);
      expect(isValidEmployeeRequestLink('//malicious.com')).toBe(false);
      expect(isValidEmployeeRequestLink('javascript:alert(1)')).toBe(false);
      expect(isValidEmployeeRequestLink('')).toBe(false);
      expect(isValidEmployeeRequestLink(null)).toBe(false);
      expect(isValidEmployeeRequestLink(undefined)).toBe(false);
    });

    it('navigates to approved request detail route when link is valid and marks unread notification read first', async () => {
      const inFlightSet = new Set<string>();
      const markAsReadMock = vi.fn().mockResolvedValue(true);
      const pushMock = vi.fn();

      const navigated = await executeNotificationNavigation(
        '/employee/requests/req_001',
        sampleViewModels,
        inFlightSet,
        markAsReadMock,
        pushMock
      );

      expect(navigated).toBe(true);
      expect(markAsReadMock).toHaveBeenCalledWith('notif_unread_valid');
      expect(pushMock).toHaveBeenCalledWith('/employee/requests/req_001');
      expect(inFlightSet.size).toBe(0);
    });

    it('aborts navigation if marking unread notification as read fails or throws', async () => {
      const inFlightSet = new Set<string>();
      const markAsReadFailing = vi.fn().mockResolvedValue(false);
      const pushMock = vi.fn();

      const navigated = await executeNotificationNavigation(
        '/employee/requests/req_001',
        sampleViewModels,
        inFlightSet,
        markAsReadFailing,
        pushMock
      );

      expect(navigated).toBe(false);
      expect(markAsReadFailing).toHaveBeenCalledWith('notif_unread_valid');
      expect(pushMock).not.toHaveBeenCalled();
      expect(inFlightSet.size).toBe(0);
    });

    it('aborts navigation if link is invalid or malformed without calling markAsRead or push', async () => {
      const inFlightSet = new Set<string>();
      const markAsReadMock = vi.fn();
      const pushMock = vi.fn();

      const result1 = await executeNotificationNavigation(
        'https://malicious.com',
        sampleViewModels,
        inFlightSet,
        markAsReadMock,
        pushMock
      );
      const result2 = await executeNotificationNavigation(
        '/admin/requests/req_001',
        sampleViewModels,
        inFlightSet,
        markAsReadMock,
        pushMock
      );

      expect(result1).toBe(false);
      expect(result2).toBe(false);
      expect(markAsReadMock).not.toHaveBeenCalled();
      expect(pushMock).not.toHaveBeenCalled();
    });

    it('already-read valid notification navigates directly without issuing redundant markAsRead call', async () => {
      const inFlightSet = new Set<string>();
      const markAsReadMock = vi.fn();
      const pushMock = vi.fn();

      const navigated = await executeNotificationNavigation(
        '/employee/requests/req_002',
        sampleViewModels,
        inFlightSet,
        markAsReadMock,
        pushMock
      );

      expect(navigated).toBe(true);
      expect(markAsReadMock).not.toHaveBeenCalled();
      expect(pushMock).toHaveBeenCalledWith('/employee/requests/req_002');
    });
  });

  describe('6. In-Flight Concurrent Deduplication', () => {
    it('prevents duplicate concurrent mark-as-read calls for the same notification', async () => {
      const inFlightSet = new Set<string>();

      let resolveSlowPromise: (val: boolean) => void;
      const slowPromise = new Promise<boolean>((resolve) => {
        resolveSlowPromise = resolve;
      });

      const markAsReadSpy = vi.fn().mockImplementationOnce(() => slowPromise);

      // Trigger first call (enters in-flight set)
      const call1 = executeNotificationMarkAsRead('notif_dup_1', inFlightSet, markAsReadSpy);
      // Trigger second concurrent call with same ID while first is pending
      const call2 = executeNotificationMarkAsRead('notif_dup_1', inFlightSet, markAsReadSpy);

      // Second call is immediately rejected
      const result2 = await call2;
      expect(result2).toBe(false);
      expect(markAsReadSpy).toHaveBeenCalledTimes(1);

      // Resolve first call
      resolveSlowPromise!(true);
      const result1 = await call1;
      expect(result1).toBe(true);
      expect(inFlightSet.size).toBe(0);
    });
  });

  describe('7. Persona Switching & Reset Demo Data', () => {
    it('switching persona from Sarah (usr_emp_01) to David (usr_emp_02) updates page notifications', () => {
      // First Sarah
      useFleetFlowStore.setState({
        currentUserId: 'usr_emp_01',
        isHydrated: true,
      });

      const sarahHtml = renderToStaticMarkup(<EmployeeNotificationsPage />);
      expect(sarahHtml).toContain('Notifications</h1>');

      // Switch to David
      useFleetFlowStore.setState({
        currentUserId: 'usr_emp_02',
        isHydrated: true,
      });

      const davidHtml = renderToStaticMarkup(<EmployeeNotificationsPage />);
      // David has unread notifications from initialSeedData
      expect(davidHtml).toContain('1 unread');
    });

    it('resetting demo data via resetData restores pristine initial notifications', () => {
      // Mark David's notification as read
      useFleetFlowStore.getState().markNotificationRead('notif_002');
      const modifiedDavid = useFleetFlowStore
        .getState()
        .notifications.find((n) => n.id === 'notif_002');
      expect(modifiedDavid?.read).toBe(true);

      // Execute Reset Demo Data
      useFleetFlowStore.getState().resetData();

      // Verify David's notification is restored to unread
      const restoredDavid = useFleetFlowStore
        .getState()
        .notifications.find((n) => n.id === 'notif_002');
      expect(restoredDavid?.read).toBe(false);
    });
  });

  describe('8. Synchronization Between Page & Header Popover', () => {
    it('marking a notification read on the page updates the header unread badge count', async () => {
      useFleetFlowStore.setState({
        currentUserId: 'usr_emp_02', // David Chen has 1 unread notification in seed
        isHydrated: true,
      });

      // Initially header shows 1 unread
      const headerBeforeHtml = renderToStaticMarkup(
        <EmployeeLayout>
          <div>Page Content</div>
        </EmployeeLayout>
      );
      expect(headerBeforeHtml).toContain('aria-label="Notifications, 1 unread"');

      // Mark David's notification as read via service (used by page)
      await notificationService.markAsRead('notif_002');

      // Now header shows 0 unread
      const headerAfterHtml = renderToStaticMarkup(
        <EmployeeLayout>
          <div>Page Content</div>
        </EmployeeLayout>
      );
      expect(headerAfterHtml).toContain('aria-label="Notifications, no unread messages"');
    });
  });
});
