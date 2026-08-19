import { Suspense } from 'react'
import TransportContent from './TransportContent'

export default function TransportPage() {
  return (
    <Suspense>
      <TransportContent locale="en" />
    </Suspense>
  )
}
