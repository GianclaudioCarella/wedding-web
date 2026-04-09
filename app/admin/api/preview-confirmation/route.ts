import { NextRequest, NextResponse } from 'next/server'

function generateConfirmationEmail(attending: boolean, inviteUrl: string, rsvpUrl: string, locale: string): string {
  const content = {
    en: {
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
      label:      'RSVP Confirmado',
      messageYes: 'Tudo pronto! Mal podemos esperar para celebrar convosco. Tudo o que precisas está no website. Até já!',
      messageNo:  'Vamos ter saudades! Obrigado por nos avisar.',
      viewInvite: 'Ver convite',
      editRsvp:   'Editar RSVP',
      footerEdit: 'Para atualizar o teu RSVP, visita:',
      closing:    'Com amor,',
      names:      'Gian &amp; Cat',
    },
    es: {
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

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const locale = searchParams.get('locale') || 'en'
  const attending = searchParams.get('attending') === 'true'
  const inviteUrl = 'https://example.com/invite?guest=token123'
  const rsvpUrl = 'https://example.com/rsvp?guest=token123'

  const emailHtml = generateConfirmationEmail(attending, inviteUrl, rsvpUrl, locale)

  const previewBanner = `
  <div style="background-color: #fef3c7; border: 2px solid #f59e0b; padding: 15px; text-align: center; font-weight: 600; color: #92400e; margin-bottom: 20px;">
    📧 EMAIL PREVIEW MODE - This email will not be sent
  </div>
  `

  const paramInfo = `
  <div style="max-width: 600px; margin: 20px auto; padding: 20px; background-color: #f3f4f6; border-radius: 8px; font-family: monospace; font-size: 14px;">
    <h3 style="margin-top: 0;">🔍 Preview URL Parameters:</h3>
    <p><strong>Current values:</strong></p>
    <ul style="list-style: none; padding: 0;">
      <li>• locale: ${locale}</li>
      <li>• attending: ${attending}</li>
    </ul>
    <p><strong>Test different scenarios:</strong></p>
    <ul style="padding-left: 20px;">
      <li><strong>English:</strong> <a href="?locale=en&attending=true">Attending</a> | <a href="?locale=en&attending=false">Not Attending</a></li>
      <li><strong>Español:</strong> <a href="?locale=es&attending=true">Attending</a> | <a href="?locale=es&attending=false">Not Attending</a></li>
      <li><strong>Português:</strong> <a href="?locale=pt&attending=true">Attending</a> | <a href="?locale=pt&attending=false">Not Attending</a></li>
    </ul>
  </div>
  `

  const html = emailHtml.replace('<body>', '<body>' + previewBanner).replace('</body>', paramInfo + '</body>')

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html' },
  })
}
