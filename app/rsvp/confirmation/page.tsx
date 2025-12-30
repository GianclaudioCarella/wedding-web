import { Suspense } from 'react';
import ConfirmationPage from '@/components/rsvp/ConfirmationPage';

export default function Confirmation() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ backgroundColor: '#f5f7fd' }}>
        <p className="text-gray-900">Loading...</p>
      </div>
    }>
      <ConfirmationPage locale="en" />
    </Suspense>
  );
}
