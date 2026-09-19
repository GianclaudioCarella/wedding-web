'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface SeatingTable {
  id: string;
  name: string;
  seats_per_side: number;
  sort_order: number;
}

interface SeatingAssignment {
  id: string;
  table_id: string;
  side: 'A' | 'B' | 'H';
  position: number;
  guest_id: string;
  guests?: { name: string; tags: string[]; party_role: string; party_leader_id: string | null; language: string } | null;
}

interface Guest {
  id: string;
  name: string;
  tags: string[];
  party_role: string;
  party_leader_id: string | null;
  language: string;
  dietary: string | null;
}

const EMPTY_TABLE_FORM = { name: '', seats_per_side: 6 };

export default function SeatingPage() {
  const [tables, setTables]           = useState<SeatingTable[]>([]);
  const [assignments, setAssignments] = useState<SeatingAssignment[]>([]);
  const [guests, setGuests]           = useState<Guest[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [showSeated, setShowSeated]   = useState(false);

  const [showTableModal, setShowTableModal] = useState(false);
  const [editingTable, setEditingTable]     = useState<SeatingTable | null>(null);
  const [tableForm, setTableForm]           = useState(EMPTY_TABLE_FORM);
  const [saving, setSaving]                 = useState(false);
  const [deleteConfirm, setDeleteConfirm]   = useState<SeatingTable | null>(null);
  const [dragOverSeat, setDragOverSeat]     = useState<string | null>(null);
  const [shuffling, setShuffling]           = useState(false);
  const [lockedGuestIds, setLockedGuestIds] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try { return new Set(JSON.parse(localStorage.getItem('seating-locks') || '[]')); } catch { return new Set(); }
  });
  const [headTables, setHeadTables] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try { return new Set(JSON.parse(localStorage.getItem('seating-head-tables') || '[]')); } catch { return new Set(); }
  });

  const toggleHeadTable = (tableId: string) => {
    setHeadTables(prev => {
      const next = new Set(prev);
      if (next.has(tableId)) {
        next.delete(tableId);
        supabase.from('seating_assignments').delete().eq('table_id', tableId).eq('side', 'H').then(() => fetchAll());
      } else {
        next.add(tableId);
      }
      localStorage.setItem('seating-head-tables', JSON.stringify([...next]));
      return next;
    });
  };

  const toggleLock = (guestId: string) => {
    setLockedGuestIds(prev => {
      const next = new Set(prev);
      next.has(guestId) ? next.delete(guestId) : next.add(guestId);
      localStorage.setItem('seating-locks', JSON.stringify([...next]));
      return next;
    });
  };

  useEffect(() => { fetchAll(); }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowTableModal(false);
        setDeleteConfirm(null);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [tablesRes, assignRes, eventsRes] = await Promise.all([
        supabase.from('seating_tables').select('*').order('sort_order'),
        supabase.from('seating_assignments').select('*, guests(name, tags, party_role, party_leader_id, language)'),
        supabase.from('events').select('id, name, slug').order('sort_order'),
      ]);
      setTables(tablesRes.data || []);
      setAssignments(assignRes.data || []);

      const events = eventsRes.data || [];
      const ceremonyEvent = events.find(e => e.slug === 'wedding')
        || events.find(e => ((e.name as any)?.en || '').toLowerCase().includes('wedding'))
        || events[0];

      if (ceremonyEvent) {
        const [guestsRes, rsvpRes] = await Promise.all([
          supabase.from('guests').select('id, name, tags, party_role, party_leader_id, language'),
          supabase.from('rsvp_responses').select('guest_id, status, dietary_requirements, dietary_notes').eq('event_id', ceremonyEvent.id),
        ]);
        const dietaryByGuestId = new Map<string, string | null>();
        const attendingIds = new Set<string>();
        for (const r of rsvpRes.data || []) {
          if (r.status === 'attending') attendingIds.add(r.guest_id);
          const requirements = (r.dietary_requirements || []).filter((d: string) => d && d !== 'none');
          const parts = [...requirements];
          if (r.dietary_notes) parts.push(r.dietary_notes);
          dietaryByGuestId.set(r.guest_id, parts.length > 0 ? parts.join(', ') : null);
        }
        setGuests((guestsRes.data || [])
          .filter(g => attendingIds.has(g.id))
          .map(g => ({ ...g, dietary: dietaryByGuestId.get(g.id) || null })));
      } else {
        setGuests([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const getSeat = (tableId: string, side: 'A' | 'B' | 'H', position: number) =>
    assignments.find(a => a.table_id === tableId && a.side === side && a.position === position);

  const seatedGuestIds = new Set(assignments.map(a => a.guest_id));
  const guestById = new Map(guests.map(g => [g.id, g]));
  const matchesSearch = (g: Guest) => g.name.toLowerCase().includes(search.toLowerCase());
  const unseatedGuests = guests.filter(g => !seatedGuestIds.has(g.id) && matchesSearch(g));
  const seatedGuests   = guests.filter(g => seatedGuestIds.has(g.id) && matchesSearch(g));

  const tableNameById = new Map(tables.map(t => [t.id, t.name]));
  const seatLabel = (a: SeatingAssignment) => `${tableNameById.get(a.table_id) || 'Table'} · ${a.side}${a.position}`;
  const guestMeta = (g: Guest) => [g.language?.toUpperCase(), g.dietary].filter(Boolean).join(' · ');

  const exportCSV = () => {
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const cellFor = (seat?: SeatingAssignment) => {
      if (!seat) return '';
      const g = guestById.get(seat.guest_id);
      const lines = [g?.name || seat.guests?.name || 'Guest'];
      const lang = g?.language || seat.guests?.language;
      if (lang) lines.push(lang.toUpperCase());
      if (g?.dietary) lines.push(g.dietary);
      return lines.join('\r\n');
    };

    const lines: string[] = [];
    for (const table of tables) {
      lines.push(esc(table.name));
      const header = ['', ...Array.from({ length: table.seats_per_side }, (_, i) => String(i + 1))];
      lines.push(header.map(esc).join(','));
      for (const side of ['A', 'B'] as const) {
        const row = [side, ...Array.from({ length: table.seats_per_side }, (_, i) => cellFor(getSeat(table.id, side, i + 1)))];
        lines.push(row.map(esc).join(','));
      }
      lines.push('');
    }

    const allUnseated = guests.filter(g => !seatedGuestIds.has(g.id));
    if (allUnseated.length > 0) {
      lines.push(esc('Unseated'));
      for (const g of allUnseated) lines.push(esc([g.name, guestMeta(g)].filter(Boolean).join(' · ')));
    }

    const csv = lines.join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `seating-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Table CRUD
  const openNewTable = () => {
    setTableForm({ name: `Table ${tables.length + 1}`, seats_per_side: 6 });
    setEditingTable(null);
    setShowTableModal(true);
  };
  const openEditTable = (t: SeatingTable) => {
    setTableForm({ name: t.name, seats_per_side: t.seats_per_side });
    setEditingTable(t);
    setShowTableModal(true);
  };
  const saveTable = async () => {
    if (!tableForm.name.trim() || tableForm.seats_per_side < 1) return;
    setSaving(true);
    try {
      if (editingTable) {
        await supabase.from('seating_tables').update({
          name: tableForm.name,
          seats_per_side: tableForm.seats_per_side,
        }).eq('id', editingTable.id);
        // Drop any seats that no longer exist on this table (both sides share the position range)
        await supabase.from('seating_assignments').delete()
          .eq('table_id', editingTable.id)
          .gt('position', tableForm.seats_per_side);
      } else {
        await supabase.from('seating_tables').insert({
          name: tableForm.name,
          seats_per_side: tableForm.seats_per_side,
          sort_order: tables.length,
        });
      }
      setShowTableModal(false);
      setEditingTable(null);
      await fetchAll();
    } finally {
      setSaving(false);
    }
  };
  const deleteTable = async (id: string) => {
    await supabase.from('seating_tables').delete().eq('id', id);
    setDeleteConfirm(null);
    await fetchAll();
  };

  // Drag and drop
  const handleDragStart = (e: React.DragEvent, guestId: string) => {
    e.dataTransfer.setData('text/plain', guestId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, seatKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverSeat !== seatKey) setDragOverSeat(seatKey);
  };

  const handleDrop = async (e: React.DragEvent, tableId: string, side: 'A' | 'B' | 'H', position: number) => {
    e.preventDefault();
    setDragOverSeat(null);
    const guestId = e.dataTransfer.getData('text/plain');
    if (!guestId) return;

    const targetSeat = getSeat(tableId, side, position);
    if (targetSeat && targetSeat.guest_id === guestId) return;

    const sourceSeat = assignments.find(a => a.guest_id === guestId);

    if (targetSeat) {
      const idsToDelete = [targetSeat.id, ...(sourceSeat ? [sourceSeat.id] : [])];
      await supabase.from('seating_assignments').delete().in('id', idsToDelete);
      const inserts = [{ table_id: tableId, side, position, guest_id: guestId }];
      if (sourceSeat) {
        inserts.push({ table_id: sourceSeat.table_id, side: sourceSeat.side, position: sourceSeat.position, guest_id: targetSeat.guest_id });
      }
      await supabase.from('seating_assignments').insert(inserts);
    } else {
      if (sourceSeat) {
        await supabase.from('seating_assignments').delete().eq('id', sourceSeat.id);
      }
      await supabase.from('seating_assignments').insert({ table_id: tableId, side, position, guest_id: guestId });
    }
    await fetchAll();
  };

  const unassignGuest = async (assignmentId: string) => {
    await supabase.from('seating_assignments').delete().eq('id', assignmentId);
    await fetchAll();
  };

  const handleFill = async () => {
    setShuffling(true);
    try {
      const emptySeats = tables.flatMap(t => {
        const seats: { table_id: string; side: string; position: number }[] = [];
        for (const side of ['A', 'B', 'H'] as const) {
          if (side === 'H' && !headTables.has(t.id)) continue;
          const limit = side === 'H' ? 2 : t.seats_per_side;
          for (let pos = 1; pos <= limit; pos++) {
            if (!getSeat(t.id, side, pos)) seats.push({ table_id: t.id, side, position: pos });
          }
        }
        return seats;
      });
      const shuffled = [...unseatedGuests].sort(() => Math.random() - 0.5);
      const inserts = shuffled.slice(0, emptySeats.length).map((g, i) => ({ ...emptySeats[i], guest_id: g.id }));
      if (inserts.length > 0) await supabase.from('seating_assignments').insert(inserts);
      await fetchAll();
    } finally { setShuffling(false); }
  };

  const handleShuffle = async () => {
    setShuffling(true);
    try {
      const unlocked = assignments.filter(a => !lockedGuestIds.has(a.guest_id));
      if (unlocked.length < 2) return;
      const seats = unlocked.map(a => ({ table_id: a.table_id, side: a.side, position: a.position }));
      const guestIds = [...unlocked.map(a => a.guest_id)].sort(() => Math.random() - 0.5);
      await supabase.from('seating_assignments').delete().in('id', unlocked.map(a => a.id));
      await supabase.from('seating_assignments').insert(seats.map((s, i) => ({ ...s, guest_id: guestIds[i] })));
      await fetchAll();
    } finally { setShuffling(false); }
  };

  if (loading) {
    return <div className="p-8 max-w-[1400px] mx-auto text-sm text-gray-500">Loading…</div>;
  }

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Seating</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {guests.length} confirmed · {seatedGuestIds.size} seated · {guests.length - seatedGuestIds.size} unseated
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleFill} disabled={shuffling || unseatedGuests.length === 0 || tables.length === 0} className="border border-gray-200 text-gray-700 text-sm font-medium px-4 py-2 rounded-md hover:bg-gray-50 disabled:opacity-40">{shuffling ? '…' : 'Fill seats'}</button>
          <button onClick={handleShuffle} disabled={shuffling || assignments.length < 2} className="border border-gray-200 text-gray-700 text-sm font-medium px-4 py-2 rounded-md hover:bg-gray-50 disabled:opacity-40">{shuffling ? '…' : 'Shuffle'}</button>
          <button onClick={exportCSV} disabled={tables.length === 0} className="border border-gray-200 text-gray-700 text-sm font-medium px-4 py-2 rounded-md hover:bg-gray-50 disabled:opacity-40">Export CSV</button>
          <button onClick={openNewTable} className="bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-gray-700">+ Add table</button>
        </div>
      </div>

      {lockedGuestIds.size > 0 && (
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mb-4">
          🔒 {lockedGuestIds.size} seat{lockedGuestIds.size !== 1 ? 's' : ''} locked — locks are saved in this browser only. Seats are always saved.
        </p>
      )}

      <div className="space-y-6">
        {/* Tables */}
        <div className="space-y-6">
          {tables.length === 0 && (
            <div className="border border-dashed border-gray-200 rounded-xl p-10 text-center text-sm text-gray-400">
              No tables yet. Add your first table to start seating guests.
            </div>
          )}
          {tables.map(table => {
            const seatCount = assignments.filter(a => a.table_id === table.id).length;
            const totalSeats = table.seats_per_side * 2 + (headTables.has(table.id) ? 2 : 0);
            return (
              <div key={table.id} className="border border-gray-200 rounded-xl p-5 bg-white">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="font-semibold text-gray-900">{table.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{seatCount}/{totalSeats} seats filled</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => toggleHeadTable(table.id)} className={`text-xs px-2 py-1 border rounded ${headTables.has(table.id) ? 'border-purple-200 text-purple-600 bg-purple-50 hover:bg-purple-100' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>{headTables.has(table.id) ? 'Head seats on' : 'Add head seats'}</button>
                    <button onClick={() => openEditTable(table)} className="text-xs text-gray-500 hover:text-gray-800 px-2 py-1 border border-gray-200 rounded hover:bg-gray-50">Edit</button>
                    <button onClick={() => setDeleteConfirm(table)} className="text-xs text-red-400 hover:text-red-600 px-2 py-1 border border-red-100 rounded hover:bg-red-50">Delete</button>
                  </div>
                </div>

                <div className="overflow-x-auto pb-1">
                  <div className="inline-flex items-center gap-3">
                    {/* Left head seat */}
                    {headTables.has(table.id) && (() => {
                      const seat = getSeat(table.id, 'H', 1);
                      const seatKey = `${table.id}-H-1`;
                      const isDragOver = dragOverSeat === seatKey;
                      const guest = seat ? guestById.get(seat.guest_id) : undefined;
                      const meta = guest ? guestMeta(guest) : '';
                      const isLocked = seat ? lockedGuestIds.has(seat.guest_id) : false;
                      return (
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-[9px] text-gray-400 uppercase tracking-wide">Head</span>
                          <div
                            onDragOver={e => handleDragOver(e, seatKey)}
                            onDragLeave={() => setDragOverSeat(prev => prev === seatKey ? null : prev)}
                            onDrop={e => handleDrop(e, table.id, 'H', 1)}
                            draggable={!!seat && !isLocked}
                            onDragStart={seat && !isLocked ? e => handleDragStart(e, seat.guest_id) : undefined}
                            className={`relative w-14 h-14 flex-shrink-0 rounded-full border text-[9px] flex flex-col items-center justify-center px-0.5 text-center transition-colors ${seat ? isLocked ? 'bg-blue-50 border-blue-200 text-blue-800' : 'bg-purple-50 border-purple-200 text-purple-800 cursor-grab' : 'bg-gray-50 border-gray-200 text-gray-400 border-dashed'} ${isDragOver ? 'ring-2 ring-gray-900' : ''}`}
                          >
                            {seat ? (<>
                              <span className="font-medium leading-tight truncate max-w-full px-1 mt-1">{guest?.name || seat.guests?.name || 'Guest'}</span>
                              {meta && <span className={`text-[7px] truncate max-w-full ${isLocked ? 'text-blue-600' : 'text-purple-600'}`}>{meta}</span>}
                              <button onClick={() => toggleLock(seat.guest_id)} className="absolute top-0.5 right-4 text-[9px]" title={isLocked ? 'Unlock' : 'Lock'}>{isLocked ? '🔒' : '🔓'}</button>
                              <button onClick={() => unassignGuest(seat.id)} className="absolute top-0.5 right-0.5 text-gray-400 hover:text-red-600 leading-none" title="Remove">×</button>
                            </>) : <span className="text-[8px]">Empty</span>}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Main seats: sides A and B */}
                    <div className="inline-flex flex-col gap-1">
                      {(['A', 'B'] as const).map(side => (
                        <div key={side} className="flex gap-1">
                          {Array.from({ length: table.seats_per_side }, (_, i) => i + 1).map(position => {
                            const seat = getSeat(table.id, side, position);
                            const seatKey = `${table.id}-${side}-${position}`;
                            const isDragOver = dragOverSeat === seatKey;
                            const guest = seat ? guestById.get(seat.guest_id) : undefined;
                            const meta = guest ? guestMeta(guest) : '';
                            const isLocked = seat ? lockedGuestIds.has(seat.guest_id) : false;
                            return (
                              <div
                                key={seatKey}
                                onDragOver={e => handleDragOver(e, seatKey)}
                                onDragLeave={() => setDragOverSeat(prev => prev === seatKey ? null : prev)}
                                onDrop={e => handleDrop(e, table.id, side, position)}
                                draggable={!!seat && !isLocked}
                                onDragStart={seat && !isLocked ? e => handleDragStart(e, seat.guest_id) : undefined}
                                className={`relative w-14 h-14 flex-shrink-0 rounded border text-[9px] flex flex-col items-center justify-center px-0.5 text-center transition-colors ${
                                  seat
                                    ? isLocked ? 'bg-blue-50 border-blue-200 text-blue-800' : 'bg-green-50 border-green-200 text-green-800 cursor-grab'
                                    : 'bg-gray-50 border-gray-200 text-gray-400 border-dashed'
                                } ${isDragOver ? 'ring-2 ring-gray-900' : ''}`}
                                title={seat ? `${side}${position} · ${guest?.name || seat.guests?.name || 'Guest'}${meta ? ' · ' + meta : ''}` : `${side}${position}`}
                              >
                                <span className="absolute top-0.5 left-1 text-[8px] text-gray-400">{side}{position}</span>
                                {seat ? (
                                  <>
                                    <span className="font-medium leading-tight truncate max-w-full mt-1">{guest?.name || seat.guests?.name || 'Guest'}</span>
                                    {meta && <span className={`text-[7px] truncate max-w-full leading-tight ${isLocked ? 'text-blue-600' : 'text-green-700'}`}>{meta}</span>}
                                    <button onClick={() => toggleLock(seat.guest_id)} className="absolute top-0.5 right-4 text-[9px] leading-none" title={isLocked ? 'Unlock' : 'Lock'}>{isLocked ? '🔒' : '🔓'}</button>
                                    <button onClick={() => unassignGuest(seat.id)} className="absolute top-0.5 right-0.5 text-gray-400 hover:text-red-600 leading-none" title="Remove from seat">×</button>
                                  </>
                                ) : (
                                  <span className="text-[8px]">Empty</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>

                    {/* Right head seat */}
                    {headTables.has(table.id) && (() => {
                      const seat = getSeat(table.id, 'H', 2);
                      const seatKey = `${table.id}-H-2`;
                      const isDragOver = dragOverSeat === seatKey;
                      const guest = seat ? guestById.get(seat.guest_id) : undefined;
                      const meta = guest ? guestMeta(guest) : '';
                      const isLocked = seat ? lockedGuestIds.has(seat.guest_id) : false;
                      return (
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-[9px] text-gray-400 uppercase tracking-wide">Head</span>
                          <div
                            onDragOver={e => handleDragOver(e, seatKey)}
                            onDragLeave={() => setDragOverSeat(prev => prev === seatKey ? null : prev)}
                            onDrop={e => handleDrop(e, table.id, 'H', 2)}
                            draggable={!!seat && !isLocked}
                            onDragStart={seat && !isLocked ? e => handleDragStart(e, seat.guest_id) : undefined}
                            className={`relative w-14 h-14 flex-shrink-0 rounded-full border text-[9px] flex flex-col items-center justify-center px-0.5 text-center transition-colors ${seat ? isLocked ? 'bg-blue-50 border-blue-200 text-blue-800' : 'bg-purple-50 border-purple-200 text-purple-800 cursor-grab' : 'bg-gray-50 border-gray-200 text-gray-400 border-dashed'} ${isDragOver ? 'ring-2 ring-gray-900' : ''}`}
                          >
                            {seat ? (<>
                              <span className="font-medium leading-tight truncate max-w-full px-1 mt-1">{guest?.name || seat.guests?.name || 'Guest'}</span>
                              {meta && <span className={`text-[7px] truncate max-w-full ${isLocked ? 'text-blue-600' : 'text-purple-600'}`}>{meta}</span>}
                              <button onClick={() => toggleLock(seat.guest_id)} className="absolute top-0.5 right-4 text-[9px]" title={isLocked ? 'Unlock' : 'Lock'}>{isLocked ? '🔒' : '🔓'}</button>
                              <button onClick={() => unassignGuest(seat.id)} className="absolute top-0.5 right-0.5 text-gray-400 hover:text-red-600 leading-none" title="Remove">×</button>
                            </>) : <span className="text-[8px]">Empty</span>}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Guest list */}
        <div className="border border-gray-200 rounded-xl p-5 bg-white">
          <div className="flex items-center justify-between mb-3 gap-4 flex-wrap">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Unseated ({unseatedGuests.length})</p>
            <input
              type="text"
              placeholder="Search guests…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-900 w-64 focus:outline-none focus:border-gray-400"
            />
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            {unseatedGuests.length === 0 && (
              <p className="text-xs text-gray-400">Nobody left to seat.</p>
            )}
            {unseatedGuests.map(g => (
              <div
                key={g.id}
                draggable
                onDragStart={e => handleDragStart(e, g.id)}
                title={guestMeta(g) || undefined}
                className="border border-gray-200 rounded-md px-3 py-1.5 text-sm text-gray-800 bg-white cursor-grab hover:border-gray-400"
              >
                {g.name}
                {g.party_role !== 'primary' && <span className="text-xs text-gray-400 ml-1">({g.party_role})</span>}
                {guestMeta(g) && <span className="text-xs text-gray-400 ml-1.5">· {guestMeta(g)}</span>}
              </div>
            ))}
          </div>

          <button
            onClick={() => setShowSeated(s => !s)}
            className="text-xs text-gray-500 hover:text-gray-800 font-medium uppercase tracking-wider mb-2"
          >
            {showSeated ? '▾' : '▸'} Seated ({seatedGuests.length})
          </button>
          {showSeated && (
            <div className="flex flex-wrap gap-2">
              {seatedGuests.map(g => {
                const a = assignments.find(x => x.guest_id === g.id)!;
                return (
                  <div
                    key={g.id}
                    draggable
                    onDragStart={e => handleDragStart(e, g.id)}
                    title={guestMeta(g) || undefined}
                    className="border border-gray-100 rounded-md px-3 py-1.5 text-sm text-gray-500 bg-gray-50 cursor-grab hover:border-gray-300 flex items-center gap-2"
                  >
                    <span>{g.name}</span>
                    {guestMeta(g) && <span className="text-xs text-gray-400">· {guestMeta(g)}</span>}
                    <span className="text-[10px] text-gray-400 whitespace-nowrap">{seatLabel(a)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Table modal */}
      {showTableModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
            <div className="px-6 py-5 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">{editingTable ? 'Edit table' : 'Add table'}</h2>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Table name</label>
                <input
                  type="text"
                  value={tableForm.name}
                  onChange={e => setTableForm(f => ({ ...f, name: e.target.value }))}
                  className="border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-900 w-full focus:outline-none focus:border-gray-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Seats per side</label>
                <input
                  type="number"
                  min={1}
                  value={tableForm.seats_per_side}
                  onChange={e => setTableForm(f => ({ ...f, seats_per_side: Math.max(1, parseInt(e.target.value) || 1) }))}
                  className="border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-900 w-full focus:outline-none focus:border-gray-400"
                />
                <p className="text-xs text-gray-400 mt-1">{tableForm.seats_per_side * 2} seats total, {tableForm.seats_per_side} facing each other on each side.</p>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button onClick={() => setShowTableModal(false)} className="text-sm text-gray-500 px-4 py-2">Cancel</button>
              <button onClick={saveTable} disabled={saving || !tableForm.name.trim()} className="bg-gray-900 text-white text-sm font-medium px-5 py-2 rounded-md hover:bg-gray-700 disabled:opacity-50">
                {saving ? 'Saving…' : editingTable ? 'Save changes' : 'Add table'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 text-center">
            <p className="font-semibold text-gray-900 mb-2">Delete "{deleteConfirm.name}"?</p>
            <p className="text-sm text-gray-500 mb-6">
              {assignments.filter(a => a.table_id === deleteConfirm.id).length > 0
                ? `This will unseat ${assignments.filter(a => a.table_id === deleteConfirm.id).length} guest(s) currently at this table.`
                : 'This table has no seated guests.'}
            </p>
            <div className="flex justify-center gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="text-sm text-gray-500 px-4 py-2">Cancel</button>
              <button onClick={() => deleteTable(deleteConfirm.id)} className="bg-red-500 text-white text-sm font-medium px-5 py-2 rounded-md hover:bg-red-600">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
