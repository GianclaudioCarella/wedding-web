'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const COLORS = [
  { name: 'Blue',   value: '#3B82F6' }, { name: 'Green',  value: '#10B981' },
  { name: 'Amber',  value: '#F59E0B' }, { name: 'Red',    value: '#EF4444' },
  { name: 'Purple', value: '#8B5CF6' }, { name: 'Pink',   value: '#EC4899' },
  { name: 'Cyan',   value: '#06B6D4' }, { name: 'Orange', value: '#F97316' },
];

interface Task {
  id: string; name: string; description: string | null;
  start_month: number; end_month: number; year: number;
  color: string; position: number; status: 'pending' | 'done';
}

const EMPTY_FORM = { name: '', description: '', start_month: 1, end_month: 3, year: 2026, color: '#3B82F6' };

export default function PlanningPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(2026);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => { fetchTasks(); }, []);

  const fetchTasks = async () => {
    const { data } = await supabase.from('planning_tasks').select('*').order('position');
    setTasks(data || []);
    setLoading(false);
  };

  const openNew = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, year });
    setShowModal(true);
  };

  const openEdit = (t: Task) => {
    setEditing(t);
    setForm({ name: t.name, description: t.description || '', start_month: t.start_month, end_month: t.end_month, year: t.year, color: t.color });
    setShowModal(true);
  };

  const save = async () => {
    setSaving(true);
    const payload = { ...form, position: editing?.position ?? tasks.length, status: editing?.status ?? 'pending' };
    if (editing) {
      await supabase.from('planning_tasks').update(payload).eq('id', editing.id);
    } else {
      await supabase.from('planning_tasks').insert(payload);
    }
    setShowModal(false); setSaving(false); await fetchTasks();
  };

  const toggleDone = async (t: Task) => {
    await supabase.from('planning_tasks').update({ status: t.status === 'done' ? 'pending' : 'done' }).eq('id', t.id);
    await fetchTasks();
  };

  const deleteTask = async (id: string) => {
    await supabase.from('planning_tasks').delete().eq('id', id);
    setDeleteConfirm(null); await fetchTasks();
  };

  const yearTasks = tasks.filter(t => t.year === year).sort((a, b) => a.position - b.position);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Planning</h1>
          <p className="text-sm text-gray-500 mt-0.5">Wedding timeline — {yearTasks.filter(t => t.status === 'done').length} of {yearTasks.length} tasks done</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={year} onChange={e => setYear(parseInt(e.target.value))} className="border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-gray-400">
            <option value={2025}>2025</option>
            <option value={2026}>2026</option>
          </select>
          <button onClick={openNew} className="bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-gray-700">+ Add task</button>
        </div>
      </div>

      {loading ? <p className="text-sm text-gray-400">Loading…</p> : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {/* Month header */}
          <div className="grid border-b border-gray-200" style={{ gridTemplateColumns: '200px repeat(12, 1fr)' }}>
            <div className="px-4 py-3 text-xs font-medium text-gray-400 border-r border-gray-100">Task</div>
            {MONTHS.map((m, i) => (
              <div key={m} className={`px-2 py-3 text-xs font-medium text-center text-gray-400 ${i < 11 ? 'border-r border-gray-100' : ''}`}>{m}</div>
            ))}
          </div>

          {yearTasks.length === 0 && (
            <div className="px-4 py-10 text-center text-gray-400 text-sm">No tasks for {year}. Add your first task above.</div>
          )}

          {yearTasks.map(task => (
            <div key={task.id} className={`grid border-b border-gray-100 group hover:bg-gray-50 transition-colors ${task.status === 'done' ? 'opacity-60' : ''}`} style={{ gridTemplateColumns: '200px repeat(12, 1fr)' }}>
              {/* Task name */}
              <div className="px-4 py-3 border-r border-gray-100 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={task.status === 'done'}
                  onChange={() => toggleDone(task)}
                  className="rounded border-gray-300 shrink-0"
                />
                <div className="min-w-0">
                  <p className={`text-sm font-medium text-gray-900 truncate ${task.status === 'done' ? 'line-through text-gray-400' : ''}`}>{task.name}</p>
                  {task.description && <p className="text-xs text-gray-400 truncate">{task.description}</p>}
                </div>
              </div>

              {/* Month cells */}
              {MONTHS.map((_, monthIdx) => {
                const month = monthIdx + 1;
                const isStart = month === task.start_month;
                const isEnd = month === task.end_month;
                const isInRange = month >= task.start_month && month <= task.end_month;
                return (
                  <div key={month} className={`py-3 px-0.5 flex items-center ${monthIdx < 11 ? 'border-r border-gray-100' : ''}`}>
                    {isInRange && (
                      <div
                        className="h-6 w-full flex items-center justify-center"
                        style={{
                          backgroundColor: task.color + '30',
                          borderRadius: isStart && isEnd ? '6px' : isStart ? '6px 0 0 6px' : isEnd ? '0 6px 6px 0' : '0',
                          borderLeft: isStart ? `3px solid ${task.color}` : 'none',
                          borderRight: isEnd ? `3px solid ${task.color}` : 'none',
                          marginLeft: isStart ? '2px' : '0',
                          marginRight: isEnd ? '2px' : '0',
                        }}
                      />
                    )}
                  </div>
                );
              })}

              {/* Hover actions */}
              <div className="absolute right-4 hidden group-hover:flex items-center gap-2 py-3">
                <button onClick={() => openEdit(task)} className="text-xs text-gray-400 hover:text-gray-700">Edit</button>
                <button onClick={() => setDeleteConfirm(task.id)} className="text-xs text-red-400 hover:text-red-600">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit buttons below table as fallback */}
      {!loading && yearTasks.length > 0 && (
        <div className="mt-4 space-y-1">
          {yearTasks.map(task => (
            <div key={task.id} className="flex items-center justify-between px-2 py-1">
              <span className="text-sm text-gray-500 flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: task.color }} />
                {task.name}
              </span>
              <div className="flex gap-3">
                <button onClick={() => openEdit(task)} className="text-xs text-gray-400 hover:text-gray-700">Edit</button>
                <button onClick={() => setDeleteConfirm(task.id)} className="text-xs text-red-400 hover:text-red-600">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="px-6 py-5 border-b border-gray-200"><h2 className="text-lg font-semibold text-gray-900">{editing ? 'Edit task' : 'Add task'}</h2></div>
            <div className="px-6 py-5 space-y-4">
              <Field label="Task name *"><input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input" placeholder="Book florist, Send invites…" /></Field>
              <Field label="Description"><input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="input" /></Field>
              <div className="grid grid-cols-3 gap-4">
                <Field label="From month">
                  <select value={form.start_month} onChange={e => setForm(f => ({ ...f, start_month: parseInt(e.target.value) }))} className="input">
                    {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                  </select>
                </Field>
                <Field label="To month">
                  <select value={form.end_month} onChange={e => setForm(f => ({ ...f, end_month: parseInt(e.target.value) }))} className="input">
                    {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                  </select>
                </Field>
                <Field label="Year">
                  <select value={form.year} onChange={e => setForm(f => ({ ...f, year: parseInt(e.target.value) }))} className="input">
                    <option value={2025}>2025</option>
                    <option value={2026}>2026</option>
                  </select>
                </Field>
              </div>
              <Field label="Colour">
                <div className="flex gap-2 mt-1">
                  {COLORS.map(c => (
                    <button key={c.value} type="button" onClick={() => setForm(f => ({ ...f, color: c.value }))}
                      className="w-7 h-7 rounded-full transition-transform hover:scale-110"
                      style={{ backgroundColor: c.value, outline: form.color === c.value ? `3px solid ${c.value}` : 'none', outlineOffset: '2px' }}
                    />
                  ))}
                </div>
              </Field>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="text-sm text-gray-500 px-4 py-2">Cancel</button>
              <button onClick={save} disabled={saving || !form.name} className="bg-gray-900 text-white text-sm font-medium px-5 py-2 rounded-md hover:bg-gray-700 disabled:opacity-50">{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 text-center">
            <p className="font-semibold text-gray-900 mb-4">Delete this task?</p>
            <div className="flex justify-center gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="text-sm text-gray-500 px-4 py-2">Cancel</button>
              <button onClick={() => deleteTask(deleteConfirm)} className="bg-red-500 text-white text-sm font-medium px-5 py-2 rounded-md">Delete</button>
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
