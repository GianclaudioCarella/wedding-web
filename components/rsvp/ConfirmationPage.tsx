'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getTranslation } from '@/lib/translations';

const TEXT  = 'var(--color-text)'
const MUTED = 'var(--color-muted)'
const SERIF = 'var(--font-serif)'
const SANS  = 'var(--font-sans)'

interface ConfirmationPageProps {
  locale: string;
}

export default function ConfirmationPage({ locale }: ConfirmationPageProps) {
  const t = getTranslation(locale);
  const searchParams = useSearchParams();
  const guestId = searchParams.get('guest');
  const [attending, setAttending] = useState<boolean | null>(null);

  const baseUrl   = locale === 'en' ? '' : `/${locale}`;
  const rsvpUrl   = guestId ? `${baseUrl}/rsvp?guest=${guestId}` : `${baseUrl}/rsvp`;
  const inviteUrl = guestId ? `${baseUrl}/invite?guest=${guestId}` : `${baseUrl}/invite`;

  useEffect(() => {
    if (!guestId) return;
    (async () => {
      // Look up guest by invite_token to get their id
      const { data: guestData } = await supabase
        .from('guests')
        .select('id')
        .eq('invite_token', guestId)
        .single();

      if (!guestData) return;

      // Check rsvp_responses for this guest
      const { data: rsvps } = await supabase
        .from('rsvp_responses')
        .select('status')
        .eq('guest_id', guestData.id);

      if (!rsvps || rsvps.length === 0) return;

      const hasAttending = rsvps.some(r => r.status === 'attending');
      setAttending(hasAttending);
    })();
  }, [guestId]);

  const isNo = attending === false;

  const title   = isNo ? t.confirmation.titleNo   : t.confirmation.titleYes;
  const message = isNo ? t.confirmation.messageNo : t.confirmation.messageYes;

  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingBlock: 'var(--space-section)' }}>
      <div style={{ width: '100%', maxWidth: 480, textAlign: 'center' }}>

        <p style={{ fontFamily: SANS, fontSize: 'var(--text-xs)', letterSpacing: 'var(--tracking-widest)', textTransform: 'uppercase', color: MUTED, margin: 0, marginBottom: 12 }}>
          {t.confirmation.received}
        </p>
        <h1 style={{ fontFamily: SERIF, fontSize: 'clamp(28px, 4vw, 42px)', color: TEXT, margin: 0, marginBottom: 16, fontWeight: 400, lineHeight: 1.2 }}>
          {title}
        </h1>
        <p style={{ fontFamily: SANS, fontSize: 'var(--text-base)', color: MUTED, margin: '0 auto', marginBottom: 48, maxWidth: 360, lineHeight: 'var(--leading-normal)' }}>
          {message}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <Link href={inviteUrl} className="btn btn-primary">
            {t.confirmation.backToInvitation}
          </Link>
          <Link
            href={rsvpUrl}
            style={{ fontFamily: SANS, fontSize: 'var(--text-sm)', color: MUTED, textDecoration: 'underline', textUnderlineOffset: 3 }}
          >
            {t.confirmation.editRsvp}
          </Link>
        </div>

      </div>
    </main>
  );
}
