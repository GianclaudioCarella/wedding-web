import Link from 'next/link';
import Image from 'next/image';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 pb-12 md:pb-6" style={{ backgroundColor: '#f5f7fd' }}>
      {/* Wedding Save the Date Image */}
      <div className="w-full max-w-xl mx-auto flex-shrink-0">
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
        <div className="space-y-2">
          <h1 className="text-base md:text-md text-gray-900 font-semibold tracking-wide transform uppercase">
            Gian & Cat are getting married 3/10/2026
          </h1>
          <p className="text-base md:text-md text-gray-700">
             Please let us know if you can make it
          </p>
        </div>

        <Link
          href="/rsvp"
          className="inline-block py-3 px-8 bg-gray-900 text-white font-semibold rounded-md shadow-sm hover:bg-gray-700 transition-all"
        >
          RSVP Now →
        </Link>
      </div>
    </main>
  );
}
