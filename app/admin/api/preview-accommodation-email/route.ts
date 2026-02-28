import { NextRequest, NextResponse } from 'next/server';
import { generateAccommodationEmailHtml } from '@/lib/email/accommodation-generator';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const guestName = searchParams.get('name') || 'John Doe';
  const locale = searchParams.get('locale') || 'en';

  let emailHtml = generateAccommodationEmailHtml(guestName, locale);

  const previewBanner = `
  <div style="background-color: #fef3c7; border: 2px solid #f59e0b; padding: 15px; text-align: center; font-weight: 600; color: #92400e; margin-bottom: 20px;">
    📧 EMAIL PREVIEW MODE - This email will not be sent
  </div>
  `;

  const paramInfo = `
  <div style="max-width: 600px; margin: 20px auto; padding: 20px; background-color: #f3f4f6; border-radius: 8px; font-family: monospace; font-size: 14px;">
    <h3 style="margin-top: 0;">🔍 Preview URL Parameters:</h3>
    <ul style="list-style: none; padding: 0;">
      <li>• name: ${guestName}</li>
      <li>• locale: ${locale}</li>
    </ul>
    <p><strong>Test different languages:</strong></p>
    <ul style="padding-left: 20px;">
      <li><a href="?locale=en&name=John Doe">🇺🇸 English</a></li>
      <li><a href="?locale=es&name=María García">🇪🇸 Español</a></li>
      <li><a href="?locale=pt&name=João Silva">🇧🇷 Português</a></li>
    </ul>
  </div>
  `;

  emailHtml = emailHtml.replace('<body>', '<body>' + previewBanner);
  emailHtml = emailHtml.replace('</body>', paramInfo + '</body>');

  return new NextResponse(emailHtml, {
    headers: { 'Content-Type': 'text/html' },
  });
}
