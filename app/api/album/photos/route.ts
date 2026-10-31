import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { hasAlbumSession, hashUploaderKey } from '@/lib/album/session'
import { ALLOWED_TYPES, MAX_ORIGINAL_BYTES, objectSize, photoKeys } from '@/lib/album/s3'
import { PHOTO_COLUMNS, toAlbumPhoto, UUID_RE, type GuestPhotoRow } from '@/lib/album/photos'

/** Lists visible photos, newest first. `mine` is set using the X-Album-Uploader header. */
export async function GET(request: NextRequest) {
  if (!hasAlbumSession(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabaseAdmin
    .from('guest_photos')
    .select(PHOTO_COLUMNS)
    .eq('hidden', false)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: 'Failed to load photos' }, { status: 500 })
  }

  const uploaderKeyHash = hashUploaderKey(request.headers.get('X-Album-Uploader'))
  const photos = await Promise.all((data as GuestPhotoRow[]).map(row => toAlbumPhoto(row, uploaderKeyHash)))
  return NextResponse.json({ photos })
}

/** Registers a photo once its three files are in S3. */
export async function POST(request: NextRequest) {
  if (!hasAlbumSession(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const id = body?.id
  const contentType = body?.contentType
  const uploaderKeyHash = hashUploaderKey(body?.uploaderKey)

  if (typeof id !== 'string' || !UUID_RE.test(id) || !ALLOWED_TYPES[contentType] || !uploaderKeyHash) {
    return NextResponse.json({ error: 'Invalid photo' }, { status: 400 })
  }

  const keys = photoKeys(id, contentType)
  const [originalSize, displaySize, thumbSize] = await Promise.all([
    objectSize(keys.original),
    objectSize(keys.display),
    objectSize(keys.thumb),
  ])
  if (!originalSize || !displaySize || !thumbSize || originalSize > MAX_ORIGINAL_BYTES) {
    return NextResponse.json({ error: 'Upload incomplete' }, { status: 400 })
  }

  const dimension = (value: unknown) =>
    Number.isInteger(value) && (value as number) > 0 && (value as number) < 100_000 ? (value as number) : null
  const text = (value: unknown, max: number) =>
    typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null

  const { data, error } = await supabaseAdmin
    .from('guest_photos')
    .insert({
      id,
      original_key: keys.original,
      display_key: keys.display,
      thumb_key: keys.thumb,
      content_type: contentType,
      size_bytes: originalSize,
      width: dimension(body.width),
      height: dimension(body.height),
      original_filename: text(body.filename, 200),
      uploader_name: text(body.uploaderName, 80),
      uploader_key_hash: uploaderKeyHash,
    })
    .select(PHOTO_COLUMNS)
    .single()

  if (error || !data) {
    const duplicate = error?.code === '23505'
    return NextResponse.json(
      { error: duplicate ? 'Already registered' : 'Failed to save photo' },
      { status: duplicate ? 409 : 500 },
    )
  }

  return NextResponse.json({ photo: await toAlbumPhoto(data as GuestPhotoRow, uploaderKeyHash) })
}
