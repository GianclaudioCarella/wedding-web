import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
})

interface SendEmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

export async function sendEmail({ to, subject, html, text }: SendEmailOptions) {
  const from = `Gian & Cat <${process.env.GMAIL_USER}>`
  const cc   = process.env.GMAIL_CC || undefined

  await transporter.sendMail({
    from,
    to,
    cc,
    replyTo: process.env.GMAIL_USER,
    subject,
    html,
    ...(text ? { text } : {}),
  })
}
