'use client'

import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import FAB from '@/components/invite/FAB'
import { WaveText } from '@/components/WaveText'
import Countdown from '@/components/invite/Countdown'
import { getTranslation } from '@/lib/translations'

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

export default function InviteContent({ locale = 'en' }: { locale?: string }) {
  const t = getTranslation(locale)
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
      <p style={{ color: MUTED, fontFamily: SANS, fontSize: 14 }}>{t.loading}</p>
    </div>
  )

  if (notFound) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontFamily: SERIF, fontSize: 28, color: TEXT, marginBottom: 8 }}>{t.invitationNotFound}</h1>
        <p style={{ fontFamily: SANS, color: MUTED, fontSize: 15 }}>{t.checkLink}</p>
      </div>
    </div>
  )

  const hasStay = guest?.venue_stay_invited || externalAccom.length > 0

  const navLinks = [
    { label: t.navAbout, href: '#about' },
    { label: t.navLocation, href: '#venue' },
    { label: t.navSchedule, href: '#events' },
    ...(hasStay ? [{ label: t.navStay, href: '#stay' }] : []),
    ...(registry.length > 0 ? [{ label: t.navRegistry, href: '#registry' }] : []),
    { label: t.navFaq, href: '#faq' },
    { label: t.navRsvp, href: '#rsvp' },
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
              {t.weddingDate}
            </p>
            <a href="#rsvp" className="btn btn-primary">
              <WaveText text={t.rsvpNow} />
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
        <p className="schedule-label" style={{ marginBottom: 24 }}>{t.aboutLabel}</p>
        <p style={{ fontFamily: SERIF, fontSize: 'clamp(20px, 2.2vw, 28px)', color: TEXT, lineHeight: 'var(--leading-normal)', margin: 0, fontWeight: 400 }}>
          {t.aboutText}
        </p>
      </section>

      {/* ── Venue ── */}
      <section id="venue" className="venue-section" style={{ paddingBlock: 'var(--space-section)', gap: 24, minHeight: '100vh' }}>
        <div style={{ display: 'flex', flexDirection: 'column' as const, paddingTop: 8 }}>
          <p className="schedule-label">{t.locationLabel}</p>
          <h2 style={{ fontFamily: SERIF, fontSize: 'clamp(28px, 3vw, 42px)', color: TEXT, margin: 0, marginBottom: 48, lineHeight: 1.2, fontWeight: 400 }}>
            {t.venueName}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 28, marginTop: 'auto' }}>
            <div>
              <p style={{ fontFamily: SANS, fontSize: 'var(--text-base)', color: TEXT, margin: 0, marginBottom: 6, fontWeight: 500 }}>{t.venueAddressLabel}</p>
              <p style={{ fontFamily: SANS, fontSize: 'var(--text-sm)', color: MUTED, margin: 0, lineHeight: 'var(--leading-normal)' }}>
                {t.venueAddress}<br />{t.venueCity}
              </p>
              <a href="#" style={{ fontFamily: SANS, fontSize: 'var(--text-sm)', color: TEXT, display: 'inline-block', marginTop: 4, textDecoration: 'underline', textUnderlineOffset: 3 }}>
                {t.venueMapsLink}
              </a>
            </div>
            <div>
              <p style={{ fontFamily: SANS, fontSize: 'var(--text-base)', color: TEXT, margin: 0, marginBottom: 6, fontWeight: 500 }}>{t.venueCarLabel}</p>
              <p style={{ fontFamily: SANS, fontSize: 'var(--text-sm)', color: MUTED, margin: 0, lineHeight: 'var(--leading-normal)' }}>{t.venueCarText}</p>
            </div>
            <div>
              <p style={{ fontFamily: SANS, fontSize: 'var(--text-base)', color: TEXT, margin: 0, marginBottom: 6, fontWeight: 500 }}>{t.venueBusLabel}</p>
              <p style={{ fontFamily: SANS, fontSize: 'var(--text-sm)', color: MUTED, margin: 0, lineHeight: 'var(--leading-normal)' }}>
                {t.venueBusText}
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
            <p className="schedule-label">{t.scheduleLabel}</p>
            <p className="schedule-intro">
              {t.scheduleIntro}
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
              <p style={{ fontFamily: SANS, fontSize: 14, color: MUTED }}>{t.eventComingSoon}</p>
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
                  <p className="schedule-label">{t.stayLabel}</p>
                  <h2 style={{ fontFamily: SERIF, fontSize: 'clamp(24px, 2.5vw, 36px)', color: TEXT, margin: 0, fontWeight: 400, lineHeight: 1.2 }}>
                    {t.hotelsTitle}
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
                            <WaveText text={t.bookNow} />
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
                <p className="schedule-label">{t.stayLabel}</p>
                <h2 style={{ fontFamily: SERIF, fontSize: 'clamp(24px, 2.5vw, 36px)', color: TEXT, margin: 0, marginBottom: 40, fontWeight: 400, lineHeight: 1.2 }}>
                  {t.venueStayTitle}
                </h2>
                <p style={{ fontFamily: SANS, fontSize: 'var(--text-base)', color: MUTED, margin: 0, marginBottom: 32, lineHeight: 'var(--leading-normal)' }}>
                  {t.venueStayText}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 20 }}>
                  {[
                    { label: t.checkIn,  detail: t.checkInDetail },
                    { label: t.checkOut, detail: t.checkOutDetail },
                    { label: t.breakfast, detail: t.breakfastDetail },
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
      {registry.length > 0 && (
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
            <p className="schedule-label" style={{ marginBottom: 16 }}>{t.registryLabel}</p>
            <p style={{ fontFamily: SERIF, fontSize: 'clamp(22px, 2.5vw, 34px)', color: TEXT, margin: '0 auto', marginBottom: 16, lineHeight: 'var(--leading-normal)', maxWidth: 520, fontWeight: 400 }}>
              {t.registryTitle}
            </p>
            <p style={{ fontFamily: SANS, fontSize: 'var(--text-base)', color: MUTED, margin: '0 auto', marginBottom: 40, maxWidth: 420, lineHeight: 'var(--leading-normal)' }}>
              {t.registryText}
            </p>
            <a href="#" className="btn btn-secondary">
              <WaveText text={t.honeymoonFund} />
            </a>
          </div>
        </section>
      )}

      {/* ── FAQ ── */}
      <section id="faq" className="schedule faq-section">
        <div className="schedule-inner" style={{ alignItems: 'start' }}>
          <div className="schedule-left" style={{ display: 'flex', flexDirection: 'column' as const, gap: 24 }}>
            <div>
              <p className="schedule-label">{t.faqLabel}</p>
              <p className="schedule-intro" style={{ margin: 0 }}>{t.faqIntro}</p>
            </div>
            <div style={{ width: 250, height: 250, background: 'var(--color-surface)' }} />
            <div id="contact">
              <p style={{ fontFamily: SANS, fontSize: 'var(--text-sm)', color: MUTED, margin: 0, marginBottom: 8, lineHeight: 'var(--leading-normal)' }}>
                {t.anyOtherQuestions}
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
              <p style={{ fontFamily: SANS, fontSize: 'var(--text-sm)', color: MUTED }}>{t.faqComingSoon}</p>
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
          <p className="schedule-label" style={{ marginBottom: 24 }}>{t.rsvpDeadline}</p>
          <h2 style={{ fontFamily: SERIF, fontSize: 'clamp(28px, 4vw, 48px)', color: TEXT, margin: '0 auto', marginBottom: 16, lineHeight: 1.2, fontWeight: 400 }}>
            {t.rsvpQuestion}
          </h2>
          <p style={{ fontFamily: SANS, fontSize: 'var(--text-base)', color: MUTED, margin: '0 auto', marginBottom: 40, lineHeight: 'var(--leading-normal)' }}>
            {t.rsvpVenue}
          </p>
          <Link href={`/${locale === 'en' ? '' : locale}/rsvp?guest=${token}`} className="btn btn-primary">
            <WaveText text={t.rsvpButton} />
          </Link>
        </div>

        {/* Back to top — pinned to bottom of section */}
        <div style={{ marginTop: 'auto', paddingTop: 48 }}>
          <a href="#" className="btn btn-secondary">
            <WaveText text={t.backToTop} />
          </a>
        </div>
      </section>

    </div>
  )
}
