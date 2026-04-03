import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { supabaseAdmin } from '@/lib/supabase-admin'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

function generateConfirmationEmail(
  guestName: string,
  attending: boolean,
  inviteUrl: string,
  rsvpUrl: string,
  locale: string
): string {
  const content = {
    en: {
      subjectYes: 'See you there — RSVP confirmed',
      subjectNo:  "We'll miss you — RSVP confirmed",
      label:      'RSVP Confirmed',
      titleYes:   'See you there.',
      titleNo:    "We'll miss you.",
      messageYes: "We can't wait to celebrate with you. We'll be in touch with more details closer to the date.",
      messageNo:  "Thank you for letting us know. We're sorry you won't be able to make it.",
      viewInvite: 'View invitation',
      editRsvp:   'Edit RSVP',
      closing:    'With love,',
      names:      'Gian &amp; Cat',
    },
    pt: {
      subjectYes: 'Até já — confirmação de RSVP',
      subjectNo:  'Vamos ter saudades — confirmação de RSVP',
      label:      'RSVP Confirmado',
      titleYes:   'Até já.',
      titleNo:    'Vamos ter saudades.',
      messageYes: 'Mal podemos esperar para celebrar convosco. Entraremos em contacto com mais detalhes mais perto da data.',
      messageNo:  'Obrigado por nos informares. Lamentamos que não possas estar presente.',
      viewInvite: 'Ver convite',
      editRsvp:   'Editar RSVP',
      closing:    'Com amor,',
      names:      'Gian &amp; Cat',
    },
    es: {
      subjectYes: 'Hasta pronto — confirmación de RSVP',
      subjectNo:  'Te echaremos de menos — confirmación de RSVP',
      label:      'RSVP Confirmado',
      titleYes:   'Hasta pronto.',
      titleNo:    'Te echaremos de menos.',
      messageYes: 'Estamos deseando celebrarlo contigo. Nos pondremos en contacto con más detalles más cerca de la fecha.',
      messageNo:  'Gracias por avisarnos. Lamentamos que no puedas venir.',
      viewInvite: 'Ver invitación',
      editRsvp:   'Editar RSVP',
      closing:    'Con amor,',
      names:      'Gian &amp; Cat',
    },
  }

  const t = content[locale as keyof typeof content] || content.en

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#f5f4f0;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f4f0;padding:48px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:12px;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="padding:48px 48px 32px;text-align:center;border-bottom:1px solid #ece9e4;">
              <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#9b9186;">${t.label}</p>
              <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:28px;font-weight:400;color:#1a1a18;line-height:1.3;">Gian &amp; Cat</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 48px;">
              <p style="margin:0 0 24px;font-size:15px;color:#4a4540;">Dear ${guestName},</p>
              <p style="margin:0 0 8px;font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:400;color:#1a1a18;">${attending ? t.titleYes : t.titleNo}</p>
              <p style="margin:0 0 36px;font-size:15px;color:#4a4540;line-height:1.7;">${attending ? t.messageYes : t.messageNo}</p>

              <!-- CTAs -->
              <table cellpadding="0" cellspacing="0" style="margin:0 0 40px;">
                <tr>
                  ${attending ? `<td style="padding-right:12px;">
                    <a href="${inviteUrl}" style="display:inline-block;padding:12px 24px;font-size:13px;font-weight:500;letter-spacing:0.06em;text-transform:uppercase;color:#ffffff;text-decoration:none;background:#1a1a18;border-radius:100px;">${t.viewInvite}</a>
                  </td>` : ''}
                  <td>
                    <a href="${rsvpUrl}" style="display:inline-block;padding:12px 24px;font-size:13px;font-weight:500;letter-spacing:0.06em;text-transform:uppercase;color:#1a1a18;text-decoration:none;border:1px solid #d4cfc9;border-radius:100px;">${t.editRsvp}</a>
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
              <p style="margin:0;font-size:11px;color:#b8b0a7;">To update your RSVP, visit: ${rsvpUrl}</p>
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

  const { token, attending } = await request.json()
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

  const { data: guest } = await supabaseAdmin
    .from('guests')
    .select('id, name, email, invite_token, language')
    .eq('invite_token', token)
    .single()

  if (!guest?.email) {
    return NextResponse.json({ error: 'Guest not found or no email' }, { status: 404 })
  }

  const baseUrl  = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const locale   = guest.language || 'en'
  const inviteUrl = `${baseUrl}/invite?guest=${guest.invite_token}`
  const rsvpUrl   = `${baseUrl}/rsvp?guest=${guest.invite_token}`

  const subjects: Record<string, { yes: string; no: string }> = {
    en: { yes: 'See you there — RSVP confirmed',          no: "We'll miss you — RSVP confirmed" },
    pt: { yes: 'Até já — confirmação de RSVP',             no: 'Vamos ter saudades — confirmação de RSVP' },
    es: { yes: 'Hasta pronto — confirmación de RSVP',      no: 'Te echaremos de menos — confirmación de RSVP' },
  }
  const subject = (subjects[locale] || subjects.en)[attending ? 'yes' : 'no']

  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
    to: guest.email,
    subject,
    html: generateConfirmationEmail(guest.name, attending, inviteUrl, rsvpUrl, locale),
    replyTo: process.env.RESEND_REPLY_TO_EMAIL || process.env.RESEND_FROM_EMAIL,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
