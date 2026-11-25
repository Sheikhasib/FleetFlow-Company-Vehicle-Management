import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useFleetFlowStore } from '@/stores/fleetflow-store';
import { tripService } from '@/services/trip-service';
import { TripLegStatus } from '@/types/domain';

// Stateful React hook harness for testing interactive client page components in Node
const hookStore = new Map<string, unknown[]>();
let currentPath = 'root';
let hookCursor = 0;

function resetHookStore() {
  hookStore.clear();
  currentPath = 'root';
  hookCursor = 0;
}

vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react');

  function getComponentStates() {
    let states = hookStore.get(currentPath);
    if (!states) {
      states = [];
      hookStore.set(currentPath, states);
    }
    return states;
  }

  return {
    ...actual,
    useState: <T,>(initialState: T | (() => T)): [T, React.Dispatch<React.SetStateAction<T>>] => {
      const states = getComponentStates();
      const idx = hookCursor++;
      if (!(idx in states)) {
        states[idx] =
          typeof initialState === 'function' ? (initialState as () => T)() : initialState;
      }
      const key = currentPath;
      const setState: React.Dispatch<React.SetStateAction<T>> = (value) => {
        const targetStates = hookStore.get(key) || [];
        const prev = targetStates[idx] as T;
        targetStates[idx] =
          typeof value === 'function' ? (value as (prevState: T) => T)(prev) : value;
        hookStore.set(key, targetStates);
      };
      return [states[idx] as T, setState];
    },
    useMemo: <T,>(factory: () => T): T => factory(),
    useCallback: <T extends (...args: never[]) => unknown>(fn: T): T => fn,
    useRef: <T,>(initialValue: T) => {
      const states = getComponentStates();
      const idx = hookCursor++;
      if (!(idx in states)) {
        states[idx] = { current: initialValue };
      }
      return states[idx] as React.MutableRefObject<T>;
    },
    useEffect: () => {},
    useContext: <T,>(ctx: React.Context<T> & { _currentValue?: T }) =>
      ctx && '_currentValue' in ctx ? (ctx._currentValue as T) : (undefined as T),
    useId: () => 'test-id',
  };
});

vi.mock('lucide-react', () => {
  const icon = (name: string) =>
    function MockIcon(props: Record<string, unknown>) {
      return React.createElement('svg', { 'data-icon': name, ...props });
    };
  return {
    Navigation: icon('Navigation'),
    Car: icon('Car'),
    User: icon('User'),
    Users: icon('Users'),
    Clock: icon('Clock'),
    CheckCircle2: icon('CheckCircle2'),
    AlertCircle: icon('AlertCircle'),
    Search: icon('Search'),
    Filter: icon('Filter'),
    ArrowRight: icon('ArrowRight'),
    ShieldAlert: icon('ShieldAlert'),
    Calendar: icon('Calendar'),
    Check: icon('Check'),
    X: icon('X'),
    FolderSearch: icon('FolderSearch'),
    Loader2: icon('Loader2'),
  };
});

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => React.createElement('a', { href, ...props }, children),
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

import AdminTripMonitoringPage from '@/app/admin/trips/page';

interface CapturedInteractive {
  tag: string;
  text: string;
  onClick?: (e?: { stopPropagation: () => void }) => unknown;
}

interface EvaluatedTree {
  text: string;
  buttons: CapturedInteractive[];
}

function renderStatefulTree(element: React.ReactNode): EvaluatedTree {
  const buttons: CapturedInteractive[] = [];

  function extractText(node: React.ReactNode): string {
    if (node == null || typeof node === 'boolean') return '';
    if (typeof node === 'string' || typeof node === 'number') return String(node);
    if (Array.isArray(node)) return node.map(extractText).join(' ');
    if (React.isValidElement<{ children?: React.ReactNode }>(node)) {
      return extractText(node.props.children);
    }
    return '';
  }

  function walk(node: React.ReactNode, path: string): string {
    if (node == null || typeof node === 'boolean') return '';
    if (typeof node === 'string' || typeof node === 'number') return String(node);
    if (Array.isArray(node)) {
      return node.map((child, i) => walk(child, `${path}.${i}`)).join(' ');
    }
    if (!React.isValidElement<Record<string, unknown>>(node)) {
      return '';
    }

    const type = node.type as unknown;
    const props = node.props || {};

    if (typeof type === 'symbol') {
      return walk(props.children as React.ReactNode, `${path}.frag`);
    }

    if (typeof type === 'function') {
      const prevPath = currentPath;
      const prevCursor = hookCursor;
      currentPath = path;
      hookCursor = 0;
      const rendered = (type as (p: Record<string, unknown>) => React.ReactNode)(props);
      currentPath = prevPath;
      hookCursor = prevCursor;
      return walk(rendered, `${path}.fn`);
    }

    if (
      typeof type === 'object' &&
      type !== null &&
      'render' in type &&
      typeof (type as { render?: unknown }).render === 'function'
    ) {
      const prevPath = currentPath;
      const prevCursor = hookCursor;
      currentPath = path;
      hookCursor = 0;
      const rendered = (
        type as { render: (p: Record<string, unknown>, ref: null) => React.ReactNode }
      ).render(props, null);
      currentPath = prevPath;
      hookCursor = prevCursor;
      return walk(rendered, `${path}.fwd`);
    }

    const innerText = walk(props.children as React.ReactNode, `${path}.${String(type)}`);
    if (
      typeof type === 'string' &&
      (type === 'button' || type === 'tr') &&
      typeof props.onClick === 'function'
    ) {
      buttons.push({
        tag: type,
        text: innerText.replace(/\s+/g, ' ').trim() || extractText(props.children as React.ReactNode),
        onClick: props.onClick as CapturedInteractive['onClick'],
      });
    }
    return innerText;
  }

  const text = walk(element, 'root').replace(/\s+/g, ' ').trim();
  return { text, buttons };
}

describe('AdminTripMonitoringPage — Status Control Modal & Wording (FND-006)', () => {
  beforeEach(() => {
    resetHookStore();
    useFleetFlowStore.getState().resetData();
    useFleetFlowStore.setState({ isHydrated: true, currentUserId: 'usr_adm_01' });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('opens trip status modal, displays updated admin controls, and updates admin-specific feedback across all six actions', async () => {
    const updateLegStatus = (legId: string, nextStatus: TripLegStatus) => {
      useFleetFlowStore.setState((state) => ({
        tripLegs: state.tripLegs.map((leg) =>
          leg.id === legId ? { ...leg, status: nextStatus } : leg
        ),
      }));
    };

    const acceptSpy = vi
      .spyOn(tripService, 'acceptTrip')
      .mockImplementation(async (legId) => {
        updateLegStatus(legId, 'ACCEPTED');
        return useFleetFlowStore.getState().tripLegs.find((l) => l.id === legId)!;
      });
    const arriveSpy = vi
      .spyOn(tripService, 'markArrivedAtPickup')
      .mockImplementation(async (legId) => {
        updateLegStatus(legId, 'ARRIVED_AT_PICKUP');
        return useFleetFlowStore.getState().tripLegs.find((l) => l.id === legId)!;
      });
    const pickupSpy = vi
      .spyOn(tripService, 'confirmPickup')
      .mockImplementation(async (legId) => {
        updateLegStatus(legId, 'PICKED_UP');
        return useFleetFlowStore.getState().tripLegs.find((l) => l.id === legId)!;
      });
    const startSpy = vi
      .spyOn(tripService, 'startTrip')
      .mockImplementation(async (legId) => {
        updateLegStatus(legId, 'IN_PROGRESS');
        return useFleetFlowStore.getState().tripLegs.find((l) => l.id === legId)!;
      });
    const dropoffSpy = vi
      .spyOn(tripService, 'confirmDropoff')
      .mockImplementation(async (legId) => {
        updateLegStatus(legId, 'DROPPED_OFF');
        return useFleetFlowStore.getState().tripLegs.find((l) => l.id === legId)!;
      });
    const completeSpy = vi
      .spyOn(tripService, 'completeTrip')
      .mockImplementation(async (legId) => {
        updateLegStatus(legId, 'COMPLETED');
        return useFleetFlowStore.getState().tripLegs.find((l) => l.id === legId)!;
      });

    // 1. Initial table render: modal is closed
    let tree = renderStatefulTree(<AdminTripMonitoringPage />);
    expect(tree.text).toContain('leg_003_out');
    expect(tree.text).not.toContain('Administrative Trip Status Controls');

    // 2. Click the row for leg_003_out (starts in ASSIGNED) to open the modal
    const legRow = tree.buttons.find((b) => b.tag === 'tr' && b.text.includes('leg_003_out'));
    expect(legRow).toBeDefined();
    legRow!.onClick!({ stopPropagation: () => {} });

    tree = renderStatefulTree(<AdminTripMonitoringPage />);
    expect(tree.text).toContain('Administrative Trip Status Controls');
    expect(tree.text).toContain(
      'Advance trip milestone status on behalf of operations. Updates synchronize across Employee and Driver portals.'
    );
    expect(tree.text).not.toContain('Driver Milestone Confirmation & Progression');
    expect(tree.text).not.toContain('Confirm Driver Accepted');

    const steps = [
      {
        buttonLabel: 'Mark Trip Accepted',
        spy: acceptSpy,
        expectedFeedback: 'Trip status updated to ACCEPTED by administrator.',
      },
      {
        buttonLabel: 'Confirm Arrived at Pickup',
        spy: arriveSpy,
        expectedFeedback: 'Trip status updated to ARRIVED AT PICKUP by administrator.',
      },
      {
        buttonLabel: 'Confirm Passengers Boarded',
        spy: pickupSpy,
        expectedFeedback: 'Trip status updated to PICKED UP (passengers boarded) by administrator.',
      },
      {
        buttonLabel: 'Start Transit (In Progress)',
        spy: startSpy,
        expectedFeedback: 'Trip status updated to IN PROGRESS by administrator.',
      },
      {
        buttonLabel: 'Confirm Arrival & Drop-Off',
        spy: dropoffSpy,
        expectedFeedback: 'Trip status updated to DROPPED OFF (arrival confirmed) by administrator.',
      },
      {
        buttonLabel: 'Finalize & Mark Completed',
        spy: completeSpy,
        expectedFeedback: 'Trip finalized and marked COMPLETED by administrator.',
      },
    ];

    for (const step of steps) {
      const actionBtn = tree.buttons.find(
        (b) => b.tag === 'button' && b.text.includes(step.buttonLabel)
      );
      expect(actionBtn, `Expected modal button "${step.buttonLabel}"`).toBeDefined();

      await actionBtn!.onClick!();
      expect(step.spy).toHaveBeenCalledWith('leg_003_out', 'usr_adm_01');

      tree = renderStatefulTree(<AdminTripMonitoringPage />);
      expect(tree.text).toContain(step.expectedFeedback);
      expect(tree.text).not.toContain('Trip marked ACCEPTED by driver.');
      expect(tree.text).not.toContain('Driver reported ARRIVED AT PICKUP.');
      expect(tree.text).not.toContain('Driver confirmed arrival at destination');
    }

    expect(tree.text).toContain('Journey Completed & Closed');
  });
});
