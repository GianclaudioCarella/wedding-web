import { NextRequest, NextResponse } from 'next/server';
import { getAccommodationTranslations, generateAccommodationEmailHtml, generateAccommodationPlainText } from '@/lib/email/accommodation-generator';
import { sendEmail } from '@/lib/email/send';
import { requireAdmin } from '@/lib/auth/requireAdmin';

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.ok) return auth.response
  try {
    const body = await request.json();
    const { guestName, guestEmail, locale = 'en' } = body;

    if (!guestName || !guestEmail) {
      return NextResponse.json(
        { error: 'Missing required fields: guestName, guestEmail' },
        { status: 400 }
      );
    }

    const t = getAccommodationTranslations(locale);

    await sendEmail({
      to: guestEmail,
      subject: t.subject,
      html: generateAccommodationEmailHtml(guestName, locale),
      text: generateAccommodationPlainText(guestName, locale),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
