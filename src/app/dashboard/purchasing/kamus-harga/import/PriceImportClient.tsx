'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Upload, AlertTriangle, ChevronLeft, Loader2, CheckCircle, X } from 'lucide-react'
import { formatIDR } from '@/lib/purchasing/types'

interface MatchedItem {
  nama_vendor: string
  harga_baru: number
  satuan: string
  item_id: string | null
  nama_item: string | null
  kode_accurate: string | null
  harga_lama: number | null
  delta_pct: number | null
  confidence: number
  match_method: string
}

interface Props {
  vendors: { id: string; kode: string; nama: string; kategori: string }[]
}

// Next Monday
function nextMonday(): string {
  const d = new Date()
  const day = d.getDay()
  const diff = day === 0 ? 1 : 8 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().slice(0, 10)
}

export default function PriceImportClient({ vendors }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState(1)
  const [vendorId, setVendorId] = useState('')
  const [berlakuDari, setBerlakuDari] = useState(nextMonday())
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [importId, setImportId] = useState<string | null>(null)
  const [items, setItems] = useState<MatchedItem[]>([])
  const [applying, setApplying] = useState(false)
  const [appliedCount, setAppliedCount] = useState(0)
  // For items user has manually overridden the match
  const [overrides, setOverrides] = useState<Record<number, { confirmed: boolean }>>({})

  const today = new Date().toISOString().slice(0, 10)
  const daysSinceBerlaku = Math.round((new Date(today).getTime() - new Date(berlakuDari).getTime()) / (1000 * 60 * 60 * 24))

  const hasLargePriceChange = items.some(i => i.delta_pct !== null && Math.abs(i.delta_pct) > 20)
  const allSamePctChange: number | null = items.length > 1 ? (() => {
    const pcts = items.filter(i => i.delta_pct !== null).map(i => i.delta_pct!)
    if (pcts.length < items.length * 0.8) return null
    const first = pcts[0]
    return pcts.every(p => p === first) ? first : null
  })() : null

  async function handleUpload() {
    if (!vendorId || !file || !berlakuDari) {
      alert('Lengkapi vendor, file, dan tanggal berlaku.')
      return
    }
    setLoading(true)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('vendor_id', vendorId)
    formData.append('berlaku_dari', berlakuDari)

    const res = await fetch('/api/purchasing/price-import', {
      method: 'POST',
      body: formData,
    })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      alert('Error: ' + (data.error ?? 'Gagal membaca file'))
      return
    }

    setItems(data.items ?? [])
    setImportId(data.import_id)
    setStep(2)
  }

  async function handleApply() {
    // Check if all large price changes are confirmed
    const unconfirmedLarge = items.filter((item, i) =>
      item.item_id !== null &&
      item.delta_pct !== null &&
      Math.abs(item.delta_pct) >= 50 &&
      !overrides[i]?.confirmed
    )
    if (unconfirmedLarge.length > 0) {
      alert(`${unconfirmedLarge.length} item memiliki perubahan harga ≥50%. Centang konfirmasi dulu.`)
      return
    }

    setApplying(true)
    const { data: userData } = await supabase
      .from('brew_users')
      .select('id')
      .ilike('email', (await supabase.auth.getUser()).data.user?.email ?? '')
      .maybeSingle()

    let applied = 0
    for (const item of items) {
      if (!item.item_id) continue
      // Expire old price
      await supabase.from('kamus_harga')
        .update({ berlaku_sampai: berlakuDari })
        .eq('item_id', item.item_id)
        .eq('vendor_id', vendorId)
        .is('berlaku_sampai', null)

      // Insert new
      await supabase.from('kamus_harga').insert({
        item_id: item.item_id,
        vendor_id: vendorId,
        harga_beli: item.harga_baru,
        satuan: item.satuan,
        berlaku_dari: berlakuDari,
        sumber: 'pdf_import',
        created_by: userData?.id,
      })
      applied++
    }

    // Update import log
    if (importId) {
      await supabase.from('price_list_imports').update({
        status: 'applied',
        applied_by: userData?.id,
        applied_at: new Date().toISOString(),
        total_items_matched: applied,
      }).eq('id', importId)

      // Audit log
      if (userData?.id) {
        await supabase.from('purchasing_audit_log').insert({
          tabel: 'price_list_imports',
          record_id: importId,
          aksi: 'update',
          nilai_baru: { applied, vendor_id: vendorId, berlaku_dari: berlakuDari },
          dilakukan_oleh: userData.id,
        })
      }
    }

    setAppliedCount(applied)
    setApplying(false)
    setStep(3)
  }

  const highConfidence = items.filter(i => i.confidence >= 85 && i.item_id)
  const medConfidence = items.filter(i => i.confidence >= 60 && i.confidence < 85 && i.item_id)
  const noMatch = items.filter(i => !i.item_id || i.confidence < 60)

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => step > 1 ? setStep(s => s - 1) : router.push('/dashboard/purchasing/kamus-harga')}
          className="text-gray-400 hover:text-gray-700 transition-colors">
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Import Price List Vendor</h1>
          <p className="text-gray-500 text-sm">Langkah {step} dari 3</p>
        </div>
      </div>

      {/* Step 1: Upload */}
      {step === 1 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-5">
          <h2 className="font-bold text-gray-900">Upload File Price List</h2>
          <p className="text-sm text-gray-500">Format yang didukung: PDF, Gambar (JPG/PNG), Excel (XLSX), CSV</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Vendor *</label>
              <select value={vendorId} onChange={e => setVendorId(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50 focus:ring-2 focus:ring-[#037894] outline-none">
                <option value="">Pilih vendor...</option>
                {vendors.map(v => <option key={v.id} value={v.id}>{v.nama}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Berlaku Dari *</label>
              <input type="date" value={berlakuDari} onChange={e => setBerlakuDari(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50 focus:ring-2 focus:ring-[#037894] outline-none" />
              {daysSinceBerlaku > 7 && (
                <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                  <AlertTriangle size={11} /> Tanggal berlaku sudah lewat lebih dari 7 hari. Pastikan ini bukan data lama.
                </p>
              )}
            </div>
          </div>

          {/* File upload */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">File Price List *</label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-[#037894] hover:bg-blue-50 transition-all"
            >
              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <CheckCircle size={20} className="text-[#82A13B]" />
                  <div className="text-left">
                    <p className="font-semibold text-gray-900 text-sm">{file.name}</p>
                    <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <button onClick={e => { e.stopPropagation(); setFile(null) }} className="text-gray-300 hover:text-gray-500 ml-2">
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <>
                  <Upload size={24} className="text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Klik atau drag & drop file di sini</p>
                  <p className="text-xs text-gray-400 mt-1">PDF · JPG · PNG · XLSX · CSV</p>
                </>
              )}
            </div>
            <input ref={fileInputRef} type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,.xlsx,.xls,.csv"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) setFile(f) }} />
          </div>

          <button onClick={handleUpload} disabled={loading || !vendorId || !file || !berlakuDari}
            className="w-full py-3 bg-[#037894] hover:bg-[#02627a] text-white font-bold rounded-xl shadow-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <><Loader2 size={16} className="animate-spin" /> Membaca dengan AI...</> : 'Upload & Analisis'}
          </button>
        </div>
      )}

      {/* Step 2: Review */}
      {step === 2 && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
              <p className="text-2xl font-bold text-[#82A13B]">{highConfidence.length}</p>
              <p className="text-xs text-green-700 font-medium">High confidence (≥85%)</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
              <p className="text-2xl font-bold text-[#DE9733]">{medConfidence.length}</p>
              <p className="text-xs text-amber-700 font-medium">Medium confidence (60–84%)</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center">
              <p className="text-2xl font-bold text-[#FF4F31]">{noMatch.length}</p>
              <p className="text-xs text-red-700 font-medium">Tidak cocok</p>
            </div>
          </div>

          {/* Bulk price change warning */}
          {allSamePctChange !== null && (
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
              <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-700">
                Seluruh harga {allSamePctChange > 0 ? 'naik' : 'turun'} <strong>{Math.abs(allSamePctChange)}%</strong> — kemungkinan bulk price change. Cek dulu sebelum apply.
              </p>
            </div>
          )}

          {/* Review table */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Nama di Vendor</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Match ke Item Kita</th>
                    <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">Conf.</th>
                    <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider">Harga Baru</th>
                    <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider">Harga Lama</th>
                    <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">Delta %</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, i) => {
                    const isLargeChange = item.delta_pct !== null && Math.abs(item.delta_pct) >= 50
                    const rowClass = !item.item_id
                      ? 'bg-red-50/40'
                      : item.confidence < 85
                      ? 'bg-amber-50/30'
                      : ''
                    return (
                      <tr key={i} className={`border-b border-gray-50 ${rowClass}`}>
                        <td className="px-4 py-3 text-xs text-gray-700">{item.nama_vendor}</td>
                        <td className="px-4 py-3">
                          {item.nama_item ? (
                            <div>
                              <p className="text-xs font-medium text-gray-900">{item.nama_item}</p>
                              <p className="text-[10px] text-gray-400">{item.kode_accurate}</p>
                            </div>
                          ) : (
                            <span className="text-xs text-[#FF4F31] italic">Tidak ditemukan</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            item.confidence >= 85 ? 'bg-green-100 text-green-700'
                            : item.confidence >= 60 ? 'bg-amber-100 text-amber-700'
                            : 'bg-red-100 text-red-600'
                          }`}>
                            {item.confidence}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-xs font-semibold">{formatIDR(item.harga_baru)}</td>
                        <td className="px-4 py-3 text-right font-mono text-xs text-gray-400">
                          {item.harga_lama ? formatIDR(item.harga_lama) : '—'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {item.delta_pct !== null ? (
                            <div className="flex items-center justify-center gap-1">
                              {isLargeChange && <span className="text-sm">🚨</span>}
                              <span className={`text-xs font-bold ${
                                item.delta_pct > 0 ? 'text-[#FF4F31]' : item.delta_pct < 0 ? 'text-[#82A13B]' : 'text-gray-400'
                              }`}>
                                {item.delta_pct > 0 ? '+' : ''}{item.delta_pct}%
                              </span>
                            </div>
                          ) : <span className="text-gray-300 text-xs">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          {isLargeChange && item.item_id && (
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input type="checkbox"
                                checked={overrides[i]?.confirmed ?? false}
                                onChange={e => setOverrides(prev => ({ ...prev, [i]: { confirmed: e.target.checked } }))}
                                className="w-3.5 h-3.5 accent-[#037894]" />
                              <span className="text-[10px] text-gray-600 font-medium">Konfirmasi</span>
                            </label>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <button onClick={handleApply} disabled={applying || highConfidence.length + medConfidence.length === 0}
            className="w-full py-3 bg-[#037894] hover:bg-[#02627a] text-white font-bold rounded-xl shadow-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {applying ? <Loader2 size={16} className="animate-spin" /> : null}
            Apply {highConfidence.length + medConfidence.length} Harga Baru
          </button>
        </div>
      )}

      {/* Step 3: Done */}
      {step === 3 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm space-y-6 text-center">
          <CheckCircle size={48} className="text-[#82A13B] mx-auto" />
          <div>
            <h2 className="text-xl font-bold text-gray-900">Import Selesai</h2>
            <p className="text-gray-500 text-sm mt-1">{appliedCount} harga berhasil diperbarui, {noMatch.length} item tidak cocok (disimpan untuk cek manual).</p>
          </div>

          {/* Next steps */}
          <div className="bg-gray-50 rounded-2xl p-5 text-left space-y-3">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Next Steps</p>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle size={14} className="text-[#82A13B] shrink-0" />
                <span className="text-gray-700">Kamus Harga BREW → <strong>Updated</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded-full border-2 border-amber-400 shrink-0" />
                <span className="text-gray-500">Quinos → Perlu update manual oleh Chris</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded-full border-2 border-amber-400 shrink-0" />
                <span className="text-gray-500">Accurate → Perlu update manual (PO baru akan otomatis pakai harga baru)</span>
              </div>
            </div>
          </div>

          <button onClick={() => router.push('/dashboard/purchasing/kamus-harga')}
            className="bg-[#037894] hover:bg-[#02627a] text-white font-bold px-6 py-3 rounded-xl transition-colors">
            Kembali ke Kamus Harga
          </button>
        </div>
      )}
    </div>
  )
}
