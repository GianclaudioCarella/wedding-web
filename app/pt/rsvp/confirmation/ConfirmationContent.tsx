'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function ConfirmationContent() {
  const searchParams = useSearchParams();
  const guestId = searchParams.get('guest');
  const [attending, setAttending] = useState<string>('');
  
  const rsvpUrl = guestId ? `/pt/rsvp?guest=${guestId}` : '/pt/rsvp';
  const homeUrl = guestId ? `/pt?guest=${guestId}` : '/pt';

  useEffect(() => {
    if (guestId) {
      fetchAttendingStatus(guestId);
    }
  }, [guestId]);

  const fetchAttendingStatus = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('guests')
        .select('attending')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (data) {
        setAttending(data.attending || '');
      }
    } catch (error) {
      console.error('Error fetching attending status:', error);
    }
  };

  const getTitle = () => {
    if (attending === 'no') return 'Sentiremos sua falta!';
    if (attending === 'perhaps') return 'Esperamos que você possa vir!';
    return 'Obrigado!';
  };

  const getMessage = () => {
    if (attending === 'no') return 'Entendemos e esperamos celebrar com você em outra ocasião!';
    if (attending === 'perhaps') return 'Esperamos que você consiga comparecer!';
    return 'Esperamos ver você em breve!';
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ backgroundColor: '#f5f7fd' }}>
      <div className="max-w-md w-full text-center space-y-8">
        <div className="flex justify-center">
          <Image
            src="/save-the-date.png"
            alt="Save the Date"
            width={200}
            height={200}
            priority
            className="rounded-lg"
          />
        </div>
        
        <div className="space-y-4">
          <h1 className="text-4xl font-bold text-gray-900" style={{ letterSpacing: '0.05em' }}>
            {getTitle()}
          </h1>
          <p className="text-xl text-gray-900">
            {getMessage()}
          </p>
        </div>

        <div className="flex flex-col gap-4 mt-8">
          <Link 
            href={rsvpUrl}
            className="inline-block px-6 py-3 bg-gray-900 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            Editar RSVP
          </Link>
          <Link 
            href={homeUrl}
            className="inline-block text-gray-900 hover:text-gray-600 transition-colors"
          >
            ← Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  );
}
