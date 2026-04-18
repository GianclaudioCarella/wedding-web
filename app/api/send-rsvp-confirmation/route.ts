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
      subjectYes: 'You\'re all set — RSVP confirmed',
      subjectNo:  'We\'ll miss you — RSVP confirmed',
      label:      'RSVP Confirmed',
      messageYes: "You're all set! We can't wait to celebrate with you. Everything you need is on the website. See you there!",
      messageNo:  "We'll miss you! Thanks for letting us know.",
      viewInvite: 'View invitation',
      editRsvp:   'Edit RSVP',
      footerEdit: 'To update your RSVP, visit:',
      closing:    'With love,',
      names:      'Gian &amp; Cat',
    },
    pt: {
      subjectYes: 'Tudo pronto — confirmação de RSVP',
      subjectNo:  'Vamos sentir sua falta — confirmação de RSVP',
      label:      'RSVP Confirmado',
      messageYes: 'Tudo pronto! Mal podemos esperar para celebrar com vocês. Tudo o que precisas está no website. Até logo!',
      messageNo:  'Vamos sentir sua falta! Obrigado por nos avisar.',
      viewInvite: 'Ver convite',
      editRsvp:   'Editar RSVP',
      footerEdit: 'Para atualizar o teu RSVP, visita:',
      closing:    'Com amor,',
      names:      'Gian &amp; Cat',
    },
    es: {
      subjectYes: 'Todo listo — confirmación de RSVP',
      subjectNo:  'Te echaremos de menos — confirmación de RSVP',
      label:      'RSVP Confirmado',
      messageYes: '¡Todo listo! Estamos deseando celebrarlo contigo. Todo lo que necesitas está en la web. ¡Nos vemos!',
      messageNo:  '¡Te echaremos de menos! Gracias por avisarnos.',
      viewInvite: 'Ver invitación',
      editRsvp:   'Editar RSVP',
      footerEdit: 'Para actualizar tu RSVP, visita:',
      closing:    'Con amor,',
      names:      'Gian &amp; Cat',
    },
  }

  const t = content[locale as keyof typeof content] || content.en
  const message = attending ? t.messageYes : t.messageNo
  const ctaRow = attending
    ? `<td style="padding-right:12px;">
        <a href="${inviteUrl}" style="display:inline-block;padding:12px 32px;font-size:13px;font-weight:500;letter-spacing:0.06em;color:#262626;text-decoration:none;background:#FFB3F0;border-radius:100px;font-family:'Söhne',system-ui,sans-serif;">${t.viewInvite} →</a>
      </td>
      <td>
        <a href="${rsvpUrl}" style="display:inline-block;padding:12px 32px;font-size:13px;font-weight:500;letter-spacing:0.06em;color:#262626;text-decoration:none;border:1px solid rgba(0,0,0,0.1);border-radius:100px;font-family:'Söhne',system-ui,sans-serif;">${t.editRsvp}</a>
      </td>`
    : `<td>
        <a href="${rsvpUrl}" style="display:inline-block;padding:12px 32px;font-size:13px;font-weight:500;letter-spacing:0.06em;color:#262626;text-decoration:none;border:1px solid rgba(0,0,0,0.1);border-radius:100px;font-family:'Söhne',system-ui,sans-serif;">${t.editRsvp}</a>
      </td>`

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    @font-face {
      font-family: 'Söhne';
      src: url('https://wedding-web.s3.amazonaws.com/fonts/soehne-buch.woff2') format('woff2');
      font-weight: 400;
      font-style: normal;
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#F7F7F5;font-family:'Söhne',system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F7F5;padding:48px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#FFFFFF;border-radius:0;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="padding:48px 48px 32px;text-align:center;border-bottom:1px solid rgba(0,0,0,0.1);">
              <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#2D6B52;font-weight:500;">${t.label}</p>
              <p style="margin:0;font-family:'Söhne',system-ui,sans-serif;font-size:28px;font-weight:400;color:#262626;line-height:1.3;">Gian &amp; Cat</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 48px;">
              <p style="margin:0 0 32px;font-size:15px;color:#262626;line-height:1.6;">${message}</p>

              <!-- CTAs -->
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 40px;">
                <tr>
                  ${ctaRow}
                </tr>
              </table>

              <p style="margin:0 0 4px;font-size:14px;color:#666666;">${t.closing}</p>
              <p style="margin:0;font-family:'Söhne',system-ui,sans-serif;font-size:16px;font-weight:500;color:#262626;">${t.names}</p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 48px;border-top:1px solid rgba(0,0,0,0.1);text-align:center;background:#F7F7F5;">
              <p style="margin:0;font-size:12px;color:#666666;">${t.footerEdit} ${rsvpUrl}</p>
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
  const localePath = locale === 'en' ? '' : `/${locale}`
  const inviteUrl = `${baseUrl}${localePath}/invite?guest=${guest.invite_token}`
  const rsvpUrl   = `${baseUrl}${localePath}/rsvp?guest=${guest.invite_token}`

  const subjects: Record<string, { yes: string; no: string }> = {
    en: { yes: 'You\'re all set — RSVP confirmed',          no: "We'll miss you — RSVP confirmed" },
    pt: { yes: 'Tudo pronto — confirmação de RSVP',         no: 'Vamos sentir sua falta — confirmação de RSVP' },
    es: { yes: 'Todo listo — confirmación de RSVP',         no: 'Te echaremos de menos — confirmación de RSVP' },
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
