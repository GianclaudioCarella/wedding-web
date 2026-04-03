'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function TransportPage() {
  const [options, setOptions] = useState<any[]>([]);
  const [signups, setSignups] = useState<any[]>([]);
  const [guests, setGuests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: '', direction: 'to_venue', departure_location: '', departure_time: '', return_time: '', capacity: '', notes: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    const [optRes, signRes, gRes] = await Promise.all([
      supabase.from('transport_options').select('*').order('sort_order'),
      supabase.from('guest_transport').select('*, guests(name)'),
      supabase.from('guests').select('id, name').order('name'),
    ]);
    setOptions(optRes.data || []);
    setSignups(signRes.data || []);
    setGuests(gRes.data || []);
    setLoading(false);
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
                {optSignups.length > 0 && (
                  <div className="pt-3 border-t border-gray-100">
                    <p className="text-xs font-medium text-gray-400 mb-2">Signed up</p>
                    <div className="flex flex-wrap gap-2">
                      {optSignups.map((s: any) => (
                        <span key={s.id} className="text-xs bg-gray-100 text-gray-700 rounded px-2 py-1">{s.guests?.name}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {options.length === 0 && <p className="text-sm text-gray-400">No transport options yet.</p>}
        </div>
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
