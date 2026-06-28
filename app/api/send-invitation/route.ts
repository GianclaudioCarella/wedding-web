import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendEmail } from '@/lib/email/mailer'

function formatPartyNames(guestName: string, partyMembers: { name: string }[]): string {
  const names: string[] = []

  if (guestName) {
    names.push(guestName.split(' ')[0])
  }

  partyMembers.forEach(member => {
    names.push(member.name.split(' ')[0])
  })

  if (names.length === 0) return ''
  if (names.length === 1) return names[0]
  if (names.length === 2) return `${names[0]} & ${names[1]}`

  return names.slice(0, -1).join(', ') + ' & ' + names[names.length - 1]
}

function generateInvitationEmail(guestName: string, partyNames: string, inviteUrl: string, locale: string): string {
  const content = {
    en: {
      subject: 'You\'re invited — Gian & Cat, 3 October 2026',
      body: 'We\'re getting married, and we would love for you to be there.',
      details: 'Saturday, 3 October 2026 at La Garriga de Castelladral',
      info: 'You\'ll find everything you need on your invitation page.',
      questions: 'Questions? Get in touch at balfour.cat@gmail.com.',
      cta: 'View your invitation',
      closing: 'With love,',
      names: 'Gian &amp; Cat',
    },
    pt: {
      subject: 'Você está convidado/a',
      body: 'Vamos casar e adoraríamos contar com a sua presença.',
      details: 'Sábado, 3 de outubro de 2026 na Garriga de Castelladral',
      info: 'Encontrarás tudo o que precisa na página de convite.',
      questions: 'Dúvidas? Entre em contato em balfour.cat@gmail.com.',
      cta: 'Ver convite',
      closing: 'Com amor,',
      names: 'Gian &amp; Cat',
    },
    es: {
      subject: 'Estás invitado/a — Gian & Cat, 3 de octubre de 2026',
      body: 'Nos casamos y nos encantaría que estuvieras con nosotros.',
      details: 'Sábado, 3 de octubre de 2026 en La Garriga de Castelladral',
      info: 'Encontrarás todo lo que necesitas en la invitación.',
      questions: '¿Alguna pregunta? Contáctanos en balfour.cat@gmail.com.',
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

export async function POST(request: NextRequest) {
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

    // Fetch party members for this guest
    const { data: partyMembers } = await supabaseAdmin
      .from('party_members')
      .select('name')
      .eq('guest_id', guest.id)

    const locale = guest.language || 'en'
    const localePath = locale === 'en' ? '' : `/${locale}`
    const inviteUrl = `${baseUrl}${localePath}/invite?guest=${guest.invite_token}`
    const partyNames = formatPartyNames(guest.name, partyMembers || [])

    const subjectMap: Record<string, string> = {
      en: "You're invited — Gian & Cat, 3 October 2026",
      pt: 'Você está convidado/a — Gian & Cat, 3 de outubro de 2026',
      es: 'Estás invitado/a — Gian & Cat, 3 de octubre de 2026',
    }

    try {
      await sendEmail({
        to: guest.email,
        subject: subjectMap[locale] || subjectMap.en,
        html: generateInvitationEmail(guest.name, partyNames, inviteUrl, locale),
      })
    } catch (sendError: any) {
      results.push({ id: guest.id, success: false, error: sendError.message })
      continue
    }

    {
      await supabaseAdmin
        .from('guests')
        .update({ invited_at: new Date().toISOString() })
        .eq('id', guest.id)
      results.push({ id: guest.id, success: true })
    }
  }

  const successCount = results.filter(r => r.success).length
  const failCount    = results.filter(r => !r.success).length

  // Log to email_campaigns so it shows up in /admin/comms history
  try {
    const sentNames = results
      .filter(r => r.success)
      .map(r => guests.find(g => g.id === r.id)?.name || r.id)
      .join(', ')
    await supabaseAdmin.from('email_campaigns').insert({
      subject:          'Wedding invitation',
      body:             'Wedding invitation email',
      recipient_filter: 'invitation',
      recipient_count:  successCount,
      failed_count:     failCount,
      recipient_names:  sentNames,
      sent_by:          process.env.GMAIL_USER,
    })
  } catch { /* table may not exist yet */ }

  return NextResponse.json({ results, successCount, total: guests.length })
}
