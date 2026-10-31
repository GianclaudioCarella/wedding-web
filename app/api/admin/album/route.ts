import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { PHOTO_COLUMNS, toAlbumPhoto, type GuestPhotoRow } from '@/lib/album/photos'

/** All photos, including hidden ones. */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.ok) return auth.response

  const { data, error } = await auth.supabase
    .from('guest_photos')
    .select(PHOTO_COLUMNS)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: 'Failed to load photos' }, { status: 500 })
  }

  const photos = await Promise.all((data as GuestPhotoRow[]).map(row => toAlbumPhoto(row, null)))
  return NextResponse.json({ photos })
}
