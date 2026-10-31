'use client'

import { useEffect, useRef, useState } from 'react'
import type { AlbumPhoto } from '@/lib/album/photos'
import { getTranslation } from '@/lib/translations'

interface LightboxProps {
  locale: string
  photos: AlbumPhoto[]
  index: number
  onIndexChange: (index: number) => void
  onClose: () => void
  onDelete: (photo: AlbumPhoto) => Promise<void>
}

export default function Lightbox({ locale, photos, index, onIndexChange, onClose, onDelete }: LightboxProps) {
  const t = getTranslation(locale).album
  const photo = photos[index]
  const hasPrev = index > 0
  const hasNext = index < photos.length - 1
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const touchStart = useRef<{ x: number; y: number } | null>(null)

  const prev = () => hasPrev && onIndexChange(index - 1)
  const next = () => hasNext && onIndexChange(index + 1)

  useEffect(() => setConfirmingDelete(false), [index])

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft' && hasPrev) onIndexChange(index - 1)
      if (e.key === 'ArrowRight' && hasNext) onIndexChange(index + 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index, hasPrev, hasNext, onClose, onIndexChange])

  // Lock page scroll while open
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previous }
  }, [])

  // Preload neighbours so swiping feels instant
  useEffect(() => {
    ;[photos[index - 1], photos[index + 1]].forEach(p => {
      if (p) new Image().src = p.displayUrl
    })
  }, [index, photos])

  if (!photo) return null

  const onTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    // Leave the bottom of a video alone so dragging its scrubber doesn't change photo.
    if (e.target instanceof HTMLVideoElement) {
      const rect = e.target.getBoundingClientRect()
      if (touch.clientY > rect.bottom - rect.height * 0.25) return
    }
    touchStart.current = { x: touch.clientX, y: touch.clientY }
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return
    const dx = e.changedTouches[0].clientX - touchStart.current.x
    const dy = e.changedTouches[0].clientY - touchStart.current.y
    touchStart.current = null
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      if (dx > 0) prev()
      else next()
    } else if (dy > 80 && Math.abs(dy) > Math.abs(dx)) {
      onClose()
    }
  }

  const handleDelete = async () => {
    if (!confirmingDelete) return setConfirmingDelete(true)
    setDeleting(true)
    try {
      await onDelete(photo)
    } finally {
      setDeleting(false)
      setConfirmingDelete(false)
    }
  }

  return (
    <div className="lightbox" role="dialog" aria-modal="true" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div className="lightbox-bar">
        <span>{index + 1} / {photos.length}</span>
        <button type="button" className="lightbox-btn" onClick={onClose} aria-label={t.close}>✕</button>
      </div>

      <div className="lightbox-stage" onClick={e => e.target === e.currentTarget && onClose()}>
        {photo.mediaType === 'video' && photo.videoUrl ? (
          <video
            key={photo.id}
            src={photo.videoUrl}
            poster={photo.displayUrl}
            controls
            playsInline
            preload="metadata"
            className="lightbox-img lightbox-video"
          />
        ) : (
          <>
            {/* Thumbnail is already cached — show it while the larger image loads */}
            <img key={`thumb-${photo.id}`} src={photo.thumbUrl} alt="" className="lightbox-img lightbox-img--placeholder" />
            <img key={photo.id} src={photo.displayUrl} alt="" className="lightbox-img" />
          </>
        )}

        {hasPrev && (
          <button type="button" className="lightbox-btn lightbox-nav lightbox-nav--prev" onClick={prev} aria-label={t.previous}>←</button>
        )}
        {hasNext && (
          <button type="button" className="lightbox-btn lightbox-nav lightbox-nav--next" onClick={next} aria-label={t.next}>→</button>
        )}
      </div>

      <div className="lightbox-bar">
        <span className="lightbox-caption">{photo.uploaderName ? t.by(photo.uploaderName) : ''}</span>
        <div style={{ display: 'flex', gap: 8 }}>
          {photo.mine && (
            <button type="button" className="pill lightbox-pill" onClick={handleDelete} disabled={deleting}>
              {confirmingDelete ? t.confirmDelete : t.delete}
            </button>
          )}
          <a href={photo.downloadUrl} className="pill lightbox-pill" style={{ textDecoration: 'none' }}>
            {t.download}
          </a>
        </div>
      </div>
    </div>
  )
}
