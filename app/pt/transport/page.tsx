import { Suspense } from 'react'
import TransportContent from '../TransportContent'

export default function TransportPagePT() {
  return (
    <Suspense>
      <TransportContent locale="pt" />
    </Suspense>
  )
}
