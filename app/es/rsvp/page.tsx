import { Suspense } from 'react';
import RSVPForm from '@/components/rsvp/RSVPForm';

export default function RSVPPageES() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ backgroundColor: '#f5f7fd' }}>
        <p className="text-gray-900">Cargando...</p>
      </div>
    }>
      <RSVPForm locale="es" />
    </Suspense>
  );
}
