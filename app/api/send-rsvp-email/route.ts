import { NextRequest, NextResponse } from 'next/server';
import { getTranslations, generateEmailHtml, generatePlainTextEmail } from '@/lib/email/generator';
import { sendEmail } from '@/lib/email/mailer';

export async function POST(request: NextRequest) {
  try {
    console.log('=== Email API called ===');
    const { guestName, guestEmail, attending, eventDate, eventLocation, locale = 'en' } = await request.json();
    console.log('Request data:', { guestName, guestEmail, attending, locale });

    // Validate required fields
    if (!guestName || !guestEmail || !attending) {
      console.error('Missing required fields:', { guestName, guestEmail, attending });
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const t = getTranslations(locale);

    await sendEmail({
      to: guestEmail,
      subject: t.subject,
      html: generateEmailHtml(guestName, eventDate, eventLocation, locale),
      text: generatePlainTextEmail(guestName, eventDate, eventLocation, locale),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    );
  }
}
