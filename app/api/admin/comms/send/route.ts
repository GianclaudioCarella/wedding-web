import { NextRequest, NextResponse } from 'next/server'
import { requireWeddingRole } from '@/lib/auth/requireWeddingRole'
import { logCampaign } from '@/lib/data/campaigns'
import { listGuestsByIds } from '@/lib/data/guests'
import { guestInviteUrl, guestRsvpUrl } from '@/lib/links'
import { sendEmail } from '@/lib/email/send'
import { generateBroadcastHtml, generateBroadcastText } from '@/lib/email/broadcast'

export async function POST(request: NextRequest) {
  const auth = await requireWeddingRole(request, 'editor')
  if (!auth.ok) return auth.response
  const { subject, body, filter, recipient_ids } = await request.json()

  if (!subject?.trim() || !body?.trim() || !recipient_ids?.length) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const { data: guests, error } = await listGuestsByIds(auth.weddingId, recipient_ids)

  if (error || !guests) {
    return NextResponse.json({ error: 'Failed to fetch recipients' }, { status: 500 })
  }

  let sent = 0
  let failed = 0
  let firstError: string | null = null
  const sentNames: string[] = []

  for (const guest of guests) {
    if (!guest.email) { failed++; continue }

    const firstName = guest.name.split(' ')[0]
    const inviteUrl = guestInviteUrl(guest)
    const rsvpUrl = guestRsvpUrl(guest)

    try {
      await sendEmail({
        to: guest.email,
        subject,
        html: generateBroadcastHtml(body, firstName, inviteUrl, rsvpUrl),
        text: generateBroadcastText(body, firstName, inviteUrl, rsvpUrl),
      })
      sent++
      sentNames.push(guest.name)
    } catch (err) {
      console.error(`[comms/send] Failed to send to ${guest.email}:`, err)
      if (!firstError) firstError = err instanceof Error ? err.message : String(err)
      failed++
    }
  }

  await logCampaign(auth.weddingId, {
    subject,
    body,
    recipient_filter:  filter,
    recipient_count:   sent,
    failed_count:      failed,
    recipient_names:   sentNames.join(', '),
    sent_by:           process.env.RESEND_FROM_EMAIL,
  })

  return NextResponse.json({ sent, failed, error: firstError })
}
