import { describe, it, expect } from 'vitest';
import { Notification } from '@/types/domain';
import { NotificationViewModel } from '../../types/view-models';
import {
  isValidEmployeeRequestLink,
  calculateRelativeTime,
  selectUnreadNotificationCount,
  selectEmployeeNotifications,
  filterNotificationsByStatus,
  NotificationFilterStatus,
} from '../notification-selectors';

describe('Notification Selectors & Route Validation', () => {
  const FIXED_REF_TIME = '2026-11-24T12:00:00.000Z';

  const mixedNotifications: Notification[] = [
    {
      id: 'notif_001',
      recipientId: 'usr_adm_01',
      title: 'New Vehicle Request Submitted',
      message: 'Sarah Jenkins submitted req_001',
      read: false,
      createdAt: '2026-11-24T11:00:00.000Z',
      link: '/admin/requests/req_001',
    },
    {
      id: 'notif_002',
      recipientId: 'usr_emp_01',
      title: 'Vehicle Request Approved',
      message: 'Your request req_002 was approved',
      read: false,
      createdAt: '2026-11-24T10:00:00.000Z',
      link: '/employee/requests/req_002',
    },
    {
      id: 'notif_003',
      recipientId: 'usr_drv_01',
      title: 'New Trip Assignment',
      message: 'Assigned to leg_003_out',
      read: false,
      createdAt: '2026-11-24T09:30:00.000Z',
      link: '/driver/trips/leg_003_out',
    },
    {
      id: 'notif_004',
      recipientId: 'usr_emp_01',
      title: 'Driver En Route',
      message: 'Driver Marcus Vance is en route for req_004',
      read: true,
      createdAt: '2026-11-24T08:00:00.000Z',
      link: '/employee/requests/req_004',
    },
    {
      id: 'notif_005',
      recipientId: 'usr_emp_01',
      title: 'External Link Notice',
      message: 'Alert with external link',
      read: false,
      createdAt: '2026-11-24T07:00:00.000Z',
      link: 'https://evil.com/phish',
    },
    {
      id: 'notif_006',
      recipientId: 'usr_emp_01',
      title: 'No Link Notice',
      message: 'General alert with no deep link',
      read: true,
      createdAt: '2026-11-24T06:00:00.000Z',
    },
  ];

  describe('1. Route Validation (isValidEmployeeRequestLink)', () => {
    it('accepts valid Employee internal request-detail routes', () => {
      expect(isValidEmployeeRequestLink('/employee/requests/req_002')).toBe(true);
      expect(isValidEmployeeRequestLink('/employee/requests/req_dtl_01')).toBe(true);
      expect(isValidEmployeeRequestLink('/employee/requests/req_abc-123_xyz')).toBe(true);
    });

    it('rejects Admin and Driver internal routes', () => {
      expect(isValidEmployeeRequestLink('/admin/requests/req_001')).toBe(false);
      expect(isValidEmployeeRequestLink('/driver/trips/leg_003_out')).toBe(false);
      expect(isValidEmployeeRequestLink('/admin/dashboard')).toBe(false);
      expect(isValidEmployeeRequestLink('/driver/dashboard')).toBe(false);
    });

    it('rejects external URLs and protocol-relative links', () => {
      expect(isValidEmployeeRequestLink('https://malicious.com/employee/requests/req_001')).toBe(false);
      expect(isValidEmployeeRequestLink('http://example.com')).toBe(false);
      expect(isValidEmployeeRequestLink('//evil.com/employee/requests/req_001')).toBe(false);
    });

    it('rejects script injection and non-HTTP protocols', () => {
      expect(isValidEmployeeRequestLink('javascript:alert(1)')).toBe(false);
      expect(isValidEmployeeRequestLink('data:text/html,<script>alert(1)</script>')).toBe(false);
      expect(isValidEmployeeRequestLink('vbscript:msgbox(1)')).toBe(false);
    });

    it('rejects missing, empty, or malformed path links', () => {
      expect(isValidEmployeeRequestLink(undefined)).toBe(false);
      expect(isValidEmployeeRequestLink(null)).toBe(false);
      expect(isValidEmployeeRequestLink('')).toBe(false);
      expect(isValidEmployeeRequestLink('   ')).toBe(false);
      expect(isValidEmployeeRequestLink('/employee/requests/')).toBe(false);
      expect(isValidEmployeeRequestLink('/employee/requests/new')).toBe(false);
      expect(isValidEmployeeRequestLink('/employee/dashboard')).toBe(false);
      expect(isValidEmployeeRequestLink('/employee/requests/invalid_id')).toBe(false);
    });
  });

  describe('2. Deterministic Relative Time Calculation (calculateRelativeTime)', () => {
    it('calculates deterministic relative time using the mandatory reference instant', () => {
      // 2 hours ago
      expect(calculateRelativeTime('2026-11-24T10:00:00.000Z', FIXED_REF_TIME)).toBe('2 hours ago');
      // 30 seconds ago ("just now")
      expect(calculateRelativeTime('2026-11-24T11:59:30.000Z', FIXED_REF_TIME)).toBe('just now');
      // 1 day ago ("yesterday")
      expect(calculateRelativeTime('2026-11-23T12:00:00.000Z', FIXED_REF_TIME)).toBe('yesterday');
      // 5 days ago
      expect(calculateRelativeTime('2026-11-19T12:00:00.000Z', FIXED_REF_TIME)).toBe('5 days ago');
      // In 2 hours
      expect(calculateRelativeTime('2026-11-24T14:00:00.000Z', FIXED_REF_TIME)).toBe('in 2 hours');
    });

    it('accepts Date objects and numeric timestamps as referenceTime', () => {
      const refDate = new Date(FIXED_REF_TIME);
      const refMs = refDate.getTime();
      expect(calculateRelativeTime('2026-11-24T10:00:00.000Z', refDate)).toBe('2 hours ago');
      expect(calculateRelativeTime('2026-11-24T10:00:00.000Z', refMs)).toBe('2 hours ago');
    });

    it('applies deterministic failure policy for invalid referenceTime', () => {
      expect(calculateRelativeTime('2026-11-24T10:00:00.000Z', 'invalid-date')).toBe('—');
      expect(calculateRelativeTime('2026-11-24T10:00:00.000Z', NaN)).toBe('—');
      expect(calculateRelativeTime('2026-11-24T10:00:00.000Z', null as any)).toBe('—');
      expect(calculateRelativeTime('2026-11-24T10:00:00.000Z', undefined as any)).toBe('—');
      expect(calculateRelativeTime('2026-11-24T10:00:00.000Z', '')).toBe('—');
    });

    it('handles invalid target timestamps safely', () => {
      expect(calculateRelativeTime('not-a-valid-date', FIXED_REF_TIME)).toBe('—');
      expect(calculateRelativeTime('', FIXED_REF_TIME)).toBe('—');
      expect(calculateRelativeTime(null as any, FIXED_REF_TIME)).toBe('—');
    });
  });

  describe('3. Unread Notification Count (selectUnreadNotificationCount)', () => {
    const sampleNotifications: Notification[] = [
      {
        id: 'notif_001',
        recipientId: 'usr_emp_01',
        title: 'Alert 1',
        message: 'Unread alert',
        read: false,
        createdAt: '2026-11-24T09:00:00.000Z',
      },
      {
        id: 'notif_002',
        recipientId: 'usr_emp_01',
        title: 'Alert 2',
        message: 'Read alert',
        read: true,
        createdAt: '2026-11-24T08:00:00.000Z',
      },
      {
        id: 'notif_003',
        recipientId: 'usr_emp_01',
        title: 'Alert 3',
        message: 'Another unread alert',
        read: false,
        createdAt: '2026-11-24T07:00:00.000Z',
      },
      {
        id: 'notif_004',
        recipientId: 'usr_adm_01',
        title: 'Admin alert',
        message: 'Admin unread',
        read: false,
        createdAt: '2026-11-24T06:00:00.000Z',
      },
    ];

    it('accurately counts unread notifications for the active recipient only', () => {
      expect(selectUnreadNotificationCount(sampleNotifications, 'usr_emp_01')).toBe(2);
      expect(selectUnreadNotificationCount(sampleNotifications, 'usr_adm_01')).toBe(1);
      expect(selectUnreadNotificationCount(sampleNotifications, 'usr_drv_01')).toBe(0);
    });

    it('returns 0 when all notifications are read', () => {
      const allRead = sampleNotifications.map((n) => ({ ...n, read: true }));
      expect(selectUnreadNotificationCount(allRead, 'usr_emp_01')).toBe(0);
    });

    it('returns 0 for empty array, null, or undefined', () => {
      expect(selectUnreadNotificationCount([], 'usr_emp_01')).toBe(0);
      expect(selectUnreadNotificationCount(null as any, 'usr_emp_01')).toBe(0);
      expect(selectUnreadNotificationCount(undefined as any, 'usr_emp_01')).toBe(0);
      expect(selectUnreadNotificationCount(sampleNotifications, '')).toBe(0);
    });
  });

  describe('4. Employee Notification Selection (selectEmployeeNotifications)', () => {
    it('enforces strict recipient isolation (no Admin or Driver alerts leaked)', () => {
      const results = selectEmployeeNotifications(mixedNotifications, 'usr_emp_01', FIXED_REF_TIME);
      expect(results).toHaveLength(4);
      expect(results.every((n) => n.recipientId === 'usr_emp_01')).toBe(true);
      expect(results.some((n) => n.id === 'notif_001')).toBe(false); // Admin alert excluded
      expect(results.some((n) => n.id === 'notif_003')).toBe(false); // Driver alert excluded
    });

    it('orders notifications newest-first chronologically', () => {
      const results = selectEmployeeNotifications(mixedNotifications, 'usr_emp_01', FIXED_REF_TIME);
      expect(results[0].id).toBe('notif_002'); // 10:00:00
      expect(results[1].id).toBe('notif_004'); // 08:00:00
      expect(results[2].id).toBe('notif_005'); // 07:00:00
      expect(results[3].id).toBe('notif_006'); // 06:00:00
    });

    it('uses ID comparison as deterministic tie-breaker for identical timestamps', () => {
      const tieNotifications: Notification[] = [
        {
          id: 'notif_alpha',
          recipientId: 'usr_emp_01',
          title: 'Alert A',
          message: 'Message A',
          read: false,
          createdAt: '2026-11-24T10:00:00.000Z',
        },
        {
          id: 'notif_zeta',
          recipientId: 'usr_emp_01',
          title: 'Alert Z',
          message: 'Message Z',
          read: false,
          createdAt: '2026-11-24T10:00:00.000Z',
        },
        {
          id: 'notif_beta',
          recipientId: 'usr_emp_01',
          title: 'Alert B',
          message: 'Message B',
          read: false,
          createdAt: '2026-11-24T10:00:00.000Z',
        },
      ];

      const results = selectEmployeeNotifications(tieNotifications, 'usr_emp_01', FIXED_REF_TIME);
      // Descending alphabetical ID order for tie: zeta > beta > alpha
      expect(results.map((n) => n.id)).toEqual(['notif_zeta', 'notif_beta', 'notif_alpha']);
    });

    it('validates deep links and strips unauthorized or external links', () => {
      const results = selectEmployeeNotifications(mixedNotifications, 'usr_emp_01', FIXED_REF_TIME);

      // notif_002: approved internal link
      const notif2 = results.find((n) => n.id === 'notif_002')!;
      expect(notif2.hasValidLink).toBe(true);
      expect(notif2.link).toBe('/employee/requests/req_002');

      // notif_005: external link rejected
      const notif5 = results.find((n) => n.id === 'notif_005')!;
      expect(notif5.hasValidLink).toBe(false);
      expect(notif5.link).toBeUndefined();

      // notif_006: missing link
      const notif6 = results.find((n) => n.id === 'notif_006')!;
      expect(notif6.hasValidLink).toBe(false);
      expect(notif6.link).toBeUndefined();
    });

    it('formats timestamps deterministically using mandatory referenceTime', () => {
      const results = selectEmployeeNotifications(mixedNotifications, 'usr_emp_01', FIXED_REF_TIME);
      const notif2 = results.find((n) => n.id === 'notif_002')!; // 10:00:00 vs Ref 12:00:00
      expect(notif2.relativeTime).toBe('2 hours ago');
      expect(notif2.displayDateTime).toContain('Nov 24, 2026');

      const notif4 = results.find((n) => n.id === 'notif_004')!; // 08:00:00 vs Ref 12:00:00
      expect(notif4.relativeTime).toBe('4 hours ago');
    });

    it('handles invalid referenceTime gracefully per the deterministic failure policy', () => {
      const results = selectEmployeeNotifications(mixedNotifications, 'usr_emp_01', 'invalid-time-instant');
      expect(results).toHaveLength(4);
      // Relative time falls back safely to '—'
      expect(results[0].relativeTime).toBe('—');
      // Absolute display format still renders valid createdAt dates
      expect(results[0].displayDateTime).toContain('Nov 24, 2026');
    });

    it('handles invalid notification timestamps safely without crashing', () => {
      const badTimestampNotifications: Notification[] = [
        {
          id: 'notif_good',
          recipientId: 'usr_emp_01',
          title: 'Good date',
          message: 'Valid date',
          read: false,
          createdAt: '2026-11-24T10:00:00.000Z',
        },
        {
          id: 'notif_bad',
          recipientId: 'usr_emp_01',
          title: 'Corrupted date',
          message: 'Invalid ISO string',
          read: false,
          createdAt: 'not-a-valid-date',
        },
      ];

      const results = selectEmployeeNotifications(badTimestampNotifications, 'usr_emp_01', FIXED_REF_TIME);
      expect(results).toHaveLength(2);
      expect(results[0].id).toBe('notif_good'); // Valid date sorted to top
      expect(results[1].id).toBe('notif_bad'); // Invalid date sorted to bottom
      expect(results[1].relativeTime).toBe('—');
      expect(results[1].displayDateTime).toBe('—');
    });

    it('does not mutate input arrays or objects (frozen input test)', () => {
      const frozenNotifications = Object.freeze(
        mixedNotifications.map((n) => Object.freeze({ ...n }))
      );

      expect(() => {
        const results = selectEmployeeNotifications(
          frozenNotifications as Notification[],
          'usr_emp_01',
          FIXED_REF_TIME
        );
        expect(results).toHaveLength(4);
      }).not.toThrow();
    });

    it('returns empty array when recipient has no notifications or for unknown recipient', () => {
      expect(selectEmployeeNotifications(mixedNotifications, 'usr_unknown_99', FIXED_REF_TIME)).toEqual([]);
      expect(selectEmployeeNotifications([], 'usr_emp_01', FIXED_REF_TIME)).toEqual([]);
      expect(selectEmployeeNotifications(null as any, 'usr_emp_01', FIXED_REF_TIME)).toEqual([]);
      expect(selectEmployeeNotifications(mixedNotifications, '', FIXED_REF_TIME)).toEqual([]);
    });
  });

  describe('5. Status Filtering (filterNotificationsByStatus)', () => {
    const sampleViewModels: NotificationViewModel[] = [
      {
        id: 'vm_001',
        recipientId: 'usr_emp_01',
        title: 'Unread Alert 1',
        message: 'First unread message',
        read: false,
        createdAt: '2026-11-24T10:00:00.000Z',
        relativeTime: '2 hours ago',
        displayDateTime: 'Nov 24, 2026, 10:00 AM',
        link: '/employee/requests/req_001',
        hasValidLink: true,
      },
      {
        id: 'vm_002',
        recipientId: 'usr_emp_01',
        title: 'Read Notice 1',
        message: 'First read message',
        read: true,
        createdAt: '2026-11-24T09:00:00.000Z',
        relativeTime: '3 hours ago',
        displayDateTime: 'Nov 24, 2026, 9:00 AM',
        link: '/employee/requests/req_002',
        hasValidLink: true,
      },
      {
        id: 'vm_003',
        recipientId: 'usr_emp_01',
        title: 'Unread Alert 2',
        message: 'Second unread message',
        read: false,
        createdAt: '2026-11-24T08:00:00.000Z',
        relativeTime: '4 hours ago',
        displayDateTime: 'Nov 24, 2026, 8:00 AM',
        link: undefined,
        hasValidLink: false,
      },
      {
        id: 'vm_004',
        recipientId: 'usr_emp_01',
        title: 'Read Notice 2',
        message: 'Second read message',
        read: true,
        createdAt: '2026-11-24T07:00:00.000Z',
        relativeTime: '5 hours ago',
        displayDateTime: 'Nov 24, 2026, 7:00 AM',
        link: undefined,
        hasValidLink: false,
      },
    ];

    it('1. ALL returns every notification in the collection', () => {
      const results = filterNotificationsByStatus(sampleViewModels, 'ALL');
      expect(results).toHaveLength(4);
      expect(results.map((n) => n.id)).toEqual(['vm_001', 'vm_002', 'vm_003', 'vm_004']);
    });

    it('2. UNREAD returns only notifications where read is false', () => {
      const results = filterNotificationsByStatus(sampleViewModels, 'UNREAD');
      expect(results).toHaveLength(2);
      expect(results.every((n) => n.read === false)).toBe(true);
      expect(results.map((n) => n.id)).toEqual(['vm_001', 'vm_003']);
    });

    it('3. READ returns only notifications where read is true', () => {
      const results = filterNotificationsByStatus(sampleViewModels, 'READ');
      expect(results).toHaveLength(2);
      expect(results.every((n) => n.read === true)).toBe(true);
      expect(results.map((n) => n.id)).toEqual(['vm_002', 'vm_004']);
    });

    it('4. returns an empty array for empty input across all three filters', () => {
      expect(filterNotificationsByStatus([], 'ALL')).toEqual([]);
      expect(filterNotificationsByStatus([], 'UNREAD')).toEqual([]);
      expect(filterNotificationsByStatus([], 'READ')).toEqual([]);
      expect(filterNotificationsByStatus(null as any, 'ALL')).toEqual([]);
      expect(filterNotificationsByStatus(undefined as any, 'UNREAD')).toEqual([]);
    });

    it('5. returns an empty array when no notifications match the specified filter', () => {
      const allRead = sampleViewModels.filter((n) => n.read);
      const allUnread = sampleViewModels.filter((n) => !n.read);

      // UNREAD filter on all-read collection -> []
      expect(filterNotificationsByStatus(allRead, 'UNREAD')).toEqual([]);
      // READ filter on all-unread collection -> []
      expect(filterNotificationsByStatus(allUnread, 'READ')).toEqual([]);
    });

    it('6. preserves original notification order exactly', () => {
      // Input has vm_001 then vm_003
      const unread = filterNotificationsByStatus(sampleViewModels, 'UNREAD');
      expect(unread[0].id).toBe('vm_001');
      expect(unread[1].id).toBe('vm_003');

      // Input has vm_002 then vm_004
      const read = filterNotificationsByStatus(sampleViewModels, 'READ');
      expect(read[0].id).toBe('vm_002');
      expect(read[1].id).toBe('vm_004');
    });

    it('7. returns a new array and does not mutate the input array', () => {
      const inputCopy = [...sampleViewModels];
      const results = filterNotificationsByStatus(inputCopy, 'ALL');

      // Must be a new array reference
      expect(results).not.toBe(inputCopy);
      // Input array length and elements remain identical
      expect(inputCopy).toHaveLength(4);
      expect(inputCopy.map((n) => n.id)).toEqual(['vm_001', 'vm_002', 'vm_003', 'vm_004']);

      // Frozen input array test
      const frozenInput = Object.freeze([...sampleViewModels]);
      expect(() => filterNotificationsByStatus(frozenInput as NotificationViewModel[], 'UNREAD')).not.toThrow();
    });

    it('8. does not mutate notification objects within the array', () => {
      const frozenItems = Object.freeze(
        sampleViewModels.map((item) => Object.freeze({ ...item }))
      );

      const unreadResults = filterNotificationsByStatus(frozenItems as NotificationViewModel[], 'UNREAD');
      expect(unreadResults).toHaveLength(2);
      // Object references are preserved without cloning overhead or mutation
      expect(unreadResults[0]).toBe(frozenItems[0]);
      expect(unreadResults[1]).toBe(frozenItems[2]);
    });

    it('9. preserves existing recipient-isolation behavior when chained with selectEmployeeNotifications', () => {
      const recipientSelected = selectEmployeeNotifications(mixedNotifications, 'usr_emp_01', FIXED_REF_TIME);
      // Recipient isolation: only usr_emp_01 items
      const unreadForEmp1 = filterNotificationsByStatus(recipientSelected, 'UNREAD');
      const readForEmp1 = filterNotificationsByStatus(recipientSelected, 'READ');

      expect(unreadForEmp1.every((n) => n.recipientId === 'usr_emp_01')).toBe(true);
      expect(readForEmp1.every((n) => n.recipientId === 'usr_emp_01')).toBe(true);

      // Verify no leaked admin or driver items exist in filtered sets
      expect(unreadForEmp1.some((n) => n.id === 'notif_001')).toBe(false);
      expect(readForEmp1.some((n) => n.id === 'notif_003')).toBe(false);
    });

    it('10. preserves existing safe-navigation behavior and route validation flags on filtered items', () => {
      const recipientSelected = selectEmployeeNotifications(mixedNotifications, 'usr_emp_01', FIXED_REF_TIME);
      const allFiltered = filterNotificationsByStatus(recipientSelected, 'ALL');

      // Valid internal link: /employee/requests/req_002
      const notif2 = allFiltered.find((n) => n.id === 'notif_002')!;
      expect(notif2.hasValidLink).toBe(true);
      expect(notif2.link).toBe('/employee/requests/req_002');
      expect(isValidEmployeeRequestLink(notif2.link)).toBe(true);

      // Invalid external link: stripped
      const notif5 = allFiltered.find((n) => n.id === 'notif_005')!;
      expect(notif5.hasValidLink).toBe(false);
      expect(notif5.link).toBeUndefined();

      // Missing link
      const notif6 = allFiltered.find((n) => n.id === 'notif_006')!;
      expect(notif6.hasValidLink).toBe(false);
      expect(notif6.link).toBeUndefined();
    });
  });
});
