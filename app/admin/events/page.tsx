'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Event {
  id: string;
  name: string;
  slug: string | null;
  event_date: string | null;
  event_time: string | null;
  location: string | null;
  description: string | null;
  sort_order: number;
}

interface GuestRow {
  id: string;
  name: string;
  email: string | null;
  status: string | null; // rsvp status, null = no response
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
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    const [eventsRes, rsvpRes, geRes, guestsRes] = await Promise.all([
      supabase.from('events').select('*').order('sort_order'),
      supabase.from('rsvp_responses').select('event_id, status, guest_id'),
      supabase.from('guest_events').select('event_id, guest_id'),
      supabase.from('guests').select('id, name, email'),
    ]);
    setEvents(eventsRes.data || []);
    setRsvps(rsvpRes.data || []);

    const counts: Record<string, number> = {};
    for (const ge of (geRes.data || [])) counts[ge.event_id] = (counts[ge.event_id] || 0) + 1;
    setGuestCounts(counts);

    // Build guest list per event with RSVP status
    const guestsMap: Record<string, { id: string; name: string; email: string | null }> = {};
    for (const g of (guestsRes.data || [])) guestsMap[g.id] = g;
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
  };

  const popupEvent = events.find(e => e.id === guestPopupEventId);
  const popupGuests = guestPopupEventId ? (guestsByEvent[guestPopupEventId] || []) : [];

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-1">Events</h1>
          <p className="text-sm text-gray-500">{loading ? '…' : `${events.length} event${events.length !== 1 ? 's' : ''}`}</p>
        </div>
        <button
          onClick={() => { setForm({}); setIsAdding(true); }}
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
                    <h2 className="text-lg font-semibold text-gray-900">{event.name}</h2>
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
                  <button onClick={() => { setForm({ ...event }); setEditingId(event.id); }} className="text-sm text-gray-400 hover:text-gray-700">Edit</button>
                  <button onClick={() => setDeleteConfirm(event.id)} className="text-sm text-red-400 hover:text-red-600">Delete</button>
                </div>
              </div>
              {event.description && <p className="text-sm text-gray-600 mb-4">{event.description}</p>}
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
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{popupEvent?.name}</h2>
                <p className="text-xs text-gray-400 mt-0.5">{popupGuests.length} invited</p>
              </div>
              <button onClick={() => setGuestPopupEventId(null)} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
            </div>
            <div className="overflow-y-auto flex-1 divide-y divide-gray-100">
              {popupGuests.length === 0 && (
                <p className="px-6 py-8 text-sm text-gray-400 text-center">No guests invited yet.</p>
              )}
              {popupGuests.map(g => (
                <div key={g.id} className="px-6 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{g.name}</p>
                    {g.email && <p className="text-xs text-gray-400">{g.email}</p>}
                  </div>
                  {g.status ? (
                    <span style={{ ...STATUS_STYLE[g.status], fontSize: 11, padding: '2px 8px', borderRadius: 4 }}>{g.status}</span>
                  ) : (
                    <span className="text-xs text-amber-500">Pending</span>
                  )}
                </div>
              ))}
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
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Name *"><input type="text" value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input" /></Field>
                <Field label="Slug">
                  <input type="text" value={form.slug || ''} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} className="input" placeholder="e.g. wedding, pre-party, aftermath" />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Date"><input type="date" value={form.event_date || ''} onChange={e => setForm(f => ({ ...f, event_date: e.target.value }))} className="input" /></Field>
                <Field label="Time"><input type="time" value={form.event_time || ''} onChange={e => setForm(f => ({ ...f, event_time: e.target.value }))} className="input" /></Field>
              </div>
              <Field label="Location"><input type="text" value={form.location || ''} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} className="input" /></Field>
              <Field label="Description"><textarea value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="input resize-none" rows={3} /></Field>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button onClick={() => { setEditingId(null); setIsAdding(false); }} className="text-sm text-gray-500 px-4 py-2">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="bg-gray-900 text-white text-sm font-medium px-5 py-2 rounded-md hover:bg-gray-700 disabled:opacity-50">{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
      {/* Delete confirmation */}
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

      <style jsx>{`.input{width:100%;border:1px solid #e5e7eb;border-radius:6px;padding:8px 12px;font-size:14px;color:#111827;outline:none}.input:focus{border-color:#6b7280}`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>{children}</div>;
}
