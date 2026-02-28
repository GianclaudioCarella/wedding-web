import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getAccommodationTranslations, generateAccommodationEmailHtml, generateAccommodationPlainText } from '@/lib/email/accommodation-generator';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { guestName, guestEmail, locale = 'en' } = body;

    if (!guestName || !guestEmail) {
      return NextResponse.json(
        { error: 'Missing required fields: guestName, guestEmail' },
        { status: 400 }
      );
    }

    if (!process.env.RESEND_API_KEY || !resend) {
      console.error('RESEND_API_KEY not configured!');
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 500 }
      );
    }

    const t = getAccommodationTranslations(locale);
    const html = generateAccommodationEmailHtml(guestName, locale);
    const text = generateAccommodationPlainText(guestName, locale);

    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'hello@giancat.com',
      to: guestEmail,
      replyTo: process.env.RESEND_REPLY_TO_EMAIL,
      subject: t.subject,
      html,
      text,
    });

    if (error) {
      console.error('Resend error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log(`Accommodation email sent to ${guestEmail} (${locale}):`, data);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
