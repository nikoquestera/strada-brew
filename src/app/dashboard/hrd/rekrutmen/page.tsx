'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import RekrutmenClient from './RekrutmenClient'

export default function RekrutmenPage() {
  const supabase = createClient()
  const [applicants, setApplicants] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  async function fetchApplicants() {
    const { data } = await supabase
      .from('applicants')
      .select(`
        id, full_name, email, phone, position_applied,
        outlet_preference, source, pipeline_stage, quest_score,
        created_at,
        applicant_quest_scores (
          overall_score, recommendation, status, summary
        )
      `)
      .order('created_at', { ascending: false })
    if (data) setApplicants(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchApplicants()

    const channel = supabase
      .channel('rekrutmen-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'applicants' }, fetchApplicants)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'applicant_quest_scores' }, fetchApplicants)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: '12px' }}>
      <div style={{ fontSize: '24px', animation: 'spin 1s linear infinite' }}>⚙</div>
      <p style={{ color: '#8A8A8D', fontSize: '14px' }}>Memuat data pelamar...</p>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  return <RekrutmenClient initialApplicants={applicants} />
}
