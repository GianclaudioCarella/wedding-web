'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function HomeContent() {
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
        <p className="text-gray-900">Loading...</p>
      </main>
    );
  }

  if (guestNotFound) {
    return (
      <main className="flex h-screen flex-col items-center justify-center p-6" style={{ backgroundColor: '#f5f7fd' }}>
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-4xl font-bold text-gray-900" style={{ letterSpacing: '0.05em' }}>
            Not Found
          </h1>
          <p className="text-lg text-gray-700">
            We couldn't find your invitation. Please check your invitation link.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex h-screen flex-col items-center justify-center p-6 pb-12 md:pb-6" style={{ backgroundColor: '#f5f7fd' }}>
      {/* Wedding Save the Date Image */}
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
            {guestName}, you're invited!
          </h1>
          <h1 className="text-base md:text-md text-gray-900 font-semibold tracking-wide transform uppercase">
            Gian & Cat are getting married 3/10/2026.
          </h1>
          <p className="text-base md:text-md text-gray-700">
            Please let us know if you can make it
          </p>
        </div>

        <Link
          href={`/rsvp?guest=${guestId}`}
          className="inline-block px-6 py-3 bg-gray-900 text-white font-semibold rounded-md hover:bg-gray-700 transition-all"
        >
          RSVP Now →
        </Link>
      </div>
    </main>
  );
}
