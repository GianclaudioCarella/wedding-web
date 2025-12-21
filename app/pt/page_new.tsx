import { Suspense } from 'react';
import HomeContentPT from './HomeContentPT';

export default function Home() {
  return (
    <Suspense fallback={
      <main className="flex h-screen flex-col items-center justify-center p-6" style={{ backgroundColor: '#f5f7fd' }}>
        <p className="text-gray-900">Carregando...</p>
      </main>
    }>
      <HomeContentPT />
    </Suspense>
  );
}
