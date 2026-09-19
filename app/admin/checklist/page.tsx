'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface ChecklistItem {
  id: string;
  title: string;
  completed: boolean;
  position: number;
}

type Filter = 'all' | 'pending' | 'completed';

interface Checklist {
  id: string;
  name: string;
  checklist_items: { completed: boolean }[];
}

export default function ChecklistPage() {
  const [lists, setLists] = useState<Checklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [activeList, setActiveList] = useState<Checklist | null>(null);
  const creating = useRef(false);

  const loadLists = async () => {
    setError(null);
    try {
      const result = await supabase.from('checklists').select('id, name, checklist_items(completed)').order('created_at').order('id');
      if (result.error) throw result.error;
      setLists(result.data || []);
    } catch {
      setError('Could not load checklists. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadLists(); }, []);

  const addList = async () => {
    if (!name.trim() || creating.current) return;
    creating.current = true;
    setSaving(true);
    setError(null);
    try {
      const result = await supabase.from('checklists').insert({ name: name.trim() }).select('id, name').single();
      if (result.error) throw result.error;
      const list = { ...result.data, checklist_items: [] };
      setLists(previous => [...previous, list]);
      setName('');
      setShowAdd(false);
      setActiveList(list);
    } catch {
      setError('Could not create the checklist. Please try again.');
    } finally {
      creating.current = false;
      setSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-1">Checklist</h1>
          <p className="text-sm text-gray-500">{loading ? 'Loading...' : `${lists.length} checklists`}</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-gray-700">+ Add checklist</button>
      </div>

      {showAdd && <form onSubmit={event => { event.preventDefault(); void addList(); }} className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
        <label htmlFor="checklist-name" className="block text-sm font-medium text-gray-700 mb-2">Checklist name</label>
        <div className="flex flex-wrap gap-3">
          <input id="checklist-name" autoFocus value={name} onChange={event => setName(event.target.value)} maxLength={150}
            placeholder="e.g. Ceremony, Transport" disabled={saving}
            className="min-w-0 flex-1 border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-gray-400" />
          <button type="submit" disabled={!name.trim() || saving} className="bg-gray-900 text-white text-sm px-4 py-2 rounded-md disabled:opacity-50">{saving ? 'Saving...' : 'Create'}</button>
          <button type="button" disabled={saving} onClick={() => { setShowAdd(false); setName(''); }} className="text-sm text-gray-500 px-2">Cancel</button>
        </div>
      </form>}

      {error && <div role="alert" className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
        {error} <button onClick={() => void loadLists()} className="ml-2 underline">Retry</button>
      </div>}

      {!loading && !error && lists.length === 0 && <p className="bg-white border border-gray-200 rounded-lg p-10 text-center text-sm text-gray-400">Create your first checklist to get started.</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {lists.map(list => {
          const completed = list.checklist_items.filter(item => item.completed).length;
          const pending = list.checklist_items.length - completed;
          return (
            <button key={list.id} onClick={() => setActiveList(list)} className="text-left bg-white border border-gray-200 rounded-lg p-6 hover:border-gray-400 transition-colors">
              <h2 className="text-lg font-semibold text-gray-900 break-words mb-4">{list.name}</h2>
              <div className="flex items-end justify-between gap-4 border-t border-gray-100 pt-4">
                <div className="flex gap-6">
                  <div><p className="text-xl font-semibold text-amber-600">{pending}</p><p className="text-xs text-gray-400">Pending</p></div>
                  <div><p className="text-xl font-semibold text-green-600">{completed}</p><p className="text-xs text-gray-400">Completed</p></div>
                </div>
                <span className="text-sm text-gray-500">Open →</span>
              </div>
            </button>
          );
        })}
      </div>

      {activeList && <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={() => setActiveList(null)}>
        <div role="dialog" aria-modal="true" aria-labelledby="checklist-dialog-title" onClick={event => event.stopPropagation()}
          onKeyDown={event => { if (event.key === 'Escape') setActiveList(null); }}
          className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
          <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between gap-4">
            <h2 id="checklist-dialog-title" className="text-lg font-semibold text-gray-900 break-words">{activeList.name}</h2>
            <button autoFocus onClick={() => setActiveList(null)} aria-label="Close checklist" className="text-gray-400 hover:text-gray-700 text-xl">×</button>
          </div>
          <div className="overflow-y-auto">
            <ChecklistItems key={activeList.id} listId={activeList.id} onChanged={() => void loadLists()} />
          </div>
        </div>
      </div>}
    </div>
  );
}

function ChecklistItems({ listId, onChanged }: { listId: string; onChanged: () => void }) {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [title, setTitle] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [targetId, setTargetId] = useState<string | null>(null);
  const busy = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await supabase.from('checklist_items').select('id, title, completed, position')
        .eq('checklist_id', listId)
        .order('position').order('created_at').order('id');
      if (result.error) throw result.error;
      setItems(result.data || []);
      setLoadFailed(false);
    } catch {
      setLoadFailed(true);
      setError('Could not load the checklist. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadItems(); }, []);

  const visibleItems = items.filter(item => filter === 'all' || item.completed === (filter === 'completed'));
  const completedCount = items.filter(item => item.completed).length;

  const saveChange = async (action: () => Promise<void>) => {
    if (busy.current) return;
    busy.current = true;
    setSaving(true);
    setError(null);
    try {
      await action();
      onChanged();
    } catch {
      setError('Could not save your change. Please try again.');
    } finally {
      busy.current = false;
      setSaving(false);
    }
  };

  const addItem = async () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    await saveChange(async () => {
      const result = await supabase.from('checklist_items').insert({
        checklist_id: listId,
        title: trimmed,
        position: Math.max(-1, ...items.map(item => item.position)) + 1,
      }).select('id, title, completed, position').single();
      if (result.error) throw result.error;
      setItems(previous => [...previous, result.data]);
      setTitle('');
      if (filter === 'completed') setFilter('pending');
    });
    inputRef.current?.focus();
  };

  const toggleItem = (item: ChecklistItem) => saveChange(async () => {
    const result = await supabase.from('checklist_items').update({ completed: !item.completed })
      .eq('id', item.id).eq('checklist_id', listId).select('id').single();
    if (result.error) throw result.error;
    setItems(previous => previous.map(current => current.id === item.id ? { ...current, completed: !item.completed } : current));
  });

  const deleteItem = (item: ChecklistItem) => saveChange(async () => {
    const result = await supabase.from('checklist_items').delete()
      .eq('id', item.id).eq('checklist_id', listId).select('id').single();
    if (result.error) throw result.error;
    setItems(previous => previous.filter(current => current.id !== item.id));
  });

  const moveItem = async (sourceId: string, destinationId: string) => {
    if (sourceId === destinationId) return;
    const from = visibleItems.findIndex(item => item.id === sourceId);
    const to = visibleItems.findIndex(item => item.id === destinationId);
    if (from < 0 || to < 0) return;
    const reordered = [...visibleItems];
    reordered.splice(to, 0, reordered.splice(from, 1)[0]);
    const visibleIds = new Set(visibleItems.map(item => item.id));
    let index = 0;
    // Reorder only visible slots so a filter never disrupts hidden items.
    const next = items.map(item => visibleIds.has(item.id) ? reordered[index++] : item)
      .map((item, position) => ({ ...item, position }));
    await saveChange(async () => {
      setItems(next);
      try {
        const result = await supabase.rpc('reorder_checklist_items', { list_id: listId, item_ids: next.map(item => item.id) });
        if (result.error) throw result.error;
      } catch (cause) {
        setItems(items);
        throw cause;
      }
    });
  };

  const cancelDrag = () => { setDraggedId(null); setTargetId(null); };

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-4">
        <p className="text-sm text-gray-500" aria-live="polite">
          {loading ? 'Loading...' : `${completedCount} of ${items.length} completed`}
        </p>
      </div>

      <form onSubmit={event => { event.preventDefault(); void addItem(); }} className="flex gap-3 mb-6">
        <input
          ref={inputRef}
          aria-label="New checklist item"
          placeholder="Add a checklist item..."
          value={title}
          onChange={event => setTitle(event.target.value)}
          maxLength={500}
          disabled={loading || loadFailed || saving}
          className="min-w-0 flex-1 bg-white border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-gray-400 disabled:opacity-50"
        />
        <button type="submit" disabled={!title.trim() || loading || loadFailed || saving}
          className="bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-gray-700 disabled:opacity-50">+ Add</button>
      </form>

      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div className="flex gap-1" role="group" aria-label="Filter checklist">
          {(['all', 'pending', 'completed'] as const).map(value => (
            <button key={value} onClick={() => { cancelDrag(); setFilter(value); }} aria-pressed={filter === value}
              className={`text-sm px-3 py-1.5 rounded-md ${filter === value ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
              {value === 'all' ? 'All' : value === 'pending' ? 'Pending' : 'Completed'}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400" role="status">{saving ? 'Saving...' : 'Drag the handle to reorder'}</p>
      </div>

      {error && <div role="alert" className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
        {error}
        {loadFailed && <button onClick={() => void loadItems()} disabled={loading} className="ml-3 underline">Retry</button>}
      </div>}

      {!loading && !loadFailed && (
        <ul className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100 overflow-hidden">
          {visibleItems.length === 0 && <li className="px-6 py-10 text-center text-sm text-gray-400">
            {items.length === 0 ? 'Add your first checklist item above.' : filter === 'pending' ? 'No pending items.' : 'No completed items yet.'}
          </li>}
          {visibleItems.map((item, index) => (
            <li key={item.id} data-checklist-id={item.id}
              className={`flex items-center gap-3 px-4 py-3 ${targetId === item.id && draggedId !== item.id ? 'bg-blue-50 ring-2 ring-inset ring-blue-200' : ''} ${draggedId === item.id ? 'opacity-50' : ''}`}>
              <button type="button" disabled={saving} aria-label={`Reorder ${item.title}`}
                title="Drag to reorder, or use the arrow keys"
                className="touch-none cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-700 p-1 rounded focus-visible:outline-2 disabled:opacity-50"
                onKeyDown={event => {
                  if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
                  event.preventDefault();
                  const destination = visibleItems[index + (event.key === 'ArrowUp' ? -1 : 1)];
                  if (destination) void moveItem(item.id, destination.id);
                }}
                onPointerDown={event => {
                  if (event.button !== 0 || busy.current) return;
                  event.currentTarget.setPointerCapture(event.pointerId);
                  setDraggedId(item.id);
                  setTargetId(item.id);
                }}
                onPointerMove={event => {
                  if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
                  const row = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-checklist-id]');
                  setTargetId(row?.dataset.checklistId || null);
                }}
                onPointerUp={event => {
                  if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
                  const row = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-checklist-id]');
                  const destination = row?.dataset.checklistId;
                  event.currentTarget.releasePointerCapture(event.pointerId);
                  cancelDrag();
                  if (destination) void moveItem(item.id, destination);
                }}
                onPointerCancel={cancelDrag}
                onLostPointerCapture={cancelDrag}
              >
                <svg width="16" height="20" viewBox="0 0 16 20" fill="currentColor" aria-hidden="true">
                  {[5, 10, 15].flatMap(y => [5, 11].map(x => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.3" />))}
                </svg>
              </button>
              <label className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer">
                <input type="checkbox" checked={item.completed} disabled={saving} onChange={() => void toggleItem(item)}
                  className="h-4 w-4 shrink-0 accent-gray-900" />
                <span className={`text-sm break-words min-w-0 ${item.completed ? 'line-through text-gray-400' : 'text-gray-900'}`}>{item.title}</span>
              </label>
              <button
                type="button"
                onClick={() => void deleteItem(item)}
                disabled={saving}
                aria-label={`Delete ${item.title}`}
                title="Delete item"
                className="shrink-0 rounded-md p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 focus-visible:outline-2 disabled:opacity-50"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M2 4h12M6 4V2h4v2M3.5 4l.75 10h7.5l.75-10M6.5 7v4M9.5 7v4" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
