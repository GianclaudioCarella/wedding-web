'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AdminInspirationPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [boardUrl, setBoardUrl] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [editUrl, setEditUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => { checkAuth(); }, []);

  useEffect(() => {
    if (!boardUrl || boardUrl.includes('YOUR_USERNAME')) return;

    const existingWidgets = document.querySelectorAll('[data-pin-do="embedBoard"]');
    existingWidgets.forEach(widget => {
      const parent = widget.parentElement;
      if (parent && parent !== widget) {
        while (parent.firstChild) parent.removeChild(parent.firstChild);
        parent.appendChild(widget);
      }
    });

    const existingScript = document.querySelector('script[src="https://assets.pinterest.com/js/pinit.js"]');
    if (existingScript) existingScript.remove();

    const script = document.createElement('script');
    script.async = true;
    script.defer = true;
    script.src = 'https://assets.pinterest.com/js/pinit.js';
    document.body.appendChild(script);

    return () => { if (document.body.contains(script)) document.body.removeChild(script); };
  }, [boardUrl]);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/admin/login'); return; }
    setUserId(user.id);
    await loadBoardUrl(user.id);
    setIsLoading(false);
  };

  const loadBoardUrl = async (uid: string) => {
    const { data } = await supabase
      .from('user_settings')
      .select('pinterest_board_url')
      .eq('user_id', uid)
      .single();
    if (data?.pinterest_board_url) setBoardUrl(data.pinterest_board_url);
  };

  const handleSaveUrl = async () => {
    if (!userId || !editUrl.trim()) return;
    setIsSaving(true);
    try {
      const { data: existing } = await supabase
        .from('user_settings').select('id').eq('user_id', userId).single();
      if (existing) {
        await supabase.from('user_settings').update({ pinterest_board_url: editUrl.trim() }).eq('user_id', userId);
      } else {
        await supabase.from('user_settings').insert({ user_id: userId, pinterest_board_url: editUrl.trim() });
      }
      setBoardUrl(editUrl.trim());
      setIsEditMode(false);
      setEditUrl('');
      setTimeout(() => window.location.reload(), 100);
    } catch (error) {
      console.error('Error saving board URL:', error);
      alert('Error saving Pinterest board URL. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' }}>
        <p style={{ color: '#9ca3af', fontSize: 14 }}>Loading…</p>
      </div>
    );
  }

  const hasBoard = boardUrl && !boardUrl.includes('YOUR_USERNAME');

  return (
    <div style={{ padding: '32px 40px', height: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9ca3af', margin: '0 0 4px' }}>Admin</p>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: '#111827', margin: 0 }}>Inspiration</h1>
        </div>
        <button
          onClick={() => { setEditUrl(boardUrl); setIsEditMode(true); }}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', border: '1px solid #e5e7eb', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 500, color: '#374151' }}
          onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
          onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M11 2l3 3-8 8H3v-3L11 2z"/>
          </svg>
          {hasBoard ? 'Edit board URL' : 'Configure board'}
        </button>
      </div>

      {/* Pinterest board or empty state */}
      <div style={{ flex: 1, border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', overflow: 'auto', minHeight: 0 }}>
        {!hasBoard ? (
          <div style={{ padding: '80px 40px', textAlign: 'center' }}>
            <div style={{ width: 48, height: 48, background: '#f3f4f6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round">
                <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/>
              </svg>
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: '#111827', margin: '0 0 6px' }}>No board configured</h3>
            <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 20px' }}>Add your Pinterest board URL to display it here.</p>
            <button
              onClick={() => { setEditUrl(''); setIsEditMode(true); }}
              style={{ padding: '9px 20px', border: 'none', borderRadius: 6, background: '#111827', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}
            >
              Configure board URL
            </button>
          </div>
        ) : (
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
            <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
              <a
                key={boardUrl}
                data-pin-do="embedBoard"
                data-pin-board-width="900"
                data-pin-scale-height="600"
                data-pin-scale-width="115"
                href={boardUrl}
              />
            </div>
            <a
              href={boardUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', border: '1px solid #e5e7eb', borderRadius: 6, color: '#374151', fontSize: 13, fontWeight: 500, textDecoration: 'none', background: '#fff' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#e60023"><path d="M12 0a12 12 0 0 0-4.37 23.16c-.1-.91-.19-2.32 0-3.32l1.43-6.05s-.37-.73-.37-1.82c0-1.7 1-3 2.23-3 1.05 0 1.56.79 1.56 1.73 0 1.06-.67 2.64-1 4.1-.29 1.21.61 2.2 1.8 2.2 2.16 0 3.83-2.28 3.83-5.57 0-2.91-2.09-4.95-5.08-4.95-3.46 0-5.49 2.6-5.49 5.28 0 1.05.4 2.17.9 2.78.1.12.11.22.08.35l-.33 1.36c-.05.22-.18.27-.42.16-1.52-.71-2.47-2.93-2.47-4.72 0-3.84 2.79-7.36 8.05-7.36 4.23 0 7.51 3 7.51 7.03 0 4.19-2.64 7.56-6.31 7.56-1.23 0-2.39-.64-2.79-1.4l-.76 2.9c-.28 1.07-1.03 2.41-1.53 3.23A12 12 0 1 0 12 0z"/></svg>
              Open in Pinterest
            </a>
            <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>
              Make sure your Pinterest board is set to public for the embed to work.
            </p>
          </div>
        )}
      </div>

      {/* Edit URL modal */}
      {isEditMode && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 10, padding: 24, width: '100%', maxWidth: 520, border: '1px solid #e5e7eb' }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: '#111827', margin: '0 0 6px' }}>Pinterest Board URL</h2>
            <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 16px' }}>
              Paste the full URL of your Pinterest board (e.g. https://pinterest.com/username/board-name/)
            </p>
            <input
              type="url"
              value={editUrl}
              onChange={e => setEditUrl(e.target.value)}
              placeholder="https://www.pinterest.com/username/board-name/"
              style={{ width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, color: '#111827', outline: 'none', marginBottom: 16, boxSizing: 'border-box' }}
              onFocus={e => (e.currentTarget.style.borderColor = '#6b7280')}
              onBlur={e => (e.currentTarget.style.borderColor = '#e5e7eb')}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setIsEditMode(false); setEditUrl(''); }}
                disabled={isSaving}
                style={{ padding: '8px 16px', border: '1px solid #e5e7eb', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 13, color: '#374151' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveUrl}
                disabled={isSaving || !editUrl.trim()}
                style={{ padding: '8px 16px', border: 'none', borderRadius: 6, background: '#111827', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}
              >
                {isSaving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
