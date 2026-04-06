export const dynamic = "force-dynamic"
import { createClient } from '@/lib/supabase/server'
import WeightsClient from './WeightsClient'

export default async function WeightsPage() {
  const supabase = await createClient()
  const { data: weights } = await supabase
    .from('scoring_weights')
    .select('*')
    .order('created_at', { ascending: false })

  return <WeightsClient initialWeights={weights || []} />
}
