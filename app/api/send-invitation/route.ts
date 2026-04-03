import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { supabaseAdmin } from '@/lib/supabase-admin'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

function generateInvitationEmail(guestName: string, inviteUrl: string, locale: string): string {
  const content = {
    en: {
      subject: 'You\'re invited — Gian & Cat, 4 October 2026',
      greeting: `Dear ${guestName},`,
      body: 'We\'re getting married, and we would love for you to be there.',
      details: 'Saturday, 4 October 2026',
      cta: 'View your invitation',
      closing: 'With love,',
      names: 'Gian &amp; Cat',
    },
    pt: {
      subject: 'Estás convidado/a — Gian & Cat, 4 de outubro de 2026',
      greeting: `Caro/a ${guestName},`,
      body: 'Vamos casar e adorávamos contar com a tua presença.',
      details: 'Sábado, 4 de outubro de 2026',
      cta: 'Ver o teu convite',
      closing: 'Com amor,',
      names: 'Gian &amp; Cat',
    },
    es: {
      subject: 'Estás invitado/a — Gian & Cat, 4 de octubre de 2026',
      greeting: `Querido/a ${guestName},`,
      body: 'Nos casamos y nos encantaría que estuvieras con nosotros.',
      details: 'Sábado, 4 de octubre de 2026',
      cta: 'Ver tu invitación',
      closing: 'Con amor,',
      names: 'Gian &amp; Cat',
    },
  }

  const t = content[locale as keyof typeof content] || content.en

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${t.subject}</title>
</head>
<body style="margin:0;padding:0;background:#f5f4f0;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f4f0;padding:48px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:12px;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="padding:48px 48px 32px;text-align:center;border-bottom:1px solid #ece9e4;">
              <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#9b9186;">Wedding Invitation</p>
              <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:28px;font-weight:400;color:#1a1a18;line-height:1.3;">Gian &amp; Cat</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 48px;">
              <p style="margin:0 0 24px;font-size:15px;color:#4a4540;">${t.greeting}</p>
              <p style="margin:0 0 8px;font-size:15px;color:#4a4540;line-height:1.7;">${t.body}</p>
              <p style="margin:0 0 36px;font-size:15px;color:#9b9186;">${t.details}</p>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 40px;">
                <tr>
                  <td style="background:#1a1a18;border-radius:100px;">
                    <a href="${inviteUrl}" style="display:inline-block;padding:14px 36px;font-size:13px;font-weight:500;letter-spacing:0.06em;text-transform:uppercase;color:#ffffff;text-decoration:none;">${t.cta} →</a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 4px;font-size:14px;color:#9b9186;">${t.closing}</p>
              <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:18px;font-weight:400;color:#1a1a18;">${t.names}</p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 48px;border-top:1px solid #ece9e4;text-align:center;">
              <p style="margin:0;font-size:11px;color:#b8b0a7;">If you have trouble with the button, copy this link: ${inviteUrl}</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export async function POST(request: NextRequest) {
  if (!resend) {
    return NextResponse.json({ error: 'Email service not configured' }, { status: 500 })
  }

  const { guest_ids } = await request.json()
  if (!guest_ids?.length) {
    return NextResponse.json({ error: 'No guest IDs provided' }, { status: 400 })
  }

  const { data: guests, error } = await supabaseAdmin
    .from('guests')
    .select('id, name, email, invite_token, language')
    .in('id', guest_ids)

  if (error || !guests) {
    return NextResponse.json({ error: 'Failed to fetch guests' }, { status: 500 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const results: { id: string; success: boolean; error?: string }[] = []

  for (const guest of guests) {
    if (!guest.email) {
      results.push({ id: guest.id, success: false, error: 'No email address' })
      continue
    }

    const locale = guest.language || 'en'
    const localePath = locale === 'en' ? '' : `/${locale}`
    const inviteUrl = `${baseUrl}${localePath}/invite?guest=${guest.invite_token}`
    const subjectMap: Record<string, string> = {
      en: "You're invited — Gian & Cat, 4 October 2026",
      pt: 'Estás convidado/a — Gian & Cat, 4 de outubro de 2026',
      es: 'Estás invitado/a — Gian & Cat, 4 de octubre de 2026',
    }

    const { error: sendError } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
      to: guest.email,
      subject: subjectMap[locale] || subjectMap.en,
      html: generateInvitationEmail(guest.name, inviteUrl, locale),
      replyTo: process.env.RESEND_REPLY_TO_EMAIL || process.env.RESEND_FROM_EMAIL,
    })

    if (sendError) {
      results.push({ id: guest.id, success: false, error: sendError.message })
    } else {
      await supabaseAdmin
        .from('guests')
        .update({ invited_at: new Date().toISOString() })
        .eq('id', guest.id)
      results.push({ id: guest.id, success: true })
    }
  }

  const successCount = results.filter(r => r.success).length
  return NextResponse.json({ results, successCount, total: guests.length })
}
