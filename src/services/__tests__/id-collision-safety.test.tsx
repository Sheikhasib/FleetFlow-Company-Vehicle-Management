import * as React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { tripService } from '../trip-service';
import { assignmentService } from '../assignment-service';
import { offlineSyncService } from '../offline-sync-service';
import { notificationService } from '../notification-service';
import { useFleetFlowStore } from '@/stores/fleetflow-store';
import { generateUniqueId } from '@/lib/utils/id';
import { selectActivityTimeline } from '@/features/vehicle-requests/selectors/activity-selectors';
import { selectEmployeeNotifications } from '@/features/notifications/selectors/notification-selectors';
import { ActivityTimeline } from '@/features/vehicle-requests/components/activity-timeline';
import { NotificationFeed } from '@/features/notifications/components/notification-feed';

describe('Collision-Safe ID Generation — ActivityLog & Notification Uniqueness (FND-002)', () => {
  beforeEach(() => {
    offlineSyncService.resetConcurrencyGuard();
    useFleetFlowStore.getState().resetData();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('1. generateUniqueId produces strictly unique IDs across rapid same-millisecond calls even under frozen time and fixed Math.random', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-29T10:00:00.000Z'));
    vi.spyOn(Math, 'random').mockReturnValue(0.123456789);

    const ids: string[] = [];
    for (let i = 0; i < 100; i++) {
      ids.push(generateUniqueId('act'));
    }

    expect(new Set(ids).size).toBe(100);
    expect(ids.every((id) => id.startsWith('act_'))).toBe(true);
    expect(generateUniqueId('notif', 'comp')).toMatch(/^notif_\d+_[a-z0-9]+_comp$/);
  });

  it('2. TripService creates collision-free ActivityLog and Notification IDs across all 6 lifecycle transitions within the same millisecond', async () => {
    vi.useFakeTimers();
    const frozenNow = new Date('2026-11-29T10:00:00.000Z');
    vi.setSystemTime(frozenNow);

    // Seed req_003 has leg_003_out (ASSIGNED, drv_01 -> usr_drv_01, requester usr_emp_03)
    const initialLogIds = new Set(useFleetFlowStore.getState().activityLogs.map((l) => l.id));
    const initialNotifIds = new Set(useFleetFlowStore.getState().notifications.map((n) => n.id));

    await tripService.acceptTrip('leg_003_out', 'usr_drv_01');
    await tripService.markArrivedAtPickup('leg_003_out', 'usr_drv_01');
    await tripService.confirmPickup('leg_003_out', 'usr_drv_01');
    await tripService.startTrip('leg_003_out', 'usr_drv_01');
    await tripService.confirmDropoff('leg_003_out', 'usr_drv_01');
    await tripService.completeTrip('leg_003_out', 'usr_drv_01');

    const state = useFleetFlowStore.getState();
    const createdLogs = state.activityLogs.filter((l) => !initialLogIds.has(l.id));
    const createdNotifs = state.notifications.filter((n) => !initialNotifIds.has(n.id));

    // 6 milestone logs + 1 REQUEST_COMPLETED log = 7 logs
    expect(createdLogs).toHaveLength(7);
    expect(new Set(createdLogs.map((l) => l.id)).size).toBe(7);
    expect(createdLogs.every((l) => l.id.startsWith('act_'))).toBe(true);

    // 6 milestone notifications + 1 REQUEST_COMPLETED notification = 7 notifications
    expect(createdNotifs).toHaveLength(7);
    expect(new Set(createdNotifs.map((n) => n.id)).size).toBe(7);
    expect(createdNotifs.every((n) => n.id.startsWith('notif_'))).toBe(true);

    // Verify marking one same-millisecond notification as read affects ONLY that single record
    const targetNotifId = createdNotifs[0].id;
    await notificationService.markAsRead(targetNotifId);
    const afterRead = useFleetFlowStore
      .getState()
      .notifications.filter((n) => !initialNotifIds.has(n.id));
    expect(afterRead.filter((n) => n.read).map((n) => n.id)).toEqual([targetNotifId]);
    expect(afterRead.filter((n) => !n.read)).toHaveLength(6);

    // Verify zero React key collisions in rendered ActivityTimeline & NotificationFeed
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const timelineItems = selectActivityTimeline(
      { activityLogs: state.activityLogs, users: state.users, tripLegs: state.tripLegs },
      'req_003'
    );
    const notifItems = selectEmployeeNotifications(
      state.notifications,
      'usr_emp_03',
      frozenNow.toISOString()
    );

    expect(new Set(timelineItems.map((i) => i.id)).size).toBe(timelineItems.length);
    expect(new Set(notifItems.map((i) => i.id)).size).toBe(notifItems.length);

    const timelineHtml = renderToStaticMarkup(<ActivityTimeline items={timelineItems} />);
    const notifHtml = renderToStaticMarkup(
      <NotificationFeed
        items={notifItems}
        selectedFilter="ALL"
        counts={{
          all: notifItems.length,
          unread: notifItems.filter((n) => !n.read).length,
          read: notifItems.filter((n) => n.read).length,
        }}
        onMarkAsRead={() => {}}
        onNavigateRequest={() => {}}
      />
    );
    expect(timelineHtml).toContain('Request Completed');
    expect(notifHtml).toContain('Transportation Request Completed');
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('3. OfflineSyncService rapid queue replay within the same millisecond produces strictly unique ActivityLog and Notification IDs', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-29T11:00:00.000Z'));

    const initialLogIds = new Set(useFleetFlowStore.getState().activityLogs.map((l) => l.id));
    const initialNotifIds = new Set(useFleetFlowStore.getState().notifications.map((n) => n.id));

    useFleetFlowStore.setState({ isSimulatedOffline: true });
    offlineSyncService.enqueueAction({
      tripLegId: 'leg_003_out',
      actorUserId: 'usr_drv_01',
      actionType: 'ACCEPT_TRIP',
      currentStatus: 'ASSIGNED',
      targetStatus: 'ACCEPTED',
    });
    offlineSyncService.enqueueAction({
      tripLegId: 'leg_003_out',
      actorUserId: 'usr_drv_01',
      actionType: 'MARK_ARRIVED',
      currentStatus: 'ACCEPTED',
      targetStatus: 'ARRIVED_AT_PICKUP',
    });
    offlineSyncService.enqueueAction({
      tripLegId: 'leg_003_out',
      actorUserId: 'usr_drv_01',
      actionType: 'CONFIRM_PICKUP',
      currentStatus: 'ARRIVED_AT_PICKUP',
      targetStatus: 'PICKED_UP',
    });

    // Reconnect and replay all 3 actions sequentially in the exact same frozen millisecond
    useFleetFlowStore.setState({ isSimulatedOffline: false });
    const res = await offlineSyncService.sync('usr_drv_01');
    expect(res).toEqual({ processed: 3, succeeded: 3, failed: 0, errors: [] });

    const state = useFleetFlowStore.getState();
    const replayedLogs = state.activityLogs.filter((l) => !initialLogIds.has(l.id));
    const replayedNotifs = state.notifications.filter((n) => !initialNotifIds.has(n.id));

    expect(replayedLogs).toHaveLength(3);
    expect(new Set(replayedLogs.map((l) => l.id)).size).toBe(3);

    expect(replayedNotifs).toHaveLength(3);
    expect(new Set(replayedNotifs.map((n) => n.id)).size).toBe(3);
  });

  it('4. AssignmentService rapid same-millisecond multi-leg assignments produce unique Assignment, ActivityLog, and Notification IDs', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-29T12:00:00.000Z'));

    const initialAsgIds = new Set(useFleetFlowStore.getState().assignments.map((a) => a.id));
    const initialLogIds = new Set(useFleetFlowStore.getState().activityLogs.map((l) => l.id));
    const initialNotifIds = new Set(useFleetFlowStore.getState().notifications.map((n) => n.id));

    // Seed req_002 is APPROVED round-trip (leg_002_out, leg_002_ret)
    await assignmentService.createAssignment('leg_002_out', 'veh_03', 'drv_03', 'usr_adm_01');
    await assignmentService.createAssignment('leg_002_ret', 'veh_03', 'drv_03', 'usr_adm_01');

    const state = useFleetFlowStore.getState();
    const createdAsgs = state.assignments.filter((a) => !initialAsgIds.has(a.id));
    const createdLogs = state.activityLogs.filter((l) => !initialLogIds.has(l.id));
    const createdNotifs = state.notifications.filter((n) => !initialNotifIds.has(n.id));

    expect(createdAsgs).toHaveLength(2);
    expect(new Set(createdAsgs.map((a) => a.id)).size).toBe(2);
    expect(createdAsgs.every((a) => a.id.startsWith('asg_'))).toBe(true);

    expect(createdLogs).toHaveLength(2);
    expect(new Set(createdLogs.map((l) => l.id)).size).toBe(2);
    expect(createdLogs.every((l) => l.id.startsWith('act_'))).toBe(true);

    // 2 assignments * (1 driver + 1 employee notification) = 4 notifications
    expect(createdNotifs).toHaveLength(4);
    expect(new Set(createdNotifs.map((n) => n.id)).size).toBe(4);
    expect(createdNotifs.filter((n) => n.id.endsWith('_drv'))).toHaveLength(2);
    expect(createdNotifs.filter((n) => n.id.endsWith('_emp'))).toHaveLength(2);
  });
});
