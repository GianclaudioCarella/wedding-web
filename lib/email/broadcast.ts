export function generateBroadcastHtml(
  body: string,
  firstName: string,
  inviteUrl: string,
  rsvpUrl?: string
): string {
  const withValues = body
    .replace(/\{\{first_name\}\}/g, firstName)
    .replace(
      /\{\{invitation_link\}\}/g,
      `<a href="${inviteUrl}" style="color:#2D6B52;text-underline-offset:3px;">${inviteUrl}</a>`
    )
    .replace(
      /\{\{rsvp_link\}\}/g,
      rsvpUrl ? `<a href="${rsvpUrl}" style="color:#2D6B52;text-underline-offset:3px;">${rsvpUrl}</a>` : ''
    )

  const htmlBody = withValues
    .split(/\n{2,}/)
    .map(para => {
      const formatted = para
        .replace(/\n/g, '<br>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      return `<p style="margin:0 0 16px;font-size:15px;color:#262626;line-height:1.7;">${formatted}</p>`
    })
    .join('')

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0;padding:24px 16px;font-family:Georgia,serif;font-size:15px;color:#262626;line-height:1.7;max-width:520px;">
  ${htmlBody}
</body>
</html>`
}

export function generateBroadcastText(
  body: string,
  firstName: string,
  inviteUrl: string,
  rsvpUrl?: string
): string {
  return (
    body
      .replace(/\{\{first_name\}\}/g, firstName)
      .replace(/\{\{invitation_link\}\}/g, inviteUrl)
      .replace(/\{\{rsvp_link\}\}/g, rsvpUrl ?? '')
      .replace(/\*\*(.+?)\*\*/g, '$1') +
    '\n\nWith love,\nGian & Cat'
  )
}
