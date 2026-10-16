import { describe, expect, test } from 'vitest'
import { calculateDashboardAttendance, calculateRoomOccupancy } from '@/lib/admin/dashboard-stats'

describe('dashboard stats', () => {

test('counts rooms once even with multiple occupants and ignores nonexistent rooms', () => {
  const result = calculateRoomOccupancy([{ id: 'one' }, { id: 'two' }, { id: 'three' }], [
    { room_id: 'one' }, { room_id: 'one' }, { room_id: 'two' }, { room_id: 'deleted' },
  ]);
  expect(result).toEqual({ total: 3, occupied: 2, empty: 1 });
  expect(calculateRoomOccupancy([], [])).toEqual({ total: 0, occupied: 0, empty: 0 });
});

test('counts current invitations only and includes explicit pending and missing RSVPs', () => {
  const guests = ['yes', 'no', 'pending', 'missing', 'removed'].map(id => ({ id, attending: null }));
  const invitations = guests.filter(g => g.id !== 'removed').map(g => ({ guest_id: g.id, event_id: 'event' }));
  const rsvps = [
    { guest_id: 'yes', event_id: 'event', status: 'attending' },
    { guest_id: 'no', event_id: 'event', status: 'declined' },
    { guest_id: 'pending', event_id: 'event', status: 'pending' },
    { guest_id: 'removed', event_id: 'event', status: 'attending' },
    { guest_id: 'deleted', event_id: 'event', status: 'declined' },
  ];
  const result = calculateDashboardAttendance(guests, [...invitations, invitations[0]], rsvps);
  expect(result.events.event).toEqual({ invited: 4, attending: 1, declined: 1, pending: 2 });
  expect(result.summary).toEqual({ attending: 1, declined: 1, pending: 3 });
});

test('summary counts a person once and leaves partially declined invitations pending', () => {
  const guests = ['party', 'partial', 'declined', 'unanswered'].map(id => ({ id, attending: null }));
  const invitations = guests.flatMap(g => ['one', 'two'].map(event_id => ({ guest_id: g.id, event_id })));
  const rsvps = [
    { guest_id: 'party', event_id: 'one', status: 'attending' },
    { guest_id: 'party', event_id: 'two', status: 'attending' },
    { guest_id: 'partial', event_id: 'one', status: 'declined' },
    { guest_id: 'declined', event_id: 'one', status: 'declined' },
    { guest_id: 'declined', event_id: 'two', status: 'declined' },
    { guest_id: 'unanswered', event_id: 'one', status: 'pending' },
  ];
  const result = calculateDashboardAttendance(guests, invitations, rsvps);
  expect(result.summary).toEqual({ attending: 1, declined: 1, pending: 2 });
  for (const counts of Object.values(result.events)) {
    expect(counts.invited).toEqual(counts.attending + counts.declined + counts.pending);
  }
});

test('empty data and unknown statuses never produce negative or missing counts', () => {
  expect(calculateDashboardAttendance([], [], [])).toEqual({ events: {}, summary: { attending: 0, declined: 0, pending: 0 } });
  const guests = [{ id: 'guest', attending: null }];
  const invitation = { guest_id: 'guest', event_id: 'event' };
  const result = calculateDashboardAttendance(guests, [invitation], [{ ...invitation, status: null }]);
  expect(result.events.event.pending).toEqual(1);
  expect(result.summary.pending).toEqual(1);
});
})
