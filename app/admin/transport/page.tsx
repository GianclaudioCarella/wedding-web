'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function TransportPage() {
  const [options, setOptions] = useState<any[]>([]);
  const [signups, setSignups] = useState<any[]>([]);
  const [guests, setGuests] = useState<any[]>([]);
  const [confirmedIds, setConfirmedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: '', direction: 'to_venue', departure_location: '', departure_time: '', return_time: '', capacity: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [guestSearch, setGuestSearch] = useState('');
  const [addingGuestId, setAddingGuestId] = useState<string | null>(null);
  const [requestSearch, setRequestSearch] = useState('');
  const [onlyUnassigned, setOnlyUnassigned] = useState(false);
  const [assigningRequestId, setAssigningRequestId] = useState<string | null>(null);
  const [reviewBusyId, setReviewBusyId] = useState<string | null>(null);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    const [optRes, signRes, gRes, rsvpRes] = await Promise.all([
      supabase.from('transport_options').select('*').order('sort_order'),
      supabase.from('guest_transport').select('*, guests(name)'),
      supabase.from('guests').select('id, name, party_role, party_leader_id, transport_needed, transport_from, transport_return').order('name'),
      supabase.from('rsvp_responses').select('guest_id, status'),
    ]);
    setOptions(optRes.data || []);
    setSignups(signRes.data || []);
    setGuests(gRes.data || []);
    setConfirmedIds(new Set((rsvpRes.data || []).filter(r => r.status === 'attending').map(r => r.guest_id)));
    setLoading(false);
  };

  const addGuest = async (optionId: string, guestId: string) => {
    setAddingGuestId(guestId);
    await supabase.from('guest_transport').insert({ transport_option_id: optionId, guest_id: guestId });
    await fetchAll();
    setAddingGuestId(null);
  };

  const removeGuest = async (signupId: string) => {
    await supabase.from('guest_transport').delete().eq('id', signupId);
    await fetchAll();
  };

  const copyTransportFromPrimary = async (companionId: string, primary: any) => {
    setReviewBusyId(companionId);
    await supabase.from('guests').update({
      transport_needed: true,
      transport_from: primary.transport_from,
      transport_return: primary.transport_return,
    }).eq('id', companionId);
    await fetchAll();
    setReviewBusyId(null);
  };
  const markCompanionNoTransport = async (companionId: string) => {
    setReviewBusyId(companionId);
    await supabase.from('guests').update({ transport_needed: false, transport_from: null, transport_return: null }).eq('id', companionId);
    await fetchAll();
    setReviewBusyId(null);
  };

  const save = async () => {
    setSaving(true);
    const payload = {
      name: form.name,
      direction: form.direction,
      departure_location: form.departure_location || null,
      departure_time: form.departure_time || null,
      return_time: form.return_time || null,
      capacity: form.capacity ? parseInt(form.capacity) : null,
      notes: form.notes || null,
    };
    if (editing) {
      await supabase.from('transport_options').update(payload).eq('id', editing.id);
    } else {
      await supabase.from('transport_options').insert(payload);
    }
    setShowModal(false);
    setEditing(null);
    setSaving(false);
    await fetchAll();
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from('transport_options').update({ is_active: !current }).eq('id', id);
    await fetchAll();
  };

  const deleteOption = async (id: string) => {
    await supabase.from('transport_options').delete().eq('id', id);
    await fetchAll();
  };

  const directionLabel: Record<string, string> = { to_venue: 'To venue', from_venue: 'From venue', both: 'Both ways' };
  const directionColor: Record<string, string> = { to_venue: 'bg-blue-50 text-blue-700', from_venue: 'bg-purple-50 text-purple-700', both: 'bg-green-50 text-green-700' };

  const activeOptions = options.filter(o => o.is_active);
  const getSignupsFor = (guestId: string) => signups.filter(s => s.guest_id === guestId);
  const requestedGuests = guests
    .filter(g => g.transport_needed === true)
    .filter(g => g.name.toLowerCase().includes(requestSearch.toLowerCase()))
    .filter(g => !onlyUnassigned || getSignupsFor(g.id).length === 0);
  const unassignedCount = guests.filter(g => g.transport_needed === true && getSignupsFor(g.id).length === 0).length;

  const guestsById = new Map(guests.map(g => [g.id, g]));
  const needsReview = guests.filter(g => {
    if (!g.party_leader_id) return false;
    const primary = guestsById.get(g.party_leader_id);
    return primary?.transport_needed === true && g.transport_needed !== true && g.transport_needed !== false;
  });

  const assignFromRequest = async (optionId: string, guestId: string) => {
    setAssigningRequestId(guestId);
    await addGuest(optionId, guestId);
    setAssigningRequestId(null);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Transport</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage transport options for guests</p>
        </div>
        <button onClick={() => { setEditing(null); setForm({ name: '', direction: 'to_venue', departure_location: '', departure_time: '', return_time: '', capacity: '', notes: '' }); setShowModal(true); }} className="bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-gray-700">+ Add option</button>
      </div>

      {loading ? <p className="text-sm text-gray-400">Loading…</p> : (
        <>
        {needsReview.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-5 mb-6">
            <h2 className="font-semibold text-amber-900 mb-1">Party members to review ({needsReview.length})</h2>
            <p className="text-xs text-amber-700 mb-3">Their travel companion needs transport, but they don't have an answer yet — new RSVPs copy this automatically, these are from before that.</p>
            <div className="space-y-1.5">
              {needsReview.map(g => {
                const primary = guestsById.get(g.party_leader_id);
                return (
                  <div key={g.id} className="flex items-center justify-between gap-3 text-sm bg-white border border-amber-100 rounded-md px-3 py-2">
                    <div className="min-w-0">
                      <span className="font-medium text-gray-900">{g.name}</span>
                      <span className="text-gray-500"> · travels with {primary?.name}{primary?.transport_from ? ` (from ${primary.transport_from})` : ''}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => copyTransportFromPrimary(g.id, primary)}
                        disabled={reviewBusyId === g.id}
                        className="text-xs bg-gray-900 text-white px-3 py-1.5 rounded hover:bg-gray-700 disabled:opacity-40"
                      >{reviewBusyId === g.id ? '…' : `Same as ${primary?.name}`}</button>
                      <button
                        onClick={() => markCompanionNoTransport(g.id)}
                        disabled={reviewBusyId === g.id}
                        className="text-xs border border-gray-200 text-gray-600 px-3 py-1.5 rounded hover:bg-gray-50 disabled:opacity-40"
                      >Doesn't need it</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6">
          <div className="flex items-center justify-between mb-3 gap-4 flex-wrap">
            <div>
              <h2 className="font-semibold text-gray-900">Requested transport ({requestedGuests.length}{requestSearch || onlyUnassigned ? ` of ${guests.filter(g => g.transport_needed === true).length}` : ''})</h2>
              <p className="text-xs text-gray-500 mt-0.5">{unassignedCount} without an option yet</p>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-600 select-none">
                <input type="checkbox" checked={onlyUnassigned} onChange={e => setOnlyUnassigned(e.target.checked)} className="rounded border-gray-300" />
                Only unassigned
              </label>
              <input
                type="text"
                value={requestSearch}
                onChange={e => setRequestSearch(e.target.value)}
                placeholder="Search…"
                className="input"
                style={{ width: 200 }}
              />
            </div>
          </div>

          {requestedGuests.length === 0 ? (
            <p className="text-xs text-gray-400">
              {guests.filter(g => g.transport_needed === true).length === 0 ? 'No guests have requested transport yet.' : 'No guests match.'}
            </p>
          ) : (
            <div className="space-y-1.5">
              {requestedGuests.map(g => {
                const guestSignups = getSignupsFor(g.id);
                return (
                  <div key={g.id} className="flex items-center justify-between gap-3 text-sm border-b border-gray-50 last:border-0 py-1.5">
                    <div className="min-w-0">
                      <span className="font-medium text-gray-900">{g.name}</span>
                      {g.transport_from && <span className="text-gray-500"> · from {g.transport_from}</span>}
                      <span className="text-gray-400"> · return: {g.transport_return ? 'Yes' : 'No'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {guestSignups.map(s => {
                        const opt = options.find(o => o.id === s.transport_option_id);
                        return (
                          <span key={s.id} className="text-xs bg-gray-100 text-gray-700 rounded pl-2 pr-1 py-1 flex items-center gap-1.5 whitespace-nowrap">
                            {opt?.name || 'Option'}
                            <button onClick={() => removeGuest(s.id)} className="text-gray-400 hover:text-red-500 leading-none">×</button>
                          </span>
                        );
                      })}
                      {guestSignups.length === 0 && (
                        <select
                          value=""
                          disabled={assigningRequestId === g.id}
                          onChange={e => { if (e.target.value) assignFromRequest(e.target.value, g.id); }}
                          className="text-xs border border-amber-200 bg-amber-50 text-amber-800 rounded px-2 py-1.5 disabled:opacity-40"
                        >
                          <option value="">{assigningRequestId === g.id ? 'Adding…' : 'Add to option…'}</option>
                          {activeOptions.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                        </select>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-4">
          {options.map(opt => {
            const optSignups = signups.filter(s => s.transport_option_id === opt.id);
            return (
              <div key={opt.id} className={`bg-white border rounded-lg p-5 ${!opt.is_active ? 'opacity-50' : 'border-gray-200'}`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900">{opt.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${directionColor[opt.direction]}`}>{directionLabel[opt.direction]}</span>
                      {!opt.is_active && <span className="text-xs text-gray-400 border border-gray-200 rounded px-2 py-0.5">Inactive</span>}
                    </div>
                    {opt.departure_location && <p className="text-sm text-gray-500">From: {opt.departure_location}</p>}
                    {opt.departure_time && <p className="text-sm text-gray-500">Departs: {new Date(opt.departure_time).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>}
                    {opt.capacity && <p className="text-sm text-gray-500">{optSignups.length} / {opt.capacity} seats</p>}
                    {opt.notes && <p className="text-xs text-gray-400 mt-1">{opt.notes}</p>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setEditing(opt); setForm({ name: opt.name, direction: opt.direction, departure_location: opt.departure_location || '', departure_time: opt.departure_time ? opt.departure_time.slice(0, 16) : '', return_time: opt.return_time ? opt.return_time.slice(0, 16) : '', capacity: opt.capacity?.toString() || '', notes: opt.notes || '' }); setShowModal(true); }} className="text-xs text-gray-400 hover:text-gray-700">Edit</button>
                    <button onClick={() => toggleActive(opt.id, opt.is_active)} className="text-xs text-gray-400 hover:text-gray-700">{opt.is_active ? 'Deactivate' : 'Activate'}</button>
                    <button onClick={() => deleteOption(opt.id)} className="text-xs text-red-400 hover:text-red-600">Delete</button>
                  </div>
                </div>
                <div className="pt-3 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-gray-400">Signed up{opt.capacity ? ` (${optSignups.length}/${opt.capacity})` : optSignups.length > 0 ? ` (${optSignups.length})` : ''}</p>
                    <button
                      onClick={() => { setAddingTo(addingTo === opt.id ? null : opt.id); setGuestSearch(''); }}
                      className="text-xs text-gray-500 hover:text-gray-900 font-medium"
                    >
                      {addingTo === opt.id ? 'Close' : '+ Add guest'}
                    </button>
                  </div>
                  {optSignups.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {optSignups.map((s: any) => (
                        <span key={s.id} className="text-xs bg-gray-100 text-gray-700 rounded pl-2 pr-1 py-1 flex items-center gap-1.5">
                          {s.guests?.name}
                          <button onClick={() => removeGuest(s.id)} className="text-gray-400 hover:text-red-500 leading-none">×</button>
                        </span>
                      ))}
                    </div>
                  )}
                  {optSignups.length === 0 && addingTo !== opt.id && (
                    <p className="text-xs text-gray-300">No guests yet.</p>
                  )}
                  {addingTo === opt.id && (() => {
                    const available = guests
                      .filter(g => confirmedIds.has(g.id))
                      .filter(g => !optSignups.some((s: any) => s.guest_id === g.id))
                      .filter(g => g.name.toLowerCase().includes(guestSearch.toLowerCase()));
                    return (
                      <div className="border border-gray-200 rounded-md p-2">
                        <input
                          type="text"
                          value={guestSearch}
                          onChange={e => setGuestSearch(e.target.value)}
                          placeholder="Search confirmed guests…"
                          className="input mb-2"
                          autoFocus
                        />
                        <div className="max-h-40 overflow-y-auto space-y-0.5">
                          {available.map(g => (
                            <button
                              key={g.id}
                              onClick={() => addGuest(opt.id, g.id)}
                              disabled={addingGuestId === g.id}
                              className="w-full text-left text-sm px-2 py-1.5 rounded hover:bg-gray-50 text-gray-700 disabled:opacity-40"
                            >
                              {addingGuestId === g.id ? 'Adding…' : g.name}
                            </button>
                          ))}
                          {available.length === 0 && (
                            <p className="text-xs text-gray-400 px-2 py-1">
                              {guests.filter(g => confirmedIds.has(g.id)).length === 0 ? 'No confirmed guests yet.' : 'No matching confirmed guests left to add.'}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            );
          })}
          {options.length === 0 && <p className="text-sm text-gray-400">No transport options yet.</p>}
        </div>
        </>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="px-6 py-5 border-b border-gray-200"><h2 className="text-lg font-semibold text-gray-900">{editing ? 'Edit option' : 'Add transport option'}</h2></div>
            <div className="px-6 py-5 space-y-4">
              <Field label="Name"><input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input" placeholder="Bus from Lisbon…" /></Field>
              <Field label="Direction">
                <select value={form.direction} onChange={e => setForm(f => ({ ...f, direction: e.target.value }))} className="input">
                  <option value="to_venue">To venue</option>
                  <option value="from_venue">From venue</option>
                  <option value="both">Both ways</option>
                </select>
              </Field>
              <Field label="Departure location"><input type="text" value={form.departure_location} onChange={e => setForm(f => ({ ...f, departure_location: e.target.value }))} className="input" placeholder="Lisbon city centre…" /></Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Departure time"><input type="datetime-local" value={form.departure_time} onChange={e => setForm(f => ({ ...f, departure_time: e.target.value }))} className="input" /></Field>
                <Field label="Return time"><input type="datetime-local" value={form.return_time} onChange={e => setForm(f => ({ ...f, return_time: e.target.value }))} className="input" /></Field>
              </div>
              <Field label="Capacity"><input type="number" value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} className="input" placeholder="50" /></Field>
              <Field label="Notes"><textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="input resize-none" rows={2} /></Field>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="text-sm text-gray-500 px-4 py-2">Cancel</button>
              <button onClick={save} disabled={saving || !form.name} className="bg-gray-900 text-white text-sm font-medium px-5 py-2 rounded-md hover:bg-gray-700 disabled:opacity-50">{saving ? 'Saving…' : 'Save'}</button>
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
