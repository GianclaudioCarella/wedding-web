'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Room { id: string; name: string; room_type: string; capacity: number; floor: string | null; notes: string | null; section: string | null; amenities: string[]; extra_bed_type: string | null; sort_order: number; reserved_for: string | null; }
interface Assignment { id: string; room_id: string; guest_id: string; bed_label: string | null; notes: string | null; guests?: { name: string; tags: string[]; party_role: string; party_leader_id: string | null; }; }
interface Guest { id: string; name: string; tags: string[]; party_role: string; party_leader_id: string | null; venue_stay_invited: boolean; }
interface ExternalAccommodation { id: string; name: string; description: { en: string; pt: string; es: string }; url: string | null; directions_url: string | null; distance_from_venue: string | null; image_url: string | null; price_range: string | null; }

const getTagColor = (tag: string, allTags: string[]) => {
  const colors = [
    'border-blue-600 text-blue-600 bg-blue-600/10',
    'border-orange-600 text-orange-600 bg-orange-600/10',
    'border-red-600 text-red-600 bg-red-600/10',
    'border-purple-600 text-purple-600 bg-purple-600/10',
    'border-green-600 text-green-600 bg-green-600/10',
    'border-yellow-600 text-yellow-600 bg-yellow-600/10',
    'border-pink-600 text-pink-600 bg-pink-600/10',
    'border-indigo-600 text-indigo-600 bg-indigo-600/10',
    'border-teal-600 text-teal-600 bg-teal-600/10',
    'border-amber-600 text-amber-600 bg-amber-600/10',
    'border-rose-600 text-rose-600 bg-rose-600/10',
    'border-cyan-600 text-cyan-600 bg-cyan-600/10',
    'border-lime-600 text-lime-600 bg-lime-600/10',
    'border-fuchsia-600 text-fuchsia-600 bg-fuchsia-600/10',
    'border-sky-600 text-sky-600 bg-sky-600/10',
    'border-emerald-600 text-emerald-600 bg-emerald-600/10',
  ];
  const tagColorMap = new Map<string, number>();
  const usedIndices = new Set<number>();
  for (const t of allTags) {
    if (tagColorMap.has(t)) continue;
    let hash = 0;
    for (let i = 0; i < t.length; i++) {
      hash = t.charCodeAt(i) + ((hash << 5) - hash);
    }
    let index = Math.abs(hash) % colors.length;
    while (usedIndices.has(index)) {
      index = (index + 1) % colors.length;
    }
    tagColorMap.set(t, index);
    usedIndices.add(index);
  }
  const index = tagColorMap.get(tag) ?? 0;
  return colors[index];
};

export default function AccommodationPage() {
  const [tab, setTab] = useState<'families' | 'external'>('families');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [external, setExternal] = useState<ExternalAccommodation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [assigningFamily, setAssigningFamily] = useState<{ guestId: string; familyName: string; familySize: number; isChanging: boolean } | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [roomForm, setRoomForm] = useState({ name: '', room_type: 'private', capacity: 2, floor: '', section: 'Second Floor', amenities: [] as string[], extra_bed_type: '', notes: '', reserved_for: '' });
  const [showExtModal, setShowExtModal] = useState(false);
  const [editingExt, setEditingExt] = useState<ExternalAccommodation | null>(null);
  const [extForm, setExtForm] = useState({ name: '', description: { en: '', pt: '', es: '' }, url: '', directions_url: '', distance_from_venue: '', image_url: '' });
  const [extTab, setExtTab] = useState<'en' | 'pt' | 'es'>('en');
  const [saving, setSaving] = useState(false);
  const [showAddStayModal, setShowAddStayModal] = useState(false);
  const [addStaySearch, setAddStaySearch] = useState('');

  useEffect(() => { fetchAll(); }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowRoomModal(false);
        setAssigningFamily(null);
        setSelectedRoom(null);
        setShowExtModal(false);
        setShowAddStayModal(false);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, []);

  const fetchAll = async () => {
    const [roomsRes, assignRes, guestsRes, extRes] = await Promise.all([
      supabase.from('venue_rooms').select('*').order('section').order('sort_order'),
      supabase.from('guest_room_assignments').select('*, guests(name, tags, party_role, party_leader_id)'),
      supabase.from('guests').select('id, name, tags, party_role, party_leader_id, venue_stay_invited').order('name'),
      supabase.from('external_accommodations').select('*').order('sort_order'),
    ]);
    setRooms(roomsRes.data || []);
    setAssignments(assignRes.data || []);
    setGuests(guestsRes.data || []);
    setExternal(extRes.data || []);
    setLoading(false);
  };

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

  const assignGuest = async (guestId: string, roomId: string, isChanging: boolean = false) => {
    if (isChanging) {
      // Delete old assignment first
      const { error: deleteError } = await supabase.from('guest_room_assignments').delete().eq('guest_id', guestId);
      if (deleteError) {
        console.error('Delete error:', deleteError);
        return;
      }
    }
    // Insert new assignment
    const { error: insertError } = await supabase.from('guest_room_assignments').insert({ room_id: roomId, guest_id: guestId });
    if (insertError) {
      console.error('Insert error:', insertError);
      return;
    }
    await fetchAll();
  };

  const removeAssignment = async (id: string) => {
    await supabase.from('guest_room_assignments').delete().eq('id', id);
    await fetchAll();
  };

  const setVenueStay = async (guestId: string, invited: boolean) => {
    if (!invited) {
      await supabase.from('guest_room_assignments').delete().eq('guest_id', guestId);
    }
    await supabase.from('guests').update({ venue_stay_invited: invited }).eq('id', guestId);
    await fetchAll();
  };

  const saveExt = async () => {
    setSaving(true);
    if (editingExt) {
      await supabase.from('external_accommodations').update(extForm).eq('id', editingExt.id);
    } else {
      await supabase.from('external_accommodations').insert(extForm);
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

  // Computed values
  const venueGuests = guests.filter(g => g.venue_stay_invited);
  const primaryGuests = venueGuests.filter(g => !g.party_leader_id);
  const assignedGuestIdSet = new Set(assignments.map(a => a.guest_id));
  const getAllTags = () => Array.from(new Set(venueGuests.flatMap(g => g.tags || [])));
  const allTags = getAllTags();

  const tagStats = allTags.map(tag => {
    const primariesWithTag = primaryGuests.filter(g => g.tags?.includes(tag));
    const count = primariesWithTag.reduce((sum, primary) => {
      const familyMembers = venueGuests.filter(g => g.id === primary.id || g.party_leader_id === primary.id);
      return sum + familyMembers.length;
    }, 0);
    return { tag, count };
  });

  const filteredPrimaries = primaryGuests.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesTag = !selectedTag || (p.tags || []).includes(selectedTag);
    return matchesSearch && matchesTag;
  });

  const getRoomAssignments = (roomId: string) => assignments.filter(a => a.room_id === roomId);
  const getGuestAssignment = (guestId: string) => assignments.find(a => a.guest_id === guestId);
  const totalCapacity = rooms.reduce((s, r) => s + r.capacity, 0);
  const totalAssigned = assignments.length;
  const gianCatPrimaries = primaryGuests.filter(g => g.tags?.includes('gian') || g.tags?.includes('cat'));
  const gianCatGuestsCount = gianCatPrimaries.reduce((sum, primary) => {
    const familyMembers = venueGuests.filter(g => g.id === primary.id || g.party_leader_id === primary.id);
    return sum + familyMembers.length;
  }, 0);
  const roleLabel: Record<string, string> = { primary: '', partner: 'Partner', child: 'Child', other: 'Other' };

  if (loading) return <div className="p-8"><p className="text-sm text-gray-400">Loading…</p></div>;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Accommodation</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {gianCatGuestsCount} guests (gian + cat) · {totalAssigned} of {totalCapacity} beds assigned · {primaryGuests.filter(p => !assignedGuestIdSet.has(p.id)).length} families need rooms
          </p>
        </div>
      </div>

      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {(['families', 'external'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === t ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t === 'families' ? 'Families' : 'External Links'}
          </button>
        ))}
      </div>

      {tab === 'families' ? (
        <>
          {/* Tag stats */}
          {allTags.length > 0 && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Tag breakdown</p>
              <div className="flex flex-wrap gap-3">
                {tagStats.map(({ tag, count }) => (
                  <button
                    key={tag}
                    onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                    className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                      selectedTag === tag
                        ? `border ${getTagColor(tag, allTags)} font-medium`
                        : 'border border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {tag}: {count} {count === 1 ? 'person' : 'people'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Search */}
          <div className="mb-6">
            <input
              type="text"
              placeholder="Search families…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-gray-400"
            />
          </div>

          {/* Family cards grid */}
          <div className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900">Families</h2>
              <button
                onClick={() => { setAddStaySearch(''); setShowAddStayModal(true); }}
                className="text-xs text-gray-600 hover:text-gray-900 border border-gray-200 rounded px-3 py-1.5 hover:bg-gray-50 font-medium"
              >
                + Add to stay list
              </button>
            </div>
            {filteredPrimaries.length === 0 ? (
              <p className="text-sm text-gray-400">{search || selectedTag ? 'No families match.' : 'No families yet.'}</p>
            ) : (
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                {filteredPrimaries.map(primary => {
                  const members = guests.filter(g => g.party_leader_id === primary.id && g.venue_stay_invited);
                  const allMembers = [primary, ...members];
                  const primaryTags = (primary.tags || []);
                  const primaryAssigned = assignedGuestIdSet.has(primary.id);
                  return (
                    <div key={primary.id} className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex-1">
                          <h3 className="text-sm font-semibold text-gray-900">{primary.name}</h3>
                          {primaryTags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {primaryTags.map(tag => (
                                <span key={tag} className={`inline-block px-2 py-0.5 rounded-full text-xs border font-medium ${getTagColor(tag, allTags)}`}>
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            const familyMembers = guests.filter(g => g.party_leader_id === primary.id);
                            setSelectedRoom(null);
                            setAssigningFamily({
                              guestId: primary.id,
                              familyName: primary.name,
                              familySize: 1 + familyMembers.length,
                              isChanging: primaryAssigned,
                            });
                          }}
                          className={`text-xs font-medium px-3 py-1.5 rounded flex-shrink-0 whitespace-nowrap ${
                            primaryAssigned
                              ? 'text-gray-500 border border-gray-200 hover:bg-gray-50'
                              : 'bg-gray-900 text-white hover:bg-gray-700'
                          }`}
                        >
                          {primaryAssigned ? 'Change room' : '+ Add room'}
                        </button>
                      </div>
                      {(() => {
                        const assignment = getGuestAssignment(primary.id);
                        const room = assignment ? rooms.find(r => r.id === assignment.room_id) : null;
                        return (
                          <>
                            {room && assignment && (
                              <div className="py-2 mb-2 p-2 bg-green-50 rounded border border-green-200">
                                <p className="text-xs text-green-700 font-medium">{room.name}</p>
                                <button
                                  onClick={() => removeAssignment(assignment.id)}
                                  className="text-xs text-red-500 hover:text-red-700 mt-1"
                                >
                                  Remove room
                                </button>
                              </div>
                            )}
                            <div className="space-y-1 text-xs text-gray-600">
                              {allMembers.map(member => (
                                <div key={member.id} className="flex items-center justify-between gap-2 group">
                                  <div className="flex items-center gap-2">
                                    {member.party_leader_id && <span className="w-2 h-px bg-gray-300 flex-shrink-0" />}
                                    <span>{member.name}</span>
                                    {member.party_role && member.party_role !== 'primary' && (
                                      <span className="text-gray-400">({roleLabel[member.party_role]})</span>
                                    )}
                                  </div>
                                  {member.party_leader_id && (
                                    <button
                                      onClick={() => setVenueStay(member.id, false)}
                                      title="Remove this person from the stay list"
                                      className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      ✕
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                            <button
                              onClick={() => {
                                if (confirm(`Remove ${primary.name}${members.length ? ' and family' : ''} from the venue stay list?`)) {
                                  setVenueStay(primary.id, false);
                                }
                              }}
                              className="text-xs text-red-400 hover:text-red-600 mt-3"
                            >
                              Remove from stay list
                            </button>
                          </>
                        );
                      })()}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Rooms section */}
          <div className="border-t border-gray-200 pt-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900">Rooms</h2>
              <button
                onClick={() => {
                  setEditingRoom(null);
                  setRoomForm({
                    name: '',
                    room_type: 'private',
                    capacity: 2,
                    floor: '',
                    section: 'Second Floor',
                    amenities: [],
                    extra_bed_type: '',
                    notes: '',
                    reserved_for: '',
                  });
                  setShowRoomModal(true);
                }}
                className="bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-gray-700"
              >
                + Add room
              </button>
            </div>

            <div className="space-y-8">
              {['Second Floor', 'Garden Side', 'Terrace Side'].map(section => {
                const sectionRooms = rooms.filter(r => r.section === section);
                if (sectionRooms.length === 0) return null;
                return (
                  <div key={section}>
                    <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3">{section}</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {sectionRooms.map(room => {
                        const roomAssignments = getRoomAssignments(room.id);
                        const filledBeds = roomAssignments.length;
                        const capacity = room.capacity + (room.extra_bed_type ? 1 : 0);
                        return (
                          <div key={room.id} className={`bg-white border rounded-lg p-4 ${room.reserved_for ? 'border-amber-200 bg-amber-50/30' : 'border-gray-200'}`}>
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-semibold text-gray-900">{room.name}</h4>
                                  {room.reserved_for && <span className="text-xs text-amber-600 font-medium">🔒</span>}
                                </div>
                                {room.reserved_for && <p className="text-xs text-amber-600 mb-2">{room.reserved_for}</p>}
                                <p className="text-xs text-gray-500 mb-2">
                                  {filledBeds} of {room.capacity} beds {room.extra_bed_type && `(+1 ${room.extra_bed_type})`}
                                </p>
                                {room.amenities?.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mb-2">
                                    {room.amenities.map(a => (
                                      <span key={a} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                                        {a}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <div className="flex gap-2 ml-2 flex-shrink-0">
                                <button
                                  onClick={() => {
                                    setEditingRoom(room);
                                    setRoomForm({
                                      name: room.name,
                                      room_type: room.room_type,
                                      capacity: room.capacity,
                                      floor: room.floor || '',
                                      section: room.section || '',
                                      amenities: room.amenities || [],
                                      extra_bed_type: room.extra_bed_type || '',
                                      notes: room.notes || '',
                                      reserved_for: room.reserved_for || '',
                                    });
                                    setShowRoomModal(true);
                                  }}
                                  className="text-xs text-gray-400 hover:text-gray-700"
                                >
                                  Edit
                                </button>
                                <button onClick={() => deleteRoom(room.id)} className="text-xs text-red-400 hover:text-red-600">
                                  Delete
                                </button>
                              </div>
                            </div>

                            {roomAssignments.length > 0 && (
                              <div className="mb-3 p-3 bg-blue-50 rounded border border-blue-200">
                                <p className="text-xs font-semibold text-blue-900 mb-2">Booked by:</p>
                                {roomAssignments.map(a => {
                                  const familyMembers = guests.filter(g => g.party_leader_id === a.guest_id);
                                  return (
                                    <div key={a.id}>
                                      <div className="text-xs text-gray-700 flex items-center justify-between mb-1">
                                        <span className="font-medium">{a.guests?.name}</span>
                                        <button onClick={() => removeAssignment(a.id)} className="text-red-500 hover:text-red-700 text-xs underline">
                                          remove
                                        </button>
                                      </div>
                                      {familyMembers.length > 0 && (
                                        <div className="text-xs text-gray-500 ml-2 space-y-0.5 mb-1.5">
                                          {familyMembers.map(m => (
                                            <div key={m.id}>· {m.name}</div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="flex justify-end mb-4">
            <button
              onClick={() => {
                setEditingExt(null);
                setExtForm({
                  name: '',
                  description: { en: '', pt: '', es: '' },
                  url: '',
                  directions_url: '',
                  distance_from_venue: '',
                  image_url: '',
                });
                setExtTab('en');
                setShowExtModal(true);
              }}
              className="bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-gray-700"
            >
              + Add link
            </button>
          </div>
          <div className="grid gap-4">
            {external.map(ext => (
              <div key={ext.id} className="bg-white border border-gray-200 rounded-lg p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{ext.name}</h3>
                    {ext.description?.en && <p className="text-sm text-gray-600 mt-1">{ext.description.en}</p>}
                    <div className="flex gap-4 mt-2 text-sm text-gray-500">
                      {ext.distance_from_venue && <span>{ext.distance_from_venue} from venue</span>}
                      {ext.url && (
                        <a href={ext.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                          Website →
                        </a>
                      )}
                      {ext.directions_url && (
                        <a href={ext.directions_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                          Directions →
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => {
                        setEditingExt(ext);
                        setExtForm({
                          name: ext.name,
                          description: ext.description || { en: '', pt: '', es: '' },
                          url: ext.url || '',
                          directions_url: ext.directions_url || '',
                          distance_from_venue: ext.distance_from_venue || '',
                          image_url: ext.image_url || '',
                        });
                        setExtTab('en');
                        setShowExtModal(true);
                      }}
                      className="text-xs text-gray-400 hover:text-gray-700"
                    >
                      Edit
                    </button>
                    <button onClick={() => deleteExt(ext.id)} className="text-xs text-red-400 hover:text-red-600">
                      Delete
                    </button>
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
            <div className="px-6 py-5 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">{editingRoom ? 'Edit room' : 'Add room'}</h2>
            </div>
            <div className="px-6 py-5 space-y-4">
              <Field label="Room name">
                <input
                  type="text"
                  value={roomForm.name}
                  onChange={e => setRoomForm(f => ({ ...f, name: e.target.value }))}
                  className="input"
                  placeholder="Suite, La Pequeña…"
                />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Type">
                  <select value={roomForm.room_type} onChange={e => setRoomForm(f => ({ ...f, room_type: e.target.value }))} className="input">
                    <option value="private">Private</option>
                    <option value="shared">Shared</option>
                  </select>
                </Field>
                <Field label="Capacity (beds)">
                  <input type="number" min={1} value={roomForm.capacity} onChange={e => setRoomForm(f => ({ ...f, capacity: parseInt(e.target.value) }))} className="input" />
                </Field>
              </div>
              <Field label="Section">
                <select value={roomForm.section} onChange={e => setRoomForm(f => ({ ...f, section: e.target.value }))} className="input">
                  <option value="Second Floor">Second Floor</option>
                  <option value="Garden Side">Garden Side</option>
                  <option value="Terrace Side">Terrace Side</option>
                </select>
              </Field>
              <Field label="Amenities">
                <div className="space-y-2">
                  {['Terrace', 'Shower', 'Bath', 'Duplex', 'Garden', 'Accessible'].map(a => (
                    <label key={a} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={roomForm.amenities.includes(a)}
                        onChange={e => {
                          if (e.target.checked) {
                            setRoomForm(f => ({ ...f, amenities: [...f.amenities, a] }));
                          } else {
                            setRoomForm(f => ({ ...f, amenities: f.amenities.filter(x => x !== a) }));
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm text-gray-700">{a}</span>
                    </label>
                  ))}
                </div>
              </Field>
              <Field label="Extra bed type">
                <select value={roomForm.extra_bed_type} onChange={e => setRoomForm(f => ({ ...f, extra_bed_type: e.target.value }))} className="input">
                  <option value="">None</option>
                  <option value="supletoria">Supletoria</option>
                  <option value="cuna">Cuna</option>
                </select>
              </Field>
              <Field label="Reserved for">
                <input type="text" value={roomForm.reserved_for} onChange={e => setRoomForm(f => ({ ...f, reserved_for: e.target.value }))} className="input" placeholder="e.g., Gian & Cat (Newlyweds)" />
              </Field>
              <Field label="Notes">
                <textarea value={roomForm.notes} onChange={e => setRoomForm(f => ({ ...f, notes: e.target.value }))} className="input resize-none" rows={2} />
              </Field>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button onClick={() => setShowRoomModal(false)} className="text-sm text-gray-500 px-4 py-2">
                Cancel
              </button>
              <button onClick={saveRoom} disabled={saving || !roomForm.name} className="bg-gray-900 text-white text-sm font-medium px-5 py-2 rounded-md hover:bg-gray-700 disabled:opacity-50">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Room assignment side panel */}
      {assigningFamily && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/20 z-40" onClick={() => { setAssigningFamily(null); setSelectedRoom(null); }} />

          {/* Side panel */}
          <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-xl z-50 flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{selectedRoom ? 'Confirm' : 'Assign room'}</h2>
                <p className="text-sm text-gray-500 mt-1">{assigningFamily.familyName} ({assigningFamily.familySize} {assigningFamily.familySize === 1 ? 'person' : 'people'})</p>
              </div>
              <button
                onClick={() => {
                  if (selectedRoom) {
                    setSelectedRoom(null);
                  } else {
                    setAssigningFamily(null);
                  }
                }}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ✕
              </button>
            </div>

            {selectedRoom ? (
              // Confirmation view
              <div className="flex-1 flex flex-col">
                <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
                  {assigningFamily.isChanging && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Current room</p>
                      {(() => {
                        const assignment = getGuestAssignment(assigningFamily.guestId);
                        const currentRoom = assignment ? rooms.find(r => r.id === assignment.room_id) : null;
                        return currentRoom ? (
                          <div className="p-3 rounded-lg border border-amber-200 bg-amber-50">
                            <h4 className="font-semibold text-gray-900">{currentRoom.name}</h4>
                            <p className="text-xs text-gray-600 mt-1">{currentRoom.capacity} beds</p>
                          </div>
                        ) : null;
                      })()}
                    </div>
                  )}

                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
                      {assigningFamily.isChanging ? 'New room' : 'Assign to'}
                    </p>
                    <div className="p-3 rounded-lg border border-green-200 bg-green-50">
                      <h4 className="font-semibold text-gray-900">{selectedRoom.name}</h4>
                      <p className="text-xs text-gray-600 mt-1">{selectedRoom.capacity} beds</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {selectedRoom.amenities?.map(a => (
                          <span key={a} className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">
                            {a}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-200 px-6 py-4 flex gap-3">
                  <button
                    onClick={() => setSelectedRoom(null)}
                    className="flex-1 text-sm text-gray-500 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => {
                      assignGuest(assigningFamily.guestId, selectedRoom.id, assigningFamily.isChanging);
                      setAssigningFamily(null);
                      setSelectedRoom(null);
                    }}
                    className="flex-1 bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-700"
                  >
                    Confirm
                  </button>
                </div>
              </div>
            ) : (
              // Room selection view
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
                {['Second Floor', 'Garden Side', 'Terrace Side'].map(section => {
                  const sectionRooms = rooms.filter(r => r.section === section).sort((a, b) => a.sort_order - b.sort_order);
                  return (
                    <div key={section}>
                      <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3">{section}</h3>
                      <div className="space-y-2">
                        {sectionRooms.map(r => {
                          const assignments = getRoomAssignments(r.id);
                          const isFull = assignments.length >= r.capacity;
                          const isReserved = r.reserved_for;
                          const canAssign = !isFull && !isReserved;
                          const roomDesc = {
                            'Suite': '2 beds · For newlyweds',
                            'La Pequeña': '1 bed (1.35m wide)',
                            'Arco': 'Double + supletoria option',
                            'La Grande': 'Double + supletoria option',
                            'Tejados': 'Triple duplex + supletoria',
                            'Sabina': 'Triple duplex + supletoria',
                            'India': 'Double + supletoria option',
                            'Caballos': 'Double + cuna only',
                            'Lana': 'Triple + supletoria',
                            'Vino': 'Double + supletoria',
                            'Aceite': 'Triple + supletoria',
                            'Madera': 'Double + supletoria',
                            'Trigo': 'Triple + supletoria',
                            'Miel': 'Double + supletoria',
                            'Oveja': 'Double + cuna',
                            'Uva': 'Double + cuna',
                            'Aceituna': 'Double + cuna',
                            'Bosque': 'Double + cuna',
                            'Semilla': 'Double + cuna',
                            'Flor': 'Double + cuna (Accessible)',
                          } as Record<string, string>;

                          return (
                            <button
                              key={r.id}
                              onClick={() => {
                                if (canAssign) {
                                  setSelectedRoom(r);
                                }
                              }}
                              disabled={!canAssign}
                              className={`w-full text-left p-3 rounded-lg border transition-all ${
                                canAssign
                                  ? 'border-gray-200 hover:border-gray-400 hover:bg-gray-50 cursor-pointer'
                                  : 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                              }`}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h4 className="font-semibold text-gray-900">{r.name}</h4>
                                  <p className="text-xs text-gray-600 mt-0.5">{roomDesc[r.name] || 'Room'}</p>
                                </div>
                                <div className="text-xs ml-2 flex-shrink-0">
                                  {isReserved ? (
                                    <span className="text-amber-600 font-medium">Reserved</span>
                                  ) : isFull ? (
                                    <span className="text-red-600 font-medium">Full</span>
                                  ) : (
                                    <span className="text-green-600 font-medium">Available</span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center justify-between mt-2">
                                <div className="flex flex-wrap gap-1">
                                  {r.amenities?.map(a => (
                                    <span key={a} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                                      {a}
                                    </span>
                                  ))}
                                </div>
                                <span className="text-xs text-gray-500 ml-2">{assignments.length}/{r.capacity}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
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
              <Field label="Name">
                <input type="text" value={extForm.name} onChange={e => setExtForm(f => ({ ...f, name: e.target.value }))} className="input" />
              </Field>
              <Field label="Description">
                <textarea
                  value={extForm.description[extTab]}
                  onChange={e => setExtForm(f => ({ ...f, description: { ...f.description, [extTab]: e.target.value } }))}
                  className="input resize-none"
                  rows={2}
                />
              </Field>
              <Field label="Website URL">
                <input type="url" value={extForm.url} onChange={e => setExtForm(f => ({ ...f, url: e.target.value }))} className="input" placeholder="https://…" />
              </Field>
              <Field label="Directions URL (Google Maps)">
                <input type="url" value={extForm.directions_url} onChange={e => setExtForm(f => ({ ...f, directions_url: e.target.value }))} className="input" placeholder="https://www.google.com/maps/…" />
              </Field>
              <Field label="Distance from venue">
                <input type="text" value={extForm.distance_from_venue} onChange={e => setExtForm(f => ({ ...f, distance_from_venue: e.target.value }))} className="input" placeholder="2km from venue" />
              </Field>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button onClick={() => setShowExtModal(false)} className="text-sm text-gray-500 px-4 py-2">
                Cancel
              </button>
              <button onClick={saveExt} disabled={saving || !extForm.name} className="bg-gray-900 text-white text-sm font-medium px-5 py-2 rounded-md hover:bg-gray-700 disabled:opacity-50">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add to stay list modal */}
      {showAddStayModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="px-6 py-5 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Add to stay list</h2>
              <p className="text-sm text-gray-500 mt-1">Guests not currently marked as staying at the venue.</p>
              <input
                type="text"
                autoFocus
                placeholder="Search guests…"
                value={addStaySearch}
                onChange={e => setAddStaySearch(e.target.value)}
                className="input mt-3"
              />
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
              {guests
                .filter(g => !g.venue_stay_invited)
                .filter(g => g.name.toLowerCase().includes(addStaySearch.toLowerCase()))
                .map(g => {
                  const leader = g.party_leader_id ? guests.find(p => p.id === g.party_leader_id) : null;
                  return (
                    <div key={g.id} className="flex items-center justify-between border border-gray-100 rounded p-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{g.name}</p>
                        {leader && <p className="text-xs text-gray-400">with {leader.name}</p>}
                      </div>
                      <button
                        onClick={() => setVenueStay(g.id, true)}
                        className="text-xs text-white bg-gray-900 px-3 py-1.5 rounded hover:bg-gray-700 font-medium"
                      >
                        Add
                      </button>
                    </div>
                  );
                })}
              {guests.filter(g => !g.venue_stay_invited).filter(g => g.name.toLowerCase().includes(addStaySearch.toLowerCase())).length === 0 && (
                <p className="text-sm text-gray-400 text-center py-6">No matching guests.</p>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
              <button onClick={() => setShowAddStayModal(false)} className="text-sm text-gray-500 px-4 py-2">
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`.input{width:100%;border:1px solid #e5e7eb;border-radius:6px;padding:8px 12px;font-size:14px;color:#111827;outline:none}.input:focus{border-color:#6b7280}`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );
}
