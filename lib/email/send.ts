import { Resend } from 'resend'

/**
 * Single outbound email entry point. All transactional and broadcast email
 * is sent through Resend.
 *
 * Required env: RESEND_API_KEY, RESEND_FROM_EMAIL (e.g. "Gian & Cat <hello@example.com>").
 * Optional env: EMAIL_CC, EMAIL_REPLY_TO.
 */
export interface SendEmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

let client: Resend | null = null

function getClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) throw new Error('RESEND_API_KEY is not configured')
  if (!client) client = new Resend(apiKey)
  return client
}

export async function sendEmail({ to, subject, html, text }: SendEmailOptions): Promise<void> {
  const from = process.env.RESEND_FROM_EMAIL
  if (!from) throw new Error('RESEND_FROM_EMAIL is not configured')

  const cc = process.env.EMAIL_CC || undefined
  const replyTo = process.env.EMAIL_REPLY_TO || undefined

  const { error } = await getClient().emails.send({
    from,
    to,
    subject,
    html,
    ...(text ? { text } : {}),
    ...(cc ? { cc } : {}),
    ...(replyTo ? { replyTo } : {}),
  })

  if (error) throw new Error(`Resend error: ${error.message}`)
}
