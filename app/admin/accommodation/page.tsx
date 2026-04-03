'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function AccommodationPage() {
  const [tab, setTab] = useState<'venue' | 'external'>('venue');
  const [rooms, setRooms] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [guests, setGuests] = useState<any[]>([]);
  const [external, setExternal] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState<string | null>(null);
  const [showExtModal, setShowExtModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState<any>(null);
  const [editingExt, setEditingExt] = useState<any>(null);
  const [roomForm, setRoomForm] = useState({ name: '', room_type: 'private', capacity: 2, floor: '', notes: '' });
  const [assignForm, setAssignForm] = useState({ guest_id: '', bed_label: '', notes: '' });
  const [extForm, setExtForm] = useState({ name: '', description: { en: '', pt: '', es: '' }, url: '', directions_url: '', distance_from_venue: '', image_url: '' });
  const [extTab, setExtTab] = useState<'en' | 'pt' | 'es'>('en');
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    const [roomsRes, assignRes, guestsRes, extRes] = await Promise.all([
      supabase.from('venue_rooms').select('*').order('name'),
      supabase.from('guest_room_assignments').select('*, guests(name)'),
      supabase.from('guests').select('id, name, venue_stay_invited').order('name'),
      supabase.from('external_accommodations').select('*').order('sort_order'),
    ]);
    setRooms(roomsRes.data || []);
    setAssignments(assignRes.data || []);
    setGuests(guestsRes.data || []);
    setExternal(extRes.data || []);
    setLoading(false);
  };

  const totalCapacity = rooms.reduce((s, r) => s + (r.capacity || 0), 0);
  const totalAssigned = assignments.length;
  const venueGuests = guests.filter((g: any) => g.venue_stay_invited);
  const assignedGuestIdSet = new Set(assignments.map(a => a.guest_id));

  const saveRoom = async () => {
    setSaving(true);
    if (editingRoom) {
      await supabase.from('venue_rooms').update(roomForm).eq('id', editingRoom.id);
    } else {
      await supabase.from('venue_rooms').insert(roomForm);
    }
    setShowRoomModal(false);
    setEditingRoom(null);
    setSaving(false);
    await fetchAll();
  };

  const deleteRoom = async (id: string) => {
    await supabase.from('venue_rooms').delete().eq('id', id);
    await fetchAll();
  };

  const saveAssignment = async (roomId: string) => {
    if (!assignForm.guest_id) return;
    setSaving(true);
    await supabase.from('guest_room_assignments').insert({ room_id: roomId, guest_id: assignForm.guest_id, bed_label: assignForm.bed_label || null, notes: assignForm.notes || null });
    setShowAssignModal(null);
    setAssignForm({ guest_id: '', bed_label: '', notes: '' });
    setSaving(false);
    await fetchAll();
  };

  const removeAssignment = async (id: string) => {
    await supabase.from('guest_room_assignments').delete().eq('id', id);
    await fetchAll();
  };

  const saveExt = async () => {
    setSaving(true);
    if (editingExt) {
      await supabase.from('external_accommodations').update(extForm).eq('id', editingExt.id);
    } else {
      await supabase.from('external_accommodations').insert({ ...extForm, directions_url: extForm.directions_url || null });
    }
    setShowExtModal(false);
    setEditingExt(null);
    setSaving(false);
    await fetchAll();
  };

  const deleteExt = async (id: string) => {
    await supabase.from('external_accommodations').delete().eq('id', id);
    await fetchAll();
  };

  const assignedGuestIds = (roomId: string) =>
    assignments.filter(a => a.room_id === roomId).map(a => a.guest_id);

  const availableGuests = (roomId: string) =>
    guests.filter(g => !assignedGuestIds(roomId).includes(g.id));

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold text-gray-900 mb-1">Accommodation</h1>
      <p className="text-sm text-gray-500 mb-6">Manage venue rooms and external hotel links</p>

      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {(['venue', 'external'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === t ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t === 'venue' ? 'Venue Rooms' : 'External Links'}
          </button>
        ))}
      </div>

      {loading ? <p className="text-sm text-gray-400">Loading…</p> : tab === 'venue' ? (
        <>
          {/* Venue stay guest list */}
          <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-900">Staying at the venue</h2>
              <span className="text-xs text-gray-400">{venueGuests.length} guests · {venueGuests.filter((g: any) => assignedGuestIdSet.has(g.id)).length} assigned to a room</span>
            </div>
            {venueGuests.length === 0 ? (
              <p className="text-sm text-gray-400">No guests are marked as staying at the venue yet. Set this per guest in the Guests page.</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {venueGuests.map((g: any) => {
                  const assignment = assignments.find(a => a.guest_id === g.id);
                  const room = assignment ? rooms.find(r => r.id === assignment.room_id) : null;
                  return (
                    <div key={g.id} className="flex items-center justify-between py-2">
                      <span className="text-sm text-gray-900">{g.name}</span>
                      {room ? (
                        <span className="text-xs text-green-600">{room.name}{assignment.bed_label ? ` · ${assignment.bed_label}` : ''}</span>
                      ) : (
                        <span className="text-xs text-amber-500">No room assigned</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">{totalAssigned} of {totalCapacity} beds assigned</p>
            <button onClick={() => { setEditingRoom(null); setRoomForm({ name: '', room_type: 'private', capacity: 2, floor: '', notes: '' }); setShowRoomModal(true); }} className="bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-gray-700">+ Add room</button>
          </div>
          <div className="grid gap-4">
            {rooms.map(room => {
              const roomAssignments = assignments.filter(a => a.room_id === room.id);
              return (
                <div key={room.id} className="bg-white border border-gray-200 rounded-lg p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">{room.name}</h3>
                        <span className="text-xs border border-gray-200 rounded px-2 py-0.5 text-gray-500">{room.room_type}</span>
                        {room.floor && <span className="text-xs text-gray-400">Floor {room.floor}</span>}
                      </div>
                      <p className="text-sm text-gray-500">{roomAssignments.length} of {room.capacity} beds filled</p>
                      {room.notes && <p className="text-xs text-gray-400 mt-1">{room.notes}</p>}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { setEditingRoom(room); setRoomForm({ name: room.name, room_type: room.room_type, capacity: room.capacity, floor: room.floor || '', notes: room.notes || '' }); setShowRoomModal(true); }} className="text-xs text-gray-400 hover:text-gray-700">Edit</button>
                      <button onClick={() => deleteRoom(room.id)} className="text-xs text-red-400 hover:text-red-600">Delete</button>
                    </div>
                  </div>
                  <div className="space-y-1 mb-3">
                    {roomAssignments.map((a: any) => (
                      <div key={a.id} className="flex items-center justify-between bg-gray-50 rounded px-3 py-1.5">
                        <span className="text-sm text-gray-700">{a.guests?.name}{a.bed_label && <span className="text-gray-400 text-xs ml-2">{a.bed_label}</span>}</span>
                        <button onClick={() => removeAssignment(a.id)} className="text-xs text-red-400 hover:text-red-600">Remove</button>
                      </div>
                    ))}
                  </div>
                  {roomAssignments.length < room.capacity && (
                    <button onClick={() => { setAssignForm({ guest_id: '', bed_label: '', notes: '' }); setShowAssignModal(room.id); }} className="text-xs text-gray-500 hover:text-gray-900 border border-gray-200 rounded px-3 py-1.5">+ Assign guest</button>
                  )}
                </div>
              );
            })}
            {rooms.length === 0 && <p className="text-sm text-gray-400">No rooms yet. Add your first room above.</p>}
          </div>
        </>
      ) : (
        <>
          <div className="flex justify-end mb-4">
            <button onClick={() => { setEditingExt(null); setExtForm({ name: '', description: { en: '', pt: '', es: '' }, url: '', directions_url: '', distance_from_venue: '', image_url: '' }); setExtTab('en'); setShowExtModal(true); }} className="bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-gray-700">+ Add link</button>
          </div>
          <div className="grid gap-4">
            {external.map(ext => (
              <div key={ext.id} className="bg-white border border-gray-200 rounded-lg p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{ext.name}</h3>
                    {(ext.description as any)?.en && <p className="text-sm text-gray-600 mt-1">{(ext.description as any).en}</p>}
                    <div className="flex gap-4 mt-2 text-sm text-gray-500">
                      {ext.price_range && <span>{ext.price_range}</span>}
                      {ext.distance_from_venue && <span>{ext.distance_from_venue} from venue</span>}
                      {ext.url && <a href={ext.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Visit →</a>}
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button onClick={() => { setEditingExt(ext); setExtForm({ name: ext.name, description: (ext.description as any) || { en: '', pt: '', es: '' }, url: ext.url || '', directions_url: ext.directions_url || '', distance_from_venue: ext.distance_from_venue || '', image_url: ext.image_url || '' }); setExtTab('en'); setShowExtModal(true); }} className="text-xs text-gray-400 hover:text-gray-700">Edit</button>
                    <button onClick={() => deleteExt(ext.id)} className="text-xs text-red-400 hover:text-red-600">Delete</button>
                  </div>
                </div>
              </div>
            ))}
            {external.length === 0 && <p className="text-sm text-gray-400">No external accommodation links yet.</p>}
          </div>
        </>
      )}

      {/* Room modal */}
      {showRoomModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="px-6 py-5 border-b border-gray-200"><h2 className="text-lg font-semibold text-gray-900">{editingRoom ? 'Edit room' : 'Add room'}</h2></div>
            <div className="px-6 py-5 space-y-4">
              <Field label="Room name"><input type="text" value={roomForm.name} onChange={e => setRoomForm(f => ({ ...f, name: e.target.value }))} className="input" placeholder="Rose Cottage, Room 4B…" /></Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Type">
                  <select value={roomForm.room_type} onChange={e => setRoomForm(f => ({ ...f, room_type: e.target.value }))} className="input">
                    <option value="private">Private</option>
                    <option value="shared">Shared</option>
                  </select>
                </Field>
                <Field label="Capacity (beds)"><input type="number" min={1} value={roomForm.capacity} onChange={e => setRoomForm(f => ({ ...f, capacity: parseInt(e.target.value) }))} className="input" /></Field>
              </div>
              <Field label="Floor"><input type="text" value={roomForm.floor} onChange={e => setRoomForm(f => ({ ...f, floor: e.target.value }))} className="input" placeholder="Ground, 1st…" /></Field>
              <Field label="Notes"><textarea value={roomForm.notes} onChange={e => setRoomForm(f => ({ ...f, notes: e.target.value }))} className="input resize-none" rows={2} /></Field>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button onClick={() => setShowRoomModal(false)} className="text-sm text-gray-500 px-4 py-2">Cancel</button>
              <button onClick={saveRoom} disabled={saving || !roomForm.name} className="bg-gray-900 text-white text-sm font-medium px-5 py-2 rounded-md hover:bg-gray-700 disabled:opacity-50">{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Assign guest modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
            <div className="px-6 py-5 border-b border-gray-200"><h2 className="text-lg font-semibold text-gray-900">Assign guest</h2></div>
            <div className="px-6 py-5 space-y-4">
              <Field label="Guest">
                <select value={assignForm.guest_id} onChange={e => setAssignForm(f => ({ ...f, guest_id: e.target.value }))} className="input">
                  <option value="">Select guest…</option>
                  {availableGuests(showAssignModal).map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </Field>
              <Field label="Bed label"><input type="text" value={assignForm.bed_label} onChange={e => setAssignForm(f => ({ ...f, bed_label: e.target.value }))} className="input" placeholder="Bed 1, Left bunk…" /></Field>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button onClick={() => setShowAssignModal(null)} className="text-sm text-gray-500 px-4 py-2">Cancel</button>
              <button onClick={() => saveAssignment(showAssignModal)} disabled={saving || !assignForm.guest_id} className="bg-gray-900 text-white text-sm font-medium px-5 py-2 rounded-md hover:bg-gray-700 disabled:opacity-50">{saving ? 'Saving…' : 'Assign'}</button>
            </div>
          </div>
        </div>
      )}

      {/* External link modal */}
      {showExtModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="px-6 py-5 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">{editingExt ? 'Edit link' : 'Add link'}</h2>
              <div className="flex gap-1 mt-4 border-b border-gray-200">
                {(['en', 'pt', 'es'] as const).map(lang => (
                  <button
                    key={lang}
                    onClick={() => setExtTab(lang)}
                    className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${extTab === lang ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                  >
                    {lang.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <div className="px-6 py-5 space-y-4">
              <Field label="Name"><input type="text" value={extForm.name} onChange={e => setExtForm(f => ({ ...f, name: e.target.value }))} className="input" /></Field>
              <Field label="Description"><textarea value={extForm.description[extTab]} onChange={e => setExtForm(f => ({ ...f, description: { ...f.description, [extTab]: e.target.value } }))} className="input resize-none" rows={2} /></Field>
              <Field label="Website URL"><input type="url" value={extForm.url} onChange={e => setExtForm(f => ({ ...f, url: e.target.value }))} className="input" placeholder="https://…" /></Field>
              <Field label="Directions URL (Google Maps)"><input type="url" value={extForm.directions_url} onChange={e => setExtForm(f => ({ ...f, directions_url: e.target.value }))} className="input" placeholder="https://www.google.com/maps/…" /></Field>
              <Field label="Distance from venue"><input type="text" value={extForm.distance_from_venue} onChange={e => setExtForm(f => ({ ...f, distance_from_venue: e.target.value }))} className="input" placeholder="2km from venue" /></Field>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button onClick={() => setShowExtModal(false)} className="text-sm text-gray-500 px-4 py-2">Cancel</button>
              <button onClick={saveExt} disabled={saving || !extForm.name} className="bg-gray-900 text-white text-sm font-medium px-5 py-2 rounded-md hover:bg-gray-700 disabled:opacity-50">{saving ? 'Saving…' : 'Save'}</button>
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
