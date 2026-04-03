'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface ContentRow { id: string; key: string; value: string | null; content_type: string; label: string | null }
interface FaqItem {
  id: string;
  question: { en: string; pt: string; es: string };
  answer: { en: string; pt: string; es: string };
  sort_order: number;
  is_active: boolean
}

const EMPTY_FAQ = {
  question: { en: '', pt: '', es: '' },
  answer: { en: '', pt: '', es: '' },
  sort_order: 0,
  is_active: true
};

export default function ContentPage() {
  const [tab, setTab] = useState<'content' | 'faq'>('content');

  // Site content
  const [rows, setRows] = useState<ContentRow[]>([]);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // FAQ
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [showFaqForm, setShowFaqForm] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FaqItem | null>(null);
  const [faqForm, setFaqForm] = useState(EMPTY_FAQ);
  const [faqTab, setFaqTab] = useState<'en' | 'pt' | 'es'>('en');
  const [faqSaving, setFaqSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    const [contentRes, faqRes] = await Promise.all([
      supabase.from('site_content').select('*').order('key'),
      supabase.from('faq_items').select('*').order('sort_order'),
    ]);
    setRows(contentRes.data || []);
    setFaqs(faqRes.data || []);
    setLoading(false);
  };

  // Site content handlers
  const getValue = (row: ContentRow) => edits[row.id] !== undefined ? edits[row.id] : (row.value || '');
  const hasChanges = Object.keys(edits).length > 0;

  const saveContent = async () => {
    setSaving(true);
    await Promise.all(Object.entries(edits).map(([id, value]) =>
      supabase.from('site_content').update({ value }).eq('id', id)
    ));
    setEdits({});
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    await fetchAll();
  };

  // FAQ handlers
  const openNewFaq = () => {
    setFaqForm({ ...EMPTY_FAQ, sort_order: faqs.length });
    setEditingFaq(null);
    setShowFaqForm(true);
  };

  const openEditFaq = (faq: FaqItem) => {
    setFaqForm({ question: faq.question, answer: faq.answer, sort_order: faq.sort_order, is_active: faq.is_active });
    setEditingFaq(faq);
    setFaqTab('en');
    setShowFaqForm(true);
  };

  const saveFaq = async () => {
    if (!faqForm.question.en.trim() && !faqForm.question.pt.trim() && !faqForm.question.es.trim()) return;
    setFaqSaving(true);
    const payload = { question: faqForm.question, answer: faqForm.answer, sort_order: faqForm.sort_order, is_active: faqForm.is_active };
    if (editingFaq) {
      await supabase.from('faq_items').update(payload).eq('id', editingFaq.id);
    } else {
      await supabase.from('faq_items').insert(payload);
    }
    setShowFaqForm(false);
    setFaqSaving(false);
    await fetchAll();
  };

  const deleteFaq = async (id: string) => {
    await supabase.from('faq_items').delete().eq('id', id);
    setDeleteConfirm(null);
    await fetchAll();
  };

  const toggleActive = async (faq: FaqItem) => {
    await supabase.from('faq_items').update({ is_active: !faq.is_active }).eq('id', faq.id);
    await fetchAll();
  };

  const typeColor: Record<string, string> = {
    text: 'bg-gray-100 text-gray-500', html: 'bg-blue-50 text-blue-600',
    url: 'bg-purple-50 text-purple-600', date: 'bg-amber-50 text-amber-600',
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Content</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage your wedding website content</p>
        </div>
        {tab === 'content' && (
          <button onClick={saveContent} disabled={saving || !hasChanges} className="bg-gray-900 text-white text-sm font-medium px-5 py-2 rounded-md hover:bg-gray-700 disabled:opacity-40">
            {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save changes'}
          </button>
        )}
        {tab === 'faq' && (
          <button onClick={openNewFaq} className="bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-gray-700">+ Add question</button>
        )}
      </div>

      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {(['content', 'faq'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === t ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t === 'content' ? 'Site Content' : 'FAQ'}
          </button>
        ))}
      </div>

      {loading ? <p className="text-sm text-gray-400">Loading…</p> : tab === 'content' ? (
        <div className="space-y-4">
          {rows.map(row => {
            const isDirty = edits[row.id] !== undefined;
            return (
              <div key={row.id} className={`bg-white border rounded-lg p-5 transition-colors ${isDirty ? 'border-gray-400' : 'border-gray-200'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <label className="text-sm font-medium text-gray-900">{row.label || row.key}</label>
                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${typeColor[row.content_type] || typeColor.text}`}>{row.content_type}</span>
                  {isDirty && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 ml-auto" />}
                </div>
                {row.content_type === 'date' ? (
                  <input type="date" value={getValue(row)} onChange={e => setEdits(ed => ({ ...ed, [row.id]: e.target.value }))} className="input" />
                ) : row.content_type === 'url' ? (
                  <input type="url" value={getValue(row)} onChange={e => setEdits(ed => ({ ...ed, [row.id]: e.target.value }))} className="input" placeholder="https://…" />
                ) : (
                  <textarea value={getValue(row)} onChange={e => setEdits(ed => ({ ...ed, [row.id]: e.target.value }))} className="input resize-none" rows={getValue(row).length > 120 ? 4 : 2} />
                )}
              </div>
            );
          })}
          {rows.length === 0 && <p className="text-sm text-gray-400">No content fields yet.</p>}
        </div>
      ) : (
        <div className="space-y-3">
          {faqs.length === 0 && <p className="text-sm text-gray-400">No FAQ items yet. Add your first question above.</p>}
          {faqs.map((faq, i) => (
            <div key={faq.id} className={`bg-white border rounded-lg p-5 ${!faq.is_active ? 'opacity-50' : 'border-gray-200'}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-gray-400 font-mono w-5 shrink-0">{i + 1}</span>
                    <p className="text-sm font-medium text-gray-900">{faq.question.en || faq.question.pt || faq.question.es || '(no translation)'}</p>
                    {!faq.is_active && <span className="text-xs text-gray-400 border border-gray-200 rounded px-1.5 py-0.5">Hidden</span>}
                  </div>
                  {(faq.answer.en || faq.answer.pt || faq.answer.es) && <p className="text-sm text-gray-500 ml-7 line-clamp-2">{faq.answer.en || faq.answer.pt || faq.answer.es}</p>}
                  {!faq.answer.en && !faq.answer.pt && !faq.answer.es && <p className="text-sm text-gray-300 ml-7 italic">No answer yet</p>}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <button onClick={() => toggleActive(faq)} className="text-xs text-gray-400 hover:text-gray-700">{faq.is_active ? 'Hide' : 'Show'}</button>
                  <button onClick={() => openEditFaq(faq)} className="text-xs text-gray-400 hover:text-gray-700">Edit</button>
                  <button onClick={() => setDeleteConfirm(faq.id)} className="text-xs text-red-400 hover:text-red-600">Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* FAQ form modal */}
      {showFaqForm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="px-6 py-5 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">{editingFaq ? 'Edit question' : 'Add question'}</h2>
              <div className="flex gap-1 mt-4 border-b border-gray-200">
                {(['en', 'pt', 'es'] as const).map(lang => (
                  <button
                    key={lang}
                    onClick={() => setFaqTab(lang)}
                    className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${faqTab === lang ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                  >
                    {lang.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <div className="px-6 py-5 space-y-4">
              <Field label="Question *">
                <input type="text" value={faqForm.question[faqTab]} onChange={e => setFaqForm(f => ({ ...f, question: { ...f.question, [faqTab]: e.target.value } }))} className="input" placeholder="Is there a dress code?" />
              </Field>
              <Field label="Answer">
                <textarea value={faqForm.answer[faqTab]} onChange={e => setFaqForm(f => ({ ...f, answer: { ...f.answer, [faqTab]: e.target.value } }))} className="input resize-none" rows={4} placeholder="Your answer…" />
              </Field>
              <div className="flex items-center gap-2">
                <Field label="Sort order">
                  <input type="number" min={0} value={faqForm.sort_order} onChange={e => setFaqForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))} className="input" style={{ width: 80 }} />
                </Field>
                <label className="flex items-center gap-2 cursor-pointer mt-5 ml-4">
                  <input type="checkbox" checked={faqForm.is_active} onChange={e => setFaqForm(f => ({ ...f, is_active: e.target.checked }))} />
                  <span className="text-sm text-gray-700">Visible on site</span>
                </label>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button onClick={() => setShowFaqForm(false)} className="text-sm text-gray-500 px-4 py-2">Cancel</button>
              <button onClick={saveFaq} disabled={faqSaving || (!faqForm.question.en.trim() && !faqForm.question.pt.trim() && !faqForm.question.es.trim())} className="bg-gray-900 text-white text-sm font-medium px-5 py-2 rounded-md hover:bg-gray-700 disabled:opacity-50">{faqSaving ? 'Saving…' : editingFaq ? 'Save changes' : 'Add question'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 text-center">
            <p className="font-semibold text-gray-900 mb-2">Delete this question?</p>
            <div className="flex justify-center gap-3 mt-4">
              <button onClick={() => setDeleteConfirm(null)} className="text-sm text-gray-500 px-4 py-2">Cancel</button>
              <button onClick={() => deleteFaq(deleteConfirm)} className="bg-red-500 text-white text-sm font-medium px-5 py-2 rounded-md hover:bg-red-600">Delete</button>
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
