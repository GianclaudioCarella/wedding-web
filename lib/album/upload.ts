// Browser-side helpers for the photo album: resizing, uploader identity and S3 uploads.

const UPLOADER_KEY_STORAGE = 'album_uploader_key'
const UPLOADER_NAME_STORAGE = 'album_uploader_name'

export const MAX_FILE_BYTES = 40 * 1024 * 1024

/** Random key identifying this browser as the uploader (lets guests delete their own photos). */
export function getUploaderKey(): string {
  let key = localStorage.getItem(UPLOADER_KEY_STORAGE)
  if (!key) {
    const bytes = crypto.getRandomValues(new Uint8Array(24))
    key = btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    localStorage.setItem(UPLOADER_KEY_STORAGE, key)
  }
  return key
}

export const getUploaderName = () => localStorage.getItem(UPLOADER_NAME_STORAGE) ?? ''
export const setUploaderName = (name: string) => localStorage.setItem(UPLOADER_NAME_STORAGE, name)

export class UnsupportedImageError extends Error {}

/** Decodes an image, honouring EXIF orientation. Falls back to <img> for formats only it can decode. */
async function decode(file: File): Promise<ImageBitmap | HTMLImageElement> {
  try {
    return await createImageBitmap(file)
  } catch {
    const url = URL.createObjectURL(file)
    try {
      const img = new Image()
      img.src = url
      await img.decode()
      return img
    } catch {
      throw new UnsupportedImageError()
    } finally {
      URL.revokeObjectURL(url)
    }
  }
}

function toJpeg(source: ImageBitmap | HTMLImageElement, width: number, height: number, maxSide: number, quality: number) {
  const scale = Math.min(1, maxSide / Math.max(width, height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(width * scale)
  canvas.height = Math.round(height * scale)
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#fff' // transparent PNGs would otherwise turn black
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height)
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(blob => (blob ? resolve(blob) : reject(new UnsupportedImageError())), 'image/jpeg', quality))
}

export interface PreparedImage {
  width: number
  height: number
  display: Blob
  thumb: Blob
}

/** Builds the ~2048px viewer image and the grid thumbnail. */
export async function prepareImage(file: File): Promise<PreparedImage> {
  const source = await decode(file)
  const width = source instanceof ImageBitmap ? source.width : source.naturalWidth
  const height = source instanceof ImageBitmap ? source.height : source.naturalHeight
  if (!width || !height) throw new UnsupportedImageError()
  try {
    const display = await toJpeg(source, width, height, 2048, 0.85)
    const thumb = await toJpeg(source, width, height, 640, 0.8)
    return { width, height, display, thumb }
  } finally {
    if (source instanceof ImageBitmap) source.close()
  }
}

export interface PresignedPost {
  url: string
  fields: Record<string, string>
}

/** Uploads to S3 via presigned POST, reporting progress in bytes. */
export function postToS3(post: PresignedPost, body: Blob, onProgress: (loaded: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const form = new FormData()
    Object.entries(post.fields).forEach(([k, v]) => form.append(k, v))
    form.append('file', body) // must be the last field

    const xhr = new XMLHttpRequest()
    xhr.open('POST', post.url)
    xhr.upload.onprogress = e => onProgress(e.loaded)
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`S3 upload failed (${xhr.status})`)))
    xhr.onerror = () => reject(new Error('S3 upload failed'))
    xhr.send(form)
  })
}

/** Runs `worker` over `items` with at most `limit` in flight. */
export async function runPool<T>(items: T[], limit: number, worker: (item: T) => Promise<void>) {
  let next = 0
  const lanes = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) await worker(items[next++])
  })
  await Promise.all(lanes)
}
