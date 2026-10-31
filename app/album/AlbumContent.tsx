'use client'

import { useCallback, useState } from 'react'
import PasswordGate from '@/components/album/PasswordGate'
import AlbumView from '@/components/album/AlbumView'

export default function AlbumContent({ locale, authed }: { locale: string; authed: boolean }) {
  const [unlocked, setUnlocked] = useState(authed)
  const lock = useCallback(() => setUnlocked(false), [])

  return unlocked
    ? <AlbumView locale={locale} onSessionExpired={lock} />
    : <PasswordGate locale={locale} onUnlock={() => setUnlocked(true)} />
}
