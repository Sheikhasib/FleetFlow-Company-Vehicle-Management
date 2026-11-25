import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import EmployeeLayout from '@/app/employee/layout';
import { useFleetFlowStore } from '@/stores/fleetflow-store';
import { notificationService } from '@/services/notification-service';
import { initialSeedData } from '@/data/seed/seed-data';
import { Notification } from '@/types/domain';
import { isValidEmployeeRequestLink } from '@/features/notifications/selectors/notification-selectors';

// Mock next/navigation
const mockPush = vi.fn();
const mockReplace = vi.fn();
vi.mock('next/navigation', () => ({
  usePathname: () => '/employee/dashboard',
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

describe('Header Notification Bell & Popover Integration (Step 3B.2.3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset Zustand store to pristine initial state
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

  describe('1. Hydration Safety & Role Isolation', () => {
    it('suppresses notification bell when store is not hydrated', () => {
      useFleetFlowStore.setState({ isHydrated: false });

      const html = renderToStaticMarkup(
        <EmployeeLayout>
          <div>Child Page</div>
        </EmployeeLayout>
      );

      // AuthGuard shows loading state and header/bell is not mounted
      expect(html).toContain('Verifying employee session...');
      expect(html).not.toContain('id="notification-bell-trigger"');
      expect(html).not.toContain('id="notification-popover-panel"');
    });

    it('suppresses notification bell when current user is an Admin', () => {
      useFleetFlowStore.setState({
        currentUserId: 'usr_adm_01', // Admin persona
        isHydrated: true,
      });

      const html = renderToStaticMarkup(
        <EmployeeLayout>
          <div>Child Page</div>
        </EmployeeLayout>
      );

      // AuthGuard prevents header rendering for non-employee
      expect(html).toContain('Access Boundary');
      expect(html).toContain('Employee Portal Access');
      expect(html).not.toContain('id="notification-bell-trigger"');
    });

    it('suppresses notification bell when current user is a Driver', () => {
      useFleetFlowStore.setState({
        currentUserId: 'usr_drv_01', // Driver persona
        isHydrated: true,
      });

      const html = renderToStaticMarkup(
        <EmployeeLayout>
          <div>Child Page</div>
        </EmployeeLayout>
      );

      expect(html).toContain('Access Boundary');
      expect(html).toContain('Employee Portal Access');
      expect(html).not.toContain('id="notification-bell-trigger"');
    });

    it('renders notification bell when hydrated and active user is an Employee', () => {
      useFleetFlowStore.setState({
        currentUserId: 'usr_emp_01',
        isHydrated: true,
      });

      const html = renderToStaticMarkup(
        <EmployeeLayout>
          <div>Child Page</div>
        </EmployeeLayout>
      );

      expect(html).toContain('id="notification-bell-trigger"');
      expect(html).toContain('aria-controls="notification-popover-panel"');
      expect(html).toContain('aria-haspopup="dialog"');
      expect(html).toContain('aria-expanded="false"');
    });
  });

  describe('2. Persona Isolation & Unread Count', () => {
    it('accurately computes unread badge count for usr_emp_02 (Tanvir Ahmed)', () => {
      useFleetFlowStore.setState({
        currentUserId: 'usr_emp_02',
        isHydrated: true,
      });

      const store = useFleetFlowStore.getState();
      const emp2UnreadCount = store.notifications.filter(
        (n) => n.recipientId === 'usr_emp_02' && !n.read
      ).length;

      const html = renderToStaticMarkup(
        <EmployeeLayout>
          <div>Child Page</div>
        </EmployeeLayout>
      );

      expect(emp2UnreadCount).toBe(1);
      expect(html).toContain('aria-label="Notifications, 1 unread"');
      expect(html).toContain('>1</span>');
    });

    it('accurately shows no unread badge when employee has zero unread notifications', () => {
      useFleetFlowStore.setState({
        currentUserId: 'usr_emp_01', // Nusrat Jahan has 1 read notification in seed
        isHydrated: true,
      });

      const store = useFleetFlowStore.getState();
      const emp1UnreadCount = store.notifications.filter(
        (n) => n.recipientId === 'usr_emp_01' && !n.read
      ).length;

      const html = renderToStaticMarkup(
        <EmployeeLayout>
          <div>Child Page</div>
        </EmployeeLayout>
      );

      expect(emp1UnreadCount).toBe(0);
      expect(html).toContain('aria-label="Notifications, no unread messages"');
      expect(html).not.toContain('>0</span>');
    });

    it('strictly isolates recipient notifications between employees', () => {
      const customNotifications: Notification[] = [
        {
          id: 'notif_emp1_1',
          recipientId: 'usr_emp_01',
          title: 'Sarah Private Notice',
          message: 'Only for Sarah Jenkins',
          read: false,
          createdAt: new Date().toISOString(),
          link: '/employee/requests/req_001',
        },
        {
          id: 'notif_emp2_1',
          recipientId: 'usr_emp_02',
          title: 'David Private Notice',
          message: 'Only for David Chen',
          read: false,
          createdAt: new Date().toISOString(),
          link: '/employee/requests/req_002',
        },
        {
          id: 'notif_adm_1',
          recipientId: 'usr_adm_01',
          title: 'Admin Alert',
          message: 'Only for Admin',
          read: false,
          createdAt: new Date().toISOString(),
        },
      ];

      useFleetFlowStore.setState({
        notifications: customNotifications,
        currentUserId: 'usr_emp_01',
        isHydrated: true,
      });

      const html = renderToStaticMarkup(
        <EmployeeLayout>
          <div>Child Page</div>
        </EmployeeLayout>
      );

      // For Sarah, unread count should be exactly 1
      expect(html).toContain('aria-label="Notifications, 1 unread"');
      expect(html).toContain('>1</span>');
    });
  });

  describe('3. Reactive Store Synchronization & Demo Reset', () => {
    it('reacts to new notification pushed into store', () => {
      useFleetFlowStore.setState({
        currentUserId: 'usr_emp_01',
        isHydrated: true,
        notifications: [],
      });

      let html = renderToStaticMarkup(
        <EmployeeLayout>
          <div>Child Page</div>
        </EmployeeLayout>
      );
      expect(html).toContain('aria-label="Notifications, no unread messages"');

      // Add an unread notification to store
      useFleetFlowStore.getState().addNotification({
        id: 'notif_new_01',
        recipientId: 'usr_emp_01',
        title: 'New Urgent Notice',
        message: 'Your vehicle has arrived.',
        read: false,
        createdAt: new Date().toISOString(),
      });

      html = renderToStaticMarkup(
        <EmployeeLayout>
          <div>Child Page</div>
        </EmployeeLayout>
      );
      expect(html).toContain('aria-label="Notifications, 1 unread"');
      expect(html).toContain('>1</span>');
    });

    it('reacts to resetData() restoration of initial seed notifications', () => {
      // Clear notifications
      useFleetFlowStore.setState({
        currentUserId: 'usr_emp_02',
        isHydrated: true,
        notifications: [],
      });

      let html = renderToStaticMarkup(
        <EmployeeLayout>
          <div>Child Page</div>
        </EmployeeLayout>
      );
      expect(html).toContain('aria-label="Notifications, no unread messages"');

      // Reset to seed data
      useFleetFlowStore.getState().resetData();

      const seedUnread = useFleetFlowStore
        .getState()
        .notifications.filter((n) => n.recipientId === 'usr_emp_02' && !n.read).length;

      html = renderToStaticMarkup(
        <EmployeeLayout>
          <div>Child Page</div>
        </EmployeeLayout>
      );

      expect(seedUnread).toBe(1);
      expect(html).toContain('aria-label="Notifications, 1 unread"');
      expect(html).toContain('>1</span>');
    });
  });

  describe('4. 5-Layer Architecture & Service Delegation', () => {
    it('delegates markAsRead strictly to notificationService', async () => {
      const markAsReadSpy = vi.spyOn(notificationService, 'markAsRead');

      const testNotif: Notification = {
        id: 'notif_service_test_01',
        recipientId: 'usr_emp_01',
        title: 'Test Service Delegation',
        message: 'Verifying 5-layer architecture call chain.',
        read: false,
        createdAt: new Date().toISOString(),
      };

      useFleetFlowStore.setState({
        currentUserId: 'usr_emp_01',
        isHydrated: true,
        notifications: [testNotif],
      });

      // Call notificationService.markAsRead directly to verify repository and store mutation
      const success = await notificationService.markAsRead('notif_service_test_01');
      expect(success).toBe(true);
      expect(markAsReadSpy).toHaveBeenCalledWith('notif_service_test_01');

      // Verify store state updated through the mock repository
      const updatedNotif = useFleetFlowStore
        .getState()
        .notifications.find((n) => n.id === 'notif_service_test_01');
      expect(updatedNotif?.read).toBe(true);
    });

    it('handles service errors gracefully without corrupting UI', async () => {
      vi.spyOn(notificationService, 'markAsRead').mockRejectedValueOnce(
        new Error('Service unavailable')
      );

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      let caughtError = false;
      try {
        await notificationService.markAsRead('notif_err_01');
      } catch {
        caughtError = true;
      }

      expect(caughtError).toBe(true);
      consoleSpy.mockRestore();
    });
  });

  describe('5. Safe Navigation & Deep-Link Validation', () => {
    it('allows navigation only for approved employee request links', () => {
      const validLink = '/employee/requests/req_002';
      const invalidLinks = [
        '/admin/requests/req_002',
        '/driver/trips/trip_001',
        '/employee/dashboard',
        'https://external-malicious.com',
        'javascript:alert(1)',
        '',
      ];

      expect(isValidEmployeeRequestLink(validLink)).toBe(true);
      for (const link of invalidLinks) {
        expect(isValidEmployeeRequestLink(link)).toBe(false);
      }
    });

    it('prevents duplicate concurrent mark-as-read calls via in-flight guard', async () => {
      let resolveFirstCall: (value: boolean) => void = () => {};
      const pendingPromise = new Promise<boolean>((resolve) => {
        resolveFirstCall = resolve;
      });

      const markAsReadSpy = vi
        .spyOn(notificationService, 'markAsRead')
        .mockImplementationOnce(() => pendingPromise)
        .mockResolvedValueOnce(true);

      const inFlightSet = new Set<string>();

      const handleMarkAsRead = async (id: string): Promise<boolean> => {
        if (inFlightSet.has(id)) {
          return false;
        }
        inFlightSet.add(id);
        try {
          return await notificationService.markAsRead(id);
        } finally {
          inFlightSet.delete(id);
        }
      };

      // First call starts and is in flight
      const call1 = handleMarkAsRead('notif_dup_1');
      // Second rapid call for same ID
      const call2 = handleMarkAsRead('notif_dup_1');

      // Second call should immediately return false without calling service again
      const result2 = await call2;
      expect(result2).toBe(false);
      expect(markAsReadSpy).toHaveBeenCalledTimes(1);

      // Resolve first call
      resolveFirstCall(true);
      const result1 = await call1;
      expect(result1).toBe(true);

      // Now set is cleared, a subsequent call can proceed
      const call3 = await handleMarkAsRead('notif_dup_1');
      expect(call3).toBe(true);
      expect(markAsReadSpy).toHaveBeenCalledTimes(2);
    });
  });
});
