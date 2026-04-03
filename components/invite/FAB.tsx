'use client'

import { useState } from 'react'
import { WaveText } from '@/components/WaveText'

interface NavLink {
  label: string
  href: string
}

interface FABProps {
  links: NavLink[]
}

export default function FAB({ links }: FABProps) {
  const [open, setOpen] = useState(false)

  return (
    <div style={{ position: 'fixed', top: 'var(--space-page)', right: 'var(--space-page)', zIndex: 100 }}>

      {/* Dropdown — each item its own pill */}
      {open && (
        <div style={{
          position: 'absolute', top: 44, right: 0,
          paddingTop: 8,
          display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8,
        }}>
          {links.map(l => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className={l.href === '#rsvp' ? 'btn btn-primary' : 'btn btn-secondary'}
            >
              <WaveText text={l.label} />
            </a>
          ))}
        </div>
      )}

      {/* FAB button */}
      <button
        onClick={() => setOpen(o => !o)}
        className={open ? 'fab-btn fab-btn--open' : 'fab-btn'}
        aria-label={open ? 'Close menu' : 'Open menu'}
      >
        {/* Using currentColor so it inherits from the button's CSS color */}
        <svg width="18" height="12" viewBox="0 0 18 12" fill="none" aria-hidden="true">
          <line x1="0" y1="1"  x2="18" y2="1"  stroke="currentColor" strokeWidth="1.5"/>
          <line x1="0" y1="6"  x2="18" y2="6"  stroke="currentColor" strokeWidth="1.5"/>
          <line x1="0" y1="11" x2="18" y2="11" stroke="currentColor" strokeWidth="1.5"/>
        </svg>
      </button>

    </div>
  )
}
