'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { WaveText } from '@/components/WaveText'
import type { AlbumPhoto } from '@/lib/album/photos'
import {
  getUploaderKey, getUploaderName, MAX_FILE_BYTES, postToS3, prepareImage, runPool,
  setUploaderName, UnsupportedImageError,
} from '@/lib/album/upload'
import { getTranslation } from '@/lib/translations'
import Lightbox from './Lightbox'
import LocaleSwitch from './LocaleSwitch'

// Signed URLs last 2h; refresh the list well before they expire.
const REFRESH_AFTER_MS = 90 * 60 * 1000
const UPLOAD_CONCURRENCY = 3

const TYPE_BY_EXTENSION: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
  heic: 'image/heic', heif: 'image/heif', gif: 'image/gif',
}

class SessionExpiredError extends Error {}
class TooLargeError extends Error {}

interface PendingUpload {
  key: string
  previewUrl: string | null
  loaded: number
  total: number
}

export default function AlbumView({ locale, onSessionExpired }: { locale: string; onSessionExpired: () => void }) {
  const t = getTranslation(locale).album
  const [photos, setPhotos] = useState<AlbumPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState<PendingUpload[]>([])
  const [batch, setBatch] = useState({ done: 0, total: 0 })
  const [toast, setToast] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const loadedAt = useRef(0)

  const loadPhotos = useCallback(async () => {
    try {
      const res = await fetch('/api/album/photos', { headers: { 'X-Album-Uploader': getUploaderKey() } })
      if (res.status === 401) return onSessionExpired()
      if (!res.ok) throw new Error()
      const data = await res.json()
      setPhotos(data.photos)
      loadedAt.current = Date.now()
    } catch {
      setToast(t.somethingWrong)
    } finally {
      setLoading(false)
    }
  }, [onSessionExpired, t.somethingWrong])

  useEffect(() => {
    setName(getUploaderName())
    loadPhotos()
  }, [loadPhotos])

  // Coming back to a tab left open for hours: fetch fresh signed URLs.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && Date.now() - loadedAt.current > REFRESH_AFTER_MS) loadPhotos()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [loadPhotos])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 6000)
    return () => clearTimeout(timer)
  }, [toast])

  const updatePending = (key: string, patch: Partial<PendingUpload>) =>
    setPending(prev => prev.map(p => (p.key === key ? { ...p, ...patch } : p)))

  const uploadOne = async (file: File, key: string) => {
    // Some browsers leave file.type empty for HEIC, so fall back to the extension.
    const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
    const contentType = Object.values(TYPE_BY_EXTENSION).includes(file.type) ? file.type : TYPE_BY_EXTENSION[extension]
    if (!contentType) throw new UnsupportedImageError()
    if (file.size > MAX_FILE_BYTES) throw new TooLargeError()

    const image = await prepareImage(file)
    const total = file.size + image.display.size + image.thumb.size
    updatePending(key, { previewUrl: URL.createObjectURL(image.thumb), total })

    const presign = await fetch('/api/album/uploads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ files: [{ contentType, size: file.size }] }),
    })
    if (presign.status === 401) throw new SessionExpiredError()
    if (!presign.ok) throw new Error('Presign failed')
    const { uploads: [upload] } = await presign.json()

    const loaded = [0, 0, 0]
    const report = (i: number) => (bytes: number) => {
      loaded[i] = bytes
      updatePending(key, { loaded: loaded[0] + loaded[1] + loaded[2] })
    }
    await Promise.all([
      postToS3(upload.original, file, report(0)),
      postToS3(upload.display, image.display, report(1)),
      postToS3(upload.thumb, image.thumb, report(2)),
    ])

    const register = await fetch('/api/album/photos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: upload.id,
        contentType,
        width: image.width,
        height: image.height,
        filename: file.name,
        uploaderName: name.trim() || null,
        uploaderKey: getUploaderKey(),
      }),
    })
    if (register.status === 401) throw new SessionExpiredError()
    if (!register.ok) throw new Error('Register failed')
    const { photo } = await register.json()
    setPhotos(prev => [photo, ...prev])
  }

  const handleFiles = async (files: File[]) => {
    if (files.length === 0) return
    setUploaderName(name.trim())

    const items = files.map(file => ({ file, key: `${Date.now()}-${Math.random()}` }))
    setPending(prev => [...items.map(({ file, key }) => ({ key, previewUrl: null, loaded: 0, total: file.size })), ...prev])
    setBatch(prev => ({ done: prev.done, total: prev.total + files.length }))

    let succeeded = 0
    let unsupported = 0
    let tooLarge = 0
    let failed = 0
    let expired = false

    await runPool(items, UPLOAD_CONCURRENCY, async ({ file, key }) => {
      if (expired) return
      try {
        await uploadOne(file, key)
        succeeded++
      } catch (error) {
        if (error instanceof SessionExpiredError) expired = true
        else if (error instanceof UnsupportedImageError) unsupported++
        else if (error instanceof TooLargeError) tooLarge++
        else failed++
      } finally {
        setPending(prev => {
          const item = prev.find(p => p.key === key)
          if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl)
          return prev.filter(p => p.key !== key)
        })
        setBatch(prev => (prev.done + 1 >= prev.total ? { done: 0, total: 0 } : { ...prev, done: prev.done + 1 }))
      }
    })

    if (expired) return onSessionExpired()

    const messages = []
    if (succeeded) messages.push(t.uploadDone(succeeded))
    if (unsupported + tooLarge + failed) messages.push(t.uploadFailed(unsupported + tooLarge + failed))
    if (unsupported) messages.push(t.unsupported)
    if (tooLarge) messages.push(t.tooLarge)
    setToast(messages.join(' '))
  }

  const deletePhoto = async (photo: AlbumPhoto) => {
    const res = await fetch(`/api/album/photos/${photo.id}`, {
      method: 'DELETE',
      headers: { 'X-Album-Uploader': getUploaderKey() },
    })
    if (res.status === 401) return onSessionExpired()
    if (!res.ok) return setToast(t.somethingWrong)

    const remaining = photos.filter(p => p.id !== photo.id)
    setPhotos(remaining)
    setOpenIndex(i => (i === null || remaining.length === 0 ? null : Math.min(i, remaining.length - 1)))
  }

  const pickFiles = () => fileInput.current?.click()

  return (
    <main className="album">
      <LocaleSwitch locale={locale} />

      <header className="album-header">
        <p className="album-eyebrow">Gian &amp; Cat</p>
        <h1 className="album-title">{t.title}</h1>
        <p className="album-intro">{t.intro}</p>

        <div className="album-actions">
          <label className="album-field" style={{ flex: 1, minWidth: 200 }}>
            <span className="schedule-label" style={{ margin: 0 }}>{t.yourName}</span>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              onBlur={() => setUploaderName(name.trim())}
              placeholder={t.yourNamePlaceholder}
              maxLength={80}
              autoComplete="name"
              className="album-input"
            />
          </label>
          <button type="button" className="btn btn-primary" onClick={pickFiles}>
            <WaveText text={t.addPhotos} />
          </button>
        </div>

        {!loading && <p className="album-hint">{t.photoCount(photos.length)}</p>}
      </header>

      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={e => {
          handleFiles(Array.from(e.target.files ?? []))
          e.target.value = ''
        }}
      />

      {!loading && photos.length === 0 && pending.length === 0 && (
        <p className="album-empty">{t.empty}</p>
      )}

      <div className="album-grid">
        {pending.map(p => (
          <div key={p.key} className="album-tile album-tile--pending">
            {p.previewUrl && <img src={p.previewUrl} alt="" />}
            <div className="album-tile-progress" style={{ width: `${Math.round((p.loaded / p.total) * 100)}%` }} />
          </div>
        ))}
        {photos.map((photo, i) => (
          <button key={photo.id} type="button" className="album-tile" onClick={() => setOpenIndex(i)}>
            <img src={photo.thumbUrl} alt="" loading="lazy" decoding="async" />
          </button>
        ))}
      </div>

      {/* Floating add button, always reachable while scrolling */}
      <button type="button" className="btn btn-primary album-fab" onClick={pickFiles} aria-label={t.addPhotos}>
        +
      </button>

      {(batch.total > 0 || toast) && (
        <div className="album-status" role="status">
          {batch.total > 0 ? t.uploading(Math.min(batch.done + 1, batch.total), batch.total) : toast}
        </div>
      )}

      {openIndex !== null && (
        <Lightbox
          locale={locale}
          photos={photos}
          index={openIndex}
          onIndexChange={setOpenIndex}
          onClose={() => setOpenIndex(null)}
          onDelete={deletePhoto}
        />
      )}
    </main>
  )
}
