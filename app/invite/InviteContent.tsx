'use client'

import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import FAB from '@/components/invite/FAB'

interface Event {
  id: string; name: string; event_date: string | null
  event_time: string | null; location: string | null; description: string | null
}
interface Transport { id: string; name: string; direction: string; departure_location: string | null; departure_time: string | null; notes: string | null }
interface ExternalAccom { id: string; name: string; description: string | null; url: string | null; price_range: string | null; distance_from_venue: string | null }
interface RegistryItem { id: string; title: string; description: string | null; url: string | null; store_name: string | null; price: number | null; currency: string }
interface FaqItem { id: string; question: string; answer: string | null }

// Visual tokens — edit in globals.css
const BG     = 'var(--color-bg)'
const BG_ALT = 'var(--color-bg-alt)'
const TEXT   = 'var(--color-text)'
const MUTED  = 'var(--color-muted)'
const SERIF  = 'var(--font-serif)'
const SANS   = 'var(--font-sans)'

export default function InviteContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('guest')

  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [guest, setGuest] = useState<{ id: string; name: string; venue_stay_invited: boolean } | null>(null)
  const [events, setEvents] = useState<Event[]>([])
  const [transport, setTransport] = useState<Transport[]>([])
  const [externalAccom, setExternalAccom] = useState<ExternalAccom[]>([])
  const [registry, setRegistry] = useState<RegistryItem[]>([])
  const [faqs, setFaqs] = useState<FaqItem[]>([])

  // Timeline scroll progress — must be here with all other hooks, before any early returns
  const timelineRef = useRef<HTMLDivElement>(null)
  const pillRefs = useRef<(HTMLDivElement | null)[]>([])
  const [lineProgress, setLineProgress] = useState(0)
  const [passedEvents, setPassedEvents] = useState<Set<string>>(new Set())

  useEffect(() => {
    const onScroll = () => {
      if (!timelineRef.current) return
      const rect = timelineRef.current.getBoundingClientRect()
      const progress = Math.max(0, Math.min(1,
        (window.innerHeight - rect.top) / (rect.height + window.innerHeight * 0.5)
      ))
      setLineProgress(progress * 100)

      // Check which pills the line has reached
      const fillY = rect.top + progress * rect.height
      const newPassed = new Set<string>()
      pillRefs.current.forEach((ref) => {
        if (!ref?.dataset.eventId) return
        const pillRect = ref.getBoundingClientRect()
        if (fillY >= pillRect.top + pillRect.height / 2) {
          newPassed.add(ref.dataset.eventId)
        }
      })
      setPassedEvents(newPassed)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!token) { setNotFound(true); setLoading(false); return }
    fetch(`/api/invite?token=${token}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) { setNotFound(true); return }
        setGuest(data.guest)
        setEvents(data.events || [])
        setTransport(data.transport)
        setExternalAccom(data.externalAccommodations)
        setRegistry(data.registry)
        setFaqs(data.faqs || [])
      })
      .finally(() => setLoading(false))
  }, [token])

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: BG }}>
      <p style={{ color: MUTED, fontFamily: SANS, fontSize: 14 }}>Loading…</p>
    </div>
  )

  if (notFound) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: BG, padding: '24px' }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontFamily: SERIF, fontSize: 28, color: TEXT, marginBottom: 8 }}>Invitation not found</h1>
        <p style={{ fontFamily: SANS, color: MUTED, fontSize: 15 }}>Please check your invitation link.</p>
      </div>
    </div>
  )

  const navLinks = [
    { label: 'The Wedding', href: '#events' },
    { label: 'Venue', href: '#venue' },
    ...(transport.length > 0 ? [{ label: 'Getting here', href: '#transport' }] : []),
    ...(externalAccom.length > 0 || guest?.venue_stay_invited ? [{ label: 'Stay', href: '#stay' }] : []),
    ...(registry.length > 0 ? [{ label: 'Registry', href: '#registry' }] : []),
    { label: 'FAQ', href: '#faq' },
    { label: 'RSVP', href: '#rsvp' },
  ]

  const formatEventPill = (event: Event) => {
    if (!event.event_date) return ''
    const d = new Date(`${event.event_date}T12:00:00`)
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  }


  return (
    <div style={{ background: BG, color: TEXT, fontFamily: SANS, minHeight: '100vh' }}>

      {/* ── FAB Menu ── */}
      <FAB links={navLinks} />

      {/* ── Hero ── */}
      <section className="hero">
        {/* Image */}
        <div className="hero-image" style={{
          background: '#d4cfc9',
          borderRadius: 16,
        }} />

        {/* Text */}
        <div className="hero-text" style={{
          display: 'flex',
          flexDirection: 'column' as const,
          justifyContent: 'space-between',
          padding: '8px 0',
        }}>
          {/* Center: title */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' as const, justifyContent: 'center', alignItems: 'center', textAlign: 'center' as const }}>
            <p style={{ fontFamily: SERIF, fontSize: 'clamp(28px, 3vw, 42px)', color: TEXT, margin: 0, fontWeight: 400, lineHeight: 1.2 }}>
              Celebrating Gian &amp; Cat,
            </p>
            <p style={{ fontFamily: SERIF, fontSize: 'clamp(22px, 2.5vw, 34px)', color: TEXT, margin: 0, marginTop: 12, fontWeight: 400, lineHeight: 1.3 }}>
              we&rsquo;re getting married.
            </p>
          </div>

          {/* Bottom: date + RSVP */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ fontFamily: SANS, fontSize: 15, color: TEXT, margin: 0 }}>
              Saturday 4 October 2026
            </p>
            <a href="#rsvp" style={{
              fontFamily: SANS, fontSize: 14, color: '#fff',
              background: TEXT,
              border: 'none',
              padding: '10px 22px', borderRadius: 100, textDecoration: 'none',
              transition: 'background 0.15s',
            }}
              onMouseEnter={e => (e.currentTarget.style.background = '#444')}
              onMouseLeave={e => (e.currentTarget.style.background = TEXT)}
            >RSVP Now</a>
          </div>
        </div>
      </section>

      {/* ── Schedule ── */}
      <section id="events" className="schedule">
        <div className="schedule-inner">

          {/* Left: sticky intro */}
          <div className="schedule-left">
            <p className="schedule-label">The Schedule</p>
            <p className="schedule-intro">
              We would love for you to join us as we celebrate our wedding. Good food, familiar faces, and a few stories worth retelling.
            </p>
          </div>

          {/* Right: timeline */}
          <div className="timeline" ref={timelineRef}>

            <div className="timeline-track">
              <div className="timeline-fill" style={{ height: `${lineProgress}%` }} />
            </div>

            {events.map((event, i) => (
              <div key={event.id} className="timeline-event">
                {/* Pill + event name on the same row */}
                <div className="timeline-pill-col"
                  ref={el => { pillRefs.current[i] = el }}
                  data-event-id={event.id}
                >
                  <span className={`pill${passedEvents.has(event.id) ? ' pill--active' : ''}`}>
                    {formatEventPill(event)}
                  </span>
                </div>
                <div className="timeline-content">
                  <div className="timeline-header">
                    <p className="timeline-name">{event.name}</p>
                    {(event.location || event.description) && (
                      <p className="timeline-meta">
                        {[event.location, event.description].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>
                  {/* Image floats loosely below, no card */}
                  <div className="timeline-image" />
                </div>
              </div>
            ))}

            {events.length === 0 && (
              <p style={{ fontFamily: SANS, fontSize: 14, color: MUTED }}>Event details coming soon.</p>
            )}

          </div>
        </div>
      </section>

      {/* ── Venue + Accommodation (one box) ── */}
      <div style={{
        background: '#eaeaea',
        borderRadius: 'var(--radius-image)',
        padding: 24,
        boxSizing: 'border-box' as const,
        display: 'flex',
        flexDirection: 'column' as const,
        gap: 0,
      }}>

        {/* Venue */}
        <section id="venue" className="venue-section" style={{ gap: 24, paddingBottom: 80, minHeight: '90vh' }}>
          <div style={{ display: 'flex', flexDirection: 'column' as const, paddingTop: 8 }}>
            <p style={{ fontFamily: SANS, fontSize: 'var(--text-xs)', letterSpacing: 'var(--tracking-widest)', textTransform: 'uppercase' as const, color: MUTED, margin: 0, marginBottom: 12 }}>
              Location
            </p>
            <h2 style={{ fontFamily: SERIF, fontSize: 'clamp(28px, 3vw, 42px)', color: TEXT, margin: 0, marginBottom: 48, lineHeight: 1.2, fontWeight: 400 }}>
              Venue Name TBC.
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 28, marginTop: 'auto' }}>
              <div>
                <p style={{ fontFamily: SANS, fontSize: 'var(--text-base)', color: TEXT, margin: 0, marginBottom: 6, fontWeight: 500 }}>• Address</p>
                <p style={{ fontFamily: SANS, fontSize: 'var(--text-sm)', color: MUTED, margin: 0, lineHeight: 'var(--leading-normal)' }}>
                  Address TBC<br />City TBC
                </p>
                <a href="#" style={{ fontFamily: SANS, fontSize: 'var(--text-sm)', color: TEXT, display: 'inline-block', marginTop: 4, textDecoration: 'underline', textUnderlineOffset: 3 }}>
                  Google Maps Directions
                </a>
              </div>
              <div>
                <p style={{ fontFamily: SANS, fontSize: 'var(--text-base)', color: TEXT, margin: 0, marginBottom: 6, fontWeight: 500 }}>• By Car</p>
                <p style={{ fontFamily: SANS, fontSize: 'var(--text-sm)', color: MUTED, margin: 0, lineHeight: 'var(--leading-normal)' }}>Parking details TBC.</p>
              </div>
              <div>
                <p style={{ fontFamily: SANS, fontSize: 'var(--text-base)', color: TEXT, margin: 0, marginBottom: 6, fontWeight: 500 }}>• By Bus</p>
                <p style={{ fontFamily: SANS, fontSize: 'var(--text-sm)', color: MUTED, margin: 0, lineHeight: 'var(--leading-normal)' }}>
                  We&rsquo;re arranging a bus from the city centre. Let us know in your RSVP if you&rsquo;d like a seat.
                </p>
              </div>
            </div>
          </div>
          <div className="venue-image" style={{ background: '#d4cfc9', borderRadius: 'var(--radius-image)' }} />
        </section>

        {/* Divider */}
        <div style={{ borderTop: `1px solid var(--color-border)` }} />

        {/* Accommodation — conditional on venue_stay_invited */}
        {guest?.venue_stay_invited && (
          <section id="stay-venue" className="schedule-inner" style={{ paddingBlock: 64 }}>
            <div className="schedule-left">
              <p className="schedule-label">Accommodation</p>
              <p className="schedule-intro">You&rsquo;re staying with us.</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 28 }}>
              <div>
                <p style={{ fontFamily: SANS, fontSize: 'var(--text-base)', color: TEXT, margin: 0, marginBottom: 6, fontWeight: 500 }}>• Check-in</p>
                <p style={{ fontFamily: SANS, fontSize: 'var(--text-sm)', color: MUTED, margin: 0, lineHeight: 'var(--leading-normal)' }}>From 3pm on Friday 2 October</p>
              </div>
              <div>
                <p style={{ fontFamily: SANS, fontSize: 'var(--text-base)', color: TEXT, margin: 0, marginBottom: 6, fontWeight: 500 }}>• Check-out</p>
                <p style={{ fontFamily: SANS, fontSize: 'var(--text-sm)', color: MUTED, margin: 0, lineHeight: 'var(--leading-normal)' }}>By 11am on Sunday 4 October</p>
              </div>
              <div>
                <p style={{ fontFamily: SANS, fontSize: 'var(--text-base)', color: TEXT, margin: 0, marginBottom: 6, fontWeight: 500 }}>• Breakfast</p>
                <p style={{ fontFamily: SANS, fontSize: 'var(--text-sm)', color: MUTED, margin: 0, lineHeight: 'var(--leading-normal)' }}>Included both mornings</p>
              </div>
            </div>
          </section>
        )}

        {!guest?.venue_stay_invited && externalAccom.length > 0 && (
          <section id="stay-external" className="schedule-inner" style={{ paddingBlock: 64 }}>
            <div className="schedule-left">
              <p className="schedule-label">Accommodation</p>
              <p className="schedule-intro">Places to stay.</p>
              <p style={{ fontFamily: SANS, fontSize: 'var(--text-base)', color: MUTED, margin: 0, marginTop: 16, lineHeight: 'var(--leading-normal)' }}>
                A few options nearby we recommend.
              </p>
            </div>
            <div className="hotel-grid">
              {externalAccom.map(a => (
                <div key={a.id} style={{ border: `1px solid var(--color-border)`, borderRadius: 'var(--radius-card)', padding: 24 }}>
                  <p style={{ fontFamily: SERIF, fontSize: 'var(--text-lg)', color: TEXT, margin: 0, marginBottom: 6, fontWeight: 400 }}>{a.name}</p>
                  {a.description && <p style={{ fontFamily: SANS, fontSize: 'var(--text-sm)', color: MUTED, margin: 0, marginBottom: 16, lineHeight: 'var(--leading-normal)' }}>{a.description}</p>}
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' as const }}>
                    {a.price_range && <span style={{ fontFamily: SANS, fontSize: 'var(--text-sm)', color: MUTED }}>{a.price_range}</span>}
                    {a.distance_from_venue && <span style={{ fontFamily: SANS, fontSize: 'var(--text-sm)', color: MUTED }}>{a.distance_from_venue}</span>}
                  </div>
                  {a.url && (
                    <a href={a.url} target="_blank" rel="noopener noreferrer" style={{ fontFamily: SANS, fontSize: 'var(--text-sm)', color: TEXT, display: 'inline-block', marginTop: 12, textDecoration: 'underline', textUnderlineOffset: 3 }}>
                      View →
                    </a>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

      </div>

      
            {/* ── Registry ── */}
      <section id="registry" style={{ paddingBlock: 'var(--space-section)', minHeight: '90vh', textAlign: 'center' as const, display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', paddingTop: '100px' }}>
        <p style={{ fontFamily: SANS, fontSize: 'var(--text-xs)', letterSpacing: 'var(--tracking-widest)', textTransform: 'uppercase' as const, color: MUTED, margin: 0, marginBottom: 12 }}>
          Gift Registry
        </p>
        <p style={{ fontFamily: SERIF, fontSize: 'clamp(24px, 2.5vw, 34px)', color: TEXT, margin: '0 auto', marginBottom: 16, lineHeight: 'var(--leading-normal)', maxWidth: 560, fontWeight: 400 }}>
          Sharing our wedding day with you is what matters most to us.
        </p>
        <p style={{ fontFamily: SANS, fontSize: 'var(--text-base)', color: MUTED, margin: '0 auto', marginBottom: 40, maxWidth: 480, lineHeight: 'var(--leading-normal)' }}>
          If you would like to give a gift, a contribution towards our honeymoon would be greatly appreciated.
        </p>
        <a href="#" style={{
          fontFamily: SANS, fontSize: 'var(--text-sm)', color: TEXT,
          border: `1px solid var(--color-border)`,
          padding: '12px 28px', borderRadius: 'var(--radius-pill)', textDecoration: 'none',
          display: 'inline-block', transition: 'background var(--transition)',
        }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-surface)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          View Honeymoon Fund →
        </a>
      </section>





      {/* ── FAQ ── */}
      <section id="faq" className="schedule faq-section">
        <div className="schedule-inner" style={{ alignItems: 'start' }}>

          {/* Left: label, heading, contact, image */}
          <div className="schedule-left" style={{ display: 'flex', flexDirection: 'column' as const, gap: 24 }}>
            <div>
              <p className="schedule-label">FAQ</p>
              <p className="schedule-intro" style={{ margin: 0 }}>Good to know.</p>
            </div>
            {/* Image placeholder */}
            <div style={{ width: 250, height: 250, background: '#d4cfc9', borderRadius: 'var(--radius-card)' }} />
            {/* Contact */}
            <div id="contact">
              <p style={{ fontFamily: SANS, fontSize: 'var(--text-sm)', color: MUTED, margin: 0, marginBottom: 8, lineHeight: 'var(--leading-normal)' }}>
                Any other questions?
              </p>
              <a href="mailto:hello@example.com" style={{ fontFamily: SANS, fontSize: 'var(--text-sm)', color: TEXT, textDecoration: 'underline', textUnderlineOffset: 3 }}>
                hello@example.com
              </a>
            </div>
          </div>

          {/* Right: FAQ items from DB */}
          <div style={{ paddingTop: 28 }}>
            {faqs.map((faq, i) => (
              <div key={faq.id} style={{ paddingBlock: 28, borderBottom: i < faqs.length - 1 ? `1px solid var(--color-border)` : undefined }}>
                <p style={{ fontFamily: SERIF, fontSize: 'var(--text-md)', color: TEXT, margin: 0, marginBottom: 8, fontWeight: 400 }}>{faq.question}</p>
                <p style={{ fontFamily: SANS, fontSize: 'var(--text-sm)', color: MUTED, margin: 0, lineHeight: 'var(--leading-normal)' }}>{faq.answer || '—'}</p>
              </div>
            ))}
            {faqs.length === 0 && (
              <p style={{ fontFamily: SANS, fontSize: 'var(--text-sm)', color: MUTED }}>FAQ coming soon.</p>
            )}
          </div>

        </div>
      </section>


            {/* ── RSVP CTA ── */}
      <section id="rsvp" style={{
        background: '#eaeaea',
        borderRadius: 'var(--radius-image)',
        padding: 24,
        paddingBlock: 'var(--space-section)',
        minHeight: '90vh',
        boxSizing: 'border-box' as const,
        textAlign: 'center' as const,
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {/* Image placeholder */}
        <div style={{ width: 150, height: 150, background: '#d4cfc9', borderRadius: 'var(--radius-card)', margin: '0 auto 48px' }} />
        <p style={{ fontFamily: SANS, fontSize: 'var(--text-xs)', letterSpacing: 'var(--tracking-widest)', textTransform: 'uppercase' as const, color: MUTED, margin: 0, marginBottom: 24 }}>
          Kindly reply by May 1 2026
        </p>
        <h2 style={{ fontFamily: SERIF, fontSize: 'clamp(28px, 4vw, 52px)', color: TEXT, margin: '0 auto', marginBottom: 16, lineHeight: 1.2, maxWidth: 600, fontWeight: 400 }}>
          Please let us know if you&rsquo;ll be joining us.
        </h2>
        <p style={{ fontFamily: SANS, fontSize: 'var(--text-base)', color: MUTED, margin: '0 auto', marginBottom: 48, maxWidth: 400, lineHeight: 'var(--leading-normal)' }}>
          Venue Name TBC · Saturday 4 October 2026
        </p>
        <Link
          href={`/rsvp?guest=${token}`}
          style={{
            display: 'inline-block', fontFamily: SANS, fontSize: 'var(--text-sm)', color: 'var(--color-bg)', background: TEXT,
            padding: '14px 36px', borderRadius: 'var(--radius-pill)', textDecoration: 'none',
            letterSpacing: 'var(--tracking-wide)', textTransform: 'uppercase' as const, fontWeight: 500,
          }}
        >
          RSVP now →
        </Link>

        <div style={{ marginTop: 'auto', paddingTop: 64 }}>
          <a href="#" style={{ fontFamily: SANS, fontSize: 'var(--text-xs)', color: MUTED, display: 'block', marginTop: 8, textDecoration: 'none', letterSpacing: 'var(--tracking-wide)' }}>
            Back to top ↑
          </a>
        </div>
      </section>

    </div>
  )
}
