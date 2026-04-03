'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function HomeContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('guest');
  const [guestName, setGuestName] = useState<string | null>(null);
  const [guestNotFound, setGuestNotFound] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setGuestNotFound(true);
      setIsLoading(false);
    } else {
      fetchGuest(token);
    }
  }, [token]);

  const fetchGuest = async (t: string) => {
    try {
      const res = await fetch(`/api/guest?token=${t}`)
      if (!res.ok) {
        setGuestNotFound(true);
      } else {
        const data = await res.json();
        setGuestName(data.name);
      }
    } catch {
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
      <main className="flex h-screen flex-col items-center justify-center p-6" style={{ backgroundColor: '#fafafa' }}>
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
    <main className="flex h-screen flex-col items-center justify-center p-6 pb-12 md:pb-6" style={{ backgroundColor: '#fff' }}>
      {/* Wedding Save the Date Image */}
      <div className="w-full max-w-xl md:max-w-lg mx-auto flex-shrink-0">
        <img
          src="/save-the-date-gif.gif"
          alt="Save the Date"
          className="w-full h-auto rounded-lg"
        />
      </div>

      <div className="max-w-2xl w-full space-y-4 text-center mt-4">
        <div className="space-y-1">
          <h1 className="text-base md:text-md text-gray-900 font-semibold">
            {guestName} — Save the date.
          </h1>
          <div>
          <p className="text-base md:text-md text-gray-700">
            Let us know if you can make it. Yes, no, or maybe all help us plan.</p>
            <p className="text-base md:text-md text-gray-700">More details to follow</p>
          </div>
        </div>

        <Link
          href={`/rsvp?guest=${token}`}
          className="inline-block text-black underline underline-offset-4 hover:text-gray-600 transition-colors"
        >
          Let us know as soon as you can →
        </Link>
      </div>
    </main>
  );
}
