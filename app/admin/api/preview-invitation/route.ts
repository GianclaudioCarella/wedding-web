import { NextRequest, NextResponse } from 'next/server'

function generateInvitationEmail(guestName: string, partyNames: string, inviteUrl: string, locale: string): string {
  const content = {
    en: {
      subject: 'You\'re invited — Gian & Cat, 3 October 2026',
      body: 'We\'re getting married, and we would love for you to be there.',
      details: 'Saturday, 3 October 2026 at La Garriga de Castelladral',
      info: 'You\'ll find everything you need on your invitation page.',
      questions: 'Questions? Get in touch at hello@giancat.com.',
      cta: 'View your invitation',
      closing: 'With love,',
      names: 'Gian &amp; Cat',
    },
    pt: {
      subject: 'Estás convidado/a — Gian & Cat, 3 de outubro de 2026',
      body: 'Vamos casar e adorávamos contar com a vossa presença.',
      details: 'Sábado, 3 de outubro de 2026 na Garriga de Castelladral',
      info: 'Encontrarás tudo o que precisas na tua página de convite.',
      questions: 'Dúvidas? Entre em contato em hello@giancat.com.',
      cta: 'Ver convite',
      closing: 'Com amor,',
      names: 'Gian &amp; Cat',
    },
    es: {
      subject: 'Estás invitado/a — Gian & Cat, 3 de octubre de 2026',
      body: 'Nos casamos y nos encantaría que estuvieras con nosotros.',
      details: 'Sábado, 3 de octubre de 2026 en La Garriga de Castelladral',
      info: 'Encontrarás todo lo que necesitas en tu página de invitación.',
      questions: '¿Alguna pregunta? Contáctanos en hello@giancat.com.',
      cta: 'Ver invitación',
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
              <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#2D6B52;font-weight:500;">Wedding Invitation</p>
              <p style="margin:0;font-family:'Söhne',system-ui,sans-serif;font-size:28px;font-weight:400;color:#262626;line-height:1.3;">Gian &amp; Cat</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 48px;">
              <p style="margin:0 0 24px;font-size:15px;color:#262626;">${partyNames},</p>
              <p style="margin:0 0 20px;font-size:15px;color:#262626;line-height:1.6;">${t.body}</p>
              <p style="margin:0 0 20px;font-size:15px;color:#262626;">${t.details}</p>
              <p style="margin:0 0 32px;font-size:15px;color:#262626;line-height:1.6;">${t.info}</p>
              <p style="margin:0 0 32px;font-size:15px;color:#262626;line-height:1.6;">${t.questions}</p>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 40px;">
                <tr>
                  <td style="background:#FFB3F0;border-radius:100px;">
                    <a href="${inviteUrl}" style="display:inline-block;padding:12px 32px;font-size:13px;font-weight:500;letter-spacing:0.06em;color:#262626;text-decoration:none;font-family:'Söhne',system-ui,sans-serif;">${t.cta} →</a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 4px;font-size:14px;color:#666666;">${t.closing}</p>
              <p style="margin:0;font-family:'Söhne',system-ui,sans-serif;font-size:16px;font-weight:500;color:#262626;">${t.names}</p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 48px;border-top:1px solid rgba(0,0,0,0.1);text-align:center;background:#F7F7F5;">
              <p style="margin:0;font-size:12px;color:#666666;">If you have trouble with the button, copy this link: ${inviteUrl}</p>
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
  const names = searchParams.get('names') || 'John, Jane & Mike'
  const inviteUrl = 'https://example.com/invite?guest=token123'

  const emailHtml = generateInvitationEmail('', names, inviteUrl, locale)

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
      <li>• names: ${names}</li>
    </ul>
    <p><strong>Test different languages:</strong></p>
    <ul style="padding-left: 20px;">
      <li><a href="?locale=en&names=John, Jane & Mike">🇬🇧 English</a></li>
      <li><a href="?locale=es&names=María, Carlos & Ana">🇪🇸 Español</a></li>
      <li><a href="?locale=pt&names=João, Maria & Pedro">🇧🇷 Português</a></li>
    </ul>
  </div>
  `

  const html = emailHtml.replace('<body>', '<body>' + previewBanner).replace('</body>', paramInfo + '</body>')

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html' },
  })
}
