'use client'

import { useEffect, useRef, useState } from 'react'
import type { AlbumPhoto } from '@/lib/album/photos'
import { getTranslation } from '@/lib/translations'

type Zoom = { scale: number; x: number; y: number }
type Point = { x: number; y: number }
type Gesture =
  | { kind: 'swipe'; start: Point }
  | { kind: 'pan'; start: Point; from: Zoom }
  | { kind: 'pinch'; dist: number; mid: Point; from: Zoom }

const NO_ZOOM: Zoom = { scale: 1, x: 0, y: 0 }
const MAX_SCALE = 5
const DOUBLE_TAP_SCALE = 2.5
const DOUBLE_TAP_MS = 300

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)
const toPoint = (touch: React.Touch): Point => ({ x: touch.clientX, y: touch.clientY })

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
  const [zoom, setZoom] = useState<Zoom>(NO_ZOOM)
  const [videoFailed, setVideoFailed] = useState(false)
  const [gesturing, setGesturing] = useState(false)
  const stageRef = useRef<HTMLDivElement>(null)
  const gesture = useRef<Gesture | null>(null)
  const lastTap = useRef<{ time: number; at: Point } | null>(null)

  const prev = () => hasPrev && onIndexChange(index - 1)
  const next = () => hasNext && onIndexChange(index + 1)

  useEffect(() => {
    setConfirmingDelete(false)
    setZoom(NO_ZOOM)
    setVideoFailed(false)
  }, [index])

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

  const canZoom = photo.mediaType !== 'video'
  const zoomed = zoom.scale > 1

  // Zoom maths: a point q on the photo is shown at p = (x, y) + scale * q,
  // with p measured from the centre of the stage.
  const stageBox = () => {
    const r = stageRef.current!.getBoundingClientRect()
    return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, w: r.width, h: r.height }
  }
  const fromCentre = (p: Point): Point => {
    const { cx, cy } = stageBox()
    return { x: p.x - cx, y: p.y - cy }
  }
  /** Zooms so that `anchor` (where the gesture started) ends up at `target`, keeping the photo on screen. */
  const zoomAround = (scale: number, anchor: Point, target: Point, from: Zoom): Zoom => {
    const s = Math.min(MAX_SCALE, Math.max(1, scale))
    const qx = (anchor.x - from.x) / from.scale
    const qy = (anchor.y - from.y) / from.scale
    const { w, h } = stageBox()
    const maxX = ((s - 1) * w) / 2
    const maxY = ((s - 1) * h) / 2
    return {
      scale: s,
      x: Math.min(maxX, Math.max(-maxX, target.x - s * qx)),
      y: Math.min(maxY, Math.max(-maxY, target.y - s * qy)),
    }
  }

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && canZoom) {
      const [a, b] = [toPoint(e.touches[0]), toPoint(e.touches[1])]
      gesture.current = { kind: 'pinch', dist: distance(a, b), mid: fromCentre({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }), from: zoom }
      setGesturing(true)
      return
    }
    if (e.touches.length !== 1) return
    const touch = e.touches[0]
    // Leave the bottom of a video alone so dragging its scrubber doesn't change photo.
    if (e.target instanceof HTMLVideoElement) {
      const rect = e.target.getBoundingClientRect()
      if (touch.clientY > rect.bottom - rect.height * 0.25) return
    }
    gesture.current = zoomed
      ? { kind: 'pan', start: toPoint(touch), from: zoom }
      : { kind: 'swipe', start: toPoint(touch) }
    if (zoomed) setGesturing(true)
  }

  const onTouchMove = (e: React.TouchEvent) => {
    const g = gesture.current
    if (g?.kind === 'pinch' && e.touches.length === 2) {
      const [a, b] = [toPoint(e.touches[0]), toPoint(e.touches[1])]
      const mid = fromCentre({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })
      setZoom(zoomAround(g.from.scale * (distance(a, b) / g.dist), g.mid, mid, g.from))
    } else if (g?.kind === 'pan' && e.touches.length === 1) {
      const p = toPoint(e.touches[0])
      // Anchoring the stage centre and moving it by the finger's offset = plain pan.
      setZoom(zoomAround(g.from.scale, { x: 0, y: 0 }, { x: p.x - g.start.x, y: p.y - g.start.y }, g.from))
    }
  }

  const onTouchEnd = (e: React.TouchEvent) => {
    const g = gesture.current
    if (!g) return

    if (g.kind === 'pinch') {
      // Lifting one finger keeps panning with the other.
      const remaining = e.touches[0]
      gesture.current = remaining && zoom.scale > 1.05 ? { kind: 'pan', start: toPoint(remaining), from: zoom } : null
      if (zoom.scale <= 1.05) setZoom(NO_ZOOM)
      if (!gesture.current) setGesturing(false)
      return
    }

    gesture.current = null
    setGesturing(false)
    const end = toPoint(e.changedTouches[0])
    const dx = end.x - g.start.x
    const dy = end.y - g.start.y

    // Double tap toggles zoom on the tapped spot.
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
      const now = Date.now()
      const prevTap = lastTap.current
      if (canZoom && prevTap && now - prevTap.time < DOUBLE_TAP_MS && distance(prevTap.at, end) < 30) {
        lastTap.current = null
        const at = fromCentre(end)
        setZoom(zoomed ? NO_ZOOM : zoomAround(DOUBLE_TAP_SCALE, at, at, NO_ZOOM))
      } else {
        lastTap.current = { time: now, at: end }
      }
      return
    }

    if (g.kind !== 'swipe') return
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
    <div className="lightbox" role="dialog" aria-modal="true" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      <div className="lightbox-bar">
        <span>{index + 1} / {photos.length}</span>
        <button type="button" className="lightbox-btn" onClick={onClose} aria-label={t.close}>✕</button>
      </div>

      <div ref={stageRef} className="lightbox-stage">
        {photo.mediaType === 'video' && videoFailed ? (
          <>
            <img key={`poster-${photo.id}`} src={photo.displayUrl} alt="" className="lightbox-img" />
            <div className="lightbox-video-error">
              <p>{t.videoUnsupported}</p>
              <a href={photo.downloadUrl} className="pill" style={{ textDecoration: 'none' }}>{t.download}</a>
            </div>
          </>
        ) : photo.mediaType === 'video' && photo.videoUrl ? (
          <video
            key={photo.id}
            src={photo.videoUrl}
            poster={photo.displayUrl}
            controls
            playsInline
            preload="metadata"
            onError={() => setVideoFailed(true)}
            className="lightbox-img lightbox-video"
          />
        ) : (
          <div
            className="lightbox-zoom"
            style={{
              transform: `translate(${zoom.x}px, ${zoom.y}px) scale(${zoom.scale})`,
              transition: gesturing ? 'none' : 'transform 0.2s ease',
            }}
          >
            {/* Thumbnail is already cached — show it while the larger image loads */}
            <img key={`thumb-${photo.id}`} src={photo.thumbUrl} alt="" className="lightbox-img lightbox-img--placeholder" />
            <img key={photo.id} src={photo.displayUrl} alt="" className="lightbox-img" />
          </div>
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
