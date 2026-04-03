'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const TEXT  = 'var(--color-text)'
const MUTED = 'var(--color-muted)'
const SERIF = 'var(--font-serif)'
const SANS  = 'var(--font-sans)'

export default function ConfirmationContent() {
  const searchParams = useSearchParams();
  const guestId = searchParams.get('guest');
  const [attending, setAttending] = useState<string>('');

  const rsvpUrl  = guestId ? `/rsvp?guest=${guestId}` : '/rsvp';
  const inviteUrl = guestId ? `/invite?guest=${guestId}` : '/invite';

  useEffect(() => {
    if (!guestId) return;
    supabase
      .from('guests')
      .select('attending')
      .eq('id', guestId)
      .single()
      .then(({ data }) => { if (data) setAttending(data.attending || '') });
  }, [guestId]);

  const title = attending === 'no' ? "We'll miss you."
    : attending === 'perhaps' ? "Hope you can make it."
    : "See you there.";

  const message = attending === 'no'
    ? "We're sorry you can't join us. We hope to celebrate with you another time."
    : attending === 'perhaps'
    ? "We'll keep our fingers crossed. You can update your response any time."
    : "Your RSVP is confirmed. We can't wait to celebrate with you.";

  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingBlock: 'var(--space-section)' }}>
      <div style={{ width: '100%', maxWidth: 480, textAlign: 'center' }}>

        {/* Heading */}
        <p style={{ fontFamily: SANS, fontSize: 'var(--text-xs)', letterSpacing: 'var(--tracking-widest)', textTransform: 'uppercase', color: MUTED, margin: 0, marginBottom: 12 }}>
          RSVP Received
        </p>
        <h1 style={{ fontFamily: SERIF, fontSize: 'clamp(28px, 4vw, 42px)', color: TEXT, margin: 0, marginBottom: 16, fontWeight: 400, lineHeight: 1.2 }}>
          {title}
        </h1>
        <p style={{ fontFamily: SANS, fontSize: 'var(--text-base)', color: MUTED, margin: '0 auto', marginBottom: 48, maxWidth: 360, lineHeight: 'var(--leading-normal)' }}>
          {message}
        </p>

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <Link
            href={inviteUrl}
            style={{
              fontFamily: SANS,
              fontSize: 'var(--text-sm)',
              color: '#ffffff',
              background: TEXT,
              padding: '14px 36px',
              borderRadius: 'var(--radius-pill)',
              textDecoration: 'none',
              letterSpacing: 'var(--tracking-wide)',
              textTransform: 'uppercase',
              fontWeight: 500,
            }}
          >
            Back to invitation
          </Link>
          <Link
            href={rsvpUrl}
            style={{ fontFamily: SANS, fontSize: 'var(--text-sm)', color: MUTED, textDecoration: 'underline', textUnderlineOffset: 3 }}
          >
            Edit RSVP
          </Link>
        </div>

      </div>
    </main>
  );
}
