interface Guest {
  id: string;
  attending: string | null;
}

interface Invitation { guest_id: string; event_id: string; }
interface Rsvp extends Invitation { status: string | null; }

export interface AttendanceCounts {
  invited: number;
  attending: number;
  declined: number;
  pending: number;
}

export function calculateRoomOccupancy(rooms: { id: string }[], assignments: { room_id: string }[]) {
  const assignedRoomIds = new Set(assignments.map(assignment => assignment.room_id));
  const occupied = rooms.filter(room => assignedRoomIds.has(room.id)).length;
  return { total: rooms.length, occupied, empty: rooms.length - occupied };
}

export function calculateDashboardAttendance(guests: Guest[], invitations: Invitation[], rsvps: Rsvp[]) {
  const guestIds = new Set(guests.map(guest => guest.id));
  const invitedByEvent = new Map<string, Set<string>>();
  const statusesByEvent = new Map<string, Map<string, string | null>>();
  for (const invitation of invitations) {
    if (!guestIds.has(invitation.guest_id)) continue;
    if (!invitedByEvent.has(invitation.event_id)) invitedByEvent.set(invitation.event_id, new Set());
    invitedByEvent.get(invitation.event_id)!.add(invitation.guest_id);
  }
  for (const rsvp of rsvps) {
    if (!invitedByEvent.get(rsvp.event_id)?.has(rsvp.guest_id)) continue;
    if (!statusesByEvent.has(rsvp.event_id)) statusesByEvent.set(rsvp.event_id, new Map());
    statusesByEvent.get(rsvp.event_id)!.set(rsvp.guest_id, rsvp.status);
  }

  const events: Record<string, AttendanceCounts> = {};
  const guestStatuses = new Map<string, string[]>();
  for (const [eventId, invitedIds] of invitedByEvent) {
    const counts: AttendanceCounts = { invited: invitedIds.size, attending: 0, declined: 0, pending: 0 };
    for (const guestId of invitedIds) {
      const rawStatus = statusesByEvent.get(eventId)?.get(guestId);
      const status = rawStatus === 'attending' || rawStatus === 'declined' ? rawStatus : 'pending';
      counts[status]++;
      if (!guestStatuses.has(guestId)) guestStatuses.set(guestId, []);
      guestStatuses.get(guestId)!.push(status);
    }
    events[eventId] = counts;
  }

  const summary = { attending: 0, declined: 0, pending: 0 };
  for (const guest of guests) {
    const statuses = guestStatuses.get(guest.id) || [];
    if (statuses.includes('attending')) summary.attending++;
    else if (statuses.length > 0 && statuses.every(status => status === 'declined')) summary.declined++;
    else if (statuses.length === 0 && guest.attending === 'no') summary.declined++;
    else summary.pending++;
  }
  return { events, summary };
}
