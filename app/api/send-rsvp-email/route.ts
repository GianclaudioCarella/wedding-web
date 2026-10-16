import { NextRequest, NextResponse } from 'next/server';
import { getTranslations, generateEmailHtml, generatePlainTextEmail } from '@/lib/email/generator';
import { sendEmail } from '@/lib/email/mailer';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: NextRequest) {
  try {
    console.log('=== Email API called ===');
    const { guestName, guestEmail, attending, eventDate, eventLocation, locale = 'en' } = await request.json();

    // Validate required fields
    if (!guestName || typeof guestEmail !== 'string' || !guestEmail || !attending) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Public endpoint (legacy PT RSVP page): only send to an address that belongs
    // to a known guest, so this cannot be used as an open mail relay.
    const { data: knownGuest } = await supabaseAdmin
      .from('guests')
      .select('id')
      .ilike('email', guestEmail.trim().replace(/[\\%_]/g, (c: string) => `\\${c}`))
      .limit(1)
      .maybeSingle();
    if (!knownGuest) {
      return NextResponse.json({ error: 'Unknown guest' }, { status: 404 });
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
