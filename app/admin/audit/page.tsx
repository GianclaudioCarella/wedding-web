'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface AuditEvent {
  id: string;
  timestamp: string;
  type: 'invite_sent' | 'rsvp_response' | 'stay_request' | 'transport_selected' | 'email_campaign';
  guest_name?: string;
  detail: string;
  meta?: string;
  expanded?: {
    body?: string;
    recipients?: string;
  };
}

const TYPE_CONFIG: Record<AuditEvent['type'], { label: string; color: string; bg: string }> = {
  invite_sent:        { label: 'Invite sent',    color: '#1d4ed8', bg: '#eff6ff' },
  rsvp_response:      { label: 'RSVP',           color: '#15803d', bg: '#f0fdf4' },
  stay_request:       { label: 'Stay request',   color: '#7e22ce', bg: '#faf5ff' }, // kept for type safety
  transport_selected: { label: 'Transport',      color: '#b45309', bg: '#fffbeb' },
  email_campaign:     { label: 'Email campaign', color: '#0f766e', bg: '#f0fdfa' },
};

export default function AuditPage() {
  const [events, setEvents]       = useState<AuditEvent[]>([]);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState<AuditEvent['type'] | 'all'>('all');
  const [search, setSearch]       = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => { loadAudit(); }, []);

  const loadAudit = async () => {
    setLoading(true);
    const all: AuditEvent[] = [];

    // Invites sent
    const { data: invited } = await supabase
      .from('guests')
      .select('id, name, invited_at')
      .not('invited_at', 'is', null)
      .order('invited_at', { ascending: false });

    for (const g of invited || []) {
      all.push({ id: `invite-${g.id}`, timestamp: g.invited_at, type: 'invite_sent', guest_name: g.name, detail: 'Invitation sent' });
    }

    // Events lookup
    const { data: eventsData } = await supabase.from('events').select('id, name');
    const eventsMap = new Map((eventsData || []).map(e => [
      e.id,
      typeof e.name === 'object' ? (e.name as any)?.en || (e.name as any)?.pt || Object.values(e.name as any)[0] || 'event' : e.name,
    ]));

    // RSVP responses — grouped by guest + minute
    const { data: rsvps } = await supabase
      .from('rsvp_responses')
      .select('id, event_id, status, responded_at, updated_at, dietary_notes, guest_id, guest:guests(name)')
      .order('updated_at', { ascending: false });

    const grouped = new Map<string, { guest: string; statuses: string[]; ts: string; dietary?: string }>();
    for (const r of rsvps || []) {
      const ts = r.responded_at || r.updated_at;
      if (!ts) continue;
      const guestName = (r.guest as any)?.name ?? 'Unknown guest';
      const key = `${r.guest_id}-${ts.slice(0, 16)}`;
      const eventName = eventsMap.get(r.event_id) ?? 'event';
      const statusLabel = r.status === 'confirmed' ? 'attending' : r.status === 'declined' ? 'not attending' : r.status;
      if (grouped.has(key)) {
        grouped.get(key)!.statuses.push(`${eventName}: ${statusLabel}`);
        if (r.dietary_notes) grouped.get(key)!.dietary = r.dietary_notes;
      } else {
        grouped.set(key, { guest: guestName, statuses: [`${eventName}: ${statusLabel}`], ts, dietary: r.dietary_notes || undefined });
      }
    }
    for (const [key, g] of grouped) {
      all.push({ id: `rsvp-${key}`, timestamp: g.ts, type: 'rsvp_response', guest_name: g.guest, detail: g.statuses.join(' · '), meta: g.dietary });
    }

    // Transport
    const { data: transport } = await supabase
      .from('guest_transport')
      .select('id, created_at, guest:guests(name), transport_option:transport_options(name)')
      .order('created_at', { ascending: false });

    for (const t of transport || []) {
      all.push({ id: `transport-${t.id}`, timestamp: t.created_at, type: 'transport_selected', guest_name: (t.guest as any)?.name, detail: `Selected: ${(t.transport_option as any)?.name ?? 'transport'}` });
    }

    // Email campaigns — fetch body and recipient_names too
    const { data: campaigns } = await supabase
      .from('email_campaigns')
      .select('id, subject, body, recipient_count, failed_count, recipient_filter, recipient_names, sent_at, sent_by')
      .order('sent_at', { ascending: false });

    for (const c of campaigns || []) {
      const failed = c.failed_count > 0 ? ` · ${c.failed_count} failed` : '';
      all.push({
        id: `campaign-${c.id}`,
        timestamp: c.sent_at,
        type: 'email_campaign',
        detail: c.subject,
        meta: `${c.recipient_count} recipients · ${c.recipient_filter}${failed}`,
        expanded: {
          body: c.body || undefined,
          recipients: c.recipient_names || undefined,
        },
      });
    }

    all.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setEvents(all);
    setLoading(false);
  };

  const filtered = events.filter(e => {
    if (filter !== 'all' && e.type !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return e.guest_name?.toLowerCase().includes(q) || e.detail.toLowerCase().includes(q) || e.meta?.toLowerCase().includes(q);
    }
    return true;
  });

  const formatDate = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  const FILTERS: { value: AuditEvent['type'] | 'all'; label: string }[] = [
    { value: 'all',                label: 'All' },
    { value: 'rsvp_response',      label: 'RSVPs' },
    { value: 'invite_sent',        label: 'Invites' },
    { value: 'email_campaign',     label: 'Campaigns' },
    { value: 'transport_selected', label: 'Transport' },
  ];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
      <div style={{ padding: '24px 32px 0', flexShrink: 0 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>Activity Log</h1>
        <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 20px' }}>Guest activity and wedding portal events in chronological order</p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search guest, subject…"
            style={{ padding: '7px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, color: '#111827', outline: 'none', width: 220 }}
            onFocus={e => (e.currentTarget.style.borderColor = '#6b7280')}
            onBlur={e => (e.currentTarget.style.borderColor = '#e5e7eb')}
          />
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {FILTERS.map(f => (
              <button key={f.value} onClick={() => setFilter(f.value)} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid', fontSize: 12, fontWeight: 500, cursor: 'pointer', background: filter === f.value ? '#111827' : '#fff', color: filter === f.value ? '#fff' : '#4b5563', borderColor: filter === f.value ? '#111827' : '#e5e7eb' }}>
                {f.label}
              </button>
            ))}
          </div>
          <button onClick={loadAudit} style={{ marginLeft: 'auto', padding: '6px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 12, cursor: 'pointer', background: '#fff', color: '#4b5563' }}>Refresh</button>
        </div>
        <p style={{ fontSize: 12, color: '#9ca3af', margin: '0 0 8px' }}>{filtered.length} event{filtered.length !== 1 ? 's' : ''}</p>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 32px 32px' }}>
        {loading ? (
          <p style={{ color: '#9ca3af', fontSize: 13 }}>Loading…</p>
        ) : filtered.length === 0 ? (
          <p style={{ color: '#9ca3af', fontSize: 13 }}>No events found.</p>
        ) : (
          <div style={{ position: 'relative', paddingLeft: 28 }}>
            <div style={{ position: 'absolute', left: 7, top: 6, bottom: 0, width: 1, background: '#e5e7eb' }} />
            {filtered.map(ev => {
              const cfg = TYPE_CONFIG[ev.type];
              const isExpandable = ev.type === 'email_campaign' && ev.expanded;
              const isOpen = expandedId === ev.id;
              return (
                <div key={ev.id} style={{ position: 'relative', marginBottom: 4 }}>
                  <div style={{ position: 'absolute', left: -28, top: 14, width: 14, height: 14, borderRadius: '50%', background: cfg.bg, border: `2px solid ${cfg.color}` }} />
                  <div
                    style={{ background: '#fff', border: '1px solid #f3f4f6', borderRadius: 8, marginLeft: 4, overflow: 'hidden', cursor: isExpandable ? 'pointer' : 'default' }}
                    onClick={() => isExpandable && setExpandedId(isOpen ? null : ev.id)}
                  >
                    {/* Main row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '10px 14px' }}>
                      <span style={{ fontSize: 10, fontWeight: 600, color: cfg.color, background: cfg.bg, padding: '2px 7px', borderRadius: 4, flexShrink: 0 }}>{cfg.label}</span>
                      {ev.guest_name && <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{ev.guest_name}</span>}
                      <span style={{ fontSize: 13, color: '#4b5563', flex: 1 }}>{ev.detail}</span>
                      <span style={{ fontSize: 11, color: '#9ca3af', flexShrink: 0 }}>{formatDate(ev.timestamp)}</span>
                      {isExpandable && (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" style={{ flexShrink: 0, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
                          <path d="M2 4l4 4 4-4" />
                        </svg>
                      )}
                    </div>
                    {ev.meta && <p style={{ fontSize: 11, color: '#6b7280', margin: '0 14px 8px', paddingTop: 0 }}>{ev.meta}</p>}

                    {/* Expanded panel */}
                    {isOpen && ev.expanded && (
                      <div style={{ borderTop: '1px solid #f3f4f6', padding: '12px 14px', background: '#fafafa' }} onClick={e => e.stopPropagation()}>
                        {ev.expanded.recipients && (
                          <div style={{ marginBottom: ev.expanded.body ? 12 : 0 }}>
                            <p style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Recipients</p>
                            <p style={{ fontSize: 12, color: '#374151', margin: 0, lineHeight: 1.6 }}>{ev.expanded.recipients}</p>
                          </div>
                        )}
                        {ev.expanded.body && (
                          <div>
                            <p style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Email body</p>
                            <div
                              style={{ fontSize: 12, color: '#374151', lineHeight: 1.7, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 6, padding: '10px 12px', maxHeight: 300, overflowY: 'auto' }}
                              dangerouslySetInnerHTML={{ __html: ev.expanded.body }}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
