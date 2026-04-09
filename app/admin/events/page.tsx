'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Event {
  id: string;
  name: { en: string; pt: string; es: string };
  slug: string | null;
  event_date: string | null;
  event_time: string | null;
  location: string | null;
  description: { en: string; pt: string; es: string };
  sort_order: number;
}

interface GuestRow {
  id: string;
  name: string;
  email: string | null;
  status: string | null; // rsvp status, null = no response
  tags: string[];
  party_leader_id: string | null;
  party_role: string | null;
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [rsvps, setRsvps] = useState<{ event_id: string; status: string }[]>([]);
  const [guestCounts, setGuestCounts] = useState<Record<string, number>>({});
  const [guestsByEvent, setGuestsByEvent] = useState<Record<string, GuestRow[]>>({});
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [guestPopupEventId, setGuestPopupEventId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Event>>({});
  const [eventTab, setEventTab] = useState<'en' | 'pt' | 'es'>('en');
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleteEventConfirm, setDeleteEventConfirm] = useState<{ eventId: string; guestId: string } | null>(null);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    const [eventsRes, rsvpRes, geRes, guestsRes] = await Promise.all([
      supabase.from('events').select('*').order('sort_order'),
      supabase.from('rsvp_responses').select('event_id, status, guest_id'),
      supabase.from('guest_events').select('event_id, guest_id'),
      supabase.from('guests').select('id, name, email, tags, party_leader_id, party_role'),
    ]);
    setEvents(eventsRes.data || []);
    setRsvps(rsvpRes.data || []);

    const counts: Record<string, number> = {};
    for (const ge of (geRes.data || [])) counts[ge.event_id] = (counts[ge.event_id] || 0) + 1;
    setGuestCounts(counts);

    // Build guest list per event with RSVP status and tags
    const guestsMap: Record<string, { id: string; name: string; email: string | null; tags: string[]; party_leader_id: string | null; party_role: string | null }> = {};
    for (const g of (guestsRes.data || [])) guestsMap[g.id] = { ...g, tags: g.tags || [] };
    const rsvpMap: Record<string, Record<string, string>> = {};
    for (const r of (rsvpRes.data || [])) {
      if (!rsvpMap[r.event_id]) rsvpMap[r.event_id] = {};
      rsvpMap[r.event_id][r.guest_id] = r.status;
    }
    const byEvent: Record<string, GuestRow[]> = {};
    for (const ge of (geRes.data || [])) {
      if (!byEvent[ge.event_id]) byEvent[ge.event_id] = [];
      const g = guestsMap[ge.guest_id];
      if (g) byEvent[ge.event_id].push({ ...g, status: rsvpMap[ge.event_id]?.[ge.guest_id] || null });
    }
    // Sort each event's guests alphabetically
    for (const id in byEvent) byEvent[id].sort((a, b) => a.name.localeCompare(b.name));
    setGuestsByEvent(byEvent);

    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    if (isAdding) {
      await supabase.from('events').insert({
        name: form.name,
        slug: form.slug || null,
        event_date: form.event_date || null,
        event_time: form.event_time || null,
        location: form.location || null,
        description: form.description || null,
        sort_order: events.length,
      });
      setIsAdding(false);
    } else {
      if (!editingId) { setSaving(false); return; }
      await supabase.from('events').update({
        name: form.name,
        slug: form.slug || null,
        event_date: form.event_date || null,
        event_time: form.event_time || null,
        location: form.location || null,
        description: form.description || null,
      }).eq('id', editingId);
      setEditingId(null);
    }
    setSaving(false);
    await fetchAll();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('events').delete().eq('id', id);
    setDeleteConfirm(null);
    await fetchAll();
  };

  const handleRemoveGuestFromEvent = async (eventId: string, guestId: string) => {
    await supabase.from('guest_events').delete().eq('event_id', eventId).eq('guest_id', guestId);
    setDeleteEventConfirm(null);
    await fetchAll();
  };

  const handleMove = async (index: number, dir: 'up' | 'down') => {
    const swapIndex = dir === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= events.length) return;
    const updated = [...events];
    [updated[index], updated[swapIndex]] = [updated[swapIndex], updated[index]];
    // Persist new sort_order values
    await Promise.all(updated.map((e, i) =>
      supabase.from('events').update({ sort_order: i }).eq('id', e.id)
    ));
    await fetchAll();
  };

  const count = (eventId: string, status: string) =>
    rsvps.filter(r => r.event_id === eventId && r.status === status).length;

  const STATUS_STYLE: Record<string, React.CSSProperties> = {
    attending: { background: '#dcfce7', color: '#16a34a' },
    declined:  { background: '#fee2e2', color: '#dc2626' },
    pending:   { background: '#f3f4f6', color: '#4b5563' },
  };

  const getTagColor = (tag: string): string => {
    const gianTags = ['gian', 'gianfamily', 'gianfriends'];
    const catTags = ['cat', 'catfamily', 'catfriends'];
    const greenShades = [
      'border-green-600 text-green-600 bg-green-600/10',
      'border-emerald-600 text-emerald-600 bg-emerald-600/10',
      'border-teal-600 text-teal-600 bg-teal-600/10',
    ];
    const pinkShades = [
      'border-pink-600 text-pink-600 bg-pink-600/10',
      'border-rose-600 text-rose-600 bg-rose-600/10',
      'border-fuchsia-600 text-fuchsia-600 bg-fuchsia-600/10',
    ];

    if (gianTags.includes(tag.toLowerCase())) {
      return greenShades[gianTags.indexOf(tag.toLowerCase())];
    } else if (catTags.includes(tag.toLowerCase())) {
      return pinkShades[catTags.indexOf(tag.toLowerCase())];
    }
    return 'border-gray-300 text-gray-600 bg-gray-100';
  };

  const popupEvent = events.find(e => e.id === guestPopupEventId);
  const popupGuests = guestPopupEventId ? (guestsByEvent[guestPopupEventId] || []) : [];

  // Group guests by family (party_leader_id)
  const groupedGuests = (() => {
    // Build a map of all guests by id for quick lookup
    const allGuestsMap = new Map<string, GuestRow>();
    for (const guest of popupGuests) {
      allGuestsMap.set(guest.id, guest);
    }

    // Get primary guests (no party_leader_id) and sort by their primary tag
    const primaryGuests = popupGuests.filter(g => !g.party_leader_id);
    primaryGuests.sort((a, b) => {
      const aTag = a.tags[0] || '';
      const bTag = b.tags[0] || '';
      return aTag.localeCompare(bTag);
    });

    // Build groups: each primary with their party members
    const result: Array<{ primary: GuestRow; members: GuestRow[] }> = [];
    for (const primary of primaryGuests) {
      const members = popupGuests.filter(g => g.party_leader_id === primary.id);
      result.push({ primary, members });
    }

    return result;
  })();

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-1">Events</h1>
          <p className="text-sm text-gray-500">{loading ? '…' : `${events.length} event${events.length !== 1 ? 's' : ''}`}</p>
        </div>
        <button
          onClick={() => { setForm({ name: { en: '', pt: '', es: '' }, description: { en: '', pt: '', es: '' } }); setEventTab('en'); setIsAdding(true); }}
          className="bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-gray-700"
        >+ Add event</button>
      </div>

      {loading ? <p className="text-sm text-gray-400">Loading…</p> : (
        <div className="space-y-4">
          {events.map((event, i) => (
            <div key={event.id} className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold text-gray-900">{(event.name as any)?.en}</h2>
                    {event.slug && <span className="text-xs text-gray-400 font-mono bg-gray-100 px-2 py-0.5 rounded">{event.slug}</span>}
                  </div>
                  <p className="text-sm text-gray-500">
                    {event.event_date ? new Date(event.event_date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : 'Date TBC'}
                    {event.event_time ? ` · ${event.event_time.slice(0, 5)}` : ''}
                  </p>
                  {event.location && <p className="text-sm text-gray-500">{event.location}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex flex-col gap-0.5">
                    <button onClick={() => handleMove(i, 'up')} disabled={i === 0} className="text-gray-300 hover:text-gray-600 disabled:opacity-20 leading-none text-xs">▲</button>
                    <button onClick={() => handleMove(i, 'down')} disabled={i === events.length - 1} className="text-gray-300 hover:text-gray-600 disabled:opacity-20 leading-none text-xs">▼</button>
                  </div>
                  <button onClick={() => { setForm({ ...event }); setEventTab('en'); setEditingId(event.id); }} className="text-sm text-gray-400 hover:text-gray-700">Edit</button>
                  <button onClick={() => setDeleteConfirm(event.id)} className="text-sm text-red-400 hover:text-red-600">Delete</button>
                </div>
              </div>
              {(event.description as any)?.en && <p className="text-sm text-gray-600 mb-4">{(event.description as any)?.en}</p>}
              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <div className="flex gap-6">
                  {[
                    { label: 'Attending', value: count(event.id, 'attending'), color: 'text-green-600' },
                    { label: 'Declined',  value: count(event.id, 'declined'),  color: 'text-red-500' },
                    { label: 'No response', value: (guestCounts[event.id] || 0) - rsvps.filter(r => r.event_id === event.id).length, color: '' },
                  ].map(s => (
                    <div key={s.label} className="text-center">
                      <p className={`text-xl font-semibold ${s.color || 'text-gray-900'}`}>{s.value}</p>
                      <p className="text-xs text-gray-400">{s.label}</p>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setGuestPopupEventId(event.id)}
                  className="text-sm text-gray-500 hover:text-gray-900 border border-gray-200 rounded-md px-3 py-1.5 hover:border-gray-400 transition-colors"
                >
                  {guestCounts[event.id] || 0} guests →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Guest list popup */}
      {guestPopupEventId && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={() => setGuestPopupEventId(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{(popupEvent?.name as any)?.en}</h2>
                <p className="text-xs text-gray-400 mt-0.5">{popupGuests.length} invited</p>
              </div>
              <button onClick={() => setGuestPopupEventId(null)} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
            </div>
            <div className="overflow-y-auto flex-1 divide-y divide-gray-100">
              {popupGuests.length === 0 && (
                <p className="px-6 py-8 text-sm text-gray-400 text-center">No guests invited yet.</p>
              )}
              {groupedGuests.map(({ primary, members }) => {
                // Group party members by role
                const byRole: Record<string, string[]> = { partner: [], child: [], other: [] };
                for (const m of members) {
                  const role = m.party_role || 'other';
                  byRole[role].push(m.name);
                }

                // Build party members display string
                const partyParts: string[] = [];
                if (byRole.partner.length > 0) partyParts.push(`Partner: ${byRole.partner.join(', ')}`);
                if (byRole.child.length > 0) partyParts.push(`Children: ${byRole.child.join(', ')}`);
                if (byRole.other.length > 0) partyParts.push(`Other: ${byRole.other.join(', ')}`);
                const partyDisplay = partyParts.join(' • ');

                return (
                  <div key={primary.id} className="px-6 py-3 hover:bg-gray-50">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {/* Name with tags inline */}
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p className="text-sm font-medium text-gray-900">{primary.name}</p>
                          {primary.tags.length > 0 && primary.tags.map(tag => (
                            <span key={tag} className={`inline-block px-2 py-0.5 rounded text-xs font-medium border ${getTagColor(tag)}`}>
                              {tag}
                            </span>
                          ))}
                        </div>
                        {/* Party members */}
                        {partyDisplay && (
                          <p className="text-xs text-gray-500">{partyDisplay}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-6 flex-shrink-0">
                        {primary.status ? (
                          <span style={{ ...STATUS_STYLE[primary.status], fontSize: 11, padding: '2px 8px', borderRadius: 4 }} className="whitespace-nowrap">{primary.status}</span>
                        ) : (
                          <span style={{ ...STATUS_STYLE.pending, fontSize: 11, padding: '2px 8px', borderRadius: 4 }} className="whitespace-nowrap font-medium">Pending</span>
                        )}
                        <button
                          onClick={() => setDeleteEventConfirm({ eventId: guestPopupEventId!, guestId: primary.id })}
                          className="text-sm text-red-400 hover:text-red-600"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit event modal */}
      {(editingId || isAdding) && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="px-6 py-5 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">{isAdding ? 'Add event' : 'Edit event'}</h2>
              <div className="flex gap-1 mt-4 border-b border-gray-200">
                {(['en', 'pt', 'es'] as const).map(lang => (
                  <button
                    key={lang}
                    onClick={() => setEventTab(lang)}
                    className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${eventTab === lang ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                  >
                    {lang.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <div className="px-6 py-5 space-y-4">
              <Field label="Name *"><input type="text" value={(form.name as any)?.[eventTab] || ''} onChange={e => setForm(f => ({ ...f, name: { ...(f.name as any), [eventTab]: e.target.value } }))} className="input" /></Field>
              <Field label="Slug">
                <input type="text" value={form.slug || ''} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} className="input" placeholder="e.g. wedding, pre-party, aftermath" />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Date"><input type="date" value={form.event_date || ''} onChange={e => setForm(f => ({ ...f, event_date: e.target.value }))} className="input" /></Field>
                <Field label="Time"><input type="time" value={form.event_time || ''} onChange={e => setForm(f => ({ ...f, event_time: e.target.value }))} className="input" /></Field>
              </div>
              <Field label="Location"><input type="text" value={form.location || ''} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} className="input" /></Field>
              <Field label="Description"><textarea value={(form.description as any)?.[eventTab] || ''} onChange={e => setForm(f => ({ ...f, description: { ...(f.description as any), [eventTab]: e.target.value } }))} className="input resize-none" rows={3} /></Field>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button onClick={() => { setEditingId(null); setIsAdding(false); }} className="text-sm text-gray-500 px-4 py-2">Cancel</button>
              <button onClick={handleSave} disabled={saving || !((form.name as any)?.[eventTab]?.trim?.())} className="bg-gray-900 text-white text-sm font-medium px-5 py-2 rounded-md hover:bg-gray-700 disabled:opacity-50">{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
      {/* Delete event confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 text-center">
            <p className="font-semibold text-gray-900 mb-2">Delete this event?</p>
            <p className="text-sm text-gray-500 mb-6">This will remove all guest assignments and RSVPs for this event.</p>
            <div className="flex justify-center gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="text-sm text-gray-500 px-4 py-2">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="bg-red-500 text-white text-sm font-medium px-5 py-2 rounded-md hover:bg-red-600">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete guest from event confirmation */}
      {deleteEventConfirm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 text-center">
            <p className="font-semibold text-gray-900 mb-2">Remove from event?</p>
            <p className="text-sm text-gray-500 mb-6">This guest will be removed from the event invitation.</p>
            <div className="flex justify-center gap-3">
              <button onClick={() => setDeleteEventConfirm(null)} className="text-sm text-gray-500 px-4 py-2">Cancel</button>
              <button onClick={() => handleRemoveGuestFromEvent(deleteEventConfirm.eventId, deleteEventConfirm.guestId)} className="bg-red-500 text-white text-sm font-medium px-5 py-2 rounded-md hover:bg-red-600">Remove</button>
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
