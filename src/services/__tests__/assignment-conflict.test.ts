import { describe, it, expect, beforeEach } from 'vitest';
import { AssignmentService, TimeWindow } from '../assignment-service';
import { useFleetFlowStore } from '@/stores/fleetflow-store';

describe('AssignmentService — Conflict Detection Logic', () => {
  let assignmentService: AssignmentService;

  beforeEach(() => {
    assignmentService = new AssignmentService();
    // Reset Zustand store to deterministic fresh seed data before each test
    useFleetFlowStore.getState().resetData();
  });

  describe('Time-Window Overlap Pure Logic', () => {
    it('detects overlap when candidate starts during existing trip', () => {
      const existing: TimeWindow = {
        start: '2026-11-25T10:00:00Z',
        end: '2026-11-25T12:00:00Z',
      };
      const candidate: TimeWindow = {
        start: '2026-11-25T11:00:00Z',
        end: '2026-11-25T13:00:00Z',
      };
      expect(assignmentService.hasTimeOverlap(candidate, existing)).toBe(true);
    });

    it('detects overlap when candidate is completely contained inside existing trip', () => {
      const existing: TimeWindow = {
        start: '2026-11-25T10:00:00Z',
        end: '2026-11-25T14:00:00Z',
      };
      const candidate: TimeWindow = {
        start: '2026-11-25T11:00:00Z',
        end: '2026-11-25T12:00:00Z',
      };
      expect(assignmentService.hasTimeOverlap(candidate, existing)).toBe(true);
    });

    it('detects overlap when candidate completely engulfs existing trip', () => {
      const existing: TimeWindow = {
        start: '2026-11-25T11:00:00Z',
        end: '2026-11-25T13:00:00Z',
      };
      const candidate: TimeWindow = {
        start: '2026-11-25T09:00:00Z',
        end: '2026-11-25T15:00:00Z',
      };
      expect(assignmentService.hasTimeOverlap(candidate, existing)).toBe(true);
    });

    it('does not detect overlap when candidate ends before existing trip starts', () => {
      const existing: TimeWindow = {
        start: '2026-11-25T12:00:00Z',
        end: '2026-11-25T14:00:00Z',
      };
      const candidate: TimeWindow = {
        start: '2026-11-25T09:00:00Z',
        end: '2026-11-25T11:00:00Z',
      };
      expect(assignmentService.hasTimeOverlap(candidate, existing)).toBe(false);
    });

    it('does not detect overlap when candidate starts after existing trip ends', () => {
      const existing: TimeWindow = {
        start: '2026-11-25T10:00:00Z',
        end: '2026-11-25T12:00:00Z',
      };
      const candidate: TimeWindow = {
        start: '2026-11-25T13:00:00Z',
        end: '2026-11-25T15:00:00Z',
      };
      expect(assignmentService.hasTimeOverlap(candidate, existing)).toBe(false);
    });

    it('does not detect overlap for strictly adjacent back-to-back windows (end == start)', () => {
      const existing: TimeWindow = {
        start: '2026-11-25T10:00:00Z',
        end: '2026-11-25T12:00:00Z',
      };
      const candidate: TimeWindow = {
        start: '2026-11-25T12:00:00Z',
        end: '2026-11-25T14:00:00Z',
      };
      // startA < endB && endA > startB -> 12 < 12 is false!
      expect(assignmentService.hasTimeOverlap(candidate, existing)).toBe(false);
    });
  });

  describe('Resource Assignment Collision Checks Against Store', () => {
    it('detects vehicle conflict when assigning an already allocated vehicle in the same window', async () => {
      // In seed data: leg_004_out is assigned to veh_01 and drv_02
      const leg004 = useFleetFlowStore.getState().tripLegs.find((l) => l.id === 'leg_004_out')!;
      const legStart = new Date(leg004.scheduledDeparture).getTime();

      // targetWindow overlaps leg_004_out in an interval before leg_006_out departs
      const targetWindow: TimeWindow = {
        start: new Date(legStart + 10 * 60 * 1000).toISOString(),
        end: new Date(legStart + 40 * 60 * 1000).toISOString(),
      };

      // Check conflict for veh_01 with unassigned driver drv_01
      const result = await assignmentService.checkAssignmentConflict(
        targetWindow,
        'veh_01',
        'drv_01'
      );

      expect(result.hasConflict).toBe(true);
      expect(result.conflictingEntity).toBe('VEHICLE');
      expect(result.reason).toContain('veh_01');
    });

    it('detects driver conflict when assigning an already allocated driver in the same window', async () => {
      const leg004 = useFleetFlowStore.getState().tripLegs.find((l) => l.id === 'leg_004_out')!;
      const legStart = new Date(leg004.scheduledDeparture).getTime();
      const legEnd = new Date(leg004.scheduledArrival).getTime();

      const targetWindow: TimeWindow = {
        start: new Date(legStart + 15 * 60 * 1000).toISOString(),
        end: new Date(legEnd - 15 * 60 * 1000).toISOString(),
      };

      // Check conflict for available vehicle veh_03 with drv_02
      const result = await assignmentService.checkAssignmentConflict(
        targetWindow,
        'veh_03',
        'drv_02'
      );

      expect(result.hasConflict).toBe(true);
      expect(result.conflictingEntity).toBe('DRIVER');
      expect(result.reason).toContain('drv_02');
    });

    it('detects BOTH vehicle and driver conflicts when both are allocated', async () => {
      const leg004 = useFleetFlowStore.getState().tripLegs.find((l) => l.id === 'leg_004_out')!;
      const legStart = new Date(leg004.scheduledDeparture).getTime();
      const legEnd = new Date(leg004.scheduledArrival).getTime();

      const targetWindow: TimeWindow = {
        start: new Date(legStart + 10 * 60 * 1000).toISOString(),
        end: new Date(legEnd - 10 * 60 * 1000).toISOString(),
      };

      const result = await assignmentService.checkAssignmentConflict(
        targetWindow,
        'veh_01',
        'drv_02'
      );

      expect(result.hasConflict).toBe(true);
      expect(result.conflictingEntity).toBe('BOTH');
    });

    it('allows assignment of unallocated resources during the same window', async () => {
      const leg004 = useFleetFlowStore.getState().tripLegs.find((l) => l.id === 'leg_004_out')!;
      const legStart = new Date(leg004.scheduledDeparture).getTime();

      // Interval during leg_004_out where veh_03 and drv_01 are free (before leg_006_out departs)
      const targetWindow: TimeWindow = {
        start: new Date(legStart + 10 * 60 * 1000).toISOString(),
        end: new Date(legStart + 40 * 60 * 1000).toISOString(),
      };

      // veh_03 (Mercedes Sprinter) and drv_01 (Marcus Vance) are free during this window
      const result = await assignmentService.checkAssignmentConflict(
        targetWindow,
        'veh_03',
        'drv_01'
      );

      expect(result.hasConflict).toBe(false);
      expect(result.conflictingEntity).toBeUndefined();
    });
  });
});
