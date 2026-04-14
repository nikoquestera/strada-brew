'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ChevronLeft, AlertTriangle, Upload, Loader2, Printer } from 'lucide-react'
import { formatIDR } from '@/lib/purchasing/types'

interface GRLine {
  po_line_id: string
  item_id: string
  nama: string
  kode_accurate: string
  tipe: string
  qty_order: number
  satuan: string
  harga_po: number
  qty_diterima: number
  harga_aktual: number
  alasan_selisih: string
}

interface Props {
  gr: any
  poLines: any[]
  existingGRLines: any[]
  userRole: string
  userId: string
}

export default function GRDetailClient({ gr, poLines, existingGRLines, userRole, userId }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [penerima, setPenerima] = useState(gr.penerima ?? '')
  const [tanggalTerima, setTanggalTerima] = useState(gr.tanggal_terima ?? new Date().toISOString().slice(0, 10))
  const [suratJalanNomor, setSuratJalanNomor] = useState(gr.surat_jalan_nomor ?? '')
  const [invoiceNomor, setInvoiceNomor] = useState(gr.invoice_nomor ?? '')
  const [suratJalanUrl, setSuratJalanUrl] = useState(gr.surat_jalan_url ?? '')
  const [uploadingSJ, setUploadingSJ] = useState(false)

  // Build lines from PO lines (pre-fill)
  const [lines, setLines] = useState<GRLine[]>(() => {
    if (existingGRLines.length > 0) {
      return existingGRLines.map((l: any) => ({
        po_line_id: l.po_line_id,
        item_id: l.items?.id ?? '',
        nama: l.items?.nama ?? '',
        kode_accurate: l.items?.kode_accurate ?? '',
        tipe: l.items?.tipe ?? '',
        qty_order: poLines.find((p: any) => p.id === l.po_line_id)?.qty_order ?? 0,
        satuan: l.satuan,
        harga_po: poLines.find((p: any) => p.id === l.po_line_id)?.harga_satuan ?? 0,
        qty_diterima: l.qty_diterima,
        harga_aktual: l.harga_aktual,
        alasan_selisih: l.alasan_selisih ?? '',
      }))
    }
    return poLines.map((l: any) => ({
      po_line_id: l.id,
      item_id: l.items?.id ?? '',
      nama: l.items?.nama ?? '',
      kode_accurate: l.items?.kode_accurate ?? '',
      tipe: l.items?.tipe ?? '',
      qty_order: l.qty_order,
      satuan: l.satuan,
      harga_po: l.harga_satuan,
      qty_diterima: l.qty_order,
      harga_aktual: l.harga_satuan,
      alasan_selisih: '',
    }))
  })

  const hasDiscrepancy = lines.some(l =>
    l.qty_diterima !== l.qty_order || l.harga_aktual !== l.harga_po
  )
  const discrepancyLines = lines.filter(l =>
    l.qty_diterima !== l.qty_order || l.harga_aktual !== l.harga_po
  )
  const allDiscrepanciesHaveAlasan = discrepancyLines.every(l => l.alasan_selisih.trim() !== '')
  const isReadOnly = gr.status === 'finalized'

  function updateLine(idx: number, field: keyof GRLine, value: any) {
    const updated = [...lines]
    ;(updated[idx] as any)[field] = value
    setLines(updated)
  }

  async function handleUploadSJ(file: File) {
    setUploadingSJ(true)
    const path = `${gr.id}/surat-jalan.${file.name.split('.').pop()}`
    const { error } = await supabase.storage.from('purchasing-docs').upload(path, file, { upsert: true })
    setUploadingSJ(false)
    if (error) { alert('Gagal upload: ' + error.message); return }
    const { data: urlData } = supabase.storage.from('purchasing-docs').getPublicUrl(path)
    setSuratJalanUrl(urlData.publicUrl)
  }

  async function handleSave(finalize: boolean) {
    if (!penerima.trim()) { alert('Isi nama penerima.'); return }
    if (finalize && hasDiscrepancy && !allDiscrepanciesHaveAlasan) {
      alert('Isi alasan untuk semua selisih sebelum finalisasi.')
      return
    }

    setSaving(true)
    try {
      const status = finalize
        ? (hasDiscrepancy ? 'discrepancy' : 'finalized')
        : 'draft'

      // Upsert GR header
      await supabase.from('goods_receipts').update({
        penerima, tanggal_terima: tanggalTerima,
        surat_jalan_nomor: suratJalanNomor || null,
        invoice_nomor: invoiceNomor || null,
        surat_jalan_url: suratJalanUrl || null,
        status,
        updated_at: new Date().toISOString(),
      }).eq('id', gr.id)

      // Delete old lines and reinsert
      await supabase.from('goods_receipt_lines').delete().eq('gr_id', gr.id)
      await supabase.from('goods_receipt_lines').insert(
        lines.map(l => ({
          gr_id: gr.id,
          po_line_id: l.po_line_id,
          item_id: l.item_id,
          qty_diterima: l.qty_diterima,
          satuan: l.satuan,
          harga_aktual: l.harga_aktual,
          alasan_selisih: l.alasan_selisih || null,
        }))
      )

      if (finalize) {
        await supabase.from('purchasing_audit_log').insert({
          tabel: 'goods_receipts', record_id: gr.id, aksi: 'update',
          nilai_lama: { status: gr.status }, nilai_baru: { status },
          dilakukan_oleh: userId,
        })
      }

      router.refresh()
    } catch (err: any) {
      alert('Error: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const po = gr.purchase_orders as any

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.push('/dashboard/purchasing/terima')} className="text-gray-400 hover:text-gray-700">
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900 font-mono">{gr.nomor}</h1>
          <p className="text-gray-500 text-sm">PO: {po?.nomor} · {po?.vendors?.nama} · {(gr.outlets as any)?.kode}</p>
        </div>
        {gr.status === 'finalized' && (
          <button onClick={() => window.print()} className="ml-auto flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 px-3 py-2 rounded-xl transition-colors">
            <Printer size={14} /> Bundle Selena
          </button>
        )}
      </div>

      {/* Header fields */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <h2 className="font-bold text-gray-900 mb-4">Detail Penerimaan</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Tanggal Terima</label>
            <input type="date" value={tanggalTerima} onChange={e => setTanggalTerima(e.target.value)} disabled={isReadOnly}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 focus:ring-2 focus:ring-[#037894] outline-none disabled:opacity-60" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Nama Penerima *</label>
            <input type="text" value={penerima} onChange={e => setPenerima(e.target.value)} disabled={isReadOnly}
              placeholder="Nama orang yang menerima"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 focus:ring-2 focus:ring-[#037894] outline-none disabled:opacity-60" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">No. Surat Jalan</label>
            <input type="text" value={suratJalanNomor} onChange={e => setSuratJalanNomor(e.target.value)} disabled={isReadOnly}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 focus:ring-2 focus:ring-[#037894] outline-none disabled:opacity-60" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">No. Invoice</label>
            <input type="text" value={invoiceNomor} onChange={e => setInvoiceNomor(e.target.value)} disabled={isReadOnly}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 focus:ring-2 focus:ring-[#037894] outline-none disabled:opacity-60" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Upload Surat Jalan</label>
            {isReadOnly ? (
              suratJalanUrl ? <a href={suratJalanUrl} target="_blank" className="text-[#037894] text-sm hover:underline">Lihat Surat Jalan</a> : <p className="text-gray-400 text-sm">Tidak ada</p>
            ) : (
              <label className="flex items-center gap-3 border-2 border-dashed border-gray-200 rounded-xl px-4 py-2.5 cursor-pointer hover:border-[#037894] hover:bg-blue-50 transition-colors">
                <Upload size={14} className="text-gray-400" />
                <span className="text-sm text-gray-500">{suratJalanUrl ? '✓ Terupload' : uploadingSJ ? 'Mengupload...' : 'Upload foto / scan surat jalan'}</span>
                <input type="file" accept="image/*,.pdf" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleUploadSJ(f) }} />
              </label>
            )}
          </div>
        </div>
      </div>

      {/* Discrepancy warning */}
      {hasDiscrepancy && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl px-5 py-4">
          <AlertTriangle size={18} className="text-[#FF4F31] shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-[#FF4F31]">Ada selisih pada {discrepancyLines.length} item.</p>
            <p className="text-xs text-red-600 mt-0.5">Chris wajib rekonsiliasi sebelum kirim ke Selena. Isi alasan selisih di setiap baris.</p>
          </div>
        </div>
      )}

      {/* Fresh item note */}
      {lines.some(l => l.tipe === 'fresh') && (
        <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-700">
          <span>ℹ️</span>
          <p>Harga aktual item Fresh dapat berbeda karena timbangan outlet. Sesuaikan qty sesuai surat jalan.</p>
        </div>
      )}

      {/* Lines comparison table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">Perbandingan PO vs Diterima</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Item</th>
                <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider">Qty PO</th>
                <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider">Qty Diterima</th>
                <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider">Harga PO</th>
                <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider">Harga Aktual</th>
                <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider">Selisih Qty</th>
                <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider">Selisih Nilai</th>
                {hasDiscrepancy && <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider min-w-[160px]">Alasan Selisih</th>}
              </tr>
            </thead>
            <tbody>
              {lines.map((line, idx) => {
                const qtySelisih = line.qty_diterima - line.qty_order
                const nilaiPO = line.qty_order * line.harga_po
                const nilaiAktual = line.qty_diterima * line.harga_aktual
                const nilaiSelisih = nilaiAktual - nilaiPO
                const hasLineDiscrepancy = qtySelisih !== 0 || line.harga_aktual !== line.harga_po
                return (
                  <tr key={idx} className={`border-b border-gray-50 ${hasLineDiscrepancy ? 'bg-red-50/30' : ''}`}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{line.nama}</p>
                      <p className="text-xs text-gray-400">{line.kode_accurate}</p>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs">{line.qty_order} {line.satuan}</td>
                    <td className="px-4 py-3">
                      {isReadOnly ? (
                        <span className="block text-right font-mono text-xs">{line.qty_diterima} {line.satuan}</span>
                      ) : (
                        <input type="number" min="0" step="0.001" value={line.qty_diterima}
                          onChange={e => updateLine(idx, 'qty_diterima', parseFloat(e.target.value) || 0)}
                          className="w-24 ml-auto block text-right border border-gray-200 rounded-lg px-2 py-1 text-xs bg-gray-50 focus:ring-2 focus:ring-[#037894] outline-none" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs">{formatIDR(line.harga_po)}</td>
                    <td className="px-4 py-3">
                      {isReadOnly ? (
                        <span className="block text-right font-mono text-xs">{formatIDR(line.harga_aktual)}</span>
                      ) : (
                        <input type="number" min="0" value={line.harga_aktual}
                          onChange={e => updateLine(idx, 'harga_aktual', parseFloat(e.target.value) || 0)}
                          className="w-32 ml-auto block text-right border border-gray-200 rounded-lg px-2 py-1 text-xs bg-gray-50 focus:ring-2 focus:ring-[#037894] outline-none" />
                      )}
                    </td>
                    <td className={`px-4 py-3 text-right font-mono text-xs font-bold ${qtySelisih !== 0 ? 'text-[#FF4F31]' : 'text-gray-400'}`}>
                      {qtySelisih > 0 ? '+' : ''}{qtySelisih !== 0 ? `${qtySelisih} ${line.satuan}` : '—'}
                    </td>
                    <td className={`px-4 py-3 text-right font-mono text-xs font-bold ${nilaiSelisih !== 0 ? 'text-[#FF4F31]' : 'text-gray-400'}`}>
                      {nilaiSelisih !== 0 ? (nilaiSelisih > 0 ? '+' : '') + formatIDR(nilaiSelisih) : '—'}
                    </td>
                    {hasDiscrepancy && (
                      <td className="px-4 py-3">
                        {hasLineDiscrepancy ? (
                          isReadOnly ? (
                            <p className="text-xs text-gray-700">{line.alasan_selisih || '—'}</p>
                          ) : (
                            <input type="text" value={line.alasan_selisih}
                              onChange={e => updateLine(idx, 'alasan_selisih', e.target.value)}
                              placeholder="Isi alasan selisih..."
                              className={`w-full border rounded-lg px-2 py-1 text-xs bg-white focus:ring-2 focus:ring-[#037894] outline-none ${!line.alasan_selisih.trim() ? 'border-red-300' : 'border-gray-200'}`} />
                          )
                        ) : <span className="text-gray-300 text-xs">—</span>}
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Actions */}
      {!isReadOnly && (
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => handleSave(false)} disabled={saving}
            className="py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
            {saving ? <Loader2 size={16} className="animate-spin" /> : null}
            Simpan Draft
          </button>
          <button
            onClick={() => handleSave(true)}
            disabled={saving || (hasDiscrepancy && !allDiscrepanciesHaveAlasan)}
            className="py-3 bg-[#037894] hover:bg-[#02627a] text-white font-bold rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
            {saving ? <Loader2 size={16} className="animate-spin" /> : null}
            {hasDiscrepancy ? 'Kirim ke Selena (ada selisih)' : 'Finalisasi & Kirim ke Selena'}
          </button>
        </div>
      )}

      {/* Bundle untuk Selena — print view */}
      {gr.status === 'finalized' && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-5 space-y-2 print:block">
          <h3 className="font-bold text-[#82A13B]">✓ Bundle untuk Selena</h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="bg-white rounded-xl p-3 border border-green-100">
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Invoice</p>
              <p className="font-semibold text-gray-900">{gr.invoice_nomor ?? '-'}</p>
            </div>
            <div className="bg-white rounded-xl p-3 border border-green-100">
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Surat Jalan</p>
              <p className="font-semibold text-gray-900">{gr.surat_jalan_nomor ?? '-'}</p>
            </div>
            <div className="bg-white rounded-xl p-3 border border-green-100">
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">PO Referensi</p>
              <p className="font-semibold text-gray-900">{po?.nomor ?? '-'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
