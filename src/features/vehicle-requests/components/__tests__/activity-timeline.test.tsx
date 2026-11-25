import { describe, it, expect } from 'vitest';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ActivityTimeline } from '../activity-timeline';
import { selectActivityTimeline } from '../../selectors/activity-selectors';
import { ActivityLog, User, TripLeg } from '@/types/domain';

// Test Fixtures
const mockUsers: User[] = [
  {
    id: 'usr_emp_01',
    name: 'Sarah Jenkins',
    email: 'sarah.jenkins@company.com',
    role: 'EMPLOYEE',
    department: 'Engineering',
    phone: '+1-555-0101',
  },
  {
    id: 'usr_adm_01',
    name: 'Alex Morgan',
    email: 'alex.morgan@company.com',
    role: 'ADMIN',
    department: 'Corporate Fleet Operations',
    phone: '+1-555-0201',
  },
  {
    id: 'usr_drv_01',
    name: 'Marcus Vance',
    email: 'marcus.vance@company.com',
    role: 'DRIVER',
    department: 'Transportation Services',
    phone: '+1-555-0301',
  },
];

const mockTripLegs: TripLeg[] = [
  {
    id: 'leg_001_out',
    requestId: 'req_001',
    legType: 'OUTBOUND',
    pickupLocation: 'Headquarters',
    destination: 'Tech Center',
    scheduledDeparture: '2026-11-25T09:00:00.000Z',
    scheduledArrival: '2026-11-25T10:00:00.000Z',
    status: 'COMPLETED',
  },
  {
    id: 'leg_001_ret',
    requestId: 'req_001',
    legType: 'RETURN',
    pickupLocation: 'Tech Center',
    destination: 'Headquarters',
    scheduledDeparture: '2026-11-25T16:00:00.000Z',
    scheduledArrival: '2026-11-25T17:00:00.000Z',
    status: 'IN_PROGRESS',
  },
];

describe('ActivityTimeline Component & Selector Architecture', () => {
  it('1. renders multiple activity records', () => {
    const logs: ActivityLog[] = [
      {
        id: 'act_001',
        requestId: 'req_001',
        actorId: 'usr_emp_01',
        action: 'REQUEST_SUBMITTED',
        description: 'Sarah Jenkins submitted a one-way vehicle request.',
        timestamp: '2026-11-24T08:00:00.000Z',
      },
      {
        id: 'act_002',
        requestId: 'req_001',
        actorId: 'usr_adm_01',
        action: 'REQUEST_APPROVED',
        description: 'Alex Morgan reviewed and approved the transportation request.',
        timestamp: '2026-11-24T09:00:00.000Z',
      },
    ];

    const items = selectActivityTimeline(
      { activityLogs: logs, users: mockUsers, tripLegs: mockTripLegs },
      'req_001'
    );

    const html = renderToStaticMarkup(<ActivityTimeline items={items} />);

    expect(html).toContain('Request Submitted');
    expect(html).toContain('Request Approved');
    expect(html).toContain('Sarah Jenkins submitted a one-way vehicle request.');
    expect(html).toContain('Alex Morgan reviewed and approved the transportation request.');
    expect(html).toContain('2 Events');
  });

  it('2. displays newest activity first (descending chronological order)', () => {
    const logs: ActivityLog[] = [
      {
        id: 'act_old',
        requestId: 'req_001',
        actorId: 'usr_emp_01',
        action: 'REQUEST_SUBMITTED',
        description: 'Older event description.',
        timestamp: '2026-11-24T08:00:00.000Z',
      },
      {
        id: 'act_new',
        requestId: 'req_001',
        actorId: 'usr_adm_01',
        action: 'REQUEST_APPROVED',
        description: 'Newer event description.',
        timestamp: '2026-11-24T10:00:00.000Z',
      },
    ];

    const items = selectActivityTimeline(
      { activityLogs: logs, users: mockUsers, tripLegs: mockTripLegs },
      'req_001'
    );
    expect(items[0].id).toBe('act_new');
    expect(items[1].id).toBe('act_old');

    const html = renderToStaticMarkup(<ActivityTimeline items={items} />);

    const posNew = html.indexOf('Newer event description.');
    const posOld = html.indexOf('Older event description.');
    expect(posNew).toBeGreaterThan(-1);
    expect(posOld).toBeGreaterThan(-1);
    expect(posNew).toBeLessThan(posOld);
  });

  it('3. applies deterministic ordering for identical timestamps using ID tie-breaker', () => {
    const logs: ActivityLog[] = [
      {
        id: 'act_aaa',
        requestId: 'req_001',
        actorId: 'usr_emp_01',
        action: 'REQUEST_SUBMITTED',
        description: 'Event A',
        timestamp: '2026-11-24T12:00:00.000Z',
      },
      {
        id: 'act_zzz',
        requestId: 'req_001',
        actorId: 'usr_adm_01',
        action: 'REQUEST_APPROVED',
        description: 'Event Z',
        timestamp: '2026-11-24T12:00:00.000Z',
      },
    ];

    const items = selectActivityTimeline(
      { activityLogs: logs, users: mockUsers, tripLegs: mockTripLegs },
      'req_001'
    );
    // act_zzz comes before act_aaa via localeCompare descending
    expect(items[0].id).toBe('act_zzz');
    expect(items[1].id).toBe('act_aaa');
  });

  it('4. resolves Employee, Admin, and Driver actors correctly with appropriate role labels', () => {
    const logs: ActivityLog[] = [
      {
        id: 'act_emp',
        requestId: 'req_001',
        actorId: 'usr_emp_01',
        action: 'REQUEST_SUBMITTED',
        description: 'Submitted by employee.',
        timestamp: '2026-11-24T08:00:00.000Z',
      },
      {
        id: 'act_adm',
        requestId: 'req_001',
        actorId: 'usr_adm_01',
        action: 'ASSIGNMENT_DISPATCHED',
        description: 'Dispatched by admin.',
        timestamp: '2026-11-24T09:00:00.000Z',
      },
      {
        id: 'act_drv',
        requestId: 'req_001',
        actorId: 'usr_drv_01',
        action: 'TRIP_ACCEPTED',
        description: 'Accepted by driver.',
        timestamp: '2026-11-24T10:00:00.000Z',
      },
    ];

    const items = selectActivityTimeline(
      { activityLogs: logs, users: mockUsers, tripLegs: mockTripLegs },
      'req_001'
    );
    const html = renderToStaticMarkup(<ActivityTimeline items={items} />);

    expect(html).toContain('Sarah Jenkins');
    expect(html).toContain('Requester');

    expect(html).toContain('Alex Morgan');
    expect(html).toContain('Fleet Operations');

    expect(html).toContain('Marcus Vance');
    expect(html).toContain('Driver');
  });

  it('5. uses System Automated fallback for unknown actors', () => {
    const logs: ActivityLog[] = [
      {
        id: 'act_unknown',
        requestId: 'req_001',
        actorId: 'usr_ghost_99',
        action: 'REQUEST_APPROVED',
        description: 'Automated policy approved this request.',
        timestamp: '2026-11-24T08:00:00.000Z',
      },
    ];

    const items = selectActivityTimeline(
      { activityLogs: logs, users: mockUsers, tripLegs: mockTripLegs },
      'req_001'
    );
    const html = renderToStaticMarkup(<ActivityTimeline items={items} />);

    expect(html).toContain('System Automated');
    expect(html).toContain('System');
    expect(html).not.toContain('usr_ghost_99');
  });

  it('6. displays Outbound and Return labels for valid linked trip legs', () => {
    const logs: ActivityLog[] = [
      {
        id: 'act_out',
        requestId: 'req_001',
        tripLegId: 'leg_001_out',
        actorId: 'usr_drv_01',
        action: 'TRIP_STARTED',
        description: 'Started outbound leg.',
        timestamp: '2026-11-24T08:00:00.000Z',
      },
      {
        id: 'act_ret',
        requestId: 'req_001',
        tripLegId: 'leg_001_ret',
        actorId: 'usr_drv_01',
        action: 'ARRIVED_AT_PICKUP',
        description: 'Arrived for return journey.',
        timestamp: '2026-11-24T15:00:00.000Z',
      },
    ];

    const items = selectActivityTimeline(
      { activityLogs: logs, users: mockUsers, tripLegs: mockTripLegs },
      'req_001'
    );
    const html = renderToStaticMarkup(<ActivityTimeline items={items} />);

    expect(html).toContain('Outbound Leg');
    expect(html).toContain('Return Leg');
  });

  it('7. does not show a leg label when the relationship is missing or unlinked', () => {
    const logs: ActivityLog[] = [
      {
        id: 'act_noleg',
        requestId: 'req_001',
        actorId: 'usr_emp_01',
        action: 'REQUEST_SUBMITTED',
        description: 'General request submission.',
        timestamp: '2026-11-24T08:00:00.000Z',
      },
      {
        id: 'act_unlinked_leg',
        requestId: 'req_001',
        tripLegId: 'leg_nonexistent',
        actorId: 'usr_emp_01',
        action: 'REQUEST_SUBMITTED',
        description: 'Unlinked leg test.',
        timestamp: '2026-11-24T09:00:00.000Z',
      },
    ];

    const items = selectActivityTimeline(
      { activityLogs: logs, users: mockUsers, tripLegs: mockTripLegs },
      'req_001'
    );
    const html = renderToStaticMarkup(<ActivityTimeline items={items} />);

    expect(html).not.toContain('Outbound Leg');
    expect(html).not.toContain('Return Leg');
  });

  it('8. handles unknown action values gracefully with formatted fallback title and icon', () => {
    const logs: ActivityLog[] = [
      {
        id: 'act_custom',
        requestId: 'req_001',
        actorId: 'usr_adm_01',
        action: 'SECURITY_CHECK_CLEARED',
        description: 'Vehicle cleared gate 4 checkpoint.',
        timestamp: '2026-11-24T08:00:00.000Z',
      },
    ];

    const items = selectActivityTimeline(
      { activityLogs: logs, users: mockUsers, tripLegs: mockTripLegs },
      'req_001'
    );
    const html = renderToStaticMarkup(<ActivityTimeline items={items} />);

    // Converted to human-readable title
    expect(html).toContain('Security Check Cleared');
    expect(html).toContain('Vehicle cleared gate 4 checkpoint.');
  });

  it('9. handles invalid timestamps safely without crashing or throwing', () => {
    const logs: ActivityLog[] = [
      {
        id: 'act_valid',
        requestId: 'req_001',
        actorId: 'usr_adm_01',
        action: 'REQUEST_APPROVED',
        description: 'Valid timestamp.',
        timestamp: '2026-11-24T09:00:00.000Z',
      },
      {
        id: 'act_corrupted',
        requestId: 'req_001',
        actorId: 'usr_adm_01',
        action: 'REQUEST_SUBMITTED',
        description: 'Corrupted date test.',
        timestamp: 'NOT_A_VALID_DATE',
      },
    ];

    let items;
    expect(() => {
      items = selectActivityTimeline(
        { activityLogs: logs, users: mockUsers, tripLegs: mockTripLegs },
        'req_001'
      );
    }).not.toThrow();

    expect(items![0].id).toBe('act_valid');
    expect(items![1].id).toBe('act_corrupted');
    expect(items![1].isValidTimestamp).toBe(false);

    const html = renderToStaticMarkup(<ActivityTimeline items={items!} />);
    expect(html).toContain('Timestamp unavailable');
  });

  it('10. displays the empty state when there are no activity records', () => {
    const items = selectActivityTimeline(
      { activityLogs: [], users: mockUsers, tripLegs: mockTripLegs },
      'req_001'
    );
    const html = renderToStaticMarkup(<ActivityTimeline items={items} />);

    expect(html).toContain('No Activity Recorded Yet');
    expect(html).toContain('Audit events will appear here as this request is reviewed');
    expect(html).toContain('0 Events');
  });

  it('11. does not mutate input logs array or entity objects', () => {
    const originalLogs: ActivityLog[] = [
      {
        id: 'act_002',
        requestId: 'req_001',
        actorId: 'usr_emp_01',
        action: 'REQUEST_SUBMITTED',
        description: 'Earlier',
        timestamp: '2026-11-24T08:00:00.000Z',
      },
      {
        id: 'act_001',
        requestId: 'req_001',
        actorId: 'usr_adm_01',
        action: 'REQUEST_APPROVED',
        description: 'Later',
        timestamp: '2026-11-24T09:00:00.000Z',
      },
    ];

    const logsCopy = JSON.parse(JSON.stringify(originalLogs));
    Object.freeze(originalLogs);
    Object.freeze(originalLogs[0]);
    Object.freeze(originalLogs[1]);

    expect(() => {
      selectActivityTimeline(
        { activityLogs: originalLogs, users: mockUsers, tripLegs: mockTripLegs },
        'req_001'
      );
    }).not.toThrow();

    expect(originalLogs).toEqual(logsCopy);
  });

  it('12. does not display records belonging to another request', () => {
    const logs: ActivityLog[] = [
      {
        id: 'act_foreign',
        requestId: 'req_999_OTHER',
        actorId: 'usr_adm_01',
        action: 'REQUEST_APPROVED',
        description: 'Secret data for request 999.',
        timestamp: '2026-11-24T09:00:00.000Z',
      },
      {
        id: 'act_target',
        requestId: 'req_001',
        actorId: 'usr_emp_01',
        action: 'REQUEST_SUBMITTED',
        description: 'Public data for request 001.',
        timestamp: '2026-11-24T08:00:00.000Z',
      },
    ];

    const items = selectActivityTimeline(
      { activityLogs: logs, users: mockUsers, tripLegs: mockTripLegs },
      'req_001'
    );
    const html = renderToStaticMarkup(<ActivityTimeline items={items} />);

    expect(html).toContain('Public data for request 001.');
    expect(html).not.toContain('Secret data for request 999.');
    expect(html).toContain('1 Event');
  });
});
