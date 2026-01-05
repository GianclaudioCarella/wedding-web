import { NextRequest, NextResponse } from 'next/server';
import { getTranslations, generateEmailHtml } from '@/lib/email/generator';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  
  // Get parameters from query string with defaults
  const guestName = searchParams.get('name') || 'John Doe';
  const locale = searchParams.get('locale') || 'en';
  
  // Default dates localized by language
  const defaultDates: Record<string, string> = {
    'en': 'Saturday, October 3, 2026',
    'es': 'Sábado, 3 de octubre de 2026',
    'pt': 'Sábado, 3 de outubro de 2026'
  };
  
  const defaultLocations: Record<string, string> = {
    'en': 'La Garriga de Castelladral, Barcelona',
    'es': 'La Garriga de Castelladral, Barcelona',
    'pt': 'La Garriga de Castelladral, Barcelona'
  };
  
  const eventDate = searchParams.get('eventDate') || defaultDates[locale] || defaultDates['en'];
  const eventLocation = searchParams.get('eventLocation') || defaultLocations[locale] || defaultLocations['en'];

  // Generate the same HTML as the email
  let emailHtml = generateEmailHtml(guestName, eventDate, eventLocation, locale);
  
  // Add preview banner to the top
  const previewBanner = `
  <div style="background-color: #fef3c7; border: 2px solid #f59e0b; padding: 15px; text-align: center; font-weight: 600; color: #92400e; margin-bottom: 20px;">
    📧 EMAIL PREVIEW MODE - This email will not be sent
  </div>
  `;
  
  // Add parameter info at the bottom
  const paramInfo = `
  <div style="max-width: 600px; margin: 20px auto; padding: 20px; background-color: #f3f4f6; border-radius: 8px; font-family: monospace; font-size: 14px;">
    <h3 style="margin-top: 0;">🔍 Preview URL Parameters:</h3>
    <p><strong>Current values:</strong></p>
    <ul style="list-style: none; padding: 0;">
      <li>• name: ${guestName}</li>
      <li>• locale: ${locale}</li>
      <li>• eventDate: ${eventDate}</li>
      <li>• eventLocation: ${eventLocation}</li>
    </ul>
    <p><strong>Test different languages:</strong></p>
    <ul style="padding-left: 20px;">
      <li><a href="?locale=en&name=John Doe">🇺🇸 English</a></li>
      <li><a href="?locale=es&name=María García">🇪🇸 Español</a></li>
      <li><a href="?locale=pt&name=João Silva">🇧🇷 Português</a></li>
    </ul>
  </div>
  `;
  
  // Insert banner after <body> tag and append param info before </body>
  emailHtml = emailHtml.replace('<body>', '<body>' + previewBanner);
  emailHtml = emailHtml.replace('</body>', paramInfo + '</body>');

  // Return HTML response
  return new NextResponse(emailHtml, {
    headers: {
      'Content-Type': 'text/html',
    },
  });
}
