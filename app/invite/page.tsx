import { Suspense } from 'react'
import InviteContent from './InviteContent'

export default function InvitePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-gray-400 text-sm">Loading…</p>
      </div>
    }>
      <InviteContent locale="en" />
    </Suspense>
  )
}
