import { createHash, createHmac, timingSafeEqual } from 'crypto'
import type { NextRequest, NextResponse } from 'next/server'

// Server-side only. The album is protected by a single shared password
// (ALBUM_PASSWORD). After a correct guess we set a signed, httpOnly cookie.
// The signing key includes the password, so changing it logs everyone out.

export const ALBUM_COOKIE = 'album_session'
const SESSION_DAYS = 30

function signingKey() {
  const secret = process.env.ALBUM_SESSION_SECRET
  const password = process.env.ALBUM_PASSWORD
  if (!secret || !password) throw new Error('ALBUM_SESSION_SECRET and ALBUM_PASSWORD must be set')
  return `${secret}:${password}`
}

const sign = (payload: string) => createHmac('sha256', signingKey()).update(payload).digest('base64url')

function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  return ab.length === bb.length && timingSafeEqual(ab, bb)
}

export function checkPassword(input: unknown): boolean {
  const password = process.env.ALBUM_PASSWORD
  if (typeof input !== 'string' || !password) return false
  // Compare digests so the comparison is constant-time regardless of length.
  const digest = (s: string) => createHash('sha256').update(s.trim().toLowerCase()).digest('hex')
  return safeEqual(digest(input), digest(password))
}

export function isValidSession(value: string | undefined): boolean {
  if (!value) return false
  const [expires, signature] = value.split('.')
  if (!expires || !signature || Number(expires) < Date.now()) return false
  return safeEqual(signature, sign(expires))
}

export function hasAlbumSession(request: NextRequest) {
  return isValidSession(request.cookies.get(ALBUM_COOKIE)?.value)
}

export function setAlbumSession(response: NextResponse) {
  const expires = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000
  response.cookies.set(ALBUM_COOKIE, `${expires}.${sign(String(expires))}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: new Date(expires),
  })
}

/** Uploaders get a random key in localStorage; we only store its hash. */
export function hashUploaderKey(key: unknown): string | null {
  if (typeof key !== 'string' || !/^[A-Za-z0-9_-]{16,128}$/.test(key)) return null
  return createHash('sha256').update(key).digest('hex')
}
