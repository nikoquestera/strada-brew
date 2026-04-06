'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Scale, Plus, Trash2, Check } from 'lucide-react'

interface WeightConfig {
  id?: string
  name: string
  is_default: boolean
  experience_weight: number
  certification_weight: number
  education_weight: number
  motivation_weight: number
  profile_weight: number
  custom_note: string
}

const DEFAULT_PRESET: WeightConfig = {
  name: 'Standar',
  is_default: true,
  experience_weight: 25,
  certification_weight: 20,
  education_weight: 15,
  motivation_weight: 20,
  profile_weight: 20,
  custom_note: '',
}

const WEIGHT_FIELDS: { key: keyof WeightConfig; label: string; desc: string; color: string }[] = [
  { key: 'experience_weight', label: 'Pengalaman Kafe', desc: 'Tahun kerja, tempat kerja sebelumnya, relevansi', color: '#037894' },
  { key: 'certification_weight', label: 'Sertifikasi', desc: 'Barista cert, kursus, pelatihan formal', color: '#005353' },
  { key: 'education_weight', label: 'Pendidikan', desc: 'Jenjang dan relevansi pendidikan', color: '#82A13B' },
  { key: 'motivation_weight', label: 'Motivasi & Kepribadian', desc: 'Alasan melamar, antusiasme, catatan motivasi', color: '#DE9733' },
  { key: 'profile_weight', label: 'Profil Umum', desc: 'Kelengkapan data, domisili, instagram, kerapian', color: '#8A8A8D' },
]

function totalWeight(cfg: WeightConfig) {
  return (
    (cfg.experience_weight || 0) +
    (cfg.certification_weight || 0) +
    (cfg.education_weight || 0) +
    (cfg.motivation_weight || 0) +
    (cfg.profile_weight || 0)
  )
}

interface Props { initialWeights: WeightConfig[] }

export default function WeightsClient({ initialWeights }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [weights, setWeights] = useState<WeightConfig[]>(initialWeights)
  const [editing, setEditing] = useState<WeightConfig | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showNew, setShowNew] = useState(false)

  function startNew() {
    setEditing({ ...DEFAULT_PRESET, name: 'Konfigurasi Baru', is_default: false })
    setShowNew(true)
  }

  function startEdit(w: WeightConfig) {
    setEditing({ ...w })
    setShowNew(false)
  }

  function setW(k: keyof WeightConfig, v: any) {
    setEditing(prev => prev ? { ...prev, [k]: v } : prev)
  }

  async function handleSave() {
    if (!editing) return
    setSaving(true)

    if (editing.is_default) {
      // Clear default from all others
      await supabase.from('scoring_weights').update({ is_default: false }).neq('id', editing.id || '')
    }

    if (editing.id) {
      const { data } = await supabase.from('scoring_weights').update({
        name: editing.name,
        is_default: editing.is_default,
        experience_weight: editing.experience_weight,
        certification_weight: editing.certification_weight,
        education_weight: editing.education_weight,
        motivation_weight: editing.motivation_weight,
        profile_weight: editing.profile_weight,
        custom_note: editing.custom_note,
      }).eq('id', editing.id).select().single()
      if (data) setWeights(prev => prev.map(w => w.id === data.id ? data : w))
    } else {
      const { data } = await supabase.from('scoring_weights').insert([{
        name: editing.name,
        is_default: editing.is_default,
        experience_weight: editing.experience_weight,
        certification_weight: editing.certification_weight,
        education_weight: editing.education_weight,
        motivation_weight: editing.motivation_weight,
        profile_weight: editing.profile_weight,
        custom_note: editing.custom_note,
      }]).select().single()
      if (data) setWeights(prev => [data, ...prev])
    }

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    setEditing(null)
  }

  async function handleDelete(id: string) {
    if (!confirm('Hapus konfigurasi ini?')) return
    await supabase.from('scoring_weights').delete().eq('id', id)
    setWeights(prev => prev.filter(w => w.id !== id))
  }

  async function handleSetDefault(id: string) {
    await supabase.from('scoring_weights').update({ is_default: false }).neq('id', id)
    await supabase.from('scoring_weights').update({ is_default: true }).eq('id', id)
    setWeights(prev => prev.map(w => ({ ...w, is_default: w.id === id })))
  }

  const total = editing ? totalWeight(editing) : 0

  return (
    <>
      <style>{`
        .wt-card:hover { border-color: #037894 !important; }
        .wt-btn:hover { opacity: 0.85; }
      `}</style>
      <div style={{ minHeight: '100vh', backgroundColor: '#F7F5F2' }}>
        <div style={{ backgroundColor: '#020000', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={() => router.back()} style={{ color: 'rgba(228,222,216,0.6)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: 0 }}>
            <ArrowLeft size={16} /> Kembali
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
            <Scale size={16} color="#037894" />
            <p style={{ color: '#ffffff', fontWeight: 700, fontSize: '16px', margin: 0 }}>Scoring Weightage</p>
          </div>
          <button onClick={startNew} className="wt-btn"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '10px', backgroundColor: '#037894', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '13px' }}>
            <Plus size={14} /> Konfigurasi Baru
          </button>
        </div>

        <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto', display: 'grid', gridTemplateColumns: editing ? '1fr 380px' : '1fr', gap: '20px' }}>

          {/* Left: list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '20px', border: '1.5px solid #E8E4E0' }}>
              <p style={{ fontSize: '13px', color: '#4C4845', margin: 0, lineHeight: 1.6 }}>
                Atur bobot penilaian untuk setiap kriteria. Quest AI akan menggunakan konfigurasi <strong>default</strong> saat melakukan scoring kandidat. Total bobot harus berjumlah <strong>100</strong>.
              </p>
            </div>

            {weights.length === 0 && !editing && (
              <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '40px', border: '1.5px solid #E8E4E0', textAlign: 'center' }}>
                <Scale size={32} color="#E8E4E0" style={{ marginBottom: '12px' }} />
                <p style={{ fontSize: '14px', color: '#8A8A8D', margin: 0 }}>Belum ada konfigurasi. Klik "+ Konfigurasi Baru" untuk membuat.</p>
              </div>
            )}

            {weights.map(w => (
              <div key={w.id} className="wt-card"
                style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '20px', border: `1.5px solid ${w.is_default ? '#037894' : '#E8E4E0'}`, cursor: 'pointer', transition: 'border-color 0.15s' }}
                onClick={() => startEdit(w)}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#020000', margin: 0 }}>{w.name}</h3>
                    {w.is_default && (
                      <span style={{ fontSize: '10px', fontWeight: 700, color: '#fff', backgroundColor: '#037894', padding: '2px 8px', borderRadius: '6px', letterSpacing: '1px', textTransform: 'uppercase' }}>Default</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }} onClick={e => e.stopPropagation()}>
                    {!w.is_default && (
                      <button onClick={() => handleSetDefault(w.id!)} className="wt-btn"
                        style={{ padding: '5px 10px', borderRadius: '8px', border: '1.5px solid #037894', color: '#037894', background: '#fff', cursor: 'pointer', fontSize: '11px', fontWeight: 700 }}>
                        Jadikan Default
                      </button>
                    )}
                    <button onClick={() => handleDelete(w.id!)} className="wt-btn"
                      style={{ padding: '5px 8px', borderRadius: '8px', border: '1.5px solid #FFD0C8', color: '#FF4F31', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {WEIGHT_FIELDS.map(f => (
                    <div key={f.key} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '12px', color: '#8A8A8D', width: '170px', flexShrink: 0 }}>{f.label}</span>
                      <div style={{ flex: 1, height: '6px', borderRadius: '3px', backgroundColor: '#F0EEEC', overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: '3px', backgroundColor: f.color, width: `${(w[f.key] as number || 0)}%`, transition: 'width 0.3s' }} />
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#020000', width: '32px', textAlign: 'right', flexShrink: 0 }}>{w[f.key] as number || 0}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                    <span style={{ fontSize: '12px', color: totalWeight(w) === 100 ? '#005353' : '#FF4F31', fontWeight: 700 }}>
                      Total: {totalWeight(w)}/100
                    </span>
                  </div>
                </div>
                {w.custom_note && (
                  <p style={{ fontSize: '12px', color: '#8A8A8D', margin: '10px 0 0', fontStyle: 'italic', borderTop: '1px solid #F0EEEC', paddingTop: '10px' }}>"{w.custom_note}"</p>
                )}
              </div>
            ))}
          </div>

          {/* Right: editor */}
          {editing && (
            <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', border: '1.5px solid #037894', height: 'fit-content', position: 'sticky', top: '24px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#020000', margin: '0 0 18px' }}>
                {showNew ? 'Buat Konfigurasi Baru' : 'Edit Konfigurasi'}
              </h3>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#8A8A8D', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '5px' }}>Nama</label>
                <input value={editing.name} onChange={e => setW('name', e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '9px', border: '1.5px solid #E8E4E0', fontSize: '13px', color: '#020000', boxSizing: 'border-box', outline: 'none' }} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '14px' }}>
                {WEIGHT_FIELDS.map(f => (
                  <div key={f.key}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                      <div>
                        <label style={{ fontSize: '12px', fontWeight: 700, color: '#020000', display: 'block' }}>{f.label}</label>
                        <span style={{ fontSize: '11px', color: '#8A8A8D' }}>{f.desc}</span>
                      </div>
                      <span style={{ fontSize: '16px', fontWeight: 800, color: f.color, width: '36px', textAlign: 'right' }}>{editing[f.key] as number || 0}</span>
                    </div>
                    <input type="range" min={0} max={100} value={editing[f.key] as number || 0}
                      onChange={e => setW(f.key, parseInt(e.target.value))}
                      style={{ width: '100%', accentColor: f.color }} />
                  </div>
                ))}
              </div>

              <div style={{ padding: '10px 14px', borderRadius: '10px', backgroundColor: total === 100 ? 'rgba(0,83,83,0.08)' : 'rgba(255,79,49,0.08)', marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: '#4C4845', fontWeight: 600 }}>Total bobot</span>
                <span style={{ fontSize: '18px', fontWeight: 800, color: total === 100 ? '#005353' : '#FF4F31' }}>{total}/100</span>
              </div>
              {total !== 100 && (
                <p style={{ fontSize: '12px', color: '#FF4F31', margin: '0 0 12px' }}>⚠ Total harus tepat 100 agar Quest AI dapat menggunakan konfigurasi ini.</p>
              )}

              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#8A8A8D', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '5px' }}>Catatan tambahan (opsional)</label>
                <textarea value={editing.custom_note} onChange={e => setW('custom_note', e.target.value)}
                  placeholder="Catatan untuk Quest AI tentang konteks penilaian ini..."
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '9px', border: '1.5px solid #E8E4E0', fontSize: '13px', color: '#020000', boxSizing: 'border-box', minHeight: '70px', resize: 'vertical', fontFamily: 'inherit', outline: 'none' }} />
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', cursor: 'pointer' }}>
                <input type="checkbox" checked={editing.is_default} onChange={e => setW('is_default', e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: '#037894' }} />
                <span style={{ fontSize: '13px', color: '#020000', fontWeight: 600 }}>Jadikan konfigurasi default</span>
              </label>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => setEditing(null)}
                  style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1.5px solid #E8E4E0', background: '#fff', color: '#4C4845', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>
                  Batal
                </button>
                <button onClick={handleSave} disabled={saving || total !== 100} className="wt-btn"
                  style={{ flex: 2, padding: '10px', borderRadius: '10px', border: 'none', backgroundColor: total !== 100 ? '#E8E4E0' : saving ? '#8A8A8D' : '#037894', color: total !== 100 ? '#8A8A8D' : '#fff', fontWeight: 700, fontSize: '13px', cursor: total !== 100 || saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  {saved ? <><Check size={13} /> Tersimpan</> : saving ? 'Menyimpan...' : 'Simpan Konfigurasi'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
