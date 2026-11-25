import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AdminAuthGuard, getAdminGuardFallbackTarget } from '@/components/shared/admin-auth-guard';
import { DriverAuthGuard } from '@/components/shared/driver-auth-guard';
import { useFleetFlowStore } from '@/stores/fleetflow-store';

const mockPush = vi.fn();
const mockReplace = vi.fn();

interface CapturedButton {
  text: string;
  onClick?: () => void;
}

const capturedButtons: CapturedButton[] = [];

function extractNodeText(node: React.ReactNode): string {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractNodeText).join('');
  if (React.isValidElement<{ children?: React.ReactNode }>(node)) {
    return extractNodeText(node.props.children);
  }
  return '';
}

vi.mock('@/components/ui/button', async () => {
  const actual = await vi.importActual<typeof import('@/components/ui/button')>(
    '@/components/ui/button'
  );
  const ActualButton = actual.Button;
  const WrappedButton = React.forwardRef<HTMLButtonElement, React.ComponentProps<typeof ActualButton>>(
    (props, ref) => {
      capturedButtons.push({
        text: extractNodeText(props.children).trim(),
        onClick: props.onClick as (() => void) | undefined,
      });
      return <ActualButton ref={ref} {...props} />;
    }
  );
  WrappedButton.displayName = 'Button';
  return {
    ...actual,
    Button: WrappedButton,
  };
});

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
  usePathname: () => '/admin/dashboard',
}));

vi.mock('@/stores/fleetflow-store', async () => {
  const actual = await vi.importActual<typeof import('@/stores/fleetflow-store')>(
    '@/stores/fleetflow-store'
  );
  const store = actual.useFleetFlowStore;
  const useFleetFlowStoreMock = (selector?: (state: ReturnType<typeof store.getState>) => unknown) => {
    return selector ? selector(store.getState()) : store.getState();
  };
  Object.assign(useFleetFlowStoreMock, store);
  return {
    useFleetFlowStore: useFleetFlowStoreMock,
  };
});

describe('AdminAuthGuard — Role Authorization & Redirect Targets (FND-004)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedButtons.length = 0;
    useFleetFlowStore.getState().resetData();
  });

  it('shows loading state while store hydration is pending', () => {
    useFleetFlowStore.setState({ isHydrated: false, currentUserId: 'usr_adm_01' });

    const html = renderToStaticMarkup(
      <AdminAuthGuard>
        <div>Protected Admin Content</div>
      </AdminAuthGuard>
    );

    expect(html).toContain('Loading session...');
    expect(html).not.toContain('Protected Admin Content');
  });

  it('grants access to authenticated ADMIN users', () => {
    useFleetFlowStore.setState({ isHydrated: true, currentUserId: 'usr_adm_01' });

    const html = renderToStaticMarkup(
      <AdminAuthGuard>
        <div>Protected Admin Content</div>
      </AdminAuthGuard>
    );

    expect(html).toContain('Protected Admin Content');
    expect(html).not.toContain('Administrator Role Required');
  });

  it('directs denied DRIVER users to /driver/dashboard on clicking Return to Driver without redirect loop', () => {
    useFleetFlowStore.setState({ isHydrated: true, currentUserId: 'usr_drv_01' });

    const html = renderToStaticMarkup(
      <AdminAuthGuard>
        <div>Protected Admin Content</div>
      </AdminAuthGuard>
    );

    expect(html).not.toContain('Protected Admin Content');
    expect(html).toContain('Administrator Role Required');
    expect(html).toContain('Return to Driver');
    expect(html).not.toContain('Return to Login');
    expect(getAdminGuardFallbackTarget('DRIVER')).toEqual({
      label: 'Driver',
      href: '/driver/dashboard',
    });

    const returnToDriverBtn = capturedButtons.find((b) => b.text === 'Return to Driver');
    expect(returnToDriverBtn).toBeDefined();
    expect(returnToDriverBtn?.onClick).toBeTypeOf('function');

    returnToDriverBtn!.onClick!();
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith('/driver/dashboard');

    // Confirm /driver/dashboard admits the DRIVER user without a redirect loop
    const driverPortalHtml = renderToStaticMarkup(
      <DriverAuthGuard>
        <div>Driver Dashboard Content</div>
      </DriverAuthGuard>
    );
    expect(driverPortalHtml).toContain('Driver Dashboard Content');
  });

  it('preserves /employee/dashboard fallback navigation on clicking Return to Employee', () => {
    useFleetFlowStore.setState({ isHydrated: true, currentUserId: 'usr_emp_01' });

    const html = renderToStaticMarkup(
      <AdminAuthGuard>
        <div>Protected Admin Content</div>
      </AdminAuthGuard>
    );

    expect(html).not.toContain('Protected Admin Content');
    expect(html).toContain('Return to Employee');
    expect(getAdminGuardFallbackTarget('EMPLOYEE')).toEqual({
      label: 'Employee',
      href: '/employee/dashboard',
    });

    const returnToEmployeeBtn = capturedButtons.find((b) => b.text === 'Return to Employee');
    expect(returnToEmployeeBtn).toBeDefined();
    returnToEmployeeBtn!.onClick!();
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith('/employee/dashboard');
  });

  it('preserves /login fallback navigation for unauthenticated or unknown users', () => {
    useFleetFlowStore.setState({ isHydrated: true, currentUserId: 'usr_unknown' });

    const html = renderToStaticMarkup(
      <AdminAuthGuard>
        <div>Protected Admin Content</div>
      </AdminAuthGuard>
    );

    expect(html).not.toContain('Protected Admin Content');
    expect(html).toContain('Administrator Role Required');
    expect(html).toContain('Return to Login');
    expect(getAdminGuardFallbackTarget(undefined)).toEqual({
      label: 'Login',
      href: '/login',
    });

    const returnToLoginBtn = capturedButtons.find((b) => b.text === 'Return to Login');
    expect(returnToLoginBtn).toBeDefined();
    returnToLoginBtn!.onClick!();
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith('/login');
  });

  it('allows switching to Admin persona directly from the inline Access Boundary card', () => {
    useFleetFlowStore.setState({ isHydrated: true, currentUserId: 'usr_drv_01' });

    renderToStaticMarkup(
      <AdminAuthGuard>
        <div>Protected Admin Content</div>
      </AdminAuthGuard>
    );

    const switchBtn = capturedButtons.find((b) =>
      b.text.includes('Switch to Admin (Arif Hasan)')
    );
    expect(switchBtn).toBeDefined();
    switchBtn!.onClick!();

    expect(useFleetFlowStore.getState().currentUserId).toBe('usr_adm_01');
    const adminHtml = renderToStaticMarkup(
      <AdminAuthGuard>
        <div>Protected Admin Content</div>
      </AdminAuthGuard>
    );
    expect(adminHtml).toContain('Protected Admin Content');
  });
});
