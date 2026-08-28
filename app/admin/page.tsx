'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface EventStat {
  id: string; name: string; event_date: string | null; event_time: string | null; sort_order: number;
  invited: number; attending: number; declined: number; pending: number;
}

interface Summary {
  totalGuests: number;
  invitedCount: number;
  responding: number;
  attending: number;
  declined: number;
  pending: number;
  roomsFilled: number;
  roomsTotal: number;
  unsentWithEmail: number;
}

export default function AdminDashboard() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [eventStats, setEventStats] = useState<EventStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [hideDeclined, setHideDeclined] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('hideDeclined');
    if (stored !== null) setHideDeclined(stored === 'true');
  }, []);

  const toggleHideDeclined = (val: boolean) => {
    setHideDeclined(val);
    localStorage.setItem('hideDeclined', String(val));
  };

  useEffect(() => { fetchDashboard(); }, []);

  const fetchDashboard = async () => {
    try {
    const [guestsRes, rsvpRes, geRes, eventsRes, roomsRes, assignRes] = await Promise.all([
      supabase.from('guests').select('id, invited_at, email, attending'),
      supabase.from('rsvp_responses').select('guest_id, event_id, status'),
      supabase.from('guest_events').select('guest_id, event_id'),
      supabase.from('events').select('id, name, event_date, event_time, sort_order').order('sort_order'),
      supabase.from('venue_rooms').select('capacity'),
      supabase.from('guest_room_assignments').select('id', { count: 'exact', head: true }),
    ]);

    const guests   = guestsRes.data || [];
    const rsvps    = rsvpRes.data || [];
    const ge       = geRes.data || [];
    const events   = eventsRes.data || [];

    const respondedGuestIds  = new Set(rsvps.map(r => r.guest_id));
    const attendingGuestIds  = new Set(rsvps.filter(r => r.status === 'attending').map(r => r.guest_id));

    const guestRsvpStatuses: Record<string, string[]> = {};
    for (const r of rsvps) {
      if (!guestRsvpStatuses[r.guest_id]) guestRsvpStatuses[r.guest_id] = [];
      guestRsvpStatuses[r.guest_id].push(r.status);
    }
    const declinedGuestIds = new Set(guests.filter(g => {
      const statuses = guestRsvpStatuses[g.id] || [];
      const allRsvpDeclined = statuses.length > 0 && statuses.every(s => !s || s === 'declined') && statuses.some(s => s === 'declined');
      const saveTheDateDeclined = g.attending === 'no' && statuses.length === 0;
      return allRsvpDeclined || saveTheDateDeclined;
    }).map(g => g.id));

    const summary: Summary = {
      totalGuests:    guests.length,
      invitedCount:   guests.filter(g => g.invited_at).length,
      responding:     respondedGuestIds.size,
      attending:      attendingGuestIds.size,
      declined:       declinedGuestIds.size,
      pending:        guests.filter(g => !respondedGuestIds.has(g.id) && !declinedGuestIds.has(g.id)).length,
      roomsFilled:    assignRes.count || 0,
      roomsTotal:     (roomsRes.data || []).reduce((s, r) => s + (r.capacity || 0), 0),
      unsentWithEmail: guests.filter(g => g.email && !g.invited_at).length,
    };

    // Per-event stats
    const stats: EventStat[] = events.map(event => {
      const invitedIds = new Set(ge.filter(g => g.event_id === event.id).map(g => g.guest_id));
      const eventRsvps = rsvps.filter(r => r.event_id === event.id);
      const attending  = eventRsvps.filter(r => r.status === 'attending').length;
      const declined   = eventRsvps.filter(r => r.status === 'declined').length;
      return {
        ...event,
        invited:  invitedIds.size,
        attending,
        declined,
        pending:  invitedIds.size - eventRsvps.length,
      };
    });

    setSummary(summary);
    setEventStats(stats);
    } finally {
      setLoading(false);
    }
  };

  const displayTotal = summary ? summary.totalGuests - (hideDeclined ? summary.declined : 0) : 0;
  const responseNumerator = summary ? (hideDeclined ? summary.attending : summary.responding) : 0;
  const responseRate = displayTotal > 0
    ? Math.round((responseNumerator / displayTotal) * 100)
    : 0;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gian &amp; Cat · Saturday 3 October 2026</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-600 select-none">
            <input type="checkbox" checked={hideDeclined} onChange={e => toggleHideDeclined(e.target.checked)} className="rounded border-gray-300" />
            Hide declined
          </label>
          {summary && summary.unsentWithEmail > 0 && (
            <Link href="/admin/guests" className="border border-gray-200 text-sm text-gray-700 font-medium px-4 py-2 rounded-md hover:bg-gray-50">
              {summary.unsentWithEmail} unsent invite{summary.unsentWithEmail !== 1 ? 's' : ''} →
            </Link>
          )}
        </div>
      </div>

      {loading ? <p className="text-sm text-gray-400">Loading…</p> : summary && (
        <>
          {/* Top stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white border border-gray-200 rounded-lg px-5 py-4">
              <p className="text-xs text-gray-500 mb-1">Total guests</p>
              <p className="text-3xl font-semibold text-gray-900">{displayTotal}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg px-5 py-4">
              <p className="text-xs text-gray-500 mb-1">Attending</p>
              <p className="text-3xl font-semibold text-green-600">{summary.attending}</p>
              {!hideDeclined && <p className="text-xs text-gray-400 mt-1">{summary.declined} declined</p>}
            </div>
            <div className="bg-white border border-gray-200 rounded-lg px-5 py-4">
              <p className="text-xs text-gray-500 mb-1">No response</p>
              <p className="text-3xl font-semibold text-amber-500">{summary.pending}</p>
              <p className="text-xs text-gray-400 mt-1">of {displayTotal} guests</p>
            </div>
          </div>

          {/* Response rate bar */}
          <div className="bg-white border border-gray-200 rounded-lg px-5 py-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-700">Response rate</p>
              <p className="text-sm font-semibold text-gray-900">{responseRate}%</p>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${responseRate}%`,
                  background: responseRate === 100 ? '#16a34a' : responseRate > 50 ? '#2563eb' : '#f59e0b',
                }}
              />
            </div>
            <div className="flex gap-4 mt-3">
              <span className="text-xs text-green-600">{summary.attending} attending</span>
              {!hideDeclined && <span className="text-xs text-red-500">{summary.declined} declined</span>}
              <span className="text-xs text-amber-500">{summary.pending} pending</span>
            </div>
          </div>

          {/* Per-event breakdown */}
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">By event</h2>
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden mb-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Event</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Date</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500">Invited</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500 text-green-600">Attending</th>
                  {!hideDeclined && <th className="text-center px-4 py-3 font-medium text-gray-500 text-red-500">Declined</th>}
                  <th className="text-center px-4 py-3 font-medium text-gray-500 text-amber-500">Pending</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {eventStats.map(e => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-900">{(e.name as any)?.en || 'Event'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {e.event_date ? new Date(e.event_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'TBC'}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-700">{e.invited}</td>
                    <td className="px-4 py-3 text-center text-green-600 font-medium">{e.attending}</td>
                    {!hideDeclined && <td className="px-4 py-3 text-center text-red-500">{e.declined}</td>}
                    <td className="px-4 py-3 text-center text-amber-500">{e.pending}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Accommodation */}
          {summary.roomsTotal > 0 && (
            <>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Accommodation</h2>
              <div className="bg-white border border-gray-200 rounded-lg px-5 py-4 mb-6 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Venue rooms</p>
                  <p className="text-sm text-gray-500">{summary.roomsFilled} of {summary.roomsTotal} beds assigned</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-32 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gray-900 rounded-full" style={{ width: `${Math.min(100, Math.round((summary.roomsFilled / summary.roomsTotal) * 100))}%` }} />
                  </div>
                  <Link href="/admin/accommodation" className="text-sm text-gray-400 hover:text-gray-700">Manage →</Link>
                </div>
              </div>
            </>
          )}

          {/* Quick links */}
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Quick links</h2>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Manage guests', href: '/admin/guests' },
              { label: 'Events',        href: '/admin/events' },
              { label: 'Content & FAQ', href: '/admin/content' },
              { label: 'Accommodation', href: '/admin/accommodation' },
              { label: 'Registry',      href: '/admin/registry' },
              { label: 'Planning',      href: '/admin/planning' },
            ].map(({ label, href }) => (
              <Link key={href} href={href} className="bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-700 hover:border-gray-400 hover:text-gray-900 transition-colors">
                {label} →
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
