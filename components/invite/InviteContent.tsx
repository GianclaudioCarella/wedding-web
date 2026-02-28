'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { getTranslation } from '@/lib/i18n/translations';

interface Guest {
  id: string;
  name: string;
  attending: string | null;
  email: string | null;
}

interface InviteContentProps {
  guestId: string;
  locale: 'en' | 'pt' | 'es';
}

export default function InviteContent({ guestId, locale }: InviteContentProps) {
  const t = getTranslation(locale);
  const [guest, setGuest] = useState<Guest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetchGuest();
  }, [guestId]);

  const fetchGuest = async () => {
    try {
      const { data, error } = await supabase
        .from('guests')
        .select('id, name, attending, email')
        .eq('id', guestId)
        .single();

      if (error || !data) {
        console.error('Supabase error:', error);
        setNotFound(true);
      } else {
        setGuest(data);
      }
    } catch (error) {
      console.error('Error fetching guest:', error);
      setNotFound(true);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 to-pink-50">
        <p className="text-lg text-gray-600">{t.common.loading}</p>
      </div>
    );
  }

  if (notFound || !guest) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 to-pink-50 p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">{t.invite.notFound.title}</h1>
          <p className="text-gray-600 mb-6">{t.invite.notFound.message}</p>
          <Link
            href={locale === 'en' ? '/' : `/${locale}`}
            className="inline-block px-6 py-3 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors"
          >
            {t.confirmation.backHome}
          </Link>
        </div>
      </div>
    );
  }

  const hasConfirmed = guest.attending !== null;
  const rsvpLink = locale === 'en' ? `/rsvp?guest=${guest.id}` : `/${locale}/rsvp?guest=${guest.id}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50 p-4">
      <div className="max-w-4xl mx-auto py-12">
        {/* Header decorativo */}
        <div className="text-center mb-12">
          <div className="text-6xl mb-4">💍</div>
          <h1 className="text-5xl md:text-6xl font-serif text-gray-800 mb-2">
            {t.invite.header.title}
          </h1>
          <div className="text-2xl md:text-3xl font-light text-gray-600 mb-8">
            Gian & Cat
          </div>
        </div>

        {/* Convite principal */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12 mb-8">
          {/* Saudação personalizada */}
          <div className="text-center mb-8">
            <p className="text-lg text-gray-600 mb-2">{t.invite.greeting.dear}</p>
            <p className="text-3xl font-serif text-rose-600 mb-6">{guest.name}</p>
            <p className="text-xl text-gray-700 leading-relaxed">
              {t.invite.greeting.message}
            </p>
          </div>

          {/* Detalhes do evento */}
          <div className="border-t border-b border-gray-200 py-8 my-8">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="text-center md:text-left">
                <h3 className="text-sm uppercase tracking-wider text-gray-500 mb-2">
                  {t.invite.details.date}
                </h3>
                <p className="text-xl font-semibold text-gray-800">
                  {/* Placeholder - pode substituir depois */}
                  {locale === 'pt' ? 'Sábado, 15 de Agosto de 2026' : 
                   locale === 'es' ? 'Sábado, 15 de Agosto de 2026' :
                   'Saturday, August 15th, 2026'}
                </p>
              </div>
              <div className="text-center md:text-left">
                <h3 className="text-sm uppercase tracking-wider text-gray-500 mb-2">
                  {t.invite.details.time}
                </h3>
                <p className="text-xl font-semibold text-gray-800">
                  {locale === 'pt' ? '16:00' : locale === 'es' ? '16:00' : '4:00 PM'}
                </p>
              </div>
              <div className="text-center md:text-left md:col-span-2">
                <h3 className="text-sm uppercase tracking-wider text-gray-500 mb-2">
                  {t.invite.details.location}
                </h3>
                <p className="text-xl font-semibold text-gray-800">
                  {/* Placeholder - pode substituir depois */}
                  {t.invite.details.locationName}
                </p>
              </div>
            </div>
          </div>

          {/* Status do RSVP */}
          <div className="text-center">
            {hasConfirmed ? (
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-6 py-3 bg-green-100 text-green-800 rounded-full">
                  <span className="text-2xl">✓</span>
                  <span className="font-semibold">{t.invite.rsvp.confirmed}</span>
                </div>
                <p className="text-gray-600">
                  {guest.attending === 'yes' 
                    ? t.invite.rsvp.statusYes
                    : guest.attending === 'maybe'
                    ? t.invite.rsvp.statusMaybe
                    : t.invite.rsvp.statusNo}
                </p>
                {guest.attending !== 'no' && (
                  <p className="text-sm text-gray-500 mt-4">
                    {t.invite.rsvp.moreDetails}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-lg text-gray-700 mb-4">
                  {t.invite.rsvp.pleaseConfirm}
                </p>
                <Link
                  href={rsvpLink}
                  className="inline-block px-8 py-4 bg-rose-500 text-white text-lg font-semibold rounded-lg hover:bg-rose-600 transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
                >
                  {t.invite.rsvp.confirmButton}
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-gray-600">
          <p className="text-sm">{t.invite.footer.lookingForward}</p>
        </div>
      </div>
    </div>
  );
}
