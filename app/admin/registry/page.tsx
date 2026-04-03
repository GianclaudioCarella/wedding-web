'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function RegistryPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', description: '', url: '', store_name: '', price: '', currency: 'EUR', image_url: '', sort_order: '0' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    const { data } = await supabase.from('registry_items').select('*').order('sort_order');
    setItems(data || []);
    setLoading(false);
  };

  const openNew = () => {
    setEditing(null);
    setForm({ title: '', description: '', url: '', store_name: '', price: '', currency: 'EUR', image_url: '', sort_order: String(items.length) });
    setShowModal(true);
  };

  const openEdit = (item: any) => {
    setEditing(item);
    setForm({ title: item.title, description: item.description || '', url: item.url || '', store_name: item.store_name || '', price: item.price?.toString() || '', currency: item.currency || 'EUR', image_url: item.image_url || '', sort_order: item.sort_order?.toString() || '0' });
    setShowModal(true);
  };

  const save = async () => {
    setSaving(true);
    const payload = {
      title: form.title,
      description: form.description || null,
      url: form.url || null,
      store_name: form.store_name || null,
      price: form.price ? parseFloat(form.price) : null,
      currency: form.currency,
      image_url: form.image_url || null,
      sort_order: parseInt(form.sort_order) || 0,
    };
    if (editing) {
      await supabase.from('registry_items').update(payload).eq('id', editing.id);
    } else {
      await supabase.from('registry_items').insert(payload);
    }
    setShowModal(false);
    setSaving(false);
    await fetchAll();
  };

  const toggleClaimed = async (id: string, current: boolean) => {
    await supabase.from('registry_items').update({ is_claimed: !current, claimed_at: !current ? new Date().toISOString() : null }).eq('id', id);
    await fetchAll();
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from('registry_items').update({ is_active: !current }).eq('id', id);
    await fetchAll();
  };

  const deleteItem = async (id: string) => {
    await supabase.from('registry_items').delete().eq('id', id);
    setDeleteConfirm(null);
    await fetchAll();
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Registry</h1>
          <p className="text-sm text-gray-500 mt-0.5">{items.filter(i => !i.is_claimed).length} of {items.length} items available</p>
        </div>
        <button onClick={openNew} className="bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-gray-700">+ Add item</button>
      </div>

      {loading ? <p className="text-sm text-gray-400">Loading…</p> : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-500">Item</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Store</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Price</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No items yet.</td></tr>
              )}
              {items.map(item => (
                <tr key={item.id} className={`hover:bg-gray-50 ${!item.is_active ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{item.title}</p>
                    {item.url && <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline">View link →</a>}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{item.store_name || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{item.price ? `${item.price} ${item.currency}` : '—'}</td>
                  <td className="px-4 py-3">
                    {item.is_claimed
                      ? <span className="text-xs bg-gray-100 text-gray-500 rounded px-2 py-0.5">Claimed</span>
                      : <span className="text-xs bg-green-50 text-green-700 rounded px-2 py-0.5">Available</span>
                    }
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3 justify-end">
                      <button onClick={() => openEdit(item)} className="text-xs text-gray-400 hover:text-gray-700">Edit</button>
                      <button onClick={() => toggleClaimed(item.id, item.is_claimed)} className="text-xs text-gray-400 hover:text-gray-700">{item.is_claimed ? 'Unclaim' : 'Mark claimed'}</button>
                      <button onClick={() => toggleActive(item.id, item.is_active)} className="text-xs text-gray-400 hover:text-gray-700">{item.is_active ? 'Hide' : 'Show'}</button>
                      <button onClick={() => setDeleteConfirm(item.id)} className="text-xs text-red-400 hover:text-red-600">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="px-6 py-5 border-b border-gray-200"><h2 className="text-lg font-semibold text-gray-900">{editing ? 'Edit item' : 'Add item'}</h2></div>
            <div className="px-6 py-5 space-y-4">
              <Field label="Title *"><input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="input" /></Field>
              <Field label="Description"><textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="input resize-none" rows={2} /></Field>
              <Field label="Link (URL)"><input type="url" value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} className="input" placeholder="https://…" /></Field>
              <div className="grid grid-cols-3 gap-4">
                <Field label="Store"><input type="text" value={form.store_name} onChange={e => setForm(f => ({ ...f, store_name: e.target.value }))} className="input" placeholder="Amazon…" /></Field>
                <Field label="Price"><input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} className="input" /></Field>
                <Field label="Currency">
                  <select value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))} className="input">
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="USD">USD</option>
                  </select>
                </Field>
              </div>
              <Field label="Sort order"><input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: e.target.value }))} className="input" /></Field>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="text-sm text-gray-500 px-4 py-2">Cancel</button>
              <button onClick={save} disabled={saving || !form.title} className="bg-gray-900 text-white text-sm font-medium px-5 py-2 rounded-md hover:bg-gray-700 disabled:opacity-50">{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 text-center">
            <p className="font-semibold text-gray-900 mb-2">Delete this item?</p>
            <div className="flex justify-center gap-3 mt-4">
              <button onClick={() => setDeleteConfirm(null)} className="text-sm text-gray-500 px-4 py-2">Cancel</button>
              <button onClick={() => deleteItem(deleteConfirm)} className="bg-red-500 text-white text-sm font-medium px-5 py-2 rounded-md hover:bg-red-600">Delete</button>
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
