'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { WaveText } from '@/components/WaveText';
import { getTranslation } from '@/lib/translations';

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
  background: 'var(--color-surface)',
  border: 'none',
  padding: '12px 16px',
  outline: 'none',
  boxSizing: 'border-box' as const,
  marginTop: 8,
  resize: 'vertical' as const,
}

const sectionStyle = {
  paddingBlock: 28,
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
  { key: 'friday_night',   label: 'Friday night' },
  { key: 'saturday_night', label: 'Saturday night' },
  { key: 'sunday_night', label: 'Sunday night' },
];

interface Event { id: string; name: { en: string; pt: string; es: string }; slug: string | null; event_date: string | null; event_time: string | null; location: string | null }
interface RSVPState { status: string }

function DietaryPicker({
  selected,
  onToggle,
  notes,
  onNotesChange,
  t,
}: {
  selected: string[];
  onToggle: (id: string) => void;
  notes: string;
  onNotesChange: (v: string) => void;
  t: ReturnType<typeof getTranslation>;
}) {
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
        {t.dietaryOptions.map(opt => (
          <label key={opt.id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <input type="checkbox" checked={selected.includes(opt.id)} onChange={() => onToggle(opt.id)} />
            <span style={{ fontFamily: SANS, fontSize: 'var(--text-sm)', color: TEXT }}>{opt.label}</span>
          </label>
        ))}
      </div>
      <textarea
        value={notes}
        onChange={e => onNotesChange(e.target.value)}
        placeholder={t.dietaryPlaceholder}
        rows={2}
        style={inputStyle}
      />
    </>
  );
}

const getLocaleDateString = (locale: string) => {
  const localeMap: Record<string, string> = { en: 'en-GB', pt: 'pt-BR', es: 'es-ES' };
  return localeMap[locale] || 'en-GB';
};

export default function RSVPForm({ locale = 'en' }: { locale?: string }) {
  const t = getTranslation(locale);
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('guest');
  const dateLocale = getLocaleDateString(locale);

  const [loading, setLoading]       = useState(true);
  const [notFound, setNotFound]     = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [guest, setGuest]           = useState<{ id: string; name: string; email: string; venue_stay_invited: boolean } | null>(null);
  const [events, setEvents]         = useState<Event[]>([]);
  const [partyMembers, setPartyMembers] = useState<{ id: string; name: string }[]>([]);
  const [rsvps, setRsvps]           = useState<Record<string, RSVPState>>({});
  const [dietary, setDietary]       = useState<string[]>([]);
  const [dietaryNotes, setDietaryNotes] = useState('');
  const [partyDietary, setPartyDietary] = useState<Record<string, string[]>>({});
  const [partyDietaryNotes, setPartyDietaryNotes] = useState<Record<string, string>>({});
  const [partyRsvps, setPartyRsvps] = useState<Record<string, Record<string, string>>>({});
  const [stayNights, setStayNights] = useState({ sunday_night: true, friday_night: true, saturday_night: true });
  const [notes, setNotes]           = useState('');
  const [transportNeeded, setTransportNeeded] = useState<boolean | null>(null);
  const [transportFrom, setTransportFrom]     = useState('');
  const [transportReturn, setTransportReturn] = useState<boolean | null>(null);

  useEffect(() => {
    if (!token) { setNotFound(true); setLoading(false); return; }
    fetch(`/api/rsvp?token=${token}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) { setNotFound(true); return; }
        setGuest(data.guest);
        setEvents(data.events);
        if (data.partyMembers?.length) setPartyMembers(data.partyMembers);

        const rsvpMap: Record<string, RSVPState> = {};
        for (const r of data.existingRsvps) {
          rsvpMap[r.event_id] = { status: r.status };
          if (r.dietary_requirements?.length) setDietary(r.dietary_requirements);
          if (r.dietary_notes) setDietaryNotes(r.dietary_notes);
        }
        setRsvps(rsvpMap);

        // Pre-fill notes from guest record (shared field with admin notes)
        if (data.guest.notes) setNotes(data.guest.notes);

        // Pre-fill party member dietary and RSVPs from previous submission
        if (data.partyRsvps) {
          const pDietary: Record<string, string[]> = {};
          const pNotes: Record<string, string> = {};
          const pRsvps: Record<string, Record<string, string>> = {};
          for (const [id, r] of Object.entries(data.partyRsvps as Record<string, any>)) {
            if (r.dietary_requirements?.length) pDietary[id] = r.dietary_requirements;
            if (r.dietary_notes) pNotes[id] = r.dietary_notes;
            // Initialize party member RSVPs
            if (!pRsvps[id]) pRsvps[id] = {};
            for (const [eventId, status] of Object.entries(r.rsvps || {})) {
              pRsvps[id][eventId] = status as string;
            }
          }
          if (Object.keys(pDietary).length) setPartyDietary(pDietary);
          if (Object.keys(pNotes).length) setPartyDietaryNotes(pNotes);
          if (Object.keys(pRsvps).length) setPartyRsvps(pRsvps);
        }

        if (data.stayRequest) {
          setStayNights({
            sunday_night: data.stayRequest.sunday_night,
            friday_night:   data.stayRequest.friday_night,
            saturday_night: data.stayRequest.saturday_night,
          });
        }
        if (data.guest.transport_needed !== null) setTransportNeeded(data.guest.transport_needed);
        if (data.guest.transport_from) setTransportFrom(data.guest.transport_from);
        if (data.guest.transport_return !== null) setTransportReturn(data.guest.transport_return);
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

  const togglePartyDietary = (memberId: string, id: string) => {
    setPartyDietary(prev => {
      const curr = prev[memberId] || [];
      if (id === 'none') return { ...prev, [memberId]: ['none'] };
      const without = curr.filter(d => d !== 'none');
      return { ...prev, [memberId]: without.includes(id) ? without.filter(d => d !== id) : [...without, id] };
    });
  };

  const formatPartyNames = () => {
    const names: string[] = [];

    // Add primary guest first name
    if (guest?.name) {
      names.push(guest.name.split(' ')[0]);
    }

    // Add party members first names
    partyMembers.forEach(member => {
      names.push(member.name.split(' ')[0]);
    });

    if (names.length === 0) return '';
    if (names.length === 1) return names[0];
    if (names.length === 2) return `${names[0]} & ${names[1]}`;

    // 3+ people: "Name1, Name2, Name3 & Name4"
    return names.slice(0, -1).join(', ') + ' & ' + names[names.length - 1];
  };

  const eventMeta = (ev: Event) => {
    const parts: string[] = []
    if (ev.event_date) parts.push(new Date(ev.event_date).toLocaleDateString(dateLocale, { weekday: 'long', day: 'numeric', month: 'long' }))
    if (ev.event_time) parts.push(ev.event_time.slice(0, 5))
    if (ev.location)   parts.push(ev.location)
    return parts.join(' · ')
  }

  const sortedEvents = [...events].sort((a, b) => {
    const aStr = `${a.event_date || ''}T${a.event_time || '00:00:00'}`
    const bStr = `${b.event_date || ''}T${b.event_time || '00:00:00'}`
    return aStr.localeCompare(bStr)
  })

  const ceremonyEvent    = sortedEvents.find(e => e.slug === 'wedding') || sortedEvents.find(e => ((e.name as any)?.en || '').toLowerCase().includes('wedding')) || sortedEvents[Math.floor(sortedEvents.length / 2)]
  const otherEvents      = sortedEvents.filter(e => e.id !== ceremonyEvent?.id)
  const ceremonyRsvp     = ceremonyEvent ? (rsvps[ceremonyEvent.id] || { status: '' }) : null
  const ceremonyAttending = ceremonyRsvp?.status === 'attending'
  const ceremonyDeclined  = ceremonyRsvp?.status === 'declined'
  const anyAttending      = ceremonyAttending
  const dietaryAnswered   = !anyAttending || dietary.length > 0
  const transportAnswered = !anyAttending || (
    transportNeeded === false ||
    (transportNeeded === true && transportFrom.trim() !== '' && transportReturn !== null)
  )
  const allAnswered       = !!ceremonyEvent && !!rsvps[ceremonyEvent.id]?.status && (
    ceremonyDeclined || (otherEvents.every(e => rsvps[e.id]?.status) && dietaryAnswered && transportAnswered)
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
        party_dietary:       partyDietary,
        party_dietary_notes: partyDietaryNotes,
        party_rsvps:         partyRsvps,
        transport_needed:    anyAttending ? transportNeeded : null,
        transport_from:      anyAttending && transportNeeded ? transportFrom : null,
        transport_return:    anyAttending && transportNeeded ? transportReturn : null,
      }),
    });

    fetch('/api/send-rsvp-confirmation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, attending: anyAttending }),
    }).catch(() => {});

    const confirmationPath = locale === 'en' ? `/rsvp/confirmation?guest=${token}` : `/${locale}/rsvp/confirmation?guest=${token}`;
    router.push(confirmationPath);
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontFamily: SANS, fontSize: 'var(--text-sm)', color: MUTED }}>{t.loading}</p>
    </div>
  );

  if (notFound) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontFamily: SERIF, fontSize: 28, color: TEXT, marginBottom: 8, fontWeight: 400 }}>{t.invitationNotFound}</h1>
        <p style={{ fontFamily: SANS, fontSize: 'var(--text-base)', color: MUTED }}>{t.checkLink}</p>
      </div>
    </div>
  );

  const toggleBtn = (selected: boolean) => ({
    flex: 1,
    fontFamily: SANS,
    fontSize: 'var(--text-sm)',
    padding: '10px 12px',
    borderRadius: 'var(--radius-pill)',
    border: 'none',
    cursor: 'pointer',
    transition: 'background var(--transition)',
    background: selected ? 'var(--color-pink)' : 'var(--color-surface)',
    color: TEXT,
  } as React.CSSProperties)

  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingBlock: 'var(--space-section)' }}>
      <div style={{ width: '100%', maxWidth: 520 }}>

        {/* Back link */}
        <div style={{ marginBottom: 32 }}>
          <a href={`${locale === 'en' ? '/invite' : `/${locale}/invite`}?guest=${token}`} className="btn btn-secondary">
            ← {t.confirmation.backToInvitation}
          </a>
        </div>

        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <h1 style={{ fontFamily: SERIF, fontSize: 'clamp(22px, 3vw, 32px)', color: TEXT, margin: 0, fontWeight: 400, lineHeight: 1.2 }}>
            {t.rsvpGreeting(formatPartyNames())}
          </h1>
          <p style={{ fontFamily: SERIF, fontSize: 'clamp(16px, 2vw, 22px)', color: TEXT, margin: 0, marginTop: 8, fontWeight: 400, lineHeight: 1.3 }}>
            {t.rsvpQuestion}
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

          {/* Ceremony */}
          {ceremonyEvent && (() => {
            const rsvp = ceremonyRsvp!
            return (
              <div style={sectionStyle}>
                <p style={{ fontFamily: SERIF, fontSize: 'var(--text-lg)', color: TEXT, margin: 0, marginBottom: 4, fontWeight: 400 }}>
                  {(ceremonyEvent.name as any)?.[locale] || (ceremonyEvent.name as any)?.en}
                </p>
                {eventMeta(ceremonyEvent) && (
                  <p style={{ fontFamily: SANS, fontSize: 'var(--text-sm)', color: MUTED, margin: 0, marginBottom: 16 }}>
                    {eventMeta(ceremonyEvent)}
                  </p>
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                  {[
                    { value: 'attending', label: t.attending },
                    { value: 'declined',  label: t.notAttending },
                  ].map(opt => (
                    <button key={opt.value} type="button" onClick={() => setEventRsvp(ceremonyEvent.id, opt.value)} style={toggleBtn(rsvp.status === opt.value)}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )
          })()}

          {/* Other events */}
          {ceremonyAttending && otherEvents.map(event => {
            const rsvp = rsvps[event.id] || { status: '' }
            return (
              <div key={event.id} style={sectionStyle}>
                <p style={{ fontFamily: SERIF, fontSize: 'var(--text-lg)', color: TEXT, margin: 0, marginBottom: 4, fontWeight: 400 }}>
                  {(event.name as any)?.[locale] || (event.name as any)?.en}
                </p>
                {eventMeta(event) && (
                  <p style={{ fontFamily: SANS, fontSize: 'var(--text-sm)', color: MUTED, margin: 0, marginBottom: 16 }}>
                    {eventMeta(event)}
                  </p>
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                  {[
                    { value: 'attending', label: t.attending },
                    { value: 'declined',  label: t.notAttending },
                  ].map(opt => (
                    <button key={opt.value} type="button" onClick={() => setEventRsvp(event.id, opt.value)} style={toggleBtn(rsvp.status === opt.value)}>
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
                {t.stayingWithUs}
              </p>
              <p style={{ fontFamily: SANS, fontSize: 'var(--text-sm)', color: MUTED, margin: 0, marginBottom: 16, lineHeight: 'var(--leading-normal)' }}>
                {t.stayDescription}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {t.nights.map(night => (
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

          {/* Dietary — primary guest */}
          {anyAttending && (
            <div style={sectionStyle}>
              <p style={{ fontFamily: SERIF, fontSize: 'var(--text-lg)', color: TEXT, margin: 0, marginBottom: 4, fontWeight: 400 }}>
                {partyMembers.length > 0 ? `${guest?.name?.split(' ')[0]} — ${t.dietaryRequirements}` : t.dietaryRequirements}
              </p>
              <p style={{ fontFamily: SANS, fontSize: 'var(--text-sm)', color: MUTED, margin: 0, marginBottom: 16 }}>
                {t.dietarySelectAll}
              </p>
              <DietaryPicker
                selected={dietary}
                onToggle={toggleDietary}
                notes={dietaryNotes}
                onNotesChange={setDietaryNotes}
                t={t}
              />
              {!dietaryAnswered && (
                <p style={{ fontFamily: SANS, fontSize: 'var(--text-sm)', color: MUTED, margin: 0, marginTop: 12 }}>
                  {t.dietaryError}
                </p>
              )}
            </div>
          )}

          {/* Party members — responses + dietary */}
          {anyAttending && partyMembers.length > 0 && partyMembers.map(member => {
            const memberAttending = Object.values(partyRsvps[member.id] || {}).every(status => status === 'attending');
            const hasResponded = Object.keys(partyRsvps[member.id] || {}).length > 0;
            return (
              <div key={member.id} style={sectionStyle}>
                <p style={{ fontFamily: SERIF, fontSize: 'var(--text-lg)', color: TEXT, margin: 0, marginBottom: 16, fontWeight: 400 }}>
                  {member.name?.split(' ')[0]}
                </p>

                {/* Response selection */}
                <div style={{ marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid var(--color-border)' }}>
                  <div style={{ display: 'flex', gap: 20 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name={`party-response-${member.id}`}
                        checked={memberAttending}
                        onChange={() => {
                          const newRsvps: Record<string, string> = {};
                          for (const event of events) {
                            newRsvps[event.id] = 'attending';
                          }
                          setPartyRsvps(prev => ({ ...prev, [member.id]: newRsvps }));
                        }}
                      />
                      <span style={{ fontFamily: SANS, fontSize: 'var(--text-base)', color: TEXT }}>{t.partyAttending || t.attending || 'Yes'}</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name={`party-response-${member.id}`}
                        checked={!memberAttending && hasResponded}
                        onChange={() => {
                          const newRsvps: Record<string, string> = {};
                          for (const event of events) {
                            newRsvps[event.id] = 'declined';
                          }
                          setPartyRsvps(prev => ({ ...prev, [member.id]: newRsvps }));
                        }}
                      />
                      <span style={{ fontFamily: SANS, fontSize: 'var(--text-base)', color: TEXT }}>{t.partyNotAttending || t.notAttending || 'No'}</span>
                    </label>
                  </div>
                </div>

                {/* Dietary — only if attending */}
                {memberAttending && (
                  <div>
                    <p style={{ fontFamily: SANS, fontSize: 'var(--text-sm)', color: MUTED, margin: 0, marginBottom: 16 }}>
                      {t.dietaryRequirements}
                    </p>
                    <DietaryPicker
                      selected={partyDietary[member.id] || []}
                      onToggle={(id) => togglePartyDietary(member.id, id)}
                      notes={partyDietaryNotes[member.id] || ''}
                      onNotesChange={(v) => setPartyDietaryNotes(prev => ({ ...prev, [member.id]: v }))}
                      t={t}
                    />
                  </div>
                )}
              </div>
            );
          })}


          {/* Notes */}
          {!!ceremonyRsvp?.status && (
            <div style={sectionStyle}>
              <p style={{ fontFamily: SERIF, fontSize: 'var(--text-lg)', color: TEXT, margin: 0, marginBottom: 4, fontWeight: 400 }}>
                {t.anythingElse}
              </p>
              <p style={{ fontFamily: SANS, fontSize: 'var(--text-sm)', color: MUTED, margin: 0, marginBottom: 16, lineHeight: 'var(--leading-normal)' }}>
                {t.anythingElseDescription}
              </p>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                placeholder={t.notesPlaceholder}
                style={inputStyle}
              />
            </div>
          )}

          {/* Transport */}
          {anyAttending && (
            <div style={{
              ...sectionStyle,
              borderRadius: 12,
              padding: 24,
              background: 'var(--color-surface)',
              borderLeft: !transportAnswered ? '3px solid var(--color-green)' : '3px solid transparent',
            }}>
              <p style={{ fontFamily: SANS, fontSize: 'var(--text-xs)', letterSpacing: 'var(--tracking-widest)', textTransform: 'uppercase' as const, color: 'var(--color-label)', margin: '0 0 4px' }}>
                {t.transportLabel}
              </p>
              <p style={{ fontFamily: SERIF, fontSize: 'var(--text-lg)', color: TEXT, margin: '0 0 16px', fontWeight: 400 }}>
                {t.transportNeeded}
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                {([true, false] as const).map(v => (
                  <button
                    key={String(v)} type="button"
                    onClick={() => { setTransportNeeded(v); if (!v) { setTransportFrom(''); setTransportReturn(null); } }}
                    style={toggleBtn(transportNeeded === v)}
                  >{v ? t.transportYes : t.transportNo}</button>
                ))}
              </div>

              {transportNeeded === true && (
                <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column' as const, gap: 20 }}>
                  <div>
                    <p style={{ fontFamily: SERIF, fontSize: 'var(--text-lg)', color: TEXT, margin: '0 0 8px', fontWeight: 400 }}>
                      {t.transportFrom}
                    </p>
                    <input
                      type="text" value={transportFrom}
                      onChange={e => setTransportFrom(e.target.value)}
                      placeholder={t.transportFromPlaceholder}
                      style={{ ...inputStyle, resize: undefined }}
                    />
                  </div>
                  <div>
                    <p style={{ fontFamily: SERIF, fontSize: 'var(--text-lg)', color: TEXT, margin: '0 0 16px', fontWeight: 400 }}>
                      {t.transportReturn}
                    </p>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {([true, false] as const).map(v => (
                        <button
                          key={String(v)} type="button"
                          onClick={() => setTransportReturn(v)}
                          style={toggleBtn(transportReturn === v)}
                        >{v ? t.transportYes : t.transportNo}</button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Submit */}
          {!!ceremonyRsvp?.status && (
            <div style={{ paddingTop: 32 }}>
              {!allAnswered && (
                <p style={{ fontFamily: SANS, fontSize: 'var(--text-sm)', color: MUTED, margin: 0, marginBottom: 16 }}>
                  {!dietaryAnswered
                    ? t.dietaryErrorMessage
                    : t.eventsErrorMessage}
                </p>
              )}
              <button
                type="submit"
                disabled={!allAnswered || submitting}
                className="btn btn-primary"
                style={
                  !allAnswered || submitting
                    ? {
                        background: 'var(--color-surface)',
                        color: '#aaaaaa',
                        pointerEvents: 'none',
                        cursor: 'default',
                      }
                    : {}
                }
              >
                <WaveText text={submitting ? t.submitting : t.submitButton} />
              </button>
            </div>
          )}

        </form>

        {/* Contact */}
        <div style={{ marginTop: 64 }}>
          <p style={{ fontFamily: SANS, fontSize: 'var(--text-sm)', color: MUTED, margin: 0, marginBottom: 4 }}>{t.anyQuestions}</p>
          <a href="mailto:balfour.cat@gmail.com" style={{ fontFamily: SANS, fontSize: 'var(--text-sm)', color: TEXT, textDecoration: 'underline', textUnderlineOffset: 3 }}>
            balfour.cat@gmail.com
          </a>
        </div>

      </div>
    </main>
  );
}
