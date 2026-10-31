import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { hasAlbumSession } from '@/lib/album/session'
import { ALLOWED_TYPES, MAX_DERIVED_BYTES, MAX_ORIGINAL_BYTES, photoKeys, presignUpload } from '@/lib/album/s3'

const MAX_FILES_PER_REQUEST = 20

/**
 * Hands out presigned POSTs so the browser uploads straight to S3
 * (bypassing Vercel's request body limit). Each photo gets three uploads:
 * the untouched original, a ~2048px JPEG for the viewer and a small JPEG thumbnail.
 * The photo only shows up after POST /api/album/photos registers it.
 */
export async function POST(request: NextRequest) {
  if (!hasAlbumSession(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const files: unknown = body?.files
  if (!Array.isArray(files) || files.length === 0 || files.length > MAX_FILES_PER_REQUEST) {
    return NextResponse.json({ error: 'Invalid files' }, { status: 400 })
  }

  for (const file of files) {
    if (!ALLOWED_TYPES[file?.contentType] || typeof file?.size !== 'number' || file.size <= 0) {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 })
    }
    if (file.size > MAX_ORIGINAL_BYTES) {
      return NextResponse.json({ error: 'File too large' }, { status: 413 })
    }
  }

  const uploads = await Promise.all(files.map(async (file: { contentType: string }) => {
    const id = randomUUID()
    const keys = photoKeys(id, file.contentType)
    const [original, display, thumb] = await Promise.all([
      presignUpload(keys.original, file.contentType, MAX_ORIGINAL_BYTES),
      presignUpload(keys.display, 'image/jpeg', MAX_DERIVED_BYTES),
      presignUpload(keys.thumb, 'image/jpeg', MAX_DERIVED_BYTES),
    ])
    return { id, original, display, thumb }
  }))

  return NextResponse.json({ uploads })
}
