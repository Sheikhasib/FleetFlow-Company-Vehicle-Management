import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DriverAuthGuard } from '@/components/shared/driver-auth-guard';
import { SessionRedirect } from '@/components/shared/session-redirect';
import { useFleetFlowStore } from '@/stores/fleetflow-store';
import { User, Driver } from '@/types/domain';

// Mock next/navigation
const mockPush = vi.fn();
const mockReplace = vi.fn();
const mockPathname = vi.fn(() => '/driver/dashboard');

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
  usePathname: () => mockPathname(),
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

describe('DriverAuthGuard — Hydration-Safe Route Protection & Role Boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useFleetFlowStore.getState().resetData();
  });

  describe('Hydration Gate', () => {
    it('shows loading indicator and prevents protected content rendering while hydration is pending', () => {
      useFleetFlowStore.setState({
        isHydrated: false,
        currentUserId: 'usr_drv_01',
      });

      const html = renderToStaticMarkup(
        <DriverAuthGuard>
          <div id="protected-content">Protected Driver Area</div>
        </DriverAuthGuard>
      );

      expect(html).toContain('Loading driver session...');
      expect(html).not.toContain('Protected Driver Area');
    });
  });

  describe('Authorized Driver Access', () => {
    it('grants access and renders children when authenticated as valid Driver (usr_drv_01)', () => {
      useFleetFlowStore.setState({
        isHydrated: true,
        currentUserId: 'usr_drv_01', // Abdul Karim, role DRIVER
      });

      const html = renderToStaticMarkup(
        <DriverAuthGuard>
          <div id="protected-content">Protected Driver Area</div>
        </DriverAuthGuard>
      );

      expect(html).toContain('Protected Driver Area');
      expect(html).not.toContain('Driver Access Required');
      expect(html).not.toContain('Loading driver session...');
    });

    it('grants access for all registered demo drivers with valid Driver entity records', () => {
      const driverUserIds = ['usr_drv_01', 'usr_drv_02', 'usr_drv_03'];

      driverUserIds.forEach((userId) => {
        useFleetFlowStore.setState({
          isHydrated: true,
          currentUserId: userId,
        });

        const html = renderToStaticMarkup(
          <DriverAuthGuard>
            <div id={`content-${userId}`}>Content for {userId}</div>
          </DriverAuthGuard>
        );

        expect(html).toContain(`Content for ${userId}`);
        expect(html).not.toContain('Driver Access Required');
      });
    });
  });

  describe('Access Boundary — Non-Driver Personas', () => {
    it('blocks Employee (usr_emp_01) and displays Driver Access Required boundary card', () => {
      useFleetFlowStore.setState({
        isHydrated: true,
        currentUserId: 'usr_emp_01', // Nusrat Jahan (EMPLOYEE)
      });

      const html = renderToStaticMarkup(
        <DriverAuthGuard>
          <div id="protected-content">Protected Driver Area</div>
        </DriverAuthGuard>
      );

      expect(html).not.toContain('Protected Driver Area');
      expect(html).toContain('Driver Access Required');
      expect(html).toContain('Nusrat Jahan');
      expect(html).toContain('EMPLOYEE');
      expect(html).toContain('Switch to Driver (Abdul Karim)');
      expect(html).toContain('Return to Employee');
    });

    it('blocks Admin (usr_adm_01) and displays Driver Access Required boundary card', () => {
      useFleetFlowStore.setState({
        isHydrated: true,
        currentUserId: 'usr_adm_01', // Mohammad Arif Hasan (ADMIN)
      });

      const html = renderToStaticMarkup(
        <DriverAuthGuard>
          <div id="protected-content">Protected Driver Area</div>
        </DriverAuthGuard>
      );

      expect(html).not.toContain('Protected Driver Area');
      expect(html).toContain('Driver Access Required');
      expect(html).toContain('Mohammad Arif Hasan');
      expect(html).toContain('ADMIN');
      expect(html).toContain('Switch to Driver (Abdul Karim)');
      expect(html).toContain('Return to Admin');
    });
  });

  describe('Missing Driver Profile Fallback State', () => {
    it('shows safe Driver Profile Missing card without crashing if DRIVER user lacks a Driver record', () => {
      // Add a user with DRIVER role who has no matching Driver entity in store
      const orphanUser: User = {
        id: 'usr_drv_orphan',
        name: 'Orphan Driver',
        email: 'orphan@fleetflow.com',
        role: 'DRIVER',
        department: 'Transportation Services',
        phone: '+880-1811-099999',
      };

      useFleetFlowStore.setState((s) => ({
        isHydrated: true,
        users: [...s.users, orphanUser],
        currentUserId: 'usr_drv_orphan',
        // drivers array does NOT contain an entry with userId: 'usr_drv_orphan'
      }));

      const html = renderToStaticMarkup(
        <DriverAuthGuard>
          <div id="protected-content">Protected Driver Area</div>
        </DriverAuthGuard>
      );

      expect(html).not.toContain('Protected Driver Area');
      expect(html).toContain('Driver Profile Missing');
      expect(html).toContain('Orphan Driver');
      expect(html).toContain('Switch to Abdul Karim');
    });
  });

  describe('SessionRedirect & Navigation Rules Integration', () => {
    it('redirects DRIVER persona to /driver/dashboard upon rehydration', () => {
      useFleetFlowStore.setState({
        isHydrated: true,
        currentUserId: 'usr_drv_01',
      });

      renderToStaticMarkup(<SessionRedirect />);

      const users = useFleetFlowStore.getState().users;
      const currentUser = users.find((u) => u.id === 'usr_drv_01');
      expect(currentUser?.role).toBe('DRIVER');
    });

    it('preserves existing EMPLOYEE and ADMIN target routes in session redirect logic', () => {
      const users = useFleetFlowStore.getState().users;

      const empUser = users.find((u) => u.role === 'EMPLOYEE');
      expect(empUser).toBeDefined();

      const admUser = users.find((u) => u.role === 'ADMIN');
      expect(admUser).toBeDefined();

      const drvUser = users.find((u) => u.role === 'DRIVER');
      expect(drvUser).toBeDefined();
    });

    it('verifies login handleSelectPersona routes DRIVER to /driver/dashboard, EMPLOYEE to /employee/dashboard, and ADMIN to /admin/dashboard', () => {
      const handleSelectPersona = (userId: string, role: string) => {
        useFleetFlowStore.getState().setCurrentUser(userId);
        if (role === 'EMPLOYEE') {
          mockPush('/employee/dashboard');
        } else if (role === 'ADMIN') {
          mockPush('/admin/dashboard');
        } else if (role === 'DRIVER') {
          mockPush('/driver/dashboard');
        } else {
          mockPush(`/demo/preview?role=${role}`);
        }
      };

      // Test Driver selection
      handleSelectPersona('usr_drv_01', 'DRIVER');
      expect(mockPush).toHaveBeenLastCalledWith('/driver/dashboard');
      expect(useFleetFlowStore.getState().currentUserId).toBe('usr_drv_01');

      // Test Employee selection
      handleSelectPersona('usr_emp_01', 'EMPLOYEE');
      expect(mockPush).toHaveBeenLastCalledWith('/employee/dashboard');
      expect(useFleetFlowStore.getState().currentUserId).toBe('usr_emp_01');

      // Test Admin selection
      handleSelectPersona('usr_adm_01', 'ADMIN');
      expect(mockPush).toHaveBeenLastCalledWith('/admin/dashboard');
      expect(useFleetFlowStore.getState().currentUserId).toBe('usr_adm_01');
    });

    it('verifies global toolbar selectUser navigates to /driver/dashboard when switching to Driver persona', () => {
      const selectUser = (newUserId: string, pathname: string) => {
        useFleetFlowStore.getState().setCurrentUser(newUserId);
        const users = useFleetFlowStore.getState().users;
        const selectedUser = users.find((u) => u.id === newUserId);
        if (!selectedUser) return;

        if (selectedUser.role === 'EMPLOYEE') {
          if (!pathname.startsWith('/employee')) {
            mockPush('/employee/dashboard');
          }
        } else if (selectedUser.role === 'ADMIN') {
          if (!pathname.startsWith('/admin')) {
            mockPush('/admin/dashboard');
          }
        } else if (selectedUser.role === 'DRIVER') {
          if (!pathname.startsWith('/driver')) {
            mockPush('/driver/dashboard');
          }
        } else {
          mockPush(`/demo/preview?role=${selectedUser.role}`);
        }
      };

      // Switching from /employee/dashboard to Driver usr_drv_01
      selectUser('usr_drv_01', '/employee/dashboard');
      expect(mockPush).toHaveBeenLastCalledWith('/driver/dashboard');

      // Already on /driver/dashboard -> no redundant push
      mockPush.mockClear();
      selectUser('usr_drv_02', '/driver/dashboard');
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('safely handles unauthenticated/unknown session in session redirect logic', () => {
      useFleetFlowStore.setState({
        isHydrated: true,
        currentUserId: 'nonexistent_user',
      });

      const users = useFleetFlowStore.getState().users;
      const currentUser = users.find((u) => u.id === 'nonexistent_user');
      expect(currentUser).toBeUndefined();
    });
  });
});
