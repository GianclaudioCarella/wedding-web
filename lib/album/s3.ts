import { DeleteObjectsCommand, GetObjectCommand, HeadObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { createPresignedPost, type PresignedPost } from '@aws-sdk/s3-presigned-post'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

// Server-side only — never import this in client components.
// Env names use an S3_ prefix because Vercel reserves AWS_*.

const bucket = () => process.env.S3_BUCKET!

let client: S3Client | null = null
function s3() {
  client ??= new S3Client({
    region: process.env.S3_REGION,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID!,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
    },
  })
  return client
}

// Long enough for a large video over a slow mobile connection.
const UPLOAD_EXPIRES_SECONDS = 60 * 60
export const VIEW_EXPIRES_SECONDS = 2 * 60 * 60

export const MAX_DERIVED_BYTES = 8 * 1024 * 1024

export type MediaType = 'image' | 'video'

export const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'image/gif': 'gif',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/webm': 'webm',
  'video/x-m4v': 'm4v',
}

export const mediaTypeOf = (contentType: string): MediaType =>
  contentType.startsWith('video/') ? 'video' : 'image'

export const MAX_ORIGINAL_BYTES: Record<MediaType, number> = {
  image: 40 * 1024 * 1024,
  video: 1024 * 1024 * 1024,
}

export function photoKeys(id: string, contentType: string) {
  return {
    original: `photos/${id}/original.${ALLOWED_TYPES[contentType] ?? 'bin'}`,
    display: `photos/${id}/display.jpg`,
    thumb: `photos/${id}/thumb.jpg`,
  }
}

/** Presigned POST that only accepts an exact key, content type and size range. */
export function presignUpload(key: string, contentType: string, maxBytes: number): Promise<PresignedPost> {
  return createPresignedPost(s3(), {
    Bucket: bucket(),
    Key: key,
    Conditions: [
      ['content-length-range', 1, maxBytes],
      ['eq', '$Content-Type', contentType],
    ],
    Fields: { 'Content-Type': contentType },
    Expires: UPLOAD_EXPIRES_SECONDS,
  })
}

/** Signed GET URL. With `downloadName` the browser downloads the file instead of showing it. */
export function presignView(key: string, downloadName?: string) {
  return getSignedUrl(
    s3(),
    new GetObjectCommand({
      Bucket: bucket(),
      Key: key,
      ResponseContentDisposition: downloadName
        ? `attachment; filename="${downloadName.replace(/[^\w.\- ]/g, '_')}"`
        : undefined,
    }),
    { expiresIn: VIEW_EXPIRES_SECONDS },
  )
}

/** Returns the object size, or null if it doesn't exist. */
export async function objectSize(key: string): Promise<number | null> {
  try {
    const head = await s3().send(new HeadObjectCommand({ Bucket: bucket(), Key: key }))
    return head.ContentLength ?? null
  } catch {
    return null
  }
}

export async function deleteObjects(keys: string[]) {
  if (keys.length === 0) return
  await s3().send(new DeleteObjectsCommand({
    Bucket: bucket(),
    Delete: { Objects: keys.map(Key => ({ Key })), Quiet: true },
  }))
}
