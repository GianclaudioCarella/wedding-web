'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getTranslation } from '@/lib/i18n/translations';

const TEXT  = 'var(--color-text)'
const MUTED = 'var(--color-muted)'
const SERIF = 'var(--font-serif)'
const SANS  = 'var(--font-sans)'

const inputStyle = {
  display: 'block', width: '100%', fontFamily: SANS, fontSize: 'var(--text-base)',
  color: TEXT, background: 'transparent', border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-card)', padding: '12px 16px', outline: 'none',
  boxSizing: 'border-box' as const, marginTop: 8,
}

const labelStyle = { fontFamily: SANS, fontSize: 'var(--text-sm)', color: TEXT, display: 'block' }

function YesNo({ value, onChange, yes, no }: { value: boolean | null; onChange: (v: boolean) => void; yes: string; no: string }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
      {([true, false] as const).map(v => (
        <button
          key={String(v)} type="button" onClick={() => onChange(v)}
          style={{
            flex: 1, fontFamily: SANS, fontSize: 'var(--text-sm)', padding: '10px 16px',
            borderRadius: 'var(--radius-pill)', border: 'none', cursor: 'pointer',
            transition: 'background var(--transition), color var(--transition)',
            background: value === v ? TEXT : 'var(--color-surface)',
            color: value === v ? '#fff' : TEXT,
          }}
        >{v ? yes : no}</button>
      ))}
    </div>
  )
}

export default function TransportContent({ locale }: { locale: 'en' | 'pt' | 'es' }) {
  const searchParams = useSearchParams()
  const token = searchParams.get('guest')
  const t = getTranslation(locale)

  const [loading, setLoading]       = useState(true)
  const [notFound, setNotFound]     = useState(false)
  const [submitted, setSubmitted]   = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError]           = useState('')

  const [guestName, setGuestName]           = useState('')
  const [venueStayInvited, setVenueStayInvited] = useState(false)
  const [hasBrunch, setHasBrunch]           = useState(false)

  const [transportNeeded, setTransportNeeded] = useState<boolean | null>(null)
  const [transportFrom, setTransportFrom]     = useState('')
  const [transportBrunch, setTransportBrunch] = useState<boolean | null>(null)

  useEffect(() => {
    if (!token) { setNotFound(true); setLoading(false); return }
    fetch(`/api/transport?token=${token}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) { setNotFound(true); return }
        setGuestName(data.name)
        setVenueStayInvited(data.venue_stay_invited)
        setHasBrunch(data.has_brunch)
        if (data.transport_needed !== null) setTransportNeeded(data.transport_needed)
        if (data.transport_from) setTransportFrom(data.transport_from)
        if (data.transport_brunch !== null) setTransportBrunch(data.transport_brunch)
      })
      .finally(() => setLoading(false))
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return
    setIsSubmitting(true)
    setError('')

    const res = await fetch('/api/transport', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        transport_needed: venueStayInvited ? null : transportNeeded,
        transport_from: transportNeeded ? transportFrom : null,
        transport_brunch: hasBrunch && !venueStayInvited ? transportBrunch : null,
      }),
    })

    if (res.ok) {
      setSubmitted(true)
    } else {
      setError(t.transportError)
      setIsSubmitting(false)
    }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontFamily: SANS, fontSize: 'var(--text-sm)', color: MUTED }}>{t.loading}</p>
    </div>
  )

  if (notFound) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontFamily: SERIF, fontSize: 24, color: TEXT, marginBottom: 8, fontWeight: 400 }}>{t.invitationNotFound}</h1>
        <p style={{ fontFamily: SANS, fontSize: 'var(--text-base)', color: MUTED }}>{t.checkLink}</p>
      </div>
    </div>
  )

  if (submitted) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontFamily: SERIF, fontSize: 28, color: TEXT, marginBottom: 12, fontWeight: 400 }}>{t.transportDone}</h1>
        <Link
          href={token ? `/invite?guest=${token}` : '/invite'}
          style={{ fontFamily: SANS, fontSize: 'var(--text-sm)', color: MUTED, textDecoration: 'underline', textUnderlineOffset: 3 }}
        >
          {t.backToTop}
        </Link>
      </div>
    </div>
  )

  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingBlock: 'var(--space-section)' }}>
      <div style={{ width: '100%', maxWidth: 480 }}>

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
          ← {t.backToTop.replace(' ↑', '')}
        </Link>

        <div style={{ marginBottom: 40 }}>
          <p style={{ fontFamily: SANS, fontSize: 'var(--text-xs)', letterSpacing: 'var(--tracking-widest)', textTransform: 'uppercase', color: 'var(--color-label)', margin: 0, marginBottom: 12 }}>
            {t.transportLabel}
          </p>
          <h1 style={{ fontFamily: SERIF, fontSize: 'clamp(20px, 2.5vw, 26px)', color: TEXT, margin: 0, fontWeight: 400, lineHeight: 1.3 }}>
            {guestName},
          </h1>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>

          {/* Transport to wedding — skip for venue stay guests */}
          {!venueStayInvited && (
            <div>
              <label style={labelStyle}>{t.transportNeeded}</label>
              <YesNo value={transportNeeded} onChange={setTransportNeeded} yes={t.transportYes} no={t.transportNo} />
            </div>
          )}

          {/* From where — conditional */}
          {!venueStayInvited && transportNeeded === true && (
            <div>
              <label style={labelStyle}>{t.transportFrom}</label>
              <input
                type="text" value={transportFrom}
                onChange={e => setTransportFrom(e.target.value)}
                placeholder={t.transportFromPlaceholder}
                style={inputStyle}
              />
            </div>
          )}

          {/* Brunch transport — only for brunch invitees who aren't staying */}
          {hasBrunch && !venueStayInvited && (
            <div>
              <label style={labelStyle}>{t.transportBrunch}</label>
              <YesNo value={transportBrunch} onChange={setTransportBrunch} yes={t.transportYes} no={t.transportNo} />
            </div>
          )}

          {error && <p style={{ fontFamily: SANS, fontSize: 'var(--text-sm)', color: '#cc0000', margin: 0 }}>{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting || (!venueStayInvited && transportNeeded === null) || (hasBrunch && !venueStayInvited && transportBrunch === null)}
            style={{
              fontFamily: SANS, fontSize: 'var(--text-sm)', letterSpacing: 'var(--tracking-wide)',
              textTransform: 'uppercase' as const, fontWeight: 500,
              color: isSubmitting ? '#aaaaaa' : '#ffffff',
              background: isSubmitting ? 'var(--color-surface)' : TEXT,
              border: 'none', padding: '14px 36px', borderRadius: 'var(--radius-pill)',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              alignSelf: 'flex-start',
            }}
          >
            {isSubmitting ? t.transportSubmitting : t.transportSubmit}
          </button>

        </form>
      </div>
    </main>
  )
}
