import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import LoginPage from '@/app/(auth)/login/page';
import { GlobalDemoToolbar } from '@/components/shared/global-demo-toolbar';
import AdminTripMonitoringPage from '@/app/admin/trips/page';
import { useFleetFlowStore } from '@/stores/fleetflow-store';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
  usePathname: () => '/login',
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

describe('Stage 5.7 UI Label & Copy Verification (FND-005 & FND-006)', () => {
  beforeEach(() => {
    useFleetFlowStore.getState().resetData();
    useFleetFlowStore.setState({ isHydrated: true, currentUserId: 'usr_adm_01' });
  });

  it('LoginPage displays neutral FleetFlow portal labels without stale Phase 3A/4/5 Preview strings', () => {
    const html = renderToStaticMarkup(<LoginPage />);

    expect(html).toContain('FleetFlow Corporate Fleet Demo');
    expect(html).toContain('Employee Portal');
    expect(html).toContain('Admin Portal');
    expect(html).toContain('Driver Portal');
    expect(html).toContain('Nusrat Jahan');
    expect(html).toContain('Mohammad Arif Hasan');
    expect(html).toContain('Abdul Karim');

    expect(html).not.toContain('Phase 3A');
    expect(html).not.toContain('Phase 4 Preview');
    expect(html).not.toContain('Phase 5 Preview');
  });

  it('GlobalDemoToolbar displays neutral demo labels and persona groups without stale phase strings', () => {
    const html = renderToStaticMarkup(<GlobalDemoToolbar />);

    expect(html).toContain('FleetFlow Demo');
    expect(html).toContain('Interactive Demo');
    expect(html).toContain('label="Employees"');
    expect(html).toContain('label="Admin"');
    expect(html).toContain('label="Driver"');
    expect(html).toContain('Reset Demo');

    expect(html).not.toContain('Phase 3A');
    expect(html).not.toContain('Phase 4 Preview');
    expect(html).not.toContain('Phase 5 Preview');
  });

  it('AdminTripMonitoringPage renders admin trip monitoring view cleanly', () => {
    const html = renderToStaticMarkup(<AdminTripMonitoringPage />);

    expect(html).toContain('Trip Monitoring Center');
    expect(html).not.toContain('Trip marked ACCEPTED by driver.');
    expect(html).not.toContain('Confirm Driver Accepted');
  });
});
