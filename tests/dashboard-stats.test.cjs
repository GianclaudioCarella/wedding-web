const { test } = require('node:test');
const assert = require('node:assert/strict');
const { calculateDashboardAttendance, calculateRoomOccupancy } = require('../lib/admin/dashboard-stats.ts');

test('counts rooms once even with multiple occupants and ignores nonexistent rooms', () => {
  const result = calculateRoomOccupancy([{ id: 'one' }, { id: 'two' }, { id: 'three' }], [
    { room_id: 'one' }, { room_id: 'one' }, { room_id: 'two' }, { room_id: 'deleted' },
  ]);
  assert.deepEqual(result, { total: 3, occupied: 2, empty: 1 });
  assert.deepEqual(calculateRoomOccupancy([], []), { total: 0, occupied: 0, empty: 0 });
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
  assert.deepEqual(result.events.event, { invited: 4, attending: 1, declined: 1, pending: 2 });
  assert.deepEqual(result.summary, { attending: 1, declined: 1, pending: 3 });
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
  assert.deepEqual(result.summary, { attending: 1, declined: 1, pending: 2 });
  for (const counts of Object.values(result.events)) {
    assert.equal(counts.invited, counts.attending + counts.declined + counts.pending);
  }
});

test('empty data and unknown statuses never produce negative or missing counts', () => {
  assert.deepEqual(calculateDashboardAttendance([], [], []), { events: {}, summary: { attending: 0, declined: 0, pending: 0 } });
  const guests = [{ id: 'guest', attending: null }];
  const invitation = { guest_id: 'guest', event_id: 'event' };
  const result = calculateDashboardAttendance(guests, [invitation], [{ ...invitation, status: null }]);
  assert.equal(result.events.event.pending, 1);
  assert.equal(result.summary.pending, 1);
});
