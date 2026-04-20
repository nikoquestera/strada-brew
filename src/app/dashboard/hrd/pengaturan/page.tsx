'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Save, CheckCircle2, AlertCircle, Mail, MessageSquare, Sparkles, FileText } from 'lucide-react'

export default function HRDSettingsPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const [form, setForm] = useState({
    hrd_email: 'hrd@stradacoffee.com',
    offer_letter_template: '',
    quest_ai_system_prompt: '',
    wa_template_invitation: '',
    wa_template_rejection: '',
  })

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('hrd_settings')
        .select('*')
        .eq('id', 'default')
        .single()

      if (data) {
        setForm({
          hrd_email: data.hrd_email || 'hrd@stradacoffee.com',
          offer_letter_template: data.offer_letter_template || '',
          quest_ai_system_prompt: data.quest_ai_system_prompt || '',
          wa_template_invitation: data.wa_template_invitation || '',
          wa_template_rejection: data.wa_template_rejection || '',
        })
      }
    } catch (err) {
      console.error('Failed to load settings', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    setMessage(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      const { error } = await supabase
        .from('hrd_settings')
        .upsert({
          id: 'default',
          ...form,
          updated_at: new Date().toISOString(),
          updated_by: user?.email || 'system'
        })

      if (error) throw error

      setMessage({ type: 'success', text: 'Pengaturan berhasil disimpan!' })
      setTimeout(() => setMessage(null), 3000)
    } catch (err: any) {
      console.error(err)
      setMessage({ type: 'error', text: err.message || 'Gagal menyimpan pengaturan.' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8 flex justify-center items-center h-64">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-strada-blue rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto font-sans pb-20">
      <div className="mb-10">
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Pengaturan HRD</h1>
        <p className="text-gray-500 mt-2 font-medium">Konfigurasi sistem otomatisasi rekrutmen Strada Coffee.</p>
      </div>

      {message && (
        <div className={`p-4 rounded-2xl mb-8 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 ${
          message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <span className="font-bold text-sm">{message.text}</span>
        </div>
      )}

      <div className="space-y-6">
        {/* Email Destination */}
        <section className="bg-white rounded-[32px] p-8 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-strada-blue">
              <Mail size={20} strokeWidth={2.5} />
            </div>
            <h2 className="text-xl font-extrabold text-gray-900">Email Notifikasi</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-[13px] font-bold text-gray-700 mb-2 uppercase tracking-widest">Email Penerima Alert Pelamar Baru</label>
              <input 
                type="email" 
                className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-2xl focus:ring-strada-blue focus:border-strada-blue block p-4 transition-all font-medium"
                value={form.hrd_email} 
                onChange={e => setForm(f => ({ ...f, hrd_email: e.target.value }))}
                placeholder="hrd@stradacoffee.com" 
              />
              <p className="text-[12px] text-gray-500 mt-3 leading-relaxed">
                Setiap kali ada kandidat baru yang mengisi formulir di website, sistem akan mengirimkan ringkasan data ke email ini secara real-time.
              </p>
            </div>
          </div>
        </section>

        {/* Quest AI Personality */}
        <section className="bg-white rounded-[32px] p-8 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
              <Sparkles size={20} strokeWidth={2.5} />
            </div>
            <h2 className="text-xl font-extrabold text-gray-900">Quest AI Personality</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-[13px] font-bold text-gray-700 mb-2 uppercase tracking-widest">System Prompt (Karakter AI)</label>
              <textarea 
                className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-2xl focus:ring-strada-blue focus:border-strada-blue block p-4 transition-all min-h-[120px] font-medium leading-relaxed"
                value={form.quest_ai_system_prompt} 
                onChange={e => setForm(f => ({ ...f, quest_ai_system_prompt: e.target.value }))}
                placeholder="Tentukan gaya bicara Quest AI..." 
              />
              <p className="text-[12px] text-gray-500 mt-3 leading-relaxed">
                Ini adalah instruksi dasar untuk Quest AI dalam membuat draf pesan WhatsApp/Email untuk kandidat. Atur tone di sini (misal: "sangat formal", "warm & casual", dsb).
              </p>
            </div>
          </div>
        </section>

        {/* WhatsApp Templates */}
        <section className="bg-white rounded-[32px] p-8 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-600">
              <MessageSquare size={20} strokeWidth={2.5} />
            </div>
            <h2 className="text-xl font-extrabold text-gray-900">Template Pesan Singkat (WA)</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <label className="block text-[13px] font-bold text-gray-700 mb-2 uppercase tracking-widest">Undangan Interview</label>
              <textarea 
                className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-2xl focus:ring-strada-blue focus:border-strada-blue block p-4 transition-all min-h-[140px] font-medium leading-relaxed"
                value={form.wa_template_invitation} 
                onChange={e => setForm(f => ({ ...f, wa_template_invitation: e.target.value }))}
                placeholder="Contoh: Halo [NAMA], kami ingin mengundang interview..." 
              />
            </div>
            <div>
              <label className="block text-[13px] font-bold text-gray-700 mb-2 uppercase tracking-widest">Pesan Penolakan</label>
              <textarea 
                className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-2xl focus:ring-strada-blue focus:border-strada-blue block p-4 transition-all min-h-[140px] font-medium leading-relaxed"
                value={form.wa_template_rejection} 
                onChange={e => setForm(f => ({ ...f, wa_template_rejection: e.target.value }))}
                placeholder="Contoh: Halo [NAMA], mohon maaf saat ini belum bisa lanjut..." 
              />
            </div>
          </div>
          <p className="text-[12px] text-gray-500 mt-4 font-medium italic">
            Gunakan tag <code className="bg-gray-100 px-1 py-0.5 rounded text-strada-blue font-mono text-[11px]">[NAMA]</code> dan <code className="bg-gray-100 px-1 py-0.5 rounded text-strada-blue font-mono text-[11px]">[POSISI]</code> yang akan diisi otomatis oleh sistem.
          </p>
        </section>

        {/* Document Templates */}
        <section className="bg-white rounded-[32px] p-8 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-orange-600">
              <FileText size={20} strokeWidth={2.5} />
            </div>
            <h2 className="text-xl font-extrabold text-gray-900">Template Dokumen</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-[13px] font-bold text-gray-700 mb-2 uppercase tracking-widest">Isi Utama Surat Penawaran (Offer Letter)</label>
              <textarea 
                className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-2xl focus:ring-strada-blue focus:border-strada-blue block p-4 transition-all min-h-[240px] font-medium leading-relaxed"
                value={form.offer_letter_template} 
                onChange={e => setForm(f => ({ ...f, offer_letter_template: e.target.value }))}
                placeholder="Tulis narasi standar penawaran kerja di sini..." 
              />
            </div>
          </div>
        </section>

        {/* Action Button */}
        <div className="flex justify-end pt-4">
          <button 
            onClick={handleSave} 
            disabled={saving}
            className={`flex items-center gap-3 px-12 py-4 bg-strada-blue text-white rounded-full font-[900] text-base shadow-xl shadow-strada-blue/20 hover:shadow-2xl transition-all hover:bg-strada-dark-teal hover:-translate-y-1 active:translate-y-0 ${saving ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {saving ? 'Menyimpan...' : (
              <>
                <Save size={20} strokeWidth={2.5} /> Simpan Semua Pengaturan
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  )
}
