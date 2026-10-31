import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { ALBUM_COOKIE, isValidSession } from '@/lib/album/session'
import AlbumContent from './AlbumContent'

export const metadata: Metadata = {
  title: 'Album · Gian & Cat',
  robots: { index: false, follow: false },
}

export default async function AlbumPage() {
  const authed = isValidSession((await cookies()).get(ALBUM_COOKIE)?.value)
  return <AlbumContent locale="en" authed={authed} />
}
