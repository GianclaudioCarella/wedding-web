'use client'

import { useState } from 'react'
import { WaveText } from '@/components/WaveText'
import { getTranslation } from '@/lib/translations'
import LocaleSwitch from './LocaleSwitch'

export default function PasswordGate({ locale, onUnlock }: { locale: string; onUnlock: () => void }) {
  const t = getTranslation(locale).album
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password.trim() || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/album/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (res.ok) return onUnlock()
      setError(res.status === 401 ? t.wrongPassword : t.somethingWrong)
    } catch {
      setError(t.somethingWrong)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="album-gate">
      <LocaleSwitch locale={locale} />
      <form onSubmit={submit} className="album-gate-form">
        <p className="album-eyebrow">Gian &amp; Cat</p>
        <h1 className="album-title">{t.title}</h1>
        <p className="album-intro">{t.intro}</p>

        <label className="album-field">
          <span className="schedule-label" style={{ margin: 0 }}>{t.passwordLabel}</span>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete="current-password"
            autoCapitalize="none"
            autoFocus
            className="album-input"
            aria-invalid={!!error}
          />
          <span className="album-hint">{error ?? t.passwordHint}</span>
        </label>

        <button type="submit" className="btn btn-primary" disabled={!password.trim() || submitting}>
          <WaveText text={t.enter} />
        </button>
      </form>
    </main>
  )
}
