import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { ALBUM_COOKIE, isValidSession } from '@/lib/album/session'
import AlbumContent from '@/app/album/AlbumContent'

export const metadata: Metadata = {
  title: 'Álbum · Gian & Cat',
  robots: { index: false, follow: false },
}

export default async function AlbumPagePT() {
  const authed = isValidSession((await cookies()).get(ALBUM_COOKIE)?.value)
  return <AlbumContent locale="pt" authed={authed} />
}
