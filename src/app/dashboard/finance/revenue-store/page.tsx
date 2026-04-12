import { Suspense } from 'react'
import RevenueStoreClient from './RevenueStoreClient'

export const metadata = {
  title: 'Revenue Store | Strada BREW',
}

export default function RevenuePage() {
  return (
    <Suspense>
      <RevenueStoreClient />
    </Suspense>
  )
}
