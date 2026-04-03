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
  group_name: string | null; language: string; notes: string | null;
  invite_token: string; party_role: string; party_leader_id: string | null;
  venue_stay_invited: boolean; invited_at: string | null; events: string[];
  rsvps: Record<string, RsvpDetail>;
  stayRequest: StayRequest | null;
}

const EMPTY_FORM = {
  name: '', email: '', phone: '', group_name: '', language: 'en', notes: '',
  party_role: 'primary', party_leader_id: '', venue_stay_invited: false,
  event_ids: [] as string[],
};

const STATUS_STYLE: Record<string, React.CSSProperties> = {
  attending: { background: '#dcfce7', color: '#16a34a' },
  declined:  { background: '#fee2e2', color: '#dc2626' },
};

export default function GuestsPage() {
  const [guests, setGuests]             = useState<Guest[]>([]);
  const [events, setEvents]             = useState<Event[]>([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState('');
  const [groupFilter, setGroupFilter]   = useState('');
  const [rsvpFilter, setRsvpFilter]     = useState('');
  const [showForm, setShowForm]         = useState(false);
  const [form, setForm]                 = useState(EMPTY_FORM);
  const [editingId, setEditingId]       = useState<string | null>(null);
  const [saving, setSaving]             = useState(false);
  const [copied, setCopied]             = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
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

  const ceremonyEvent = events.find(e => e.name.toLowerCase().includes('ceremon')) || events[0];
  const extraEvents   = events.filter(e => e.id !== ceremonyEvent?.id);

  const openNew  = () => {
    const autoIds = ceremonyEvent ? [ceremonyEvent.id] : [];
    setForm({ ...EMPTY_FORM, event_ids: autoIds });
    setEditingId(null); setShowForm(true);
  };
  const openEdit = (g: Guest) => {
    setForm({ name: g.name, email: g.email || '', phone: g.phone || '',
      group_name: g.group_name || '', language: g.language, notes: g.notes || '',
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
        group_name: form.group_name || null, language: form.language, notes: form.notes || null,
        party_role: form.party_role, party_leader_id: form.party_leader_id || null,
        venue_stay_invited: form.venue_stay_invited,
      };
      if (editingId) {
        await supabase.from('guests').update(payload).eq('id', editingId);
        await supabase.from('guest_events').delete().eq('guest_id', editingId);
        if (form.event_ids.length > 0)
          await supabase.from('guest_events').insert(form.event_ids.map(eid => ({ guest_id: editingId, event_id: eid })));
      } else {
        const { data: newGuest } = await supabase.from('guests').insert(payload).select('id').single();
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

  const copyLink = (token: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/invite?guest=${token}`);
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

  const tags          = Array.from(new Set(guests.map(g => g.group_name).filter(Boolean))) as string[];
  const primaryGuests = guests.filter(g => !g.party_leader_id);
  const filtered      = guests.filter(g => {
    const matchSearch = g.name.toLowerCase().includes(search.toLowerCase()) || (g.email || '').toLowerCase().includes(search.toLowerCase());
    const matchTag    = !groupFilter || g.group_name === groupFilter;
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

  // Sort so party members appear directly below their primary guest
  const sortedFiltered = (() => {
    const primaries = filtered.filter(g => !g.party_leader_id);
    const result: Guest[] = [];
    for (const p of primaries) {
      result.push(p);
      result.push(...filtered.filter(g => g.party_leader_id === p.id));
    }
    const inResult = new Set(result.map(g => g.id));
    filtered.filter(g => !inResult.has(g.id)).forEach(g => result.push(g));
    return result;
  })();

  const roleLabel: Record<string, string> = { primary: '', partner: 'Partner', child: 'Child', other: 'Other' };
  const nightLabel: Record<string, string> = { thursday_night: 'Thu', friday_night: 'Fri', saturday_night: 'Sat' };

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Guests</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {guests.length} guests · {Object.values(guests.flatMap(g => Object.values(g.rsvps))).filter((r: any) => r.status === 'attending').length} attending · {guests.filter(g => g.invited_at).length} invited
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
          <button onClick={openNew} className="bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-gray-700">+ Add guest</button>
        </div>
      </div>

      <div className="flex gap-3 mb-5">
        <input type="text" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} className="border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-900 w-64 focus:outline-none focus:border-gray-400" />
        <select value={groupFilter} onChange={e => setGroupFilter(e.target.value)} className="border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-gray-400">
          <option value="">All tags</option>
          {tags.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={rsvpFilter} onChange={e => setRsvpFilter(e.target.value)} className="border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-gray-400">
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
                  <th className="text-left px-4 py-3 font-medium text-gray-500 whitespace-nowrap">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 whitespace-nowrap">Tag</th>
                  {events.map(e => (
                    <th key={e.id} className="text-left px-4 py-3 font-medium text-gray-500 whitespace-nowrap">{e.name.split(' ')[0]}</th>
                  ))}
                  <th className="text-left px-4 py-3 font-medium text-gray-500 whitespace-nowrap">Dietary</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 whitespace-nowrap">Stay</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 whitespace-nowrap">Notes</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 whitespace-nowrap">Invited</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 whitespace-nowrap">Link</th>
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
                    <tr key={guest.id} className={guest.party_leader_id ? 'hover:bg-gray-50 bg-gray-50/50' : 'hover:bg-gray-50'}>
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

                      {/* Group */}
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{guest.group_name || '—'}</td>

                      {/* Per-event RSVP */}
                      {events.map(e => {
                        const rsvp = guest.rsvps[e.id];
                        const invited = guest.events.includes(e.id);
                        return (
                          <td key={e.id} className="px-4 py-3">
                            {!invited ? (
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
                      <td className="px-4 py-3 text-xs text-gray-500 max-w-[180px]">
                        <span className="line-clamp-2">{guest.notes || <span className="text-gray-300">—</span>}</span>
                      </td>

                      {/* Invited status */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {guest.invited_at ? (
                          <div>
                            <span className="text-xs text-green-600">✓ Sent</span>
                            <p className="text-xs text-gray-400 mt-0.5">{new Date(guest.invited_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</p>
                          </div>
                        ) : guest.email ? (
                          <button
                            onClick={() => sendInvite(guest.id)}
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
                        <button onClick={() => copyLink(guest.invite_token)} className="text-xs text-gray-400 hover:text-gray-700 font-mono whitespace-nowrap">
                          {copied === guest.invite_token ? '✓ Copied' : guest.invite_token.slice(0, 8) + '…'}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3 justify-end whitespace-nowrap">
                          {!guest.party_leader_id && (
                            <button
                              onClick={() => {
                                setForm({ ...EMPTY_FORM, group_name: guest.group_name || '', language: guest.language, party_role: 'partner', party_leader_id: guest.id, event_ids: guest.events, venue_stay_invited: guest.venue_stay_invited });
                                setEditingId(null); setShowForm(true);
                              }}
                              className="text-xs text-gray-400 hover:text-gray-700"
                              title="Add party member"
                            >+ Party</button>
                          )}
                          <button onClick={() => openEdit(guest)} className="text-xs text-gray-400 hover:text-gray-700">Edit</button>
                          <button onClick={() => setDeleteConfirm(guest.id)} className="text-xs text-red-400 hover:text-red-600">Delete</button>
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
              <Field label="Email"><input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="input" /></Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Tag"><input type="text" value={form.group_name} onChange={e => setForm(f => ({ ...f, group_name: e.target.value }))} className="input" list="tags-list" /><datalist id="tags-list">{tags.map(t => <option key={t} value={t} />)}</datalist></Field>
                <Field label="Language">
                  <select value={form.language} onChange={e => setForm(f => ({ ...f, language: e.target.value }))} className="input">
                    <option value="en">English</option>
                    <option value="pt">Portuguese</option>
                    <option value="es">Spanish</option>
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
              {(extraEvents.length > 0 || true) && (
                <div className="border border-gray-100 rounded-lg p-3 space-y-2">
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Extras</p>
                  {extraEvents.map(e => (
                    <label key={e.id} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form.event_ids.includes(e.id)} onChange={ev => setForm(f => ({ ...f, event_ids: ev.target.checked ? [...f.event_ids, e.id] : f.event_ids.filter(id => id !== e.id) }))} className="rounded border-gray-300" />
                      <span className="text-sm text-gray-700">{e.name}</span>
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
      <style jsx>{`.input{width:100%;border:1px solid #e5e7eb;border-radius:6px;padding:8px 12px;font-size:14px;color:#111827;outline:none}.input:focus{border-color:#6b7280}`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>{children}</div>;
}
