import { Suspense } from 'react'
import InviteContent from '@/app/invite/InviteContent'

export default function InvitePageES() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-gray-400 text-sm">Loading…</p>
      </div>
    }>
      <InviteContent locale="es" />
    </Suspense>
  )
}
