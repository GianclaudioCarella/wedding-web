import { presignView } from './s3'

// Server-side only.

export interface GuestPhotoRow {
  id: string
  original_key: string
  display_key: string
  thumb_key: string
  content_type: string
  size_bytes: number
  width: number | null
  height: number | null
  original_filename: string | null
  uploader_name: string | null
  uploader_key_hash: string
  hidden: boolean
  created_at: string
}

export const PHOTO_COLUMNS =
  'id, original_key, display_key, thumb_key, content_type, size_bytes, width, height, original_filename, uploader_name, uploader_key_hash, hidden, created_at'

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Shape sent to the browser: signed URLs instead of keys, no uploader hash. */
export async function toAlbumPhoto(row: GuestPhotoRow, uploaderKeyHash: string | null) {
  const [thumbUrl, displayUrl, downloadUrl] = await Promise.all([
    presignView(row.thumb_key),
    presignView(row.display_key),
    presignView(row.original_key, row.original_filename ?? row.original_key.split('/').pop()),
  ])
  return {
    id: row.id,
    width: row.width,
    height: row.height,
    uploaderName: row.uploader_name,
    createdAt: row.created_at,
    hidden: row.hidden,
    mine: uploaderKeyHash !== null && uploaderKeyHash === row.uploader_key_hash,
    thumbUrl,
    displayUrl,
    downloadUrl,
  }
}

export type AlbumPhoto = Awaited<ReturnType<typeof toAlbumPhoto>>
