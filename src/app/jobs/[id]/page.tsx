export const dynamic = "force-dynamic"
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { MapPin, Briefcase, DollarSign, ArrowLeft } from 'lucide-react'

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: job } = await supabase
    .from('job_postings')
    .select('id, job_id, title, department, location, outlet, employment_type, salary_display, description, requirements, is_urgent, is_active')
    .eq('job_id', id)
    .single()

  if (!job) notFound()

  const requirementLines = job.requirements
    ? (Array.isArray(job.requirements) ? job.requirements : String(job.requirements).split('\n').filter(Boolean))
    : []

  return (
    <div className="min-h-screen bg-[#F5F5F7] font-sans pb-20">
      {/* Top bar */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-gray-200/50 sticky top-0 z-30 px-4 py-3 flex items-center shadow-sm gap-4">
        <Link href="/apply" className="p-2 -ml-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors flex items-center gap-2 font-semibold text-sm">
          <ArrowLeft size={20} /> Semua Lowongan
        </Link>
        <img src="/strada-logo.svg" alt="Strada Coffee" className="h-10 w-auto filter grayscale contrast-200 ml-auto" />
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-8">

        {/* Header card */}
        <div className="bg-white rounded-3xl p-8 sm:p-10 shadow-sm border border-gray-100 mb-6">
          {job.is_urgent && (
            <span className="inline-block px-3 py-1 rounded-full bg-red-50 text-strada-coral text-[10px] font-extrabold tracking-widest uppercase mb-4">
              Segera Diisi
            </span>
          )}
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-2 tracking-tight">{job.title}</h1>
          <p className="text-strada-blue font-bold text-base mb-8">{job.department} · Strada Coffee</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { icon: MapPin, label: 'Lokasi', value: job.outlet || job.location || '-' },
              { icon: Briefcase, label: 'Tipe', value: job.employment_type || 'Full-time' },
              { icon: DollarSign, label: 'Gaji', value: job.salary_display || 'Kompetitif' },
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <div key={idx} className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                  <Icon size={24} className="text-gray-400 mb-3" />
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">{item.label}</p>
                  <p className="text-[14px] text-gray-900 font-bold">{item.value}</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Description */}
        {job.description && (
          <div className="bg-white rounded-3xl p-8 sm:p-10 shadow-sm border border-gray-100 mb-6">
            <h2 className="text-lg font-extrabold text-gray-900 mb-4">Tentang Posisi Ini</h2>
            <p className="text-[15px] text-gray-600 leading-relaxed whitespace-pre-wrap">{job.description}</p>
          </div>
        )}

        {/* Requirements */}
        {requirementLines.length > 0 && (
          <div className="bg-white rounded-3xl p-8 sm:p-10 shadow-sm border border-gray-100 mb-8">
            <h2 className="text-lg font-extrabold text-gray-900 mb-5">Kualifikasi & Persyaratan</h2>
            <ul className="space-y-3">
              {requirementLines.map((req: string, i: number) => (
                <li key={i} className="flex gap-3 items-start">
                  <span className="text-strada-amber font-bold shrink-0 mt-0.5">✦</span>
                  <span className="text-[15px] text-gray-600 leading-relaxed">{req.replace(/^[-•*]\s*/, '')}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* CTA */}
        <div className="bg-gradient-to-br from-strada-blue to-[#025668] rounded-[40px] p-10 md:p-16 text-center shadow-xl text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
          
          <h2 className="text-[11px] font-black tracking-[0.3em] uppercase mb-4 opacity-80">SIAP BERGABUNG?</h2>
          <h3 className="text-3xl md:text-4xl font-[900] mb-6 tracking-tight">Kirim Lamaran Kamu</h3>
          <p className="text-blue-50 text-base md:text-lg max-w-xl mx-auto mb-10 leading-relaxed font-medium">
            Proses lamaran kami singkat dan mudah. Tim HR Strada Coffee meninjau setiap profil secara personal untuk memastikan kecocokan dengan kultur kami.
          </p>
          
          <Link href={`/apply?job=${job.job_id}`} 
            className="inline-block bg-white text-strada-blue px-12 py-4 rounded-full font-[900] text-base shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 active:translate-y-0">
            Lamar Sekarang →
          </Link>
          
          <p className="text-[11px] text-blue-200/60 mt-8 font-bold uppercase tracking-widest">
            Data kamu aman & hanya digunakan untuk proses rekrutmen
          </p>
        </div>
      </div>
    </div>
  )
}