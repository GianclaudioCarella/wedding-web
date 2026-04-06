'use client';

import { useEffect, useState, Fragment } from 'react';
import { supabase } from '@/lib/supabase';

interface Event { id: string; name: string; sort_order: number }
interface RsvpDetail {
  event_id: string; status: string;
  dietary_requirements: string[] | null;
  dietary_notes: string | null;
  notes: string | null;
}
interface StayRequest {
  thursday_night: boolean; friday_night: boolean; saturday_night: boolean;
}
interface Guest {
  id: string; name: string; email: string | null; phone: string | null;
  tags: string[]; language: string; notes: string | null;
  invite_token: string; party_role: string; party_leader_id: string | null;
  venue_stay_invited: boolean; invited_at: string | null; attending: string | null; events: string[];
  rsvps: Record<string, RsvpDetail>;
  stayRequest: StayRequest | null;
}

const EMPTY_FORM = {
  name: '', email: '', phone: '', tags: [] as string[], language: 'en', notes: '',
  party_role: 'primary', party_leader_id: '', venue_stay_invited: false, attending: '',
  event_ids: [] as string[],
};

const STATUS_STYLE: Record<string, React.CSSProperties> = {
  attending: { background: '#dcfce7', color: '#16a34a' },
  declined:  { background: '#fee2e2', color: '#dc2626' },
};

const getTagColor = (tag: string) => {
  const colors = [
    'border-blue-400 text-blue-400 bg-blue-400/10',
    'border-green-400 text-green-400 bg-green-400/10',
    'border-purple-400 text-purple-400 bg-purple-400/10',
    'border-pink-400 text-pink-400 bg-pink-400/10',
    'border-indigo-400 text-indigo-400 bg-indigo-400/10',
    'border-yellow-400 text-yellow-400 bg-yellow-400/10',
    'border-teal-400 text-teal-400 bg-teal-400/10',
    'border-orange-400 text-orange-400 bg-orange-400/10',
    'border-cyan-400 text-cyan-400 bg-cyan-400/10',
    'border-rose-400 text-rose-400 bg-rose-400/10',
    'border-lime-400 text-lime-400 bg-lime-400/10',
    'border-amber-400 text-amber-400 bg-amber-400/10',
    'border-emerald-400 text-emerald-400 bg-emerald-400/10',
    'border-violet-400 text-violet-400 bg-violet-400/10',
    'border-fuchsia-400 text-fuchsia-400 bg-fuchsia-400/10',
    'border-sky-400 text-sky-400 bg-sky-400/10',
    'border-red-400 text-red-400 bg-red-400/10',
  ];
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export default function GuestsPage() {
  const [guests, setGuests]             = useState<Guest[]>([]);
  const [events, setEvents]             = useState<Event[]>([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState('');
  const [groupFilter, setGroupFilter]   = useState<string[]>([]);
  const [rsvpFilter, setRsvpFilter]     = useState('');
  const [showForm, setShowForm]         = useState(false);
  const [form, setForm]                 = useState(EMPTY_FORM);
  const [editingId, setEditingId]       = useState<string | null>(null);
  const [saving, setSaving]             = useState(false);
  const [copied, setCopied]             = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [viewingGuest, setViewingGuest] = useState<Guest | null>(null);
  const [sending, setSending]           = useState<string | null>(null); // guest id being sent
  const [bulkSending, setBulkSending]   = useState(false);
  const [sendResult, setSendResult]     = useState<string | null>(null);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [guestsRes, eventsRes, geRes, rsvpRes, stayRes] = await Promise.all([
      supabase.from('guests').select('*').order('name'),
      supabase.from('events').select('id, name, sort_order').order('sort_order'),
      supabase.from('guest_events').select('guest_id, event_id'),
      supabase.from('rsvp_responses').select('guest_id, event_id, status, dietary_requirements, dietary_notes, notes'),
      supabase.from('guest_stay_requests').select('guest_id, thursday_night, friday_night, saturday_night'),
    ]);

    const guestEvents: Record<string, string[]> = {};
    for (const ge of geRes.data || []) {
      if (!guestEvents[ge.guest_id]) guestEvents[ge.guest_id] = [];
      guestEvents[ge.guest_id].push(ge.event_id);
    }
    const guestRsvps: Record<string, Record<string, RsvpDetail>> = {};
    for (const r of rsvpRes.data || []) {
      if (!guestRsvps[r.guest_id]) guestRsvps[r.guest_id] = {};
      guestRsvps[r.guest_id][r.event_id] = r;
    }
    const guestStay: Record<string, StayRequest> = {};
    for (const s of stayRes.data || []) guestStay[s.guest_id] = s;

    setGuests((guestsRes.data || []).map(g => ({
      ...g,
      events: guestEvents[g.id] || [],
      rsvps: guestRsvps[g.id] || {},
      stayRequest: guestStay[g.id] || null,
    })));
    setEvents(eventsRes.data || []);
    setLoading(false);
  };

  const ceremonyEvent = events.find(e => ((e.name as any)?.en || '').toLowerCase().includes('ceremon')) || events[0];
  const extraEvents   = events.filter(e => e.id !== ceremonyEvent?.id);

  const openNew  = () => {
    const autoIds = ceremonyEvent ? [ceremonyEvent.id] : [];
    setForm({ ...EMPTY_FORM, event_ids: autoIds });
    setEditingId(null); setShowForm(true);
  };
  const openEdit = (g: Guest) => {
    setForm({ name: g.name, email: g.email || '', phone: g.phone || '',
      tags: g.tags || [], language: g.language, notes: g.notes || '', attending: g.attending || '',
      party_role: g.party_role || 'primary', party_leader_id: g.party_leader_id || '',
      venue_stay_invited: g.venue_stay_invited || false, event_ids: g.events });
    setEditingId(g.id); setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name, email: form.email || null, phone: form.phone || null,
        tags: form.tags && form.tags.length > 0 ? form.tags : null, language: form.language, notes: form.notes || null,
        attending: form.attending || null,
        party_role: form.party_role, party_leader_id: form.party_leader_id || null,
        venue_stay_invited: form.venue_stay_invited,
      };
      if (editingId) {
        await supabase.from('guests').update(payload).eq('id', editingId);
        await supabase.from('guest_events').delete().eq('guest_id', editingId);
        if (form.event_ids.length > 0)
          await supabase.from('guest_events').insert(form.event_ids.map(eid => ({ guest_id: editingId, event_id: eid })));
      } else {
        const newToken = crypto.randomUUID();
        const { data: newGuest } = await supabase.from('guests').insert({ ...payload, invite_token: newToken }).select('id').single();
        const finalIds = ceremonyEvent ? [...new Set([ceremonyEvent.id, ...form.event_ids])] : form.event_ids;
        if (newGuest && finalIds.length > 0)
          await supabase.from('guest_events').insert(finalIds.map(eid => ({ guest_id: newGuest.id, event_id: eid })));
      }
      setShowForm(false); await fetchAll();
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    await supabase.from('guests').delete().eq('id', id);
    setDeleteConfirm(null); await fetchAll();
  };

  const copyLink = (token: string, language: string = 'en') => {
    const localePrefix = language === 'en' ? '' : `/${language}`;
    navigator.clipboard.writeText(`${window.location.origin}${localePrefix}/invite?guest=${token}`);
    setCopied(token); setTimeout(() => setCopied(null), 2000);
  };

  const sendInvite = async (guestId: string) => {
    setSending(guestId);
    const res = await fetch('/api/send-invitation', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ guest_ids: [guestId] }) });
    const data = await res.json();
    setSending(null);
    if (data.successCount === 1) { setSendResult('Invitation sent!'); await fetchAll(); }
    else setSendResult(data.results?.[0]?.error || 'Failed to send');
    setTimeout(() => setSendResult(null), 4000);
  };

  const sendAllUninvited = async () => {
    const uninvited = guests.filter(g => g.email && !g.invited_at);
    if (!uninvited.length) return;
    setBulkSending(true);
    const res = await fetch('/api/send-invitation', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ guest_ids: uninvited.map(g => g.id) }) });
    const data = await res.json();
    setBulkSending(false);
    setSendResult(`Sent ${data.successCount} of ${data.total} invitations`);
    setTimeout(() => setSendResult(null), 5000);
    await fetchAll();
  };

  const tags          = Array.from(new Set(guests.flatMap(g => g.tags || []))) as string[];
  const primaryGuests = guests.filter(g => !g.party_leader_id);
  const filtered      = guests.filter(g => {
    const matchSearch = g.name.toLowerCase().includes(search.toLowerCase()) || (g.email || '').toLowerCase().includes(search.toLowerCase());
    const matchTag    = groupFilter.length === 0 || (g.tags || []).some(t => groupFilter.includes(t));
    const hasRsvp     = Object.values(g.rsvps).some(r => r.status);
    const isAttending = Object.values(g.rsvps).some(r => r.status === 'attending');
    const isDeclined  = Object.values(g.rsvps).every(r => !r.status || r.status === 'declined') && Object.values(g.rsvps).some(r => r.status === 'declined');
    const matchRsvp   = !rsvpFilter
      || (rsvpFilter === 'responded' && hasRsvp)
      || (rsvpFilter === 'pending'   && !hasRsvp)
      || (rsvpFilter === 'attending' && isAttending)
      || (rsvpFilter === 'declined'  && isDeclined);
    return matchSearch && matchTag && matchRsvp;
  });

  // Sort so party members always appear directly below their primary guest,
  // even if the party member itself doesn't match the filter.
  const sortedFiltered = (() => {
    const primaries = filtered.filter(g => !g.party_leader_id);
    const result: Guest[] = [];
    for (const p of primaries) {
      result.push(p);
      // Always include all party members of a matching primary, regardless of filter
      result.push(...guests.filter(g => g.party_leader_id === p.id));
    }
    // Party members whose primary didn't match the filter — still include them if they matched
    const inResult = new Set(result.map(g => g.id));
    filtered.filter(g => !inResult.has(g.id)).forEach(g => result.push(g));
    return result;
  })();

  const roleLabel: Record<string, string> = { primary: '', partner: 'Partner', child: 'Child', other: 'Other' };
  const nightLabel: Record<string, string> = { thursday_night: 'Thu', friday_night: 'Fri', saturday_night: 'Sat' };

  const exportCSV = () => {
    const eventNames = events.map(e => (e.name as any)?.en || 'Event');
    const headers = ['Name', 'Email', 'Tags', ...eventNames, 'Dietary', 'Dietary Notes', 'Stay Nights', 'Notes'];

    const rows = sortedFiltered.map(g => {
      const allDietary = [...new Set(
        Object.values(g.rsvps).flatMap(r => Array.isArray(r.dietary_requirements) ? r.dietary_requirements : []).filter(d => d && d !== 'none')
      )];
      const allDietaryNotes = Object.values(g.rsvps).map(r => r.dietary_notes).filter(Boolean).join('; ');
      const stayNightsList = g.stayRequest
        ? (['thursday_night', 'friday_night', 'saturday_night'] as const).filter(n => g.stayRequest![n]).map(n => ({ thursday_night: 'Thu', friday_night: 'Fri', saturday_night: 'Sat' })[n])
        : [];
      const eventStatuses = events.map(e => {
        if (!g.events.includes(e.id)) return 'not invited';
        return g.rsvps[e.id]?.status || 'pending';
      });
      return [
        g.name,
        g.email || '',
        (g.tags || []).join(', '),
        ...eventStatuses,
        allDietary.join(', '),
        allDietaryNotes,
        stayNightsList.join(', '),
        g.notes || '',
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `guests-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Guests</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {sortedFiltered.length} guests · {sortedFiltered.filter(g => g.attending === 'yes').length} save the date yes · {sortedFiltered.filter(g => Object.values(g.rsvps).some((r: any) => r.status === 'attending')).length} formal RSVP · {sortedFiltered.filter(g => g.invited_at).length} invited
          </p>
        </div>
        <div className="flex items-center gap-3">
          {sendResult && <span className="text-sm text-gray-500">{sendResult}</span>}
          <button
            onClick={sendAllUninvited}
            disabled={bulkSending || guests.filter(g => g.email && !g.invited_at).length === 0}
            className="border border-gray-200 text-gray-700 text-sm font-medium px-4 py-2 rounded-md hover:bg-gray-50 disabled:opacity-40"
          >
            {bulkSending ? 'Sending…' : `Send all (${guests.filter(g => g.email && !g.invited_at).length} unsent)`}
          </button>
          <button
            onClick={exportCSV}
            className="border border-gray-200 text-gray-700 text-sm font-medium px-4 py-2 rounded-md hover:bg-gray-50"
          >
            Export CSV
          </button>
          <button onClick={openNew} className="bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-gray-700">+ Add guest</button>
        </div>
      </div>

      <div className="flex gap-3 mb-5 flex-wrap items-center">
        <input type="text" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} className="border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-900 w-64 focus:outline-none focus:border-gray-400" />

        <div className="flex flex-wrap gap-2">
          {tags.map(tag => (
            <button
              key={tag}
              onClick={() => setGroupFilter(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])}
              className={`px-3 py-2 text-xs rounded-md font-medium transition-colors ${
                groupFilter.includes(tag)
                  ? `${getTagColor(tag)} border`
                  : 'border border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>

        {groupFilter.length > 0 && (
          <button
            onClick={() => setGroupFilter([])}
            className="text-xs text-gray-400 hover:text-gray-600 font-medium"
          >
            Clear filters
          </button>
        )}

        <select value={rsvpFilter} onChange={e => setRsvpFilter(e.target.value)} className="border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-gray-400 ml-auto">
          <option value="">All RSVPs</option>
          <option value="responded">Responded</option>
          <option value="pending">Pending</option>
          <option value="attending">Attending</option>
          <option value="declined">Declined</option>
        </select>
      </div>

      {loading ? <p className="text-sm text-gray-400">Loading…</p> : (
        <div className="overflow-x-auto bg-white border border-gray-200 rounded-lg">
            <table className="text-sm" style={{ width: 'max-content', minWidth: '100%' }}>
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-500 whitespace-nowrap" title="Guest name">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 whitespace-nowrap" title="Guest tag or group">Tag</th>
                  {events.map(e => (
                    <th key={e.id} className="text-left px-4 py-3 font-medium text-gray-500 whitespace-nowrap" title={`RSVP for ${(e.name as any)?.en || 'Event'}`}>{((e.name as any)?.en || 'Event').split(' ')[0]}</th>
                  ))}
                  <th className="text-left px-4 py-3 font-medium text-gray-500 whitespace-nowrap" title="Dietary restrictions">Dietary</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 whitespace-nowrap" title="Staying at venue">Stay</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 whitespace-nowrap" title="RSVP notes and status">Notes / RSVP</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 whitespace-nowrap" title="Save the Date sent">Save the Date</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 whitespace-nowrap" title="Formal invitation sent">Invited</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 whitespace-nowrap" title="Invitation link">Link</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedFiltered.length === 0 && (
                  <tr><td colSpan={8 + events.length} className="px-4 py-8 text-center text-gray-400">{guests.length === 0 ? 'No guests yet.' : 'No results.'}</td></tr>
                )}
                {sortedFiltered.map(guest => {
                  const allDietary      = [...new Set(Object.values(guest.rsvps).flatMap(r => Array.isArray(r.dietary_requirements) ? r.dietary_requirements : []).filter(d => d && d !== 'none'))];
                  const allDietaryNotes = Object.values(guest.rsvps).map(r => r.dietary_notes).filter(Boolean);
                  const stayNights = guest.stayRequest
                    ? (['thursday_night', 'friday_night', 'saturday_night'] as const).filter(n => guest.stayRequest![n]).map(n => nightLabel[n])
                    : [];
                  const leader = guest.party_leader_id ? guests.find(g => g.id === guest.party_leader_id) : null;

                  return (
                    <tr key={guest.id} onClick={() => setViewingGuest(guest)} className={`cursor-pointer ${guest.party_leader_id ? 'hover:bg-gray-100 bg-gray-50/50' : 'hover:bg-gray-100'}`}>
                      {/* Name */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {guest.party_leader_id && <span className="w-3 h-px bg-gray-300 inline-block flex-shrink-0 ml-2" />}
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium text-gray-900 whitespace-nowrap">{guest.name}</span>
                              {guest.party_role && guest.party_role !== 'primary' && (
                                <span className="text-xs text-gray-400 border border-gray-200 rounded px-1.5 py-0.5">{roleLabel[guest.party_role]}</span>
                              )}
                            </div>
                            {leader && <p className="text-xs text-gray-400 mt-0.5">with {leader.name}</p>}
                            {!leader && guest.email && <p className="text-xs text-gray-400 mt-0.5">{guest.email}</p>}
                          </div>
                        </div>
                      </td>

                      {/* Tags */}
                      <td className="px-4 py-3 text-xs whitespace-nowrap">
                        {guest.tags?.length ? (
                          <div className="flex flex-wrap gap-1">
                            {guest.tags.map(tag => (
                              <span key={tag} className={`inline-block px-2 py-1 rounded-full text-xs border ${getTagColor(tag)}`}>
                                {tag}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-500">—</span>
                        )}
                      </td>

                      {/* Per-event RSVP — party members don't have independent RSVPs */}
                      {events.map(e => {
                        const rsvp = guest.rsvps[e.id];
                        const invited = guest.events.includes(e.id);
                        const isPartyMember = !!guest.party_leader_id;
                        return (
                          <td key={e.id} className="px-4 py-3">
                            {isPartyMember ? (
                              <span className="text-gray-300 text-xs">—</span>
                            ) : !invited ? (
                              <span className="text-gray-300 text-xs">—</span>
                            ) : rsvp ? (
                              <span style={{ ...STATUS_STYLE[rsvp.status], fontSize: 11, padding: '2px 8px', borderRadius: 4 }}>
                                {rsvp.status}
                              </span>
                            ) : (
                              <span className="text-xs text-amber-500">Pending</span>
                            )}
                          </td>
                        );
                      })}

                      {/* Dietary */}
                      <td className="px-4 py-3 text-xs text-gray-600 max-w-[180px]">
                        {allDietary.length === 0 && allDietaryNotes.length === 0
                          ? <span className="text-gray-300">—</span>
                          : <div>
                              {allDietary.length > 0 && <p>{allDietary.join(', ')}</p>}
                              {allDietaryNotes.map((n, i) => <p key={i} className="text-gray-400 mt-0.5 italic">{n}</p>)}
                              {allDietary.length === 0 && allDietaryNotes.length === 0 && <span className="text-gray-400">None</span>}
                            </div>
                        }
                      </td>

                      {/* Stay */}
                      <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                        {!guest.venue_stay_invited
                          ? <span className="text-gray-300">—</span>
                          : stayNights.length > 0
                          ? stayNights.join(', ')
                          : <span className="text-amber-500">Pending</span>}
                      </td>

                      {/* Notes */}
                      <td className="px-4 py-3 text-xs text-gray-500 max-w-[120px]">
                        <span className="line-clamp-1 cursor-help" title={guest.notes || undefined}>
                          {guest.notes || <span className="text-gray-300">—</span>}
                        </span>
                      </td>

                      {/* Save the Date status — party members inherit from primary */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {guest.party_leader_id ? (
                          <span className="text-gray-300 text-xs">—</span>
                        ) : guest.attending ? (
                          <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                            guest.attending === 'yes' ? 'bg-green-100 text-green-700' :
                            guest.attending === 'no' ? 'bg-red-100 text-red-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {guest.attending === 'yes' ? '✓ Yes' : guest.attending === 'no' ? '✗ No' : '? Maybe'}
                          </span>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>

                      {/* Invited status — party members inherit from primary */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {guest.party_leader_id ? (
                          <span className="text-xs text-gray-300">—</span>
                        ) : guest.invited_at ? (
                          <div>
                            <span className="text-xs text-green-600">✓ Sent</span>
                            <p className="text-xs text-gray-400 mt-0.5">{new Date(guest.invited_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</p>
                          </div>
                        ) : guest.email ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); sendInvite(guest.id); }}
                            disabled={sending === guest.id}
                            className="text-xs text-gray-500 hover:text-gray-900 border border-gray-200 rounded px-2 py-1 hover:border-gray-400 disabled:opacity-40 whitespace-nowrap"
                          >
                            {sending === guest.id ? '…' : 'Send invite'}
                          </button>
                        ) : (
                          <span className="text-xs text-gray-300">No email</span>
                        )}
                      </td>

                      {/* Invite link */}
                      <td className="px-4 py-3">
                        {!guest.party_leader_id && (
                          <button onClick={() => copyLink(guest.invite_token)} className="text-xs text-gray-400 hover:text-gray-700 font-mono whitespace-nowrap">
                            {copied === guest.invite_token ? '✓ Copied' : guest.invite_token.slice(0, 8) + '…'}
                          </button>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3 justify-end whitespace-nowrap">
                          {!guest.party_leader_id && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setForm({ ...EMPTY_FORM, tags: guest.tags || [], language: guest.language, party_role: 'partner', party_leader_id: guest.id, event_ids: guest.events, venue_stay_invited: guest.venue_stay_invited });
                                setEditingId(null); setShowForm(true);
                              }}
                              className="text-xs text-gray-400 hover:text-gray-700"
                              title="Add party member"
                            >+ Party</button>
                          )}
                          <button onClick={(e) => { e.stopPropagation(); openEdit(guest); }} className="text-xs text-gray-400 hover:text-gray-700">Edit</button>
                          <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm(guest.id); }} className="text-xs text-red-400 hover:text-red-600">Delete</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
        </div>
      )}

      {/* Add/Edit form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-5 border-b border-gray-200 sticky top-0 bg-white">
              <h2 className="text-lg font-semibold text-gray-900">{editingId ? 'Edit guest' : 'Add guest'}</h2>
            </div>
            <div className="px-6 py-5 space-y-4">
              <Field label="Name *"><input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input" /></Field>
              {form.party_role === 'primary' && (
                <Field label="Email"><input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="input" /></Field>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Tags</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Type and press Enter"
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const input = e.target as HTMLInputElement;
                        const newTag = input.value.trim();
                        if (newTag && !form.tags?.includes(newTag)) {
                          setForm(f => ({ ...f, tags: [...(f.tags || []), newTag] }));
                          input.value = '';
                        }
                      }
                    }}
                    list="tags-list"
                    className="input flex-1"
                  />
                  <datalist id="tags-list">
                    {tags.filter(t => !form.tags?.includes(t)).map(t => <option key={t} value={t} />)}
                  </datalist>
                </div>
                {form.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {form.tags.map(tag => (
                      <span key={tag} className={`inline-flex items-center gap-2 px-2 py-1 rounded-full text-xs border ${getTagColor(tag)}`}>
                        {tag}
                        <button
                          type="button"
                          onClick={() => setForm(f => ({ ...f, tags: f.tags?.filter(t => t !== tag) || [] }))}
                          className="hover:opacity-70"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
                <Field label="Language">
                  <select value={form.language} onChange={e => setForm(f => ({ ...f, language: e.target.value }))} className="input">
                    <option value="en">English</option>
                    <option value="pt">Portuguese</option>
                    <option value="es">Spanish</option>
                  </select>
                </Field>
                <Field label="Save the Date">
                  <select value={form.attending} onChange={e => setForm(f => ({ ...f, attending: e.target.value }))} className="input">
                    <option value="">No answer</option>
                    <option value="yes">Yes, attending</option>
                    <option value="no">No, not attending</option>
                    <option value="perhaps">Maybe</option>
                  </select>
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Role in party">
                  <select value={form.party_role} onChange={e => setForm(f => ({ ...f, party_role: e.target.value, party_leader_id: e.target.value === 'primary' ? '' : f.party_leader_id }))} className="input">
                    <option value="primary">Primary guest</option>
                    <option value="partner">Partner</option>
                    <option value="child">Child</option>
                    <option value="other">Other</option>
                  </select>
                </Field>
                {form.party_role !== 'primary' && (
                  <Field label="Travelling with">
                    <select value={form.party_leader_id} onChange={e => setForm(f => ({ ...f, party_leader_id: e.target.value }))} className="input">
                      <option value="">Select primary guest…</option>
                      {primaryGuests.filter(g => g.id !== editingId).map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                  </Field>
                )}
              </div>
              {(events.length > 0 || true) && (
                <div className="border border-gray-100 rounded-lg p-3 space-y-2">
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Events</p>
                  {events.map(e => (
                    <label key={e.id} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form.event_ids.includes(e.id)} onChange={ev => setForm(f => ({ ...f, event_ids: ev.target.checked ? [...f.event_ids, e.id] : f.event_ids.filter(id => id !== e.id) }))} className="rounded border-gray-300" />
                      <span className="text-sm text-gray-700">{(e.name as any)?.en || 'Event'}</span>
                    </label>
                  ))}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.venue_stay_invited} onChange={e => setForm(f => ({ ...f, venue_stay_invited: e.target.checked }))} className="rounded border-gray-300" />
                    <span className="text-sm text-gray-700">Invited to stay at the venue</span>
                  </label>
                </div>
              )}
              <Field label="Admin notes"><textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="input resize-none" rows={2} placeholder="Accessibility, internal reminders…" /></Field>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 sticky bottom-0 bg-white">
              <button onClick={() => setShowForm(false)} className="text-sm text-gray-500 px-4 py-2">Cancel</button>
              <button onClick={handleSave} disabled={saving || !form.name.trim()} className="bg-gray-900 text-white text-sm font-medium px-5 py-2 rounded-md hover:bg-gray-700 disabled:opacity-50">{saving ? 'Saving…' : editingId ? 'Save changes' : 'Add guest'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 text-center">
            <p className="font-semibold text-gray-900 mb-2">Delete this guest?</p>
            <p className="text-sm text-gray-500 mb-6">This removes all their RSVPs and event assignments.</p>
            <div className="flex justify-center gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="text-sm text-gray-500 px-4 py-2">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="bg-red-500 text-white text-sm font-medium px-5 py-2 rounded-md hover:bg-red-600">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* View guest modal */}
      {viewingGuest && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-5 border-b border-gray-200 sticky top-0 bg-white flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">{viewingGuest.name}</h2>
              <button onClick={() => setViewingGuest(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="px-6 py-5 space-y-6">
              {/* Basic info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase mb-1">Email</p>
                  <p className="text-sm text-gray-900">{viewingGuest.email || '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase mb-1">Phone</p>
                  <p className="text-sm text-gray-900">{viewingGuest.phone || '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase mb-1">Language</p>
                  <p className="text-sm text-gray-900">{viewingGuest.language.toUpperCase()}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase mb-1">Role</p>
                  <p className="text-sm text-gray-900">{viewingGuest.party_role === 'primary' ? 'Primary Guest' : viewingGuest.party_role?.charAt(0).toUpperCase() + viewingGuest.party_role?.slice(1)}</p>
                </div>
              </div>

              {/* Tags */}
              {viewingGuest.tags?.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase mb-2">Tags</p>
                  <div className="flex flex-wrap gap-2">
                    {viewingGuest.tags.map(tag => (
                      <span key={tag} className={`inline-block px-2 py-1 rounded-full text-xs border ${getTagColor(tag)}`}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Save the date */}
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase mb-1">Save the Date Response</p>
                {viewingGuest.attending ? (
                  <p className={`text-sm font-medium ${
                    viewingGuest.attending === 'yes' ? 'text-green-700' :
                    viewingGuest.attending === 'no' ? 'text-red-700' :
                    'text-yellow-700'
                  }`}>
                    {viewingGuest.attending === 'yes' ? '✓ Yes, attending' : viewingGuest.attending === 'no' ? '✗ Not attending' : '? Maybe'}
                  </p>
                ) : (
                  <p className="text-sm text-gray-500">No response</p>
                )}
              </div>

              {/* Events and RSVPs */}
              {events.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase mb-2">Extras</p>
                  <div className="space-y-2">
                    {events.map(event => {
                      const rsvp = viewingGuest.rsvps[event.id];
                      const invited = viewingGuest.events.includes(event.id);
                      return (
                        <div key={event.id} className="text-sm border border-gray-100 rounded p-3">
                          <p className="font-medium text-gray-900">{(event.name as any)?.en || 'Event'}</p>
                          {invited ? (
                            <p className={`text-xs mt-1 ${
                              rsvp?.status === 'attending' ? 'text-green-600' :
                              rsvp?.status === 'declined' ? 'text-red-600' :
                              'text-amber-600'
                            }`}>
                              {rsvp?.status === 'attending' ? '✓ Attending' : rsvp?.status === 'declined' ? '✗ Declined' : '◐ Pending'}
                            </p>
                          ) : (
                            <p className="text-xs text-gray-400 mt-1">Not invited</p>
                          )}
                          {rsvp?.dietary_notes && <p className="text-xs text-gray-500 mt-1">Diet: {rsvp.dietary_notes}</p>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Party members (only shown on primary guest) */}
              {!viewingGuest.party_leader_id && (() => {
                const members = guests.filter(g => g.party_leader_id === viewingGuest.id);
                if (!members.length) return null;
                return (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase mb-2">Party members</p>
                    <div className="space-y-2">
                      {members.map(m => (
                        <div key={m.id} className="flex items-center justify-between border border-gray-100 rounded p-3">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{m.name}</p>
                            <p className="text-xs text-gray-400 capitalize">{m.party_role}</p>
                          </div>
                          <button
                            onClick={() => { setViewingGuest(null); openEdit(m); }}
                            className="text-xs text-gray-400 hover:text-gray-700"
                          >Edit</button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Notes */}
              {viewingGuest.notes && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase mb-1">Notes</p>
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">{viewingGuest.notes}</p>
                </div>
              )}

              {/* Invite link */}
              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs font-medium text-gray-500 uppercase mb-2">Invite Link</p>
                <div className="flex gap-2">
                  {(() => {
                    const localePrefix = viewingGuest.language === 'en' ? '' : `/${viewingGuest.language}`;
                    const inviteLink = `${typeof window !== 'undefined' ? window.location.origin : ''}${localePrefix}/invite?guest=${viewingGuest.invite_token}`;
                    return (
                      <>
                        <input
                          type="text"
                          readOnly
                          value={inviteLink}
                          className="flex-1 text-xs px-3 py-2 border border-gray-200 rounded bg-gray-50 font-mono"
                        />
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(inviteLink);
                            setCopied(viewingGuest.id);
                            setTimeout(() => setCopied(null), 2000);
                          }}
                          className="text-xs px-3 py-2 border border-gray-200 rounded hover:bg-gray-50 font-medium"
                        >
                          {copied === viewingGuest.id ? '✓ Copied' : 'Copy'}
                        </button>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Actions */}
              <div className="border-t border-gray-100 pt-4 flex gap-3">
                <button
                  onClick={() => {
                    openEdit(viewingGuest);
                    setViewingGuest(null);
                  }}
                  className="flex-1 text-sm text-gray-700 px-4 py-2 border border-gray-200 rounded hover:bg-gray-50 font-medium"
                >
                  Edit
                </button>
                <button
                  onClick={() => {
                    setViewingGuest(null);
                  }}
                  className="flex-1 text-sm text-gray-700 px-4 py-2 border border-gray-200 rounded hover:bg-gray-50 font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`.input{width:100%;border:1px solid #e5e7eb;border-radius:6px;padding:8px 12px;font-size:14px;color:#111827;outline:none}.input:focus{border-color:#6b7280}`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>{children}</div>;
}
