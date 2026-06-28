export function generateBroadcastHtml(
  body: string,
  firstName: string,
  inviteUrl: string
): string {
  const withValues = body
    .replace(/\{\{first_name\}\}/g, firstName)
    .replace(
      /\{\{invitation_link\}\}/g,
      `<a href="${inviteUrl}" style="color:#2D6B52;text-underline-offset:3px;">${inviteUrl}</a>`
    )

  const htmlBody = withValues
    .split(/\n{2,}/)
    .map(para =>
      `<p style="margin:0 0 16px;font-size:15px;color:#262626;line-height:1.7;">${para.replace(/\n/g, '<br>')}</p>`
    )
    .join('')

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#F7F7F5;font-family:system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F7F5;padding:48px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#FFFFFF;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
        <tr>
          <td style="padding:48px 48px 32px;text-align:center;border-bottom:1px solid rgba(0,0,0,0.08);">
            <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#2D6B52;font-weight:600;">Gian &amp; Cat · October 2026</p>
            <p style="margin:0;font-size:28px;font-weight:400;color:#262626;line-height:1.3;">Gian &amp; Cat</p>
          </td>
        </tr>
        <tr>
          <td style="padding:40px 48px 32px;">
            ${htmlBody}
            <p style="margin:32px 0 4px;font-size:14px;color:#888888;">With love,</p>
            <p style="margin:0;font-size:16px;font-weight:500;color:#262626;">Gian &amp; Cat</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export function generateBroadcastText(
  body: string,
  firstName: string,
  inviteUrl: string
): string {
  return (
    body
      .replace(/\{\{first_name\}\}/g, firstName)
      .replace(/\{\{invitation_link\}\}/g, inviteUrl) +
    '\n\nWith love,\nGian & Cat'
  )
}
