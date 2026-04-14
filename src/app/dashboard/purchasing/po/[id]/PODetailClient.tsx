'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AlertTriangle, CheckCircle, ChevronLeft, Loader2, ExternalLink } from 'lucide-react'
import { PO_STATUS_COLORS, PO_STATUS_LABELS, TIPE_LABELS, formatIDR, canApprovePO, canCreatePO } from '@/lib/purchasing/types'
import type { POStatus } from '@/lib/purchasing/types'

interface Props {
  po: any
  userRole: string
  userId: string
  priceChanges: { nama: string; harga_po: number; harga_sekarang: number; delta_pct: number }[]
}

export default function PODetailClient({ po, userRole, userId, priceChanges }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [accuratePONumber, setAccuratePONumber] = useState(po.accurate_po_number ?? '')
  const [approvalChecklist, setApprovalChecklist] = useState({ harga: false, item: false, vendor: false })

  const lines: any[] = po.purchase_order_lines ?? []
  const status: POStatus = po.status

  async function handleApprove() {
    if (!approvalChecklist.harga || !approvalChecklist.item || !approvalChecklist.vendor) {
      alert('Centang semua checklist sebelum approve.')
      return
    }
    setSaving(true)
    const { error } = await supabase
      .from('purchase_orders')
      .update({ status: 'approved', approved_by: userId, approved_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', po.id)

    if (!error) {
      await supabase.from('purchasing_audit_log').insert({
        tabel: 'purchase_orders', record_id: po.id, aksi: 'approve',
        nilai_lama: { status: po.status }, nilai_baru: { status: 'approved' },
        dilakukan_oleh: userId,
      })
      router.refresh()
    } else {
      alert('Gagal approve: ' + error.message)
    }
    setSaving(false)
  }

  async function handleReject() {
    if (!rejectReason.trim()) { alert('Isi alasan penolakan.'); return }
    setSaving(true)
    const newCatatan = po.catatan ? `${po.catatan}\n[Ditolak: ${rejectReason}]` : `[Ditolak: ${rejectReason}]`
    const { error } = await supabase
      .from('purchase_orders')
      .update({ status: 'draft', catatan: newCatatan, updated_at: new Date().toISOString() })
      .eq('id', po.id)

    if (!error) {
      await supabase.from('purchasing_audit_log').insert({
        tabel: 'purchase_orders', record_id: po.id, aksi: 'cancel',
        nilai_lama: { status: po.status }, nilai_baru: { status: 'draft' },
        dilakukan_oleh: userId, alasan: rejectReason,
      })
      setShowRejectModal(false)
      router.refresh()
    } else {
      alert('Gagal tolak: ' + error.message)
    }
    setSaving(false)
  }

  async function handleMarkSent() {
    setSaving(true)
    const update: any = { status: 'sent_vendor', sent_at: new Date().toISOString(), updated_at: new Date().toISOString() }
    if (accuratePONumber) update.accurate_po_number = accuratePONumber

    const { error } = await supabase.from('purchase_orders').update(update).eq('id', po.id)
    if (!error) {
      await supabase.from('purchasing_audit_log').insert({
        tabel: 'purchase_orders', record_id: po.id, aksi: 'update',
        nilai_lama: { status: po.status }, nilai_baru: { status: 'sent_vendor' },
        dilakukan_oleh: userId,
      })
      router.refresh()
    } else {
      alert(error.message)
    }
    setSaving(false)
  }

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button onClick={() => router.push('/dashboard/purchasing/po')} className="text-gray-400 hover:text-gray-700 mt-1">
          <ChevronLeft size={20} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-gray-900 font-mono">{po.nomor}</h1>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${PO_STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600'}`}>
              {PO_STATUS_LABELS[status] ?? status}
            </span>
          </div>
          <p className="text-gray-500 text-sm mt-1">
            {(po.outlets as any)?.kode} — {(po.outlets as any)?.nama} ·
            {TIPE_LABELS[po.tipe]} ·
            {(po.vendors as any)?.nama} ·
            Dibutuhkan: {po.tanggal_dibutuhkan}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Line items */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">Line Items</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Item</th>
                    <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider">Qty Order</th>
                    <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider">Diterima</th>
                    <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider">Harga Satuan</th>
                    <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line: any) => (
                    <tr key={line.id} className="border-b border-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{line.items?.nama}</p>
                        <p className="text-xs text-gray-400">{line.items?.kode_accurate}</p>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs">{line.qty_order} {line.satuan}</td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-gray-500">{line.qty_received ?? 0} {line.satuan}</td>
                      <td className="px-4 py-3 text-right font-mono text-xs">{formatIDR(line.harga_satuan)}</td>
                      <td className="px-4 py-3 text-right font-mono text-xs font-semibold">{formatIDR(line.total_harga)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 border-t border-gray-200">
                    <td colSpan={4} className="px-4 py-3 text-right font-bold text-gray-700 text-sm">Total Nilai PO:</td>
                    <td className="px-4 py-3 text-right font-bold text-[#037894] text-base">{formatIDR(po.total_nilai)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Risk Analysis Panel */}
          {(priceChanges.length > 0 || po.catatan?.includes('[Ditolak')) && (
            <div className="bg-white rounded-2xl border border-amber-200 p-5 shadow-sm space-y-3">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <AlertTriangle size={16} className="text-amber-500" />
                Analisis Risiko
              </h3>
              {priceChanges.map((c, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-amber-500">⚠️</span>
                  <p className="text-gray-700">
                    <strong>{c.nama}</strong>: harga berubah {c.delta_pct > 0 ? '+' : ''}{c.delta_pct}% sejak PO dibuat
                    ({formatIDR(c.harga_po)} → {formatIDR(c.harga_sekarang)})
                  </p>
                </div>
              ))}
              {po.catatan?.includes('[Ditolak') && (
                <div className="flex items-start gap-2 text-sm">
                  <span>ℹ️</span>
                  <p className="text-gray-700">PO ini pernah ditolak. Cek catatan di bawah.</p>
                </div>
              )}
            </div>
          )}

          {/* Catatan */}
          {po.catatan && (
            <div className="bg-gray-50 rounded-2xl border border-gray-100 p-5">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Catatan</p>
              <p className="text-sm text-gray-700 whitespace-pre-line">{po.catatan}</p>
            </div>
          )}
        </div>

        {/* Right: Action panel */}
        <div className="space-y-4">
          {/* PO info card */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-3">
            <h3 className="font-bold text-gray-900 text-sm">Informasi PO</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Dibuat oleh</span>
                <span className="font-medium text-gray-700">{(po['brew_users'] as any)?.full_name ?? (po['brew_users'] as any)?.email ?? '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Tanggal PO</span>
                <span className="font-medium text-gray-700">{po.tanggal_po}</span>
              </div>
              {po.approved_at && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Disetujui</span>
                  <span className="font-medium text-gray-700">{new Date(po.approved_at).toLocaleDateString('id-ID')}</span>
                </div>
              )}
              {po.accurate_po_number && (
                <div className="flex justify-between">
                  <span className="text-gray-400">No. Accurate</span>
                  <span className="font-mono font-bold text-[#037894]">{po.accurate_po_number}</span>
                </div>
              )}
              {(po.vendors as any)?.kontak_wa && (
                <div className="flex justify-between">
                  <span className="text-gray-400">WA Vendor</span>
                  <a href={`https://wa.me/${(po.vendors as any).kontak_wa}`} target="_blank"
                    className="text-[#037894] flex items-center gap-1 hover:underline">
                    Chat <ExternalLink size={10} />
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Action panel — role-based */}

          {/* Vetris: Approve/Reject */}
          {status === 'pending_approval' && canApprovePO(userRole) && (
            <div className="bg-white rounded-2xl border border-[#037894]/30 p-5 shadow-sm space-y-4">
              <h3 className="font-bold text-gray-900">Verifikasi PO</h3>
              <div className="space-y-2">
                {[
                  { key: 'harga', label: 'Harga sesuai Kamus Harga' },
                  { key: 'item', label: 'Item sesuai PO Quinos' },
                  { key: 'vendor', label: 'Vendor benar untuk outlet ini' },
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-3 cursor-pointer group">
                    <input type="checkbox"
                      checked={approvalChecklist[key as keyof typeof approvalChecklist]}
                      onChange={e => setApprovalChecklist(prev => ({ ...prev, [key]: e.target.checked }))}
                      className="w-4 h-4 accent-[#037894]" />
                    <span className="text-sm text-gray-700 group-hover:text-gray-900">{label}</span>
                  </label>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setShowRejectModal(true)}
                  className="py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                  Tolak
                </button>
                <button onClick={handleApprove} disabled={saving || !approvalChecklist.harga || !approvalChecklist.item || !approvalChecklist.vendor}
                  className="py-2.5 bg-[#82A13B] hover:bg-green-700 text-white rounded-xl text-sm font-bold shadow-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-1">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                  Approve
                </button>
              </div>
            </div>
          )}

          {/* Chris: Mark sent + Accurate number */}
          {status === 'approved' && canCreatePO(userRole) && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
              <h3 className="font-bold text-gray-900">Kirim ke Vendor</h3>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">No. PO di Accurate (opsional)</label>
                <input type="text" value={accuratePONumber} onChange={e => setAccuratePONumber(e.target.value)}
                  placeholder="Contoh: PO-2026-0001"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 focus:ring-2 focus:ring-[#037894] outline-none" />
              </div>
              <button onClick={handleMarkSent} disabled={saving}
                className="w-full py-2.5 bg-[#037894] hover:bg-[#02627a] text-white rounded-xl text-sm font-bold shadow-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                Tandai Sudah Dikirim ke Vendor
              </button>
            </div>
          )}

          {/* Warehouse: Create GR */}
          {status === 'sent_vendor' && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-3">
              <h3 className="font-bold text-gray-900">Penerimaan Barang</h3>
              <p className="text-sm text-gray-500">PO sudah dikirim ke vendor. Buat dokumen penerimaan barang setelah barang tiba.</p>
              <button
                onClick={() => router.push(`/dashboard/purchasing/terima/baru?po_id=${po.id}`)}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-bold shadow-sm transition-colors">
                Buat Penerimaan Barang
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h3 className="font-bold text-gray-900">Tolak PO</h3>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Alasan Penolakan *</label>
              <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                rows={3} placeholder="Jelaskan alasan penolakan..."
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50 focus:ring-2 focus:ring-[#037894] outline-none resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setShowRejectModal(false)}
                className="py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">
                Batal
              </button>
              <button onClick={handleReject} disabled={saving || !rejectReason.trim()}
                className="py-2.5 bg-[#FF4F31] hover:bg-red-700 text-white rounded-xl text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                Tolak PO
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
