import { Suspense } from 'react';
import ConfirmationContent from './ConfirmationContent';

export default function Confirmation() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ backgroundColor: '#f5f7fd' }}>
        <p className="text-gray-900">Carregando...</p>
      </div>
    }>
      <ConfirmationContent />
    </Suspense>
  );
}
