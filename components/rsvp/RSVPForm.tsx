'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

const TEXT  = 'var(--color-text)'
const MUTED = 'var(--color-muted)'
const SERIF = 'var(--font-serif)'
const SANS  = 'var(--font-sans)'

const inputStyle = {
  display: 'block',
  width: '100%',
  fontFamily: SANS,
  fontSize: 'var(--text-base)',
  color: TEXT,
  background: 'transparent',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-card)',
  padding: '12px 16px',
  outline: 'none',
  boxSizing: 'border-box' as const,
  marginTop: 8,
  resize: 'vertical' as const,
}

const sectionStyle = {
  paddingBlock: 32,
  borderTop: '1px solid var(--color-border)',
}

const DIETARY_OPTIONS = [
  { id: 'none',              label: 'No requirements' },
  { id: 'vegetarian',        label: 'Vegetarian' },
  { id: 'vegan',             label: 'Vegan' },
  { id: 'gluten_free',       label: 'Gluten-free' },
  { id: 'dairy_free',        label: 'Dairy-free' },
  { id: 'nut_allergy',       label: 'Nut allergy' },
  { id: 'shellfish_allergy', label: 'Shellfish allergy' },
  { id: 'halal',             label: 'Halal' },
  { id: 'kosher',            label: 'Kosher' },
];

const NIGHTS = [
  { key: 'thursday_night', label: 'Thursday night' },
  { key: 'friday_night',   label: 'Friday night' },
  { key: 'saturday_night', label: 'Saturday night' },
];

interface Event { id: string; name: string; event_date: string | null; event_time: string | null }
interface RSVPState { status: string }

export default function RSVPForm({ locale = 'en' }: { locale?: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('guest');

  const [loading, setLoading]     = useState(true);
  const [notFound, setNotFound]   = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [guest, setGuest]         = useState<{ id: string; name: string; email: string; venue_stay_invited: boolean } | null>(null);
  const [events, setEvents]       = useState<Event[]>([]);
  const [rsvps, setRsvps]         = useState<Record<string, RSVPState>>({});
  const [dietary, setDietary]     = useState<string[]>([]);
  const [dietaryNotes, setDietaryNotes] = useState('');
  const [stayNights, setStayNights] = useState({ thursday_night: true, friday_night: true, saturday_night: true });
  const [notes, setNotes]         = useState('');
  const [plusOne, setPlusOne]     = useState(false);
  const [plusOneName, setPlusOneName] = useState('');
  const [plusOneEmail, setPlusOneEmail] = useState('');

  useEffect(() => {
    if (!token) { setNotFound(true); setLoading(false); return; }
    fetch(`/api/rsvp?token=${token}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) { setNotFound(true); return; }
        setGuest(data.guest);
        setEvents(data.events);

        const rsvpMap: Record<string, RSVPState> = {};
        for (const r of data.existingRsvps) {
          rsvpMap[r.event_id] = { status: r.status };
          if (r.dietary_requirements?.length) setDietary(r.dietary_requirements);
          if (r.dietary_notes) setDietaryNotes(r.dietary_notes);
          if (r.notes) setNotes(r.notes);
        }
        setRsvps(rsvpMap);
        if (data.guest.plus_one_name) { setPlusOne(true); setPlusOneName(data.guest.plus_one_name); }
        if (data.guest.plus_one_email) setPlusOneEmail(data.guest.plus_one_email);

        if (data.stayRequest) {
          setStayNights({
            thursday_night: data.stayRequest.thursday_night,
            friday_night:   data.stayRequest.friday_night,
            saturday_night: data.stayRequest.saturday_night,
          });
        }
      })
      .finally(() => setLoading(false));
  }, [token]);

  const setEventRsvp = (eventId: string, status: string) => {
    setRsvps(prev => ({ ...prev, [eventId]: { status } }));
  };

  const toggleDietary = (id: string) => {
    if (id === 'none') { setDietary(['none']); return; }
    setDietary(prev => {
      const without = prev.filter(d => d !== 'none');
      return without.includes(id) ? without.filter(d => d !== id) : [...without, id];
    });
  };

  // Sort events by date+time
  const sortedEvents = [...events].sort((a, b) => {
    const aStr = `${a.event_date || ''}T${a.event_time || '00:00:00'}`
    const bStr = `${b.event_date || ''}T${b.event_time || '00:00:00'}`
    return aStr.localeCompare(bStr)
  })

  // Ceremony gates everything — identified by name, fallback to middle event
  const ceremonyEvent = sortedEvents.find(e =>
    e.name.toLowerCase().includes('ceremon')
  ) || sortedEvents[Math.floor(sortedEvents.length / 2)]

  const otherEvents = sortedEvents.filter(e => e.id !== ceremonyEvent?.id)

  const ceremonyRsvp     = ceremonyEvent ? (rsvps[ceremonyEvent.id] || { status: '' }) : null
  const ceremonyAttending = ceremonyRsvp?.status === 'attending'
  const ceremonyDeclined  = ceremonyRsvp?.status === 'declined'

  const anyAttending = ceremonyAttending
  const dietaryAnswered = !anyAttending || dietary.length > 0
  // allAnswered: ceremony must be answered; if attending, other events + dietary must also be answered
  const allAnswered = !!ceremonyEvent && !!rsvps[ceremonyEvent.id]?.status && (
    ceremonyDeclined || (otherEvents.every(e => rsvps[e.id]?.status) && dietaryAnswered)
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allAnswered || !token) return;
    setSubmitting(true);

    const responses = events.map(ev => ({ event_id: ev.id, status: rsvps[ev.id]?.status }));

    await fetch('/api/rsvp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        responses,
        dietary_requirements: dietary,
        dietary_notes:        dietaryNotes,
        stay_request:         guest?.venue_stay_invited && anyAttending ? stayNights : null,
        notes,
        plus_one_name:  plusOne ? plusOneName : '',
        plus_one_email: plusOne ? plusOneEmail : '',
      }),
    });

    // Send confirmation email (fire and forget — don't block redirect)
    fetch('/api/send-rsvp-confirmation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, attending: anyAttending }),
    }).catch(() => {});

    router.push(`/rsvp/confirmation?guest=${token}`);
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontFamily: SANS, fontSize: 'var(--text-sm)', color: MUTED }}>Loading…</p>
    </div>
  );

  if (notFound) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontFamily: SERIF, fontSize: 28, color: TEXT, marginBottom: 8, fontWeight: 400 }}>Invitation not found</h1>
        <p style={{ fontFamily: SANS, fontSize: 'var(--text-base)', color: MUTED }}>Please check your invitation link.</p>
      </div>
    </div>
  );

  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingBlock: 'var(--space-section)' }}>
      <div style={{ width: '100%', maxWidth: 520 }}>

        {/* Header */}
        <div style={{ marginBottom: 48 }}>
          <p style={{ fontFamily: SANS, fontSize: 'var(--text-xs)', letterSpacing: 'var(--tracking-widest)', textTransform: 'uppercase', color: MUTED, margin: 0, marginBottom: 12 }}>
            RSVP
          </p>
          <h1 style={{ fontFamily: SERIF, fontSize: 'clamp(28px, 4vw, 42px)', color: TEXT, margin: 0, fontWeight: 400, lineHeight: 1.2 }}>
            {guest?.name ? `${guest.name},` : 'Let us know'}
          </h1>
          <p style={{ fontFamily: SERIF, fontSize: 'clamp(20px, 2.5vw, 30px)', color: TEXT, margin: 0, marginTop: 8, fontWeight: 400, lineHeight: 1.3 }}>
            will you be joining us?
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

          {/* Ceremony — always shown first, gates everything */}
          {ceremonyEvent && (() => {
            const rsvp = ceremonyRsvp!
            return (
              <div style={sectionStyle}>
                <p style={{ fontFamily: SERIF, fontSize: 'var(--text-lg)', color: TEXT, margin: 0, marginBottom: 4, fontWeight: 400 }}>
                  {ceremonyEvent.name}
                </p>
                {ceremonyEvent.event_date && (
                  <p style={{ fontFamily: SANS, fontSize: 'var(--text-sm)', color: MUTED, margin: 0, marginBottom: 16 }}>
                    {new Date(ceremonyEvent.event_date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
                    {ceremonyEvent.event_time ? ` · ${ceremonyEvent.event_time.slice(0, 5)}` : ''}
                  </p>
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                  {[
                    { value: 'attending', label: "I'll be there" },
                    { value: 'declined',  label: "Can't make it" },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setEventRsvp(ceremonyEvent.id, opt.value)}
                      style={{
                        flex: 1, fontFamily: SANS, fontSize: 'var(--text-sm)',
                        padding: '10px 12px', borderRadius: 'var(--radius-pill)',
                        border: 'none', cursor: 'pointer',
                        transition: 'background var(--transition), color var(--transition)',
                        background: rsvp.status === opt.value ? TEXT : 'var(--color-surface)',
                        color: rsvp.status === opt.value ? '#ffffff' : TEXT,
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )
          })()}

          {/* Other events — only shown if attending the ceremony */}
          {ceremonyAttending && otherEvents.map(event => {
            const rsvp = rsvps[event.id] || { status: '' }
            return (
              <div key={event.id} style={sectionStyle}>
                <p style={{ fontFamily: SERIF, fontSize: 'var(--text-lg)', color: TEXT, margin: 0, marginBottom: 4, fontWeight: 400 }}>
                  {event.name}
                </p>
                {event.event_date && (
                  <p style={{ fontFamily: SANS, fontSize: 'var(--text-sm)', color: MUTED, margin: 0, marginBottom: 16 }}>
                    {new Date(event.event_date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
                    {event.event_time ? ` · ${event.event_time.slice(0, 5)}` : ''}
                  </p>
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                  {[
                    { value: 'attending', label: "I'll be there" },
                    { value: 'declined',  label: "Can't make it" },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setEventRsvp(event.id, opt.value)}
                      style={{
                        flex: 1, fontFamily: SANS, fontSize: 'var(--text-sm)',
                        padding: '10px 12px', borderRadius: 'var(--radius-pill)',
                        border: 'none', cursor: 'pointer',
                        transition: 'background var(--transition), color var(--transition)',
                        background: rsvp.status === opt.value ? TEXT : 'var(--color-surface)',
                        color: rsvp.status === opt.value ? '#ffffff' : TEXT,
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}

          {/* Venue stay */}
          {guest?.venue_stay_invited && anyAttending && (
            <div style={sectionStyle}>
              <p style={{ fontFamily: SERIF, fontSize: 'var(--text-lg)', color: TEXT, margin: 0, marginBottom: 4, fontWeight: 400 }}>
                Staying with us
              </p>
              <p style={{ fontFamily: SANS, fontSize: 'var(--text-sm)', color: MUTED, margin: 0, marginBottom: 16, lineHeight: 'var(--leading-normal)' }}>
                You've been invited to stay at the venue — let us know if any nights don't work.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {NIGHTS.map(night => (
                  <label key={night.key} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={stayNights[night.key as keyof typeof stayNights]}
                      onChange={e => setStayNights(prev => ({ ...prev, [night.key]: e.target.checked }))}
                    />
                    <span style={{ fontFamily: SANS, fontSize: 'var(--text-sm)', color: TEXT }}>{night.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Dietary */}
          {anyAttending && (
            <div style={sectionStyle}>
              <p style={{ fontFamily: SERIF, fontSize: 'var(--text-lg)', color: TEXT, margin: 0, marginBottom: 4, fontWeight: 400 }}>
                Dietary requirements
              </p>
              <p style={{ fontFamily: SANS, fontSize: 'var(--text-sm)', color: MUTED, margin: 0, marginBottom: 16 }}>
                Select all that apply.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                {DIETARY_OPTIONS.map(opt => (
                  <label key={opt.id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={dietary.includes(opt.id)}
                      onChange={() => toggleDietary(opt.id)}
                    />
                    <span style={{ fontFamily: SANS, fontSize: 'var(--text-sm)', color: TEXT }}>{opt.label}</span>
                  </label>
                ))}
              </div>
              <textarea
                value={dietaryNotes}
                onChange={e => setDietaryNotes(e.target.value)}
                placeholder="Anything else we should know about allergies or requirements…"
                rows={2}
                style={inputStyle}
              />
              {!dietaryAnswered && (
                <p style={{ fontFamily: SANS, fontSize: 'var(--text-sm)', color: 'var(--color-muted)', margin: 0, marginTop: 12 }}>
                  Please select at least one option above, including "No requirements" if none apply.
                </p>
              )}
            </div>
          )}

          {/* +1 */}
          {anyAttending && (
            <div style={sectionStyle}>
              <p style={{ fontFamily: SERIF, fontSize: 'var(--text-lg)', color: TEXT, margin: 0, marginBottom: 4, fontWeight: 400 }}>
                Bringing a +1?
              </p>
              <p style={{ fontFamily: SANS, fontSize: 'var(--text-sm)', color: MUTED, margin: 0, marginBottom: 16 }}>
                Let us know and we'll send them an invitation.
              </p>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input type="checkbox" checked={plusOne} onChange={e => setPlusOne(e.target.checked)} />
                <span style={{ fontFamily: SANS, fontSize: 'var(--text-sm)', color: TEXT }}>Yes, I'm bringing a +1</span>
              </label>
              {plusOne && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
                  <input
                    type="text"
                    value={plusOneName}
                    onChange={e => setPlusOneName(e.target.value)}
                    placeholder="Their name"
                    style={inputStyle}
                  />
                  <input
                    type="email"
                    value={plusOneEmail}
                    onChange={e => setPlusOneEmail(e.target.value)}
                    placeholder="Their email (optional)"
                    style={inputStyle}
                  />
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          {!!ceremonyRsvp?.status && (
            <div style={sectionStyle}>
              <p style={{ fontFamily: SERIF, fontSize: 'var(--text-lg)', color: TEXT, margin: 0, marginBottom: 4, fontWeight: 400 }}>
                Anything else?
              </p>
              <p style={{ fontFamily: SANS, fontSize: 'var(--text-sm)', color: MUTED, margin: 0, marginBottom: 16, lineHeight: 'var(--leading-normal)' }}>
                Accessibility needs, questions, or anything you'd like us to know.
              </p>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                placeholder="Let us know…"
                style={inputStyle}
              />
            </div>
          )}

          {/* Submit */}
          {!!ceremonyRsvp?.status && (
            <div style={{ paddingTop: 32 }}>
              {!allAnswered && (
                <p style={{ fontFamily: SANS, fontSize: 'var(--text-sm)', color: 'var(--color-muted)', margin: 0, marginBottom: 16 }}>
                  {!dietaryAnswered
                    ? 'Please select your dietary requirements above.'
                    : 'Please respond to all events above to continue.'}
                </p>
              )}
              <button
                type="submit"
                disabled={!allAnswered || submitting}
                style={{
                  fontFamily: SANS,
                  fontSize: 'var(--text-sm)',
                  color: '#ffffff',
                  background: TEXT,
                  border: 'none',
                  padding: '14px 36px',
                  borderRadius: 'var(--radius-pill)',
                  cursor: (!allAnswered || submitting) ? 'not-allowed' : 'pointer',
                  opacity: (!allAnswered || submitting) ? 0.4 : 1,
                  letterSpacing: 'var(--tracking-wide)',
                  textTransform: 'uppercase' as const,
                  fontWeight: 500,
                  transition: 'background var(--transition), opacity var(--transition)',
                }}
              >
                {submitting ? 'Sending…' : 'Send my RSVP'}
              </button>
            </div>
          )}

        </form>

        {/* Contact */}
        <div style={{ marginTop: 64, paddingTop: 32, borderTop: '1px solid var(--color-border)' }}>
          <p style={{ fontFamily: SANS, fontSize: 'var(--text-sm)', color: MUTED, margin: 0, marginBottom: 4 }}>Any questions?</p>
          <a href="mailto:hello@example.com" style={{ fontFamily: SANS, fontSize: 'var(--text-sm)', color: TEXT, textDecoration: 'underline', textUnderlineOffset: 3 }}>
            hello@example.com
          </a>
        </div>

      </div>
    </main>
  );
}
