import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { deleteObjects } from '@/lib/album/s3'
import { UUID_RE } from '@/lib/album/photos'

type Params = { params: Promise<{ id: string }> }

/** Hide/unhide a photo. Body: { hidden: boolean } */
export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await requireAdmin(request)
  if (!auth.ok) return auth.response

  const { id } = await params
  const body = await request.json().catch(() => null)
  if (!UUID_RE.test(id) || typeof body?.hidden !== 'boolean') {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { error } = await auth.supabase.from('guest_photos').update({ hidden: body.hidden }).eq('id', id)
  if (error) {
    return NextResponse.json({ error: 'Failed to update photo' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await requireAdmin(request)
  if (!auth.ok) return auth.response

  const { id } = await params
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { data, error } = await auth.supabase
    .from('guest_photos')
    .delete()
    .eq('id', id)
    .select('original_key, display_key, thumb_key')
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: 'Failed to delete photo' }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await deleteObjects([data.original_key, data.display_key, data.thumb_key])
  return NextResponse.json({ ok: true })
}
