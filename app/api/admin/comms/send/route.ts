import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendEmail } from '@/lib/email/mailer'
import { generateBroadcastHtml, generateBroadcastText } from '@/lib/email/broadcast'

export async function POST(request: NextRequest) {
  const { subject, body, filter, recipient_ids } = await request.json()

  if (!subject?.trim() || !body?.trim() || !recipient_ids?.length) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const { data: guests, error } = await supabaseAdmin
    .from('guests')
    .select('id, name, email, invite_token, language')
    .in('id', recipient_ids)

  if (error || !guests) {
    return NextResponse.json({ error: 'Failed to fetch recipients' }, { status: 500 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://giancat.com'
  let sent = 0
  let failed = 0
  let firstError: string | null = null
  const sentNames: string[] = []

  for (const guest of guests) {
    if (!guest.email) { failed++; continue }

    const firstName = guest.name.split(' ')[0]
    const locale = guest.language || 'en'
    const localePath = locale === 'en' ? '' : `/${locale}`
    const inviteUrl = `${baseUrl}${localePath}/invite?guest=${guest.invite_token}`
    const transportUrl = `${baseUrl}${localePath}/transport?guest=${guest.invite_token}`

    try {
      await sendEmail({
        to: guest.email,
        subject,
        html: generateBroadcastHtml(body, firstName, inviteUrl, transportUrl),
        text: generateBroadcastText(body, firstName, inviteUrl, transportUrl),
      })
      sent++
      sentNames.push(guest.name)
    } catch (err) {
      console.error(`[comms/send] Failed to send to ${guest.email}:`, err)
      if (!firstError) firstError = err instanceof Error ? err.message : String(err)
      failed++
    }
  }

  try {
    await supabaseAdmin.from('email_campaigns').insert({
      subject,
      body,
      recipient_filter:  filter,
      recipient_count:   sent,
      failed_count:      failed,
      recipient_names:   sentNames.join(', '),
      sent_by:           process.env.GMAIL_USER,
    })
  } catch { /* table not yet created */ }

  return NextResponse.json({ sent, failed, error: firstError })
}
