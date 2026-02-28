import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getTranslations, generateEmailHtml, generatePlainTextEmail } from '@/lib/email/generator';

// Only initialize Resend if API key is available
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

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

    // Check API key
    if (!process.env.RESEND_API_KEY || !resend) {
      console.error('RESEND_API_KEY not configured!');
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 500 }
      );
    }

    console.log('Using from email:', process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev');

    // Get translations
    const t = getTranslations(locale);

    // Generate email HTML
    const emailHtml = generateEmailHtml(guestName, eventDate, eventLocation, locale);
    const subject = t.subject;

    console.log('Sending email with subject:', subject);

    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
      to: guestEmail,
      subject: subject,
      html: emailHtml,
      text: generatePlainTextEmail(guestName, eventDate, eventLocation, locale),
      replyTo: process.env.RESEND_REPLY_TO_EMAIL || process.env.RESEND_FROM_EMAIL,
    });

    if (error) {
      console.error('Resend error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('Email sent successfully! ID:', data?.id);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    );
  }
}
