'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function HomeContentPT() {
  const searchParams = useSearchParams();
  const guestId = searchParams.get('guest');
  const [guestName, setGuestName] = useState<string | null>(null);
  const [guestNotFound, setGuestNotFound] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!guestId) {
      setGuestNotFound(true);
      setIsLoading(false);
    } else {
      fetchGuestName(guestId);
    }
  }, [guestId]);

  const fetchGuestName = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('guests')
        .select('name')
        .eq('id', id)
        .single();

      if (error || !data) {
        setGuestNotFound(true);
      } else {
        setGuestName(data.name);
      }
    } catch (error) {
      console.error('Error fetching guest:', error);
      setGuestNotFound(true);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <main className="flex h-screen flex-col items-center justify-center p-6" style={{ backgroundColor: '#f5f7fd' }}>
        <p className="text-gray-900">Carregando...</p>
      </main>
    );
  }

  if (guestNotFound) {
    return (
      <main className="flex h-screen flex-col items-center justify-center p-6" style={{ backgroundColor: '#f5f7fd' }}>
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-4xl font-bold text-gray-900" style={{ letterSpacing: '0.05em' }}>
            Não Encontrado
          </h1>
          <p className="text-lg text-gray-700">
            Não conseguimos encontrar seu convite. Por favor, verifique o link do convite.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex h-screen flex-col items-center justify-center p-6 pb-12 md:pb-6" style={{ backgroundColor: '#f5f7fd' }}>
      <div className="w-full max-w-xl md:max-w-lg mx-auto flex-shrink-0">
        <Image
          src="/save-the-date.png"
          alt="Save the Date"
          width={800}
          height={800}
          className="w-full h-auto rounded-lg"
          priority
        />
      </div>

      <div className="max-w-2xl w-full space-y-4 text-center mt-4">
        <div className="space-y-1">
          <h1 className="text-base md:text-md text-gray-900 font-semibold tracking-wide transform uppercase">
            {guestName}, você está convidado!
          </h1>
          <p className="text-base md:text-md text-gray-900 font-semibold tracking-wide transform uppercase">
            Gian & Cat vão se casar em 3/10/2026
          </p>
          <p className="text-base md:text-md text-gray-700">
            Por favor, nos avise se você pode comparecer
          </p>
        </div>

        <Link
          href={`/pt/rsvp?guest=${guestId}`}
          className="inline-block py-3 px-8 bg-gray-900 text-white font-semibold rounded-md shadow-sm hover:bg-gray-700 transition-all"
        >
          Confirmar Presença →
        </Link>
      </div>
    </main>
  );
}
