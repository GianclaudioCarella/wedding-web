'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';

const TEXT  = 'var(--color-text)'
const MUTED = 'var(--color-muted)'
const SERIF = 'var(--font-serif)'
const SANS  = 'var(--font-sans)'

const DIETARY_OPTIONS = ['Vegetarian', 'Vegan', 'Gluten-free', 'Dairy-free', 'Nut allergy', 'Halal', 'Kosher']

const inputStyle = {
  display: 'block', width: '100%', fontFamily: SANS, fontSize: 'var(--text-base)',
  color: TEXT, background: 'transparent', border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-card)', padding: '12px 16px', outline: 'none',
  boxSizing: 'border-box' as const, marginTop: 8,
}
const labelStyle = { fontFamily: SANS, fontSize: 'var(--text-sm)', color: TEXT, display: 'block' }

interface Event { id: string; name: string; event_date: string | null; event_time: string | null }
interface PartyMember { id: string; name: string; party_role: string }
interface ExistingRsvp { event_id: string; status: string; dietary_requirements: string[] | null; dietary_notes: string | null }

function DietaryPicker({ selected, onChange }: { selected: string[]; onChange: (v: string[]) => void }) {
  const toggle = (opt: string) =>
    onChange(selected.includes(opt) ? selected.filter(o => o !== opt) : [...selected, opt])
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 8, marginTop: 8 }}>
      {DIETARY_OPTIONS.map(opt => (
        <button
          key={opt} type="button" onClick={() => toggle(opt)}
          style={{
            fontFamily: SANS, fontSize: 'var(--text-xs)', padding: '6px 12px',
            borderRadius: 'var(--radius-pill)', border: '1px solid var(--color-border)',
            cursor: 'pointer', background: selected.includes(opt) ? TEXT : 'transparent',
            color: selected.includes(opt) ? '#fff' : TEXT,
            transition: 'background var(--transition), color var(--transition)',
          }}
        >{opt}</button>
      ))}
    </div>
  )
}

export default function RSVPContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('guest')

  const [loading, setLoading]         = useState(true)
  const [notFound, setNotFound]       = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError]             = useState('')

  // Guest data
  const [guest, setGuest]             = useState<{ id: string; name: string; venue_stay_invited: boolean } | null>(null)
  const [events, setEvents]           = useState<Event[]>([])
  const [partyMembers, setPartyMembers] = useState<PartyMember[]>([])

  // Form state
  const [responses, setResponses]     = useState<Record<string, 'attending' | 'declined'>>({})
  const [dietary, setDietary]         = useState<string[]>([])
  const [dietaryNotes, setDietaryNotes] = useState('')
  const [partyDietary, setPartyDietary] = useState<Record<string, string[]>>({})
  const [partyDietaryNotes, setPartyDietaryNotes] = useState<Record<string, string>>({})
  const [notes, setNotes]             = useState('')
  const [plusOne, setPlusOne]         = useState(false)
  const [plusOneName, setPlusOneName] = useState('')
  const [plusOneDietary, setPlusOneDietary] = useState<string[]>([])
  const [plusOneDietaryNotes, setPlusOneDietaryNotes] = useState('')
  const [stayNights, setStayNights]   = useState({ sunday_night: false, friday_night: false, saturday_night: false })
  const [transportNeeded, setTransportNeeded] = useState<boolean | null>(null)
  const [transportFrom, setTransportFrom]     = useState('')
  const [transportReturn, setTransportReturn] = useState<boolean | null>(null)
  const [transportError, setTransportError]   = useState(false)

  useEffect(() => {
    if (!token) { setNotFound(true); setLoading(false); return }
    fetch(`/api/rsvp?token=${token}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) { setNotFound(true); return }
        setGuest(data.guest)
        setEvents(data.events || [])
        setPartyMembers(data.partyMembers || [])
        // Pre-fill existing responses
        const existing: Record<string, 'attending' | 'declined'> = {}
        for (const r of (data.existingRsvps || [])) existing[r.event_id] = r.status
        setResponses(existing)
        if (data.existingRsvps?.[0]?.dietary_requirements) setDietary(data.existingRsvps[0].dietary_requirements)
        if (data.existingRsvps?.[0]?.dietary_notes) setDietaryNotes(data.existingRsvps[0].dietary_notes || '')
        if (data.stayRequest) setStayNights({
          sunday_night: data.stayRequest.sunday_night || false,
          friday_night: data.stayRequest.friday_night || false,
          saturday_night: data.stayRequest.saturday_night || false,
        })
        if (data.guest.transport_needed !== null) setTransportNeeded(data.guest.transport_needed)
        if (data.guest.transport_from) setTransportFrom(data.guest.transport_from)
        if (data.guest.transport_return !== null) setTransportReturn(data.guest.transport_return)
      })
      .finally(() => setLoading(false))
  }, [token])

  const anyAttending = Object.values(responses).some(s => s === 'attending')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !guest) return
    if (Object.keys(responses).length === 0) { setError('Please let us know if you can make it.'); return }
    if (plusOne && !plusOneName.trim()) { setError('Please enter your +1\'s name.'); return }
    if (anyAttending && transportNeeded === null) { setTransportError(true); setError('Please let us know if you need transport.'); return }
    if (anyAttending && transportNeeded === true && !transportFrom.trim()) { setTransportError(true); setError('Please let us know where you\'ll be travelling from.'); return }
    if (anyAttending && transportNeeded === true && transportReturn === null) { setTransportError(true); setError('Please let us know if you need a return journey.'); return }
    setTransportError(false)

    setIsSubmitting(true)
    setError('')

    // Build notes including party dietary if needed
    const partyDietaryText = partyMembers.map(p => {
      const d = partyDietary[p.id] || []
      const n = partyDietaryNotes[p.id] || ''
      return d.length || n ? `${p.name}: ${[...d, n].filter(Boolean).join(', ')}` : ''
    }).filter(Boolean).join(' | ')

    const plusOneDietaryText = plusOne && (plusOneDietary.length || plusOneDietaryNotes)
      ? `${plusOneName}: ${[...plusOneDietary, plusOneDietaryNotes].filter(Boolean).join(', ')}`
      : ''

    const allNotes = [notes, partyDietaryText, plusOneDietaryText].filter(Boolean).join('\n')

    const res = await fetch('/api/rsvp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        responses: Object.entries(responses).map(([event_id, status]) => ({ event_id, status })),
        dietary_requirements: dietary,
        dietary_notes: dietaryNotes || null,
        stay_request: guest.venue_stay_invited ? stayNights : null,
        notes: allNotes || null,
        plus_one_name: plusOne ? plusOneName : null,
        plus_one_email: null,
        transport_needed: anyAttending ? transportNeeded : null,
        transport_from: anyAttending && transportNeeded ? transportFrom : null,
        transport_return: anyAttending && transportNeeded ? transportReturn : null,
      }),
    })

    if (res.ok) {
      router.push(`/rsvp/confirmation?guest=${token}`)
    } else {
      setError('Something went wrong. Please try again or email us.')
      setIsSubmitting(false)
    }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontFamily: SANS, fontSize: 'var(--text-sm)', color: MUTED }}>Loading…</p>
    </div>
  )

  if (notFound) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontFamily: SERIF, fontSize: 24, color: TEXT, marginBottom: 8, fontWeight: 400 }}>Invitation not found</h1>
        <p style={{ fontFamily: SANS, fontSize: 'var(--text-base)', color: MUTED }}>Please check your invitation link.</p>
      </div>
    </div>
  )

  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingBlock: 'var(--space-section)' }}>
      <div style={{ width: '100%', maxWidth: 480 }}>

        {/* Back link — tertiary style */}
        <Link
          href={token ? `/invite?guest=${token}` : '/invite'}
          style={{
            fontFamily: SANS, fontSize: 'var(--text-xs)', color: MUTED,
            textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6,
            border: '1px solid var(--color-border)', borderRadius: 'var(--radius-pill)',
            padding: '5px 12px', marginBottom: 48,
            transition: 'border-color var(--transition)',
          }}
        >
          ← Back to invitation
        </Link>

        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <p style={{ fontFamily: SANS, fontSize: 'var(--text-xs)', letterSpacing: 'var(--tracking-widest)', textTransform: 'uppercase', color: 'var(--color-label)', margin: 0, marginBottom: 12 }}>
            RSVP
          </p>
          <h1 style={{ fontFamily: SERIF, fontSize: 'clamp(20px, 2.5vw, 26px)', color: TEXT, margin: 0, fontWeight: 400, lineHeight: 1.3 }}>
            {guest?.name}, let us know if you&rsquo;ll be joining us.
          </h1>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>

          {/* Per-event responses */}
          {events.map(event => (
            <div key={event.id}>
              <p style={{ fontFamily: SANS, fontSize: 'var(--text-sm)', color: TEXT, margin: 0, marginBottom: 10, fontWeight: 500 }}>
                {event.name}
                {event.event_date && (
                  <span style={{ color: MUTED, fontWeight: 400 }}>
                    {' · '}{new Date(`${event.event_date}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </span>
                )}
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['attending', 'declined'] as const).map(val => (
                  <button
                    key={val} type="button"
                    onClick={() => setResponses(r => ({ ...r, [event.id]: val }))}
                    style={{
                      flex: 1, fontFamily: SANS, fontSize: 'var(--text-sm)', padding: '10px 16px',
                      borderRadius: 'var(--radius-pill)', border: 'none', cursor: 'pointer',
                      transition: 'background var(--transition), color var(--transition)',
                      background: responses[event.id] === val ? TEXT : 'var(--color-surface)',
                      color: responses[event.id] === val ? '#fff' : TEXT,
                    }}
                  >
                    {val === 'attending' ? 'Attending' : 'Can\'t make it'}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* Dietary — primary guest */}
          {anyAttending && (
            <div>
              <label style={labelStyle}>Your dietary requirements</label>
              <DietaryPicker selected={dietary} onChange={setDietary} />
              <textarea
                rows={2} value={dietaryNotes} maxLength={300}
                onChange={e => setDietaryNotes(e.target.value)}
                placeholder="Anything else we should know?"
                style={{ ...inputStyle, resize: 'vertical' as const, marginTop: 12 }}
              />
            </div>
          )}

          {/* Party members — show dietary per person */}
          {anyAttending && partyMembers.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {partyMembers.map(p => (
                <div key={p.id} style={{ borderTop: '1px solid var(--color-border)', paddingTop: 24 }}>
                  <p style={{ fontFamily: SANS, fontSize: 'var(--text-sm)', color: TEXT, margin: 0, marginBottom: 4, fontWeight: 500 }}>{p.name}</p>
                  <p style={{ fontFamily: SANS, fontSize: 'var(--text-xs)', color: MUTED, margin: 0, marginBottom: 8 }}>Dietary requirements</p>
                  <DietaryPicker
                    selected={partyDietary[p.id] || []}
                    onChange={v => setPartyDietary(d => ({ ...d, [p.id]: v }))}
                  />
                  <textarea
                    rows={1} value={partyDietaryNotes[p.id] || ''} maxLength={200}
                    onChange={e => setPartyDietaryNotes(n => ({ ...n, [p.id]: e.target.value }))}
                    placeholder="Anything else?"
                    style={{ ...inputStyle, resize: 'vertical' as const, marginTop: 10 }}
                  />
                </div>
              ))}
            </div>
          )}

          {/* +1 — only show if no existing party members */}
          {anyAttending && partyMembers.length === 0 && (
            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 24 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input
                  type="checkbox" checked={plusOne}
                  onChange={e => setPlusOne(e.target.checked)}
                  style={{ width: 16, height: 16, cursor: 'pointer' }}
                />
                <span style={{ fontFamily: SANS, fontSize: 'var(--text-sm)', color: TEXT }}>I&rsquo;m bringing a +1</span>
              </label>
              {plusOne && (
                <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <label style={labelStyle}>Their name *</label>
                    <input
                      type="text" value={plusOneName}
                      onChange={e => setPlusOneName(e.target.value)}
                      placeholder="Full name"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Their dietary requirements</label>
                    <DietaryPicker selected={plusOneDietary} onChange={setPlusOneDietary} />
                    <textarea
                      rows={1} value={plusOneDietaryNotes} maxLength={200}
                      onChange={e => setPlusOneDietaryNotes(e.target.value)}
                      placeholder="Anything else?"
                      style={{ ...inputStyle, resize: 'vertical' as const, marginTop: 10 }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Stay nights — venue guests only */}
          {anyAttending && guest?.venue_stay_invited && (
            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 24 }}>
              <p style={{ fontFamily: SANS, fontSize: 'var(--text-sm)', color: TEXT, margin: 0, marginBottom: 12, fontWeight: 500 }}>Which nights are you staying?</p>
              <div style={{ display: 'flex', gap: 8 }}>
                {([
                  { key: 'friday_night',   label: 'Fri 2 Oct' },
                  { key: 'saturday_night', label: 'Sat 3 Oct' },
                  { key: 'sunday_night', label: 'Sun 4 Oct' },
                ] as const).map(({ key, label }) => (
                  <button
                    key={key} type="button"
                    onClick={() => setStayNights(s => ({ ...s, [key]: !s[key] }))}
                    style={{
                      flex: 1, fontFamily: SANS, fontSize: 'var(--text-sm)', padding: '10px 12px',
                      borderRadius: 'var(--radius-pill)', border: 'none', cursor: 'pointer',
                      transition: 'background var(--transition), color var(--transition)',
                      background: stayNights[key] ? TEXT : 'var(--color-surface)',
                      color: stayNights[key] ? '#fff' : TEXT,
                    }}
                  >{label}</button>
                ))}
              </div>
            </div>
          )}

          {/* Transport — only shown if attending anything */}
          {anyAttending && (
            <div style={{
              borderTop: '2px solid var(--color-text)',
              paddingTop: 28,
              marginTop: 8,
              borderRadius: 12,
              padding: 24,
              background: 'var(--color-surface)',
            }}>
              <p style={{ fontFamily: SANS, fontSize: 'var(--text-xs)', letterSpacing: 'var(--tracking-widest)', textTransform: 'uppercase' as const, color: 'var(--color-label)', margin: '0 0 4px' }}>Transport</p>
              <p style={{ fontFamily: SANS, fontSize: 'var(--text-sm)', color: TEXT, margin: '0 0 20px', fontWeight: 500 }}>Do you need transport to the wedding?</p>

              <div style={{ display: 'flex', gap: 8 }}>
                {([true, false] as const).map(v => (
                  <button
                    key={String(v)} type="button"
                    onClick={() => { setTransportNeeded(v); setTransportError(false); if (!v) { setTransportFrom(''); setTransportReturn(null) } }}
                    style={{
                      flex: 1, fontFamily: SANS, fontSize: 'var(--text-sm)', padding: '10px 16px',
                      borderRadius: 'var(--radius-pill)', border: 'none', cursor: 'pointer',
                      transition: 'background var(--transition), color var(--transition)',
                      background: transportNeeded === v ? TEXT : 'var(--color-bg)',
                      color: transportNeeded === v ? '#fff' : TEXT,
                    }}
                  >{v ? 'Yes' : 'No'}</button>
                ))}
              </div>

              {transportNeeded === true && (
                <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column' as const, gap: 20 }}>
                  <div>
                    <label style={labelStyle}>Where will you be travelling from?</label>
                    <input
                      type="text" value={transportFrom}
                      onChange={e => { setTransportFrom(e.target.value); setTransportError(false) }}
                      placeholder="e.g. Hotel name, city…"
                      style={{ ...inputStyle, background: 'var(--color-bg)' }}
                    />
                  </div>
                  <div>
                    <label style={{ ...labelStyle, marginBottom: 8 }}>Do you need a return journey?</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {([true, false] as const).map(v => (
                        <button
                          key={String(v)} type="button"
                          onClick={() => { setTransportReturn(v); setTransportError(false) }}
                          style={{
                            flex: 1, fontFamily: SANS, fontSize: 'var(--text-sm)', padding: '10px 16px',
                            borderRadius: 'var(--radius-pill)', border: 'none', cursor: 'pointer',
                            transition: 'background var(--transition), color var(--transition)',
                            background: transportReturn === v ? TEXT : 'var(--color-bg)',
                            color: transportReturn === v ? '#fff' : TEXT,
                          }}
                        >{v ? 'Yes' : 'No'}</button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div>
            <label style={labelStyle}>
              Notes <span style={{ color: MUTED }}>— optional</span>
            </label>
            <textarea
              rows={2} value={notes} maxLength={500}
              onChange={e => setNotes(e.target.value)}
              placeholder="Anything at all…"
              style={{ ...inputStyle, resize: 'vertical' as const }}
            />
          </div>

          {error && <p style={{ fontFamily: SANS, fontSize: 'var(--text-sm)', color: '#cc0000', margin: 0 }}>{error}</p>}

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting || Object.keys(responses).length === 0}
            style={{
              fontFamily: SANS, fontSize: 'var(--text-sm)', letterSpacing: 'var(--tracking-wide)',
              textTransform: 'uppercase' as const, fontWeight: 500,
              color: isSubmitting || Object.keys(responses).length === 0 ? '#aaaaaa' : '#ffffff',
              background: isSubmitting || Object.keys(responses).length === 0 ? 'var(--color-surface)' : TEXT,
              border: 'none', padding: '14px 36px', borderRadius: 'var(--radius-pill)',
              cursor: isSubmitting || Object.keys(responses).length === 0 ? 'not-allowed' : 'pointer',
              pointerEvents: Object.keys(responses).length === 0 ? 'none' : 'auto',
              alignSelf: 'flex-start',
            }}
          >
            {isSubmitting ? 'Sending…' : 'Send response'}
          </button>

        </form>

        <div style={{ marginTop: 64, paddingTop: 32, borderTop: '1px solid var(--color-border)' }}>
          <p style={{ fontFamily: SANS, fontSize: 'var(--text-sm)', color: MUTED, margin: 0, marginBottom: 4 }}>Any questions?</p>
          <a href="mailto:balfour.cat@gmail.com" style={{ fontFamily: SANS, fontSize: 'var(--text-sm)', color: TEXT, textDecoration: 'underline', textUnderlineOffset: 3 }}>
            balfour.cat@gmail.com
          </a>
        </div>

      </div>
    </main>
  )
}
