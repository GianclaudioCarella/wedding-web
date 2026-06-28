'use client'

import { useState, useEffect, useRef } from 'react'

type Filter = 'all' | 'attending' | 'pending' | 'declined'
type Tab = 'compose' | 'history'

interface Party {
  id: string
  name: string
  email: string
  party_size: number
  rsvp_status: 'attending' | 'pending' | 'declined'
}

interface Campaign {
  id: string
  subject: string
  body: string
  recipient_filter: string
  recipient_count: number
  failed_count: number
  recipient_names: string | null
  sent_at: string
}

interface CampaignGroup {
  subject: string
  type: 'invitation' | 'broadcast'
  totalSent: number
  totalFailed: number
  lastSentAt: string
  sends: Campaign[]
}

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all',       label: 'All parties with email' },
  { id: 'attending', label: 'Attending' },
  { id: 'pending',   label: 'Not yet replied' },
  { id: 'declined',  label: 'Declined' },
]

const STATUS: Record<string, { label: string; color: string }> = {
  attending: { label: 'Attending', color: '#16a34a' },
  pending:   { label: 'No reply',  color: '#b45309' },
  declined:  { label: 'Declined',  color: '#9ca3af' },
}

const PLACEHOLDER_HINT = `Example:

Hi {{first_name}},

We've added more details about the schedule and our gift registry — check your invitation for everything you need to know.

{{invitation_link}}

See you soon!`

export default function CommsPage() {
  const [tab, setTab]   = useState<Tab>('compose')
  const [step, setStep] = useState<'compose' | 'review' | 'sent'>('compose')

  // Compose
  const [subject, setSubject]   = useState('')
  const [body, setBody]         = useState('')
  const [filter, setFilter]     = useState<Filter>('all')
  const [search, setSearch]     = useState('')
  const [parties, setParties]   = useState<Party[]>([])
  const [excluded, setExcluded] = useState<Set<string>>(new Set())
  const [loadingParties, setLoadingParties] = useState(false)
  const [sending, setSending]   = useState(false)
  const [result, setResult]     = useState<{ sent: number; failed: number; error?: string | null } | null>(null)

  // History
  const [campaigns, setCampaigns]           = useState<Campaign[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [expanded, setExpanded]             = useState<string | null>(null)

  const bodyRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setLoadingParties(true)
    setExcluded(new Set())
    setResult(null)
    fetch(`/api/admin/comms/recipients?filter=${filter}`)
      .then(r => r.json())
      .then(d => setParties(d.parties || []))
      .catch(() => {})
      .finally(() => setLoadingParties(false))
  }, [filter])

  useEffect(() => {
    if (tab !== 'history') return
    setLoadingHistory(true)
    fetch('/api/admin/comms/history')
      .then(r => r.json())
      .then(d => setCampaigns(d.campaigns || []))
      .catch(() => {})
      .finally(() => setLoadingHistory(false))
  }, [tab])

  const q = search.trim().toLowerCase()
  const visibleParties = q
    ? parties.filter(p => p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q))
    : parties
  const selected = parties.filter(p => !excluded.has(p.id))

  const toggleParty = (id: string) =>
    setExcluded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  const insertPlaceholder = (text: string) => {
    const el = bodyRef.current
    if (!el) { setBody(b => b + text); return }
    const s = el.selectionStart
    const e = el.selectionEnd
    const next = body.slice(0, s) + text + body.slice(e)
    setBody(next)
    setTimeout(() => { el.focus(); el.setSelectionRange(s + text.length, s + text.length) }, 0)
  }

  const canReview = subject.trim() && body.trim() && selected.length > 0

  const handleSend = async () => {
    setSending(true)
    setResult(null)
    try {
      const res = await fetch('/api/admin/comms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, body, filter, recipient_ids: selected.map(p => p.id) }),
      })
      const d = await res.json()
      setResult({ sent: d.sent ?? 0, failed: d.failed ?? 0, error: d.error ?? null })
      setStep('sent')
    } catch {
      setResult({ sent: 0, failed: selected.length })
      setStep('sent')
    } finally {
      setSending(false)
    }
  }

  const handleStartNew = () => {
    setSubject(''); setBody(''); setResult(null); setStep('compose')
  }

  return (
    <div style={{ padding: '32px 40px', maxWidth: 1100 }}>

      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: '#9ca3af', margin: '0 0 4px' }}>Admin</p>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: '#111827', margin: 0 }}>Communications</h1>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', marginBottom: 32 }}>
        {(['compose', 'history'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '8px 18px', fontSize: 13, fontWeight: 500,
              border: 'none', background: 'none', cursor: 'pointer',
              color: tab === t ? '#111827' : '#6b7280',
              borderBottom: tab === t ? '2px solid #111827' : '2px solid transparent',
              marginBottom: -1,
            }}
          >
            {t === 'compose' ? 'New Email' : 'History'}
          </button>
        ))}
      </div>

      {/* ── Compose ── */}
      {tab === 'compose' && step === 'compose' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 40, alignItems: 'start' }}>

          {/* Left: compose form */}
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 24 }}>

            {/* Subject */}
            <div>
              <label style={labelStyle}>Subject</label>
              <input
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="e.g. We've added more details to your invitation"
                style={{ ...inputStyle, padding: '10px 14px' }}
              />
            </div>

            {/* Placeholders */}
            <div>
              <label style={labelStyle}>Insert placeholder</label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                {[
                  { tag: '{{first_name}}',     hint: "Replaced with the guest's first name" },
                  { tag: '{{invitation_link}}', hint: 'Replaced with their personal invite URL' },
                ].map(({ tag, hint }) => (
                  <button
                    key={tag}
                    onClick={() => insertPlaceholder(tag)}
                    title={hint}
                    style={{
                      padding: '5px 10px', fontSize: 12, fontFamily: 'monospace',
                      background: '#f3f4f6', border: '1px solid #e5e7eb',
                      borderRadius: 4, cursor: 'pointer', color: '#374151',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#e5e7eb')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#f3f4f6')}
                  >
                    {tag}
                  </button>
                ))}
              </div>
              <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>
                Click a placeholder to insert it at the cursor. Each guest receives their own values.
              </p>
            </div>

            {/* Body */}
            <div>
              <label style={labelStyle}>Message</label>
              <textarea
                ref={bodyRef}
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder={PLACEHOLDER_HINT}
                rows={16}
                style={{ ...inputStyle, resize: 'vertical' as const, lineHeight: 1.65, fontFamily: 'inherit', padding: '12px 14px' }}
              />
            </div>

            {/* Review button */}
            <div>
              <button
                onClick={() => setStep('review')}
                disabled={!canReview}
                style={{
                  padding: '11px 28px', fontSize: 14, fontWeight: 500,
                  background: canReview ? '#111827' : '#f3f4f6',
                  color:      canReview ? '#ffffff'  : '#9ca3af',
                  border: 'none', borderRadius: 6,
                  cursor: canReview ? 'pointer' : 'not-allowed',
                }}
              >
                Review & Send →
              </button>
            </div>
          </div>

          {/* Right: recipient panel */}
          <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden', position: 'sticky' as const, top: 24, background: '#fff' }}>

            {/* Panel header */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <p style={{ ...labelStyle, margin: 0 }}>Recipients</p>
                <span style={{ fontSize: 12, color: '#6b7280' }}>
                  {selected.length} selected · {parties.length} total
                </span>
              </div>

              {/* Search */}
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name or email…"
                style={{ width: '100%', padding: '7px 10px', fontSize: 13, border: '1px solid #e5e7eb', borderRadius: 6, background: '#fff', color: '#374151', outline: 'none', marginBottom: 8, boxSizing: 'border-box' as const }}
              />

              {/* Filter */}
              <select
                value={filter}
                onChange={e => { setFilter(e.target.value as Filter); setSearch('') }}
                style={{ width: '100%', padding: '7px 10px', fontSize: 13, border: '1px solid #e5e7eb', borderRadius: 6, background: '#fff', color: '#374151', outline: 'none', cursor: 'pointer', marginBottom: 10 }}
              >
                {FILTERS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
              </select>

              {/* Select controls */}
              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={() => setExcluded(new Set())} style={ghostBtn}>Select all</button>
                <button onClick={() => setExcluded(new Set(parties.map(p => p.id)))} style={ghostBtn}>Deselect all</button>
              </div>
            </div>

            {/* Party list */}
            <div style={{ maxHeight: 460, overflowY: 'auto' as const }}>
              {loadingParties ? (
                <p style={{ padding: 20, fontSize: 13, color: '#9ca3af', textAlign: 'center' as const }}>Loading…</p>
              ) : visibleParties.length === 0 ? (
                <p style={{ padding: 20, fontSize: 13, color: '#9ca3af', textAlign: 'center' as const }}>
                  {q ? 'No matches.' : 'No parties match this filter.'}
                </p>
              ) : visibleParties.map((party, i) => {
                const isSelected = !excluded.has(party.id)
                const st = STATUS[party.rsvp_status]
                return (
                  <label
                    key={party.id}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 12,
                      padding: '10px 20px', cursor: 'pointer',
                      background: isSelected ? '#fff' : '#fafafa',
                      borderBottom: i < visibleParties.length - 1 ? '1px solid #f3f4f6' : 'none',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleParty(party.id)}
                      style={{ marginTop: 3, flexShrink: 0 }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                          {party.name}
                          {party.party_size > 1 && (
                            <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 5 }}>+{party.party_size - 1}</span>
                          )}
                        </span>
                        <span style={{ fontSize: 11, color: st.color, fontWeight: 500, flexShrink: 0 }}>{st.label}</span>
                      </div>
                      <p style={{ fontSize: 12, color: '#9ca3af', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                        {party.email}
                      </p>
                    </div>
                  </label>
                )
              })}
            </div>
          </div>

        </div>
      )}

      {/* ── Review step ── */}
      {tab === 'compose' && step === 'review' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 40, alignItems: 'start' }}>

          {/* Left: email preview */}
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 20 }}>
            <div>
              <p style={{ ...labelStyle, marginBottom: 4 }}>Email preview</p>
              <p style={{ fontSize: 12, color: '#9ca3af', margin: '0 0 16px' }}>
                Placeholders will be replaced with each party's actual data before sending.
              </p>
            </div>

            {/* Email card */}
            <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
              {/* Header */}
              <div style={{ padding: '16px 20px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: '#9ca3af', width: 48, flexShrink: 0 }}>From</span>
                  <span style={{ fontSize: 12, color: '#374151' }}>Gian &amp; Cat &lt;balfour.cat@gmail.com&gt;</span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <span style={{ fontSize: 12, color: '#9ca3af', width: 48, flexShrink: 0 }}>Subject</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#111827' }}>{subject}</span>
                </div>
              </div>
              {/* Body */}
              <div style={{ padding: '24px 20px', background: '#fff' }}>
                <BodyPreview text={body} />
                <p style={{ fontSize: 13, color: '#888', margin: '24px 0 4px' }}>With love,</p>
                <p style={{ fontSize: 14, fontWeight: 500, color: '#262626', margin: 0 }}>Gian &amp; Cat</p>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <button
                onClick={handleSend}
                disabled={sending}
                style={{
                  padding: '11px 28px', fontSize: 14, fontWeight: 500,
                  background: sending ? '#6b7280' : '#111827', color: '#fff',
                  border: 'none', borderRadius: 6,
                  cursor: sending ? 'not-allowed' : 'pointer',
                }}
              >
                {sending ? 'Sending…' : `Confirm & Send to ${selected.length} ${selected.length !== 1 ? 'parties' : 'party'}`}
              </button>
              <button
                onClick={() => setStep('compose')}
                disabled={sending}
                style={{ ...ghostBtn, fontSize: 14, textDecoration: 'none' }}
              >
                ← Cancel & Edit
              </button>
            </div>
          </div>

          {/* Right: recipient list (read-only) */}
          <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden', position: 'sticky' as const, top: 24, background: '#fff' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #e5e7eb', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ ...labelStyle, margin: 0 }}>Sending to</p>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>
                {selected.length} {selected.length !== 1 ? 'parties' : 'party'}
              </span>
            </div>
            <div style={{ maxHeight: 520, overflowY: 'auto' as const }}>
              {selected.map((party, i) => (
                <div
                  key={party.id}
                  style={{
                    padding: '10px 20px',
                    borderBottom: i < selected.length - 1 ? '1px solid #f3f4f6' : 'none',
                  }}
                >
                  <p style={{ fontSize: 13, fontWeight: 500, color: '#111827', margin: '0 0 2px' }}>
                    {party.name}
                    {party.party_size > 1 && <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 5 }}>+{party.party_size - 1}</span>}
                  </p>
                  <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>{party.email}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Sent ── */}
      {tab === 'compose' && step === 'sent' && result && (
        <div style={{ padding: '60px 0', maxWidth: 480 }}>
          {result.sent > 0 ? (
            <>
              <p style={{ fontSize: 20, fontWeight: 600, color: '#111827', margin: '0 0 8px' }}>
                Sent to {result.sent} {result.sent !== 1 ? 'parties' : 'party'}.
              </p>
              {result.failed > 0 && (
                <p style={{ fontSize: 14, color: '#b45309', margin: '0 0 24px' }}>
                  {result.failed} failed to send.
                </p>
              )}
              {result.error && (
                <p style={{ fontSize: 12, fontFamily: 'monospace', color: '#ef4444', margin: '0 0 24px' }}>{result.error}</p>
              )}
            </>
          ) : (
            <>
              <p style={{ fontSize: 20, fontWeight: 600, color: '#991b1b', margin: '0 0 8px' }}>
                Send failed.
              </p>
              {result.error && (
                <p style={{ fontSize: 12, fontFamily: 'monospace', color: '#ef4444', margin: '0 0 24px' }}>{result.error}</p>
              )}
            </>
          )}
          <button
            onClick={handleStartNew}
            style={{
              padding: '10px 24px', fontSize: 14, fontWeight: 500,
              background: '#111827', color: '#fff',
              border: 'none', borderRadius: 6, cursor: 'pointer',
            }}
          >
            Write another email
          </button>
        </div>
      )}

      {/* ── History ── */}
      {tab === 'history' && (
        <div>
          {loadingHistory ? (
            <p style={{ fontSize: 13, color: '#9ca3af' }}>Loading…</p>
          ) : campaigns.length === 0 ? (
            <div style={{ padding: '60px 0', textAlign: 'center' as const }}>
              <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 8px' }}>No emails sent yet.</p>
              <p style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>
                Emails sent from now on will appear here.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 12 }}>
              {groupCampaigns(campaigns).map(group => (
                <CampaignGroupRow
                  key={group.subject}
                  group={group}
                  expandedId={expanded}
                  onToggle={id => setExpanded(expanded === id ? null : id)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ── BodyPreview: renders body text with {{placeholders}} highlighted ── */

function BodyPreview({ text }: { text: string }) {
  const parts = text.split(/(\{\{[^}]+\}\})/g)
  return (
    <div style={{ fontSize: 14, color: '#262626', lineHeight: 1.7, whiteSpace: 'pre-wrap' as const, fontFamily: 'inherit' }}>
      {parts.map((part, i) =>
        /^\{\{[^}]+\}\}$/.test(part) ? (
          <mark key={i} style={{ background: '#fef9c3', color: '#854d0e', borderRadius: 3, padding: '0 2px', fontFamily: 'monospace', fontSize: 12 }}>
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </div>
  )
}

/* ── Grouping logic ── */

function groupCampaigns(campaigns: Campaign[]): CampaignGroup[] {
  const map = new Map<string, CampaignGroup>()
  for (const c of campaigns) {
    const key = c.subject
    if (!map.has(key)) {
      map.set(key, {
        subject:     c.subject,
        type:        c.recipient_filter === 'invitation' ? 'invitation' : 'broadcast',
        totalSent:   0,
        totalFailed: 0,
        lastSentAt:  c.sent_at,
        sends:       [],
      })
    }
    const g = map.get(key)!
    g.totalSent   += c.recipient_count
    g.totalFailed += c.failed_count
    if (c.sent_at > g.lastSentAt) g.lastSentAt = c.sent_at
    g.sends.push(c)
  }
  // Sort groups by most recent send, sends within group by newest first
  return Array.from(map.values())
    .sort((a, b) => b.lastSentAt.localeCompare(a.lastSentAt))
    .map(g => ({ ...g, sends: g.sends.sort((a, b) => b.sent_at.localeCompare(a.sent_at)) }))
}

/* ── CampaignGroupRow ── */

function CampaignGroupRow({
  group,
  expandedId,
  onToggle,
}: {
  group: CampaignGroup
  expandedId: string | null
  onToggle: (id: string) => void
}) {
  const isOpen = expandedId === group.subject
  const isInvitation = group.type === 'invitation'

  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden', background: '#fff' }}>
      {/* Group header */}
      <button
        onClick={() => onToggle(group.subject)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', padding: '16px 20px',
          background: '#fff', border: 'none', cursor: 'pointer',
          textAlign: 'left' as const, gap: 16,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{
              fontSize: 10, fontWeight: 600, letterSpacing: '0.06em',
              textTransform: 'uppercase' as const, flexShrink: 0,
              padding: '2px 7px', borderRadius: 100,
              background: isInvitation ? '#eff6ff' : '#f5f3ff',
              color:      isInvitation ? '#1d4ed8'  : '#6d28d9',
            }}>
              {isInvitation ? 'Invitation' : 'Broadcast'}
            </span>
            <span style={{ fontSize: 14, fontWeight: 500, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
              {group.subject}
            </span>
          </div>
          <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>
            {group.sends.length > 1
              ? `${group.sends.length} sends · ${group.totalSent} total recipients`
              : `${group.totalSent} recipient${group.totalSent !== 1 ? 's' : ''}`}
            {group.totalFailed > 0 && ` · ${group.totalFailed} failed`}
            {' · last '}
            {new Date(group.lastSentAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>
        <span style={{ fontSize: 11, color: '#9ca3af', flexShrink: 0 }}>
          {isOpen ? '▲' : '▼'}
        </span>
      </button>

      {/* Expanded: individual sends */}
      {isOpen && (
        <div style={{ borderTop: '1px solid #f3f4f6' }}>
          {group.sends.map((c, i) => (
            <div
              key={c.id}
              style={{
                padding: '14px 20px',
                borderBottom: i < group.sends.length - 1 ? '1px solid #f3f4f6' : 'none',
                background: '#f9fafb',
              }}
            >
              <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 8px', fontWeight: 500 }}>
                {new Date(c.sent_at).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                {' · '}{c.recipient_count} sent
                {c.failed_count > 0 && <span style={{ color: '#ef4444' }}> · {c.failed_count} failed</span>}
                {!isInvitation && c.recipient_filter !== 'all' && ` · ${c.recipient_filter} only`}
              </p>
              {c.recipient_names && (
                <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 10px', lineHeight: 1.6 }}>
                  <span style={{ fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.05em', fontSize: 10 }}>To · </span>
                  {c.recipient_names}
                </p>
              )}
              {!isInvitation && (
                <pre style={{ fontSize: 13, color: '#374151', margin: 0, whiteSpace: 'pre-wrap' as const, fontFamily: 'inherit', lineHeight: 1.65, borderTop: c.recipient_names ? '1px solid #e5e7eb' : 'none', paddingTop: c.recipient_names ? 10 : 0 }}>
                  {c.body}
                </pre>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Shared styles ── */

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.07em',
  textTransform: 'uppercase',
  color: '#6b7280',
  marginBottom: 8,
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  fontSize: 14,
  border: '1px solid #e5e7eb',
  borderRadius: 6,
  outline: 'none',
  color: '#111827',
  background: '#fff',
  boxSizing: 'border-box',
}

const ghostBtn: React.CSSProperties = {
  fontSize: 12,
  color: '#6b7280',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: 0,
  textDecoration: 'underline',
  textUnderlineOffset: 2,
}
