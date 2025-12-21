import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-gradient-to-b from-rose-50 to-white">
      <div className="max-w-2xl w-full space-y-8 text-center">
        {/* Placeholder for wedding illustration */}
        <div className="w-full aspect-square max-w-md mx-auto bg-gradient-to-br from-rose-200 to-pink-200 rounded-lg shadow-2xl flex items-center justify-center">
          <div className="text-gray-600 text-center p-8">
            <svg
              className="w-32 h-32 mx-auto mb-4 text-rose-300"
              fill="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
            <p className="text-lg font-semibold text-gray-700">Wedding Illustration</p>
            <p className="text-sm text-gray-500 mt-2">Image placeholder - Upload your illustration here</p>
          </div>
        </div>

        <div className="space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-800">
            You're Invited!
          </h1>
          <p className="text-lg md:text-xl text-gray-600">
            Join us as we celebrate our special day
          </p>
        </div>

        <Link
          href="/rsvp"
          className="inline-block px-8 py-4 bg-rose-500 text-white font-semibold rounded-full shadow-lg hover:bg-rose-600 transition-all transform hover:scale-105 active:scale-95"
        >
          RSVP Now
        </Link>
      </div>
    </main>
  );
}
