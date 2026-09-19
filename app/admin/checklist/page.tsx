'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface ChecklistItem {
  id: string;
  title: string;
  notes: string;
  completed: boolean;
  position: number;
  created_at?: string;
}

type Filter = 'all' | 'pending' | 'completed';

interface Checklist {
  id: string;
  name: string;
  checklist_items: ChecklistItem[];
}

function matchesItem(item: ChecklistItem, filter: Filter, search: string) {
  return (filter === 'all' || item.completed === (filter === 'completed'))
    && `${item.title}\n${item.notes || ''}`.toLocaleLowerCase().includes(search);
}

export default function ChecklistPage() {
  const [lists, setLists] = useState<Checklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [showNote, setShowNote] = useState(false);
  const [note, setNote] = useState('');
  const [noteDetails, setNoteDetails] = useState('');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [itemDrafts, setItemDrafts] = useState<Record<string, { title: string; notes: string }>>({});
  const [noteListId, setNoteListId] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);
  const noteDialog = useRef<HTMLDialogElement>(null);
  const addingNote = useRef(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [listFilter, setListFilter] = useState('');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [deletingListId, setDeletingListId] = useState<string | null>(null);
  const creating = useRef(false);
  const deleting = useRef(false);
  const query = search.trim().toLocaleLowerCase();
  const totals = lists.reduce((counts, list) => {
    const completed = list.checklist_items.filter(item => item.completed).length;
    return { pending: counts.pending + list.checklist_items.length - completed, completed: counts.completed + completed };
  }, { pending: 0, completed: 0 });
  const visibleLists = lists.filter(list => {
    if (listFilter && list.id !== listFilter) return false;
    const itemQuery = list.name.toLocaleLowerCase().includes(query) ? '' : query;
    return (filter === 'all' && !itemQuery) || list.checklist_items.some(item => matchesItem(item, filter, itemQuery));
  });
  const allCollapsed = visibleLists.length > 0 && visibleLists.every(list => collapsed.has(list.id));
  const selectedList = lists.find(list => list.checklist_items.some(item => item.id === selectedItemId));
  const selectedItem = selectedList?.checklist_items.find(item => item.id === selectedItemId);

  const loadLists = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await supabase.from('checklists')
        .select('id, name, checklist_items(id, title, notes, completed, position, created_at)').order('created_at').order('id');
      if (result.error) throw result.error;
      setLists((result.data || []).map(list => ({ ...list, checklist_items: [...list.checklist_items].sort((a, b) =>
        a.position - b.position || a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id)
      ) })));
    } catch {
      setError('Could not load checklists. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadLists(); }, []);
  useEffect(() => {
    if (showNote) noteDialog.current?.showModal();
    else noteDialog.current?.close();
  }, [showNote]);

  const addNote = async () => {
    const list = lists.find(current => current.id === noteListId);
    if (!note.trim() || !list || addingNote.current) return;
    addingNote.current = true;
    setSavingNote(true);
    setNoteError(null);
    try {
      const result = await supabase.from('checklist_items').insert({
        checklist_id: list.id,
        title: note.trim(),
        notes: noteDetails.trim(),
        position: Math.max(-1, ...list.checklist_items.map(item => item.position)) + 1,
      }).select('id, title, notes, completed, position, created_at').single();
      if (result.error) throw result.error;
      setLists(previous => previous.map(current => current.id === list.id
        ? { ...current, checklist_items: [...current.checklist_items, result.data] } : current));
      setShowNote(false);
      setNote('');
      setNoteDetails('');
      setSearch('');
      if (filter === 'completed') setFilter('pending');
      if (listFilter && listFilter !== list.id) setListFilter(list.id);
      setCollapsed(previous => { const next = new Set(previous); next.delete(list.id); return next; });
      requestAnimationFrame(() => document.getElementById(`checklist-${list.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
    } catch {
      setNoteError('Could not add the note. Please try again.');
    } finally {
      addingNote.current = false;
      setSavingNote(false);
    }
  };

  const clearFilters = () => { setSearch(''); setFilter('all'); setListFilter(''); };
  const updateItems = (listId: string, update: React.SetStateAction<ChecklistItem[]>) => {
    setLists(previous => previous.map(list => list.id === listId
      ? { ...list, checklist_items: typeof update === 'function' ? update(list.checklist_items) : update } : list));
  };

  const addList = async () => {
    if (!name.trim() || creating.current) return;
    creating.current = true;
    setSaving(true);
    setError(null);
    try {
      const result = await supabase.from('checklists').insert({ name: name.trim() }).select('id, name').single();
      if (result.error) throw result.error;
      setLists(previous => [...previous, { ...result.data, checklist_items: [] }]);
      setName('');
      setShowAdd(false);
      clearFilters();
      requestAnimationFrame(() => document.getElementById(`checklist-${result.data.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
    } catch {
      setError('Could not create the checklist. Please try again.');
    } finally {
      creating.current = false;
      setSaving(false);
    }
  };

  const deleteList = async (list: Checklist) => {
    if (deleting.current) return;
    if (!window.confirm(`Delete "${list.name}"?\n\nThis will permanently delete the checklist and all its items.`)) return;
    deleting.current = true;
    setDeletingListId(list.id);
    setError(null);
    try {
      const result = await supabase.from('checklists').delete().eq('id', list.id).select('id').single();
      if (result.error) throw result.error;
      setLists(previous => previous.filter(current => current.id !== list.id));
      if (listFilter === list.id) setListFilter('');
    } catch {
      setError('Could not delete the checklist. Please try again.');
    } finally {
      deleting.current = false;
      setDeletingListId(null);
    }
  };

  return (
    <div className={`p-4 sm:p-8 mx-auto ${selectedItem ? 'max-w-7xl' : 'max-w-4xl'}`}>
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-1">Checklist</h1>
          <p className="text-sm text-gray-500">{loading ? 'Loading...' : `${lists.length} checklists`}</p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <button onClick={() => setShowAdd(true)} className="border border-gray-200 text-gray-700 text-sm font-medium px-4 py-2 rounded-md hover:bg-gray-100">+ Add checklist</button>
          <button onClick={() => {
            setNote(''); setNoteDetails(''); setNoteError(null); setNoteListId(listFilter || lists[0]?.id || ''); setShowNote(true);
          }} disabled={loading || lists.length === 0 || deletingListId !== null}
            title={lists.length === 0 ? 'Create a checklist first' : 'Add a note to a checklist'}
            className="bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-gray-700 disabled:opacity-50">+ Add note</button>
        </div>
      </div>

      {!loading && <div className="flex flex-wrap gap-6 mb-6 text-sm" aria-live="polite">
        <p className="text-gray-500">Total pending <strong className="text-amber-600 text-xl ml-2">{totals.pending}</strong></p>
        <p className="text-gray-500">Total completed <strong className="text-green-600 text-xl ml-2">{totals.completed}</strong></p>
      </div>}

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

      <div className="sticky top-0 z-10 bg-gray-50 py-3 mb-4 border-b border-gray-200 space-y-3">
        <div className="flex flex-wrap gap-3">
          <input type="search" aria-label="Search checklists and items" placeholder="Search lists and items..." value={search}
            onChange={event => { setSearch(event.target.value); setCollapsed(new Set()); }}
            className="min-w-0 flex-1 bg-white border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-900" />
          <select aria-label="Filter by checklist" value={listFilter} onChange={event => { setListFilter(event.target.value); setCollapsed(new Set()); }}
            className="max-w-full bg-white border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-700">
            <option value="">All lists</option>
            {lists.map(list => <option key={list.id} value={list.id}>{list.name}</option>)}
          </select>
        </div>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex gap-1" role="group" aria-label="Filter items by status">
            {(['all', 'pending', 'completed'] as const).map(value => <button key={value} aria-pressed={filter === value}
              onClick={() => { setFilter(value); setCollapsed(new Set()); }}
              className={`text-sm px-3 py-1.5 rounded-md ${filter === value ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
              {value === 'all' ? 'All' : value === 'pending' ? 'Pending' : 'Completed'}
            </button>)}
          </div>
          <div className="flex gap-4">
            {(search || filter !== 'all' || listFilter) && <button onClick={clearFilters} className="text-sm text-gray-500 hover:text-gray-900">Clear filters</button>}
            {visibleLists.length > 0 && <button onClick={() => setCollapsed(previous => {
              const next = new Set(previous);
              for (const list of visibleLists) { if (allCollapsed) next.delete(list.id); else next.add(list.id); }
              return next;
            })} className="text-sm text-gray-500 hover:text-gray-900">{allCollapsed ? 'Expand all' : 'Collapse all'}</button>}
          </div>
        </div>
      </div>

      {error && <div role="alert" className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
        {error} <button onClick={() => void loadLists()} className="ml-2 underline">Retry</button>
      </div>}

      {!loading && !error && visibleLists.length === 0 && <p className="py-10 text-center text-sm text-gray-400">
        {lists.length === 0 ? 'Create your first checklist to get started.' : 'No lists or items match the current filters.'}
      </p>}
      <div className={`grid gap-6 items-start ${selectedItem ? 'lg:grid-cols-[minmax(0,1fr)_360px]' : ''}`}>
      <div className="min-w-0 bg-white border-y border-gray-200 divide-y divide-gray-200">
        {visibleLists.map(list => {
          const completed = list.checklist_items.filter(item => item.completed).length;
          const pending = list.checklist_items.length - completed;
          const expanded = !collapsed.has(list.id);
          const itemQuery = list.name.toLocaleLowerCase().includes(query) ? '' : query;
          return (
            <section key={list.id} id={`checklist-${list.id}`} className="scroll-mt-40">
              <div className="flex items-center gap-2 px-4 sm:px-5 py-4">
                <h2 className="flex-1 min-w-0">
                  <button onClick={() => setCollapsed(previous => {
                    const next = new Set(previous);
                    if (next.has(list.id)) next.delete(list.id); else next.add(list.id);
                    return next;
                  })} aria-expanded={expanded} aria-controls={`checklist-content-${list.id}`}
                    className="w-full text-left flex items-center gap-3 text-gray-900">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"
                      className={`shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`}><path d="m6 3 5 5-5 5" /></svg>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold break-words">{list.name}</span>
                      <span className="flex flex-wrap gap-3 text-xs mt-1"><span className="text-amber-600">{pending} pending</span><span className="text-green-600">{completed} completed</span></span>
                    </span>
                  </button>
                </h2>
                <button type="button" onClick={() => void deleteList(list)} disabled={deletingListId !== null}
                  aria-label={`Delete checklist ${list.name}`} title={deletingListId === list.id ? 'Deleting...' : 'Delete checklist'}
                  className="rounded-md p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"><TrashIcon /></button>
              </div>
              <div id={`checklist-content-${list.id}`} hidden={!expanded}>
                <ChecklistItems listId={list.id} items={list.checklist_items} filter={filter} search={itemQuery}
                  selectedItemId={selectedItemId} onSelect={setSelectedItemId}
                  disabled={deletingListId === list.id} onItemsChange={items => updateItems(list.id, items)} />
              </div>
            </section>
          );
        })}
      </div>
      {selectedItem && selectedList && <ItemDetails key={selectedItem.id} item={selectedItem} list={selectedList}
        draft={itemDrafts[selectedItem.id]}
        onDraftChange={draft => setItemDrafts(previous => ({ ...previous, [selectedItem.id]: draft }))}
        onClose={() => setSelectedItemId(null)}
        onSaved={changes => {
          updateItems(selectedList.id, previous => previous.map(item => item.id === selectedItem.id ? { ...item, ...changes } : item));
          setItemDrafts(previous => { const next = { ...previous }; delete next[selectedItem.id]; return next; });
        }} />}
      </div>
      <dialog ref={noteDialog} aria-labelledby="add-note-title"
        onCancel={event => { if (addingNote.current) event.preventDefault(); else setShowNote(false); }}
        className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-xl bg-white p-0 shadow-xl backdrop:bg-black/30">
        <form onSubmit={event => { event.preventDefault(); void addNote(); }} className="p-6 space-y-4">
          <h2 id="add-note-title" className="text-lg font-semibold text-gray-900">Add note</h2>
          <div>
            <label htmlFor="note-text" className="block text-sm font-medium text-gray-700 mb-2">Title</label>
            <input id="note-text" autoFocus value={note} onChange={event => setNote(event.target.value)}
              maxLength={500} required disabled={savingNote} placeholder="What needs to be done?"
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-gray-400" />
          </div>
          <div>
            <label htmlFor="note-details" className="block text-sm font-medium text-gray-700 mb-2">Notes <span className="text-gray-400 font-normal">(optional)</span></label>
            <textarea id="note-details" value={noteDetails} onChange={event => setNoteDetails(event.target.value)}
              rows={5} maxLength={10000} disabled={savingNote} placeholder="Add details or comments..."
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-gray-400" />
          </div>
          <div>
            <label htmlFor="note-list" className="block text-sm font-medium text-gray-700 mb-2">Checklist</label>
            <select id="note-list" value={noteListId} onChange={event => setNoteListId(event.target.value)} required disabled={savingNote}
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-900">
              {lists.map(list => <option key={list.id} value={list.id}>{list.name}</option>)}
            </select>
          </div>
          {noteError && <p role="alert" className="text-sm text-red-600">{noteError}</p>}
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowNote(false)} disabled={savingNote} className="text-sm text-gray-500 px-4 py-2">Cancel</button>
            <button type="submit" disabled={savingNote || !note.trim() || !noteListId}
              className="bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-gray-700 disabled:opacity-50">{savingNote ? 'Saving...' : 'Add note'}</button>
          </div>
        </form>
      </dialog>
    </div>
  );
}

function ItemDetails({ item, list, draft, onDraftChange, onClose, onSaved }: {
  item: ChecklistItem;
  list: Checklist;
  draft?: { title: string; notes: string };
  onDraftChange: (draft: { title: string; notes: string }) => void;
  onClose: () => void;
  onSaved: (changes: { title: string; notes: string }) => void;
}) {
  const title = draft?.title ?? item.title;
  const notes = draft?.notes ?? item.notes ?? '';
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const busy = useRef(false);
  const dirty = title !== item.title || notes !== (item.notes || '');

  const save = async () => {
    if (!title.trim() || busy.current) return;
    busy.current = true;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const changes = { title: title.trim(), notes };
      const result = await supabase.from('checklist_items').update(changes)
        .eq('id', item.id).eq('checklist_id', list.id).select('id').single();
      if (result.error) throw result.error;
      onSaved(changes);
      setSaved(true);
    } catch {
      setError('Could not save the details. Please try again.');
    } finally {
      busy.current = false;
      setSaving(false);
    }
  };

  return (
    <aside aria-label="Item details" className="order-first lg:order-last lg:sticky lg:top-36 bg-white border border-gray-200 rounded-lg p-5">
      <div className="flex items-start justify-between gap-3 mb-5">
        <div className="min-w-0">
          <h2 className="font-semibold text-gray-900">Item details</h2>
          <p className="text-xs text-gray-500 mt-1 break-words">{list.name} · {item.completed ? 'Completed' : 'Pending'}</p>
        </div>
        <button type="button" onClick={onClose} disabled={saving} aria-label="Close details" className="text-gray-400 hover:text-gray-700 px-2">×</button>
      </div>
      <form onSubmit={event => { event.preventDefault(); void save(); }} className="space-y-4">
        <div>
          <label htmlFor="detail-title" className="block text-sm font-medium text-gray-700 mb-2">Title</label>
          <input id="detail-title" value={title} onChange={event => { onDraftChange({ title: event.target.value, notes }); setSaved(false); }}
            maxLength={500} required disabled={saving} className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-900" />
        </div>
        <div>
          <label htmlFor="detail-notes" className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
          <textarea id="detail-notes" value={notes} onChange={event => { onDraftChange({ title, notes: event.target.value }); setSaved(false); }}
            rows={10} maxLength={10000} disabled={saving} placeholder="Add details or comments..."
            className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-900" />
        </div>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <div className="flex items-center justify-between gap-3">
          <span role="status" className="text-xs text-gray-500">{saving ? 'Saving...' : dirty ? 'Unsaved changes' : saved ? 'Saved' : ''}</span>
          <button type="submit" disabled={saving || !title.trim() || !dirty}
            className="bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-gray-700 disabled:opacity-50">Save changes</button>
        </div>
      </form>
    </aside>
  );
}

function TrashIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2 4h12M6 4V2h4v2M3.5 4l.75 10h7.5l.75-10M6.5 7v4M9.5 7v4" />
  </svg>;
}

function ChecklistItems({ listId, items, filter, search, disabled, onItemsChange, selectedItemId, onSelect }: {
  listId: string;
  items: ChecklistItem[];
  filter: Filter;
  search: string;
  disabled: boolean;
  onItemsChange: (items: React.SetStateAction<ChecklistItem[]>) => void;
  selectedItemId: string | null;
  onSelect: (id: string) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [targetId, setTargetId] = useState<string | null>(null);
  const busy = useRef(false);

  const visibleItems = items.filter(item => matchesItem(item, filter, search))
    .sort((a, b) => Number(a.completed) - Number(b.completed));

  const saveChange = async (action: () => Promise<void>) => {
    if (busy.current || disabled) return;
    busy.current = true;
    setSaving(true);
    setError(null);
    try {
      await action();
    } catch {
      setError('Could not save your change. Please try again.');
    } finally {
      busy.current = false;
      setSaving(false);
    }
  };

  const toggleItem = (item: ChecklistItem) => saveChange(async () => {
    const result = await supabase.from('checklist_items').update({ completed: !item.completed })
      .eq('id', item.id).eq('checklist_id', listId).select('id').single();
    if (result.error) throw result.error;
    onItemsChange(previous => previous.map(current => current.id === item.id ? { ...current, completed: !item.completed } : current));
  });

  const deleteItem = (item: ChecklistItem) => saveChange(async () => {
    const result = await supabase.from('checklist_items').delete()
      .eq('id', item.id).eq('checklist_id', listId).select('id').single();
    if (result.error) throw result.error;
    onItemsChange(previous => previous.filter(current => current.id !== item.id));
  });

  const moveItem = async (sourceId: string, destinationId: string) => {
    if (sourceId === destinationId) return;
    const source = visibleItems.find(item => item.id === sourceId);
    const destination = visibleItems.find(item => item.id === destinationId);
    if (!source || !destination || source.completed !== destination.completed) return;
    const movableItems = visibleItems.filter(item => item.completed === source.completed);
    const from = movableItems.findIndex(item => item.id === sourceId);
    const to = movableItems.findIndex(item => item.id === destinationId);
    if (from < 0 || to < 0) return;
    const reordered = [...movableItems];
    reordered.splice(to, 0, reordered.splice(from, 1)[0]);
    const visibleIds = new Set(movableItems.map(item => item.id));
    let index = 0;
    // Preserve hidden items and the other completion group's manual order.
    const next = items.map(item => visibleIds.has(item.id) ? reordered[index++] : item)
      .map((item, position) => ({ ...item, position }));
    await saveChange(async () => {
      onItemsChange(previous => previous.map(item => ({ ...item, position: next.find(ordered => ordered.id === item.id)?.position ?? item.position }))
        .sort((a, b) => a.position - b.position));
      try {
        const result = await supabase.rpc('reorder_checklist_items', { list_id: listId, item_ids: next.map(item => item.id) });
        if (result.error) throw result.error;
      } catch (cause) {
        onItemsChange(previous => previous.map(item => ({ ...item, position: items.find(original => original.id === item.id)?.position ?? item.position }))
          .sort((a, b) => a.position - b.position));
        throw cause;
      }
    });
  };

  const cancelDrag = () => { setDraggedId(null); setTargetId(null); };

  return (
    <div className="px-4 pb-4 sm:px-5">
      {saving && <p className="text-xs text-gray-400 mb-3" role="status">Saving...</p>}

      {error && <div role="alert" className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
        {error}
      </div>}

      <ul className="divide-y divide-gray-100">
          {visibleItems.length === 0 && <li className="px-6 py-10 text-center text-sm text-gray-400">
            {items.length === 0 ? 'Use Add note to add an item to this checklist.' : 'No items match the current filters.'}
          </li>}
          {visibleItems.map((item, index) => (
            <li key={item.id} data-checklist-id={item.id} data-list-id={listId}
              className={`flex items-center gap-3 px-4 py-3 ${selectedItemId === item.id ? 'bg-blue-50' : ''} ${targetId === item.id && draggedId !== item.id ? 'bg-blue-50 ring-2 ring-inset ring-blue-200' : ''} ${draggedId === item.id ? 'opacity-50' : ''}`}>
              <button type="button" disabled={saving || disabled} aria-label={`Reorder ${item.title}`}
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
                  setTargetId(row?.dataset.listId === listId ? row.dataset.checklistId || null : null);
                }}
                onPointerUp={event => {
                  if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
                  const row = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-checklist-id]');
                  const destination = row?.dataset.listId === listId ? row.dataset.checklistId : undefined;
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
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <input type="checkbox" checked={item.completed} disabled={saving || disabled} onChange={() => void toggleItem(item)}
                  aria-label={`Mark ${item.title} as ${item.completed ? 'pending' : 'completed'}`}
                  className="h-4 w-4 shrink-0 accent-gray-900" />
                <button type="button" onClick={() => onSelect(item.id)} aria-pressed={selectedItemId === item.id}
                  className="text-left flex-1 min-w-0 rounded focus-visible:outline-2">
                  <span className={`block text-sm whitespace-pre-wrap break-words ${item.completed ? 'line-through text-gray-400' : 'text-gray-900'}`}>{item.title}</span>
                  {item.notes && <span className="block text-xs text-gray-400 mt-1 truncate">{item.notes}</span>}
                </button>
              </div>
              <button
                type="button"
                onClick={() => void deleteItem(item)}
                disabled={saving || disabled}
                aria-label={`Delete ${item.title}`}
                title="Delete item"
                className="shrink-0 rounded-md p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 focus-visible:outline-2 disabled:opacity-50"
              >
                <TrashIcon />
              </button>
            </li>
          ))}
      </ul>
    </div>
  );
}
