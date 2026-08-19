import { Suspense } from 'react'
import TransportContent from '../TransportContent'

export default function TransportPageES() {
  return (
    <Suspense>
      <TransportContent locale="es" />
    </Suspense>
  )
}
