import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { hasAlbumSession, hashUploaderKey } from '@/lib/album/session'
import { deleteObjects } from '@/lib/album/s3'
import { UUID_RE } from '@/lib/album/photos'

/** Guests can delete only the photos they uploaded from this browser. */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!hasAlbumSession(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const uploaderKeyHash = hashUploaderKey(request.headers.get('X-Album-Uploader'))
  if (!UUID_RE.test(id) || !uploaderKeyHash) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('guest_photos')
    .delete()
    .eq('id', id)
    .eq('uploader_key_hash', uploaderKeyHash)
    .select('original_key, display_key, thumb_key, playback_key')
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: 'Failed to delete photo' }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await deleteObjects([data.original_key, data.display_key, data.thumb_key, data.playback_key].filter(k => k !== null))
  return NextResponse.json({ ok: true })
}
