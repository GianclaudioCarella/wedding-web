'use client'

import { useEffect, useState } from 'react'

// ── Change this date to match the wedding ──
const WEDDING = new Date('2026-10-03T12:00:00')

const SANS  = 'var(--font-sans)'
const GREEN = 'var(--color-green)'
const MUTED = 'var(--color-muted)'

function getComponents(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000))
  return {
    days:  Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    mins:  Math.floor((s % 3600) / 60),
    secs:  s % 60,
  }
}

function pad(n: number) { return String(n).padStart(2, '0') }

export default function Countdown() {
  const [display, setDisplay] = useState({ days: 0, hours: 0, mins: 0, secs: 0 })
  const [revealed, setRevealed] = useState(false)

  // Count-up reveal on mount, then tick down
  useEffect(() => {
    const actual = getComponents(WEDDING.getTime() - Date.now())
    const STEPS = 80
    const DURATION = 1800
    let step = 0

    const up = setInterval(() => {
      step++
      const p = step / STEPS
      setDisplay({
        days:  Math.floor(actual.days  * p),
        hours: Math.floor(actual.hours * p),
        mins:  Math.floor(actual.mins  * p),
        secs:  Math.floor(actual.secs  * p),
      })
      if (step >= STEPS) { clearInterval(up); setRevealed(true) }
    }, DURATION / STEPS)

    return () => clearInterval(up)
  }, [])

  useEffect(() => {
    if (!revealed) return
    const tick = setInterval(() => {
      setDisplay(getComponents(WEDDING.getTime() - Date.now()))
    }, 1000)
    return () => clearInterval(tick)
  }, [revealed])

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 'clamp(12px, 3vw, 32px)' }}>
      {[
        { value: pad(display.days),  label: 'days' },
        { value: pad(display.hours), label: 'hrs' },
        { value: pad(display.mins),  label: 'min' },
        { value: pad(display.secs),  label: 'sec' },
      ].map((unit, i) => (
        <div key={unit.label} style={{ display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontFamily: SANS,
              fontSize: 'clamp(36px, 7vw, 80px)',
              fontWeight: 500,
              lineHeight: 1,
              color: GREEN,
              letterSpacing: '-0.02em',
            }}>
              {unit.value}
            </div>
            <div style={{
              fontFamily: SANS,
              fontSize: 10,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: MUTED,
              marginTop: 6,
            }}>
              {unit.label}
            </div>
          </div>
          {i < 3 && (
            <div style={{ width: 'clamp(12px, 2vw, 24px)' }} />
          )}
        </div>
      ))}
    </div>
  )
}
