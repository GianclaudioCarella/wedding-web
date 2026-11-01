// Browser-side helpers for the photo album: resizing, uploader identity and S3 uploads.

const UPLOADER_KEY_STORAGE = 'album_uploader_key'
const UPLOADER_NAME_STORAGE = 'album_uploader_name'

export const MAX_FILE_BYTES = { image: 40 * 1024 * 1024, video: 1024 * 1024 * 1024 }

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

function toJpeg(source: CanvasImageSource, width: number, height: number, maxSide: number, quality: number) {
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
  durationSeconds?: number
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

/** Waits for a media event, failing on error or after `ms`. */
function waitFor(el: HTMLMediaElement, event: string, ms: number) {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => done(new Error('timeout')), ms)
    const onError = () => done(new Error('media error'))
    const onEvent = () => done()
    function done(error?: Error) {
      clearTimeout(timer)
      el.removeEventListener(event, onEvent)
      el.removeEventListener('error', onError)
      if (error) reject(error)
      else resolve()
    }
    el.addEventListener(event, onEvent)
    el.addEventListener('error', onError)
  })
}

/** Neutral poster for videos this browser can't decode (e.g. HEVC on Chrome/Windows). */
function fallbackPoster(): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = 640
  canvas.height = 640
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#262626'
  ctx.fillRect(0, 0, 640, 640)
  ctx.fillStyle = '#FFB3F0'
  ctx.beginPath()
  ctx.moveTo(270, 240)
  ctx.lineTo(270, 400)
  ctx.lineTo(400, 320)
  ctx.closePath()
  ctx.fill()
  return new Promise((resolve, reject) =>
    canvas.toBlob(blob => (blob ? resolve(blob) : reject(new UnsupportedImageError())), 'image/jpeg', 0.8))
}

/** Captures a poster frame (~1s in) to use as the video's viewer poster and grid thumbnail. */
export async function prepareVideo(file: File): Promise<PreparedImage> {
  // Browsers often refuse video/quicktime even when the .mov holds plain H.264 — present it as MP4.
  const url = URL.createObjectURL(file.type === 'video/quicktime' ? new Blob([file], { type: 'video/mp4' }) : file)
  const video = document.createElement('video')
  video.muted = true
  video.playsInline = true
  video.preload = 'auto'
  video.src = url
  try {
    await waitFor(video, 'loadedmetadata', 15000)
    const durationSeconds = Number.isFinite(video.duration) ? video.duration : undefined
    try {
      video.currentTime = Math.min(1, (video.duration || 0) / 2)
      await waitFor(video, 'seeked', 15000)
      const { videoWidth: width, videoHeight: height } = video
      if (!width || !height) throw new Error('no frame')
      const display = await toJpeg(video, width, height, 1280, 0.85)
      const thumb = await toJpeg(video, width, height, 640, 0.8)
      return { width, height, display, thumb, durationSeconds }
    } catch {
      const poster = await fallbackPoster()
      return { width: video.videoWidth, height: video.videoHeight, display: poster, thumb: poster, durationSeconds }
    }
  } catch {
    // Can't even read the metadata: still accept the upload with a generic poster.
    const poster = await fallbackPoster()
    return { width: 0, height: 0, display: poster, thumb: poster }
  } finally {
    video.removeAttribute('src')
    video.load()
    URL.revokeObjectURL(url)
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
