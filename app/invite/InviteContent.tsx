'use client'

import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import FAB from '@/components/invite/FAB'
import { WaveText } from '@/components/WaveText'
import Countdown from '@/components/invite/Countdown'

interface Event {
  id: string; name: string; event_date: string | null
  event_time: string | null; location: string | null; description: string | null
}
interface Transport { id: string; name: string; direction: string; departure_location: string | null; departure_time: string | null; notes: string | null }
interface ExternalAccom { id: string; name: string; description: string | null; url: string | null; price_range: string | null; distance_from_venue: string | null }
interface RegistryItem { id: string; title: string; description: string | null; url: string | null; store_name: string | null; price: number | null; currency: string }
interface FaqItem { id: string; question: string; answer: string | null }

// Visual tokens — edit in globals.css
const TEXT  = 'var(--color-text)'
const MUTED = 'var(--color-muted)'
const SERIF = 'var(--font-serif)'
const SANS  = 'var(--font-sans)'

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

  // Timeline scroll progress
  const timelineRef = useRef<HTMLDivElement>(null)
  const pillRefs = useRef<(HTMLDivElement | null)[]>([])
  const [lineProgress, setLineProgress] = useState(0)
  const [passedEvents, setPassedEvents] = useState<Set<string>>(new Set())

  // Hotel carousel
  const carouselRef = useRef<HTMLDivElement>(null)
  const scrollCarousel = (dir: 'prev' | 'next') => {
    if (!carouselRef.current) return
    const w = carouselRef.current.offsetWidth * 0.85
    carouselRef.current.scrollBy({ left: dir === 'next' ? w : -w, behavior: 'smooth' })
  }

  useEffect(() => {
    const onScroll = () => {
      if (!timelineRef.current) return
      const rect = timelineRef.current.getBoundingClientRect()
      const progress = Math.max(0, Math.min(1,
        (window.innerHeight - rect.top) / (rect.height + window.innerHeight * 0.5)
      ))
      setLineProgress(progress * 100)
      const fillY = rect.top + progress * rect.height
      const newPassed = new Set<string>()
      pillRefs.current.forEach((ref) => {
        if (!ref?.dataset.eventId) return
        const pillRect = ref.getBoundingClientRect()
        if (fillY >= pillRect.top + pillRect.height / 2) newPassed.add(ref.dataset.eventId)
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
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: MUTED, fontFamily: SANS, fontSize: 14 }}>Loading…</p>
    </div>
  )

  if (notFound) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontFamily: SERIF, fontSize: 28, color: TEXT, marginBottom: 8 }}>Invitation not found</h1>
        <p style={{ fontFamily: SANS, color: MUTED, fontSize: 15 }}>Please check your invitation link.</p>
      </div>
    </div>
  )

  const hasStay = guest?.venue_stay_invited || externalAccom.length > 0

  const navLinks = [
    { label: 'About', href: '#about' },
    { label: 'Location', href: '#venue' },
    { label: 'The Schedule', href: '#events' },
    ...(hasStay ? [{ label: 'Where to stay', href: '#stay' }] : []),
    ...(registry.length > 0 ? [{ label: 'Gift Registry', href: '#registry' }] : []),
    { label: 'FAQ', href: '#faq' },
    { label: 'RSVP', href: '#rsvp' },
  ]

  const formatEventPill = (event: Event) => {
    if (!event.event_date) return ''
    const d = new Date(`${event.event_date}T12:00:00`)
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  }

  return (
    <div style={{ color: TEXT, fontFamily: SANS, minHeight: '100vh' }}>

      {/* ── FAB Menu ── */}
      <FAB links={navLinks} />

      {/* ── Hero ── */}
      <section className="hero">
        {/* Image */}
        <div className="hero-image" style={{ background: 'var(--color-surface)' }} />

        {/* Text */}
        <div className="hero-text" style={{
          display: 'flex',
          flexDirection: 'column' as const,
          justifyContent: 'space-between',
          padding: '8px 0',
        }}>
          {/* Center: label + countdown */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' as const, justifyContent: 'center', alignItems: 'center', textAlign: 'center' as const, gap: 20 }}>
            <p style={{ fontFamily: SERIF, fontSize: 'clamp(18px, 2vw, 26px)', color: TEXT, margin: 0, fontWeight: 400 }}>
              Gian &amp; Cat
            </p>
            <Countdown />
          </div>

          {/* Bottom: date + RSVP */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ fontFamily: SANS, fontSize: 15, color: TEXT, margin: 0 }}>
              Saturday 3 October 2026
            </p>
            <a href="#rsvp" className="btn btn-primary">
              <WaveText text="RSVP Now" />
            </a>
          </div>
        </div>
      </section>

      {/* ── About ── */}
      <section id="about" style={{
        paddingBlock: 'var(--space-section)',
        maxWidth: 640,
        margin: '0 auto',
        textAlign: 'center' as const,
      }}>
        <p className="schedule-label" style={{ marginBottom: 24 }}>A note from us</p>
        <p style={{ fontFamily: SERIF, fontSize: 'clamp(20px, 2.2vw, 28px)', color: TEXT, lineHeight: 'var(--leading-normal)', margin: 0, fontWeight: 400 }}>
          We&rsquo;re getting married — and we can&rsquo;t wait to celebrate with you. Everything you need is on this page: the schedule, where we&rsquo;re celebrating, where to stay, and how to RSVP. So excited to share this day with you both.
        </p>
      </section>

      {/* ── Venue ── */}
      <section id="venue" className="venue-section" style={{ paddingBlock: 'var(--space-section)', gap: 24, minHeight: '100vh' }}>
        <div style={{ display: 'flex', flexDirection: 'column' as const, paddingTop: 8 }}>
          <p className="schedule-label">Location</p>
          <h2 style={{ fontFamily: SERIF, fontSize: 'clamp(28px, 3vw, 42px)', color: TEXT, margin: 0, marginBottom: 48, lineHeight: 1.2, fontWeight: 400 }}>
            La Garriga de Castelladral.
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 28, marginTop: 'auto' }}>
            <div>
              <p style={{ fontFamily: SANS, fontSize: 'var(--text-base)', color: TEXT, margin: 0, marginBottom: 6, fontWeight: 500 }}>• Address</p>
              <p style={{ fontFamily: SANS, fontSize: 'var(--text-sm)', color: MUTED, margin: 0, lineHeight: 'var(--leading-normal)' }}>
                La Garriga de Castelladral<br />Barcelona, Spain
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
        <div className="venue-image" style={{ background: 'var(--color-surface)' }} />
      </section>

      {/* ── Schedule ── */}
      <section id="events" className="schedule">
        <div className="schedule-inner">
          <div className="schedule-left">
            <p className="schedule-label">The Schedule</p>
            <p className="schedule-intro">
              We would love for you to join us as we celebrate our wedding. Good food, familiar faces, and a few stories worth retelling.
            </p>
          </div>

          <div className="timeline" ref={timelineRef}>
            <div className="timeline-track">
              <div className="timeline-fill" style={{ height: `${lineProgress}%` }} />
            </div>

            {events.map((event, i) => (
              <div key={event.id} className="timeline-event">
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

      {/* ── Where to stay ── */}
      {hasStay && (
        <section id="stay" style={{ paddingBlock: 'var(--space-section)' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: externalAccom.length > 0 && guest?.venue_stay_invited ? '1fr 1fr' : '1fr',
            gap: 'calc(var(--space-page) * 2)',
            alignItems: 'start',
          }}>

            {/* Hotel carousel */}
            {externalAccom.length > 0 && (
              <div>
                {/* Heading */}
                <div style={{ marginBottom: 24 }}>
                  <p className="schedule-label">Where to stay</p>
                  <h2 style={{ fontFamily: SERIF, fontSize: 'clamp(24px, 2.5vw, 36px)', color: TEXT, margin: 0, fontWeight: 400, lineHeight: 1.2 }}>
                    Hotels &amp; accommodation
                  </h2>
                </div>

                {/* Buttons aligned to top of slider */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 12 }}>
                  {[{ dir: 'prev' as const, label: '←' }, { dir: 'next' as const, label: '→' }].map(({ dir, label }) => (
                    <button
                      key={dir}
                      onClick={() => scrollCarousel(dir)}
                      aria-label={dir === 'prev' ? 'Previous' : 'Next'}
                      style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--color-btn-secondary)', border: 'none', cursor: 'pointer', fontFamily: SANS, fontSize: 16, color: TEXT, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background var(--transition)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-btn-secondary-hover)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'var(--color-btn-secondary)')}
                    >{label}</button>
                  ))}
                </div>

                {/* Scrollable cards */}
                <div
                  ref={carouselRef}
                  style={{
                    display: 'flex',
                    gap: 16,
                    overflowX: 'auto',
                    scrollBehavior: 'smooth',
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                  } as React.CSSProperties}
                >
                  {externalAccom.map(a => (
                    <div key={a.id} style={{
                      minWidth: '85%',
                      background: 'var(--color-surface)',
                      padding: 24,
                      flexShrink: 0,
                      display: 'flex',
                      flexDirection: 'column' as const,
                      gap: 12,
                    }}>
                      <div>
                        <p style={{ fontFamily: SERIF, fontSize: 'var(--text-lg)', color: TEXT, margin: 0, marginBottom: 6, fontWeight: 400 }}>{a.name}</p>
                        {a.description && <p style={{ fontFamily: SANS, fontSize: 'var(--text-sm)', color: MUTED, margin: 0, lineHeight: 'var(--leading-normal)' }}>{a.description}</p>}
                      </div>
                      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' as const }}>
                        {a.price_range && <span style={{ fontFamily: SANS, fontSize: 'var(--text-sm)', color: MUTED }}>{a.price_range}</span>}
                        {a.distance_from_venue && <span style={{ fontFamily: SANS, fontSize: 'var(--text-sm)', color: MUTED }}>{a.distance_from_venue}</span>}
                      </div>
                      {a.url && (
                        <div style={{ marginTop: 'auto' }}>
                          <a href={a.url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ display: 'inline-flex' }}>
                            <WaveText text="Book now →" />
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Venue stay */}
            {guest?.venue_stay_invited && (
              <div>
                <p className="schedule-label">Where to stay</p>
                <h2 style={{ fontFamily: SERIF, fontSize: 'clamp(24px, 2.5vw, 36px)', color: TEXT, margin: 0, marginBottom: 40, fontWeight: 400, lineHeight: 1.2 }}>
                  Accommodation is on us!
                </h2>
                <p style={{ fontFamily: SANS, fontSize: 'var(--text-base)', color: MUTED, margin: 0, marginBottom: 32, lineHeight: 'var(--leading-normal)' }}>
                  We&rsquo;ve invited a special few guests to stay in the venue from Friday to Monday, and you&rsquo;re one of them. Let us know in the RSVP form what you think.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 20 }}>
                  {[
                    { label: '• Check-in',  detail: 'From 3pm on Friday 2 October' },
                    { label: '• Check-out', detail: 'By 11am on Monday 5 October' },
                    { label: '• Breakfast', detail: 'Included both mornings' },
                  ].map(item => (
                    <div key={item.label}>
                      <p style={{ fontFamily: SANS, fontSize: 'var(--text-base)', color: TEXT, margin: 0, marginBottom: 4, fontWeight: 500 }}>{item.label}</p>
                      <p style={{ fontFamily: SANS, fontSize: 'var(--text-sm)', color: MUTED, margin: 0, lineHeight: 'var(--leading-normal)' }}>{item.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </section>
      )}

      {/* ── Registry ── */}
      <section id="registry" style={{
        paddingBlock: 'var(--space-section)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
      }}>
        <div style={{
          background: 'var(--color-surface)',
          width: '100%',
          minHeight: '90vh',
          display: 'flex',
          flexDirection: 'column' as const,
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center' as const,
          padding: '48px 40px',
        }}>
          <div style={{ width: 160, height: 160, background: 'var(--color-btn-secondary)', margin: '0 auto 40px' }} />
          <p className="schedule-label" style={{ marginBottom: 16 }}>Gift Registry</p>
          <p style={{ fontFamily: SERIF, fontSize: 'clamp(22px, 2.5vw, 34px)', color: TEXT, margin: '0 auto', marginBottom: 16, lineHeight: 'var(--leading-normal)', maxWidth: 520, fontWeight: 400 }}>
            Sharing our wedding day with you is what matters most to us.
          </p>
          <p style={{ fontFamily: SANS, fontSize: 'var(--text-base)', color: MUTED, margin: '0 auto', marginBottom: 40, maxWidth: 420, lineHeight: 'var(--leading-normal)' }}>
            If you would like to give a gift, a contribution towards our honeymoon would be greatly appreciated.
          </p>
          <a href="#" className="btn btn-secondary">
            <WaveText text="View Honeymoon Fund →" />
          </a>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="schedule faq-section">
        <div className="schedule-inner" style={{ alignItems: 'start' }}>
          <div className="schedule-left" style={{ display: 'flex', flexDirection: 'column' as const, gap: 24 }}>
            <div>
              <p className="schedule-label">FAQ</p>
              <p className="schedule-intro" style={{ margin: 0 }}>Good to know.</p>
            </div>
            <div style={{ width: 250, height: 250, background: 'var(--color-surface)' }} />
            <div id="contact">
              <p style={{ fontFamily: SANS, fontSize: 'var(--text-sm)', color: MUTED, margin: 0, marginBottom: 8, lineHeight: 'var(--leading-normal)' }}>
                Any other questions?
              </p>
              <a href="mailto:hello@example.com" style={{ fontFamily: SANS, fontSize: 'var(--text-sm)', color: TEXT, textDecoration: 'underline', textUnderlineOffset: 3 }}>
                hello@example.com
              </a>
            </div>
          </div>

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
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'center',
        justifyContent: 'center',
        paddingBlock: 'var(--space-section)',
        boxSizing: 'border-box' as const,
      }}>
        {/* Box — centred in the vh */}
        <div style={{
          width: '100%',
          maxWidth: 500,
          background: 'var(--color-surface)',
          padding: '164px 40px',
          textAlign: 'center' as const,
          boxSizing: 'border-box' as const,
        }}>
          <div style={{ width: 160, height: 160, background: 'var(--color-btn-secondary)', margin: '0 auto 40px' }} />
          <p className="schedule-label" style={{ marginBottom: 24 }}>Kindly reply by 1 May 2026</p>
          <h2 style={{ fontFamily: SERIF, fontSize: 'clamp(28px, 4vw, 48px)', color: TEXT, margin: '0 auto', marginBottom: 16, lineHeight: 1.2, fontWeight: 400 }}>
            Please let us know if you&rsquo;ll be joining us.
          </h2>
          <p style={{ fontFamily: SANS, fontSize: 'var(--text-base)', color: MUTED, margin: '0 auto', marginBottom: 40, lineHeight: 'var(--leading-normal)' }}>
            La Garriga de Castelladral · Saturday 3 October 2026
          </p>
          <Link href={`/rsvp?guest=${token}`} className="btn btn-primary">
            <WaveText text="RSVP now →" />
          </Link>
        </div>

        {/* Back to top — pinned to bottom of section */}
        <div style={{ marginTop: 'auto', paddingTop: 48 }}>
          <a href="#" className="btn btn-secondary">
            <WaveText text="Back to top ↑" />
          </a>
        </div>
      </section>

    </div>
  )
}
