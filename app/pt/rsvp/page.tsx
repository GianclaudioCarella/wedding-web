import { Suspense } from 'react';
import RSVPContentPT from './RSVPContent';

export default function RSVPPagePT() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ backgroundColor: '#f5f7fd' }}>
        <p className="text-gray-900">Carregando...</p>
      </div>
    }>
      <RSVPContentPT />
    </Suspense>
  );
}
