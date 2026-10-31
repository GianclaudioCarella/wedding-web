import { NextRequest, NextResponse } from 'next/server'
import { checkPassword, setAlbumSession } from '@/lib/album/session'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)

  if (!checkPassword(body?.password)) {
    // Small delay to make guessing slower.
    await new Promise(resolve => setTimeout(resolve, 600))
    return NextResponse.json({ error: 'Wrong password' }, { status: 401 })
  }

  const response = NextResponse.json({ ok: true })
  setAlbumSession(response)
  return response
}
