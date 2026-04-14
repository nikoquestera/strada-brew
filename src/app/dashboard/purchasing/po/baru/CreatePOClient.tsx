'use client'
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Plus, Trash2, AlertTriangle, ChevronRight, ChevronLeft, Loader2, Upload } from 'lucide-react'
import { TIPE_LABELS, formatIDR } from '@/lib/purchasing/types'

interface POLine {
  item_id: string
  nama: string
  kode_accurate: string
  qty: number
  satuan: string
  harga_satuan: number | null
  catatan: string
  tipe: string
  gudang_sumber: string
}

interface Props {
  outlets: { id: string; kode: string; nama: string }[]
  vendors: { id: string; kode: string; nama: string; kategori: string }[]
  items: { id: string; kode_accurate: string; kode_quinos: string | null; nama: string; tipe: string; satuan: string; gudang_sumber: string; vendor_id: string | null }[]
}

const ALL_TIPES = ['fresh', 'dry_goods', 'frozen', 'packaging', 'roastery']
const TYPE_CODES: Record<string, string> = {
  fresh: 'FSH', dry_goods: 'DRY', frozen: 'FRZ', packaging: 'PKG', roastery: 'RST'
}

export default function CreatePOClient({ outlets, vendors, items }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)

  // Step 1 — Header
  const [outletId, setOutletId] = useState('')
  const [tipe, setTipe] = useState('')
  const [vendorId, setVendorId] = useState('')
  const [tanggalDibutuhkan, setTanggalDibutuhkan] = useState('')
  const [catatan, setCatatan] = useState('')
  const [quinosPdfUrl, setQuinosPdfUrl] = useState('')
  const [uploadingPDF, setUploadingPDF] = useState(false)

  // Step 2 — Lines
  const [lines, setLines] = useState<POLine[]>([])
  const [itemSearch, setItemSearch] = useState('')
  const [warnings, setWarnings] = useState<string[]>([])

  const today = new Date().toISOString().slice(0, 10)

  // Filter vendors by selected tipe
  const filteredVendors = useMemo(() => {
    if (!tipe) return vendors
    const tipeToKat: Record<string, string> = {
      fresh: 'fresh', dry_goods: 'dry_goods', frozen: 'frozen', packaging: 'packaging', roastery: 'roastery'
    }
    return vendors.filter(v => v.kategori === (tipeToKat[tipe] ?? tipe))
  }, [vendors, tipe])

  // Filter items by tipe
  const filteredItems = useMemo(() => {
    if (!tipe) return items
    return items.filter(i => i.tipe === tipe)
  }, [items, tipe])

  const searchedItems = useMemo(() => {
    if (!itemSearch.trim()) return filteredItems.slice(0, 20)
    const s = itemSearch.toLowerCase()
    return filteredItems.filter(i =>
      i.nama.toLowerCase().includes(s) || i.kode_accurate.toLowerCase().includes(s)
    ).slice(0, 20)
  }, [filteredItems, itemSearch])

  const totalNilai = lines.reduce((sum, l) => sum + (l.qty * (l.harga_satuan ?? 0)), 0)

  async function handlePDFUpload(file: File) {
    setUploadingPDF(true)
    const path = `po-drafts/${Date.now()}-${file.name}`
    const { data, error } = await supabase.storage.from('purchasing-docs').upload(path, file, { upsert: false })
    setUploadingPDF(false)
    if (error) { alert('Gagal upload PDF: ' + error.message); return }
    const { data: urlData } = supabase.storage.from('purchasing-docs').getPublicUrl(path)
    setQuinosPdfUrl(urlData.publicUrl)
  }

  async function fetchPrice(itemId: string, vendId: string) {
    const { data } = await supabase
      .from('kamus_harga_aktif')
      .select('harga_beli, satuan')
      .eq('item_id', itemId)
      .eq('vendor_id', vendId)
      .maybeSingle()
    return data
  }

  async function addItem(item: typeof items[0]) {
    // Check duplicate
    const existingIdx = lines.findIndex(l => l.item_id === item.id)
    if (existingIdx >= 0) {
      const updated = [...lines]
      updated[existingIdx].qty += 1
      setLines(updated)
      addWarning(`Item "${item.nama}" sudah ada, qty digabung.`)
      return
    }

    // Fresh item in non-fresh PO guard
    if (item.tipe === 'fresh' && tipe !== 'fresh') {
      addWarning(`⚠️ Item "${item.nama}" adalah Fresh — pastikan tipe PO sudah benar.`)
    }

    // Fetch price
    const priceData = vendorId ? await fetchPrice(item.id, vendorId) : null

    const newLine: POLine = {
      item_id: item.id,
      nama: item.nama,
      kode_accurate: item.kode_accurate,
      qty: 1,
      satuan: priceData?.satuan ?? item.satuan,
      harga_satuan: priceData?.harga_beli ?? null,
      catatan: '',
      tipe: item.tipe,
      gudang_sumber: item.gudang_sumber,
    }
    setLines(prev => [...prev, newLine])
    setItemSearch('')
  }

  function addWarning(msg: string) {
    setWarnings(prev => [...prev, msg])
    setTimeout(() => setWarnings(prev => prev.filter(w => w !== msg)), 6000)
  }

  function updateLine(idx: number, field: keyof POLine, value: any) {
    const updated = [...lines]
    ;(updated[idx] as any)[field] = value
    setLines(updated)
  }

  function removeLine(idx: number) {
    setLines(prev => prev.filter((_, i) => i !== idx))
  }

  function validateStep1(): string | null {
    if (!outletId) return 'Pilih outlet terlebih dahulu.'
    if (!tipe) return 'Pilih tipe PO.'
    if (!vendorId) return 'Pilih vendor.'
    if (!tanggalDibutuhkan) return 'Isi tanggal dibutuhkan.'
    if (tanggalDibutuhkan < today) return 'Tanggal dibutuhkan tidak boleh sebelum hari ini.'
    return null
  }

  function validateStep2(): string | null {
    if (lines.length === 0) return 'Tambahkan minimal satu item.'
    for (const l of lines) {
      if (l.qty <= 0) return `Qty untuk "${l.nama}" harus lebih dari 0.`
      if (!l.harga_satuan || l.harga_satuan === 0) return `Harga untuk "${l.nama}" belum ada di Kamus Harga.`
    }
    return null
  }

  async function checkDuplicate(): Promise<boolean> {
    const { data } = await supabase
      .from('purchase_orders')
      .select('id')
      .eq('outlet_id', outletId)
      .eq('vendor_id', vendorId)
      .eq('tipe', tipe)
      .eq('tanggal_dibutuhkan', tanggalDibutuhkan)
      .not('status', 'eq', 'cancelled')
      .limit(1)
    return (data ?? []).length > 0
  }

  async function handleSave(submitForApproval: boolean) {
    const err2 = validateStep2()
    if (err2) { alert(err2); return }

    // R1: PO > Rp 5jt → force pending_approval
    const forcePendingApproval = totalNilai > 5_000_000

    // Check duplicate
    const isDuplicate = await checkDuplicate()
    if (isDuplicate) {
      const proceed = confirm('⚠️ Sudah ada PO untuk outlet ini hari ini dengan vendor dan tipe yang sama.\nLanjut buat PO baru?')
      if (!proceed) return
    }

    // Validate all prices exist in kamus_harga
    const missingPrice = lines.find(l => !l.harga_satuan || l.harga_satuan === 0)
    if (missingPrice && submitForApproval) {
      alert(`Harga untuk "${missingPrice.nama}" belum ada di Kamus Harga. Update Kamus Harga dulu.`)
      return
    }

    setSaving(true)
    try {
      // Get PO number
      const numRes = await fetch(`/api/purchasing/po-number?prefix=PO&tipe=${tipe}`)
      const { nomor } = await numRes.json()

      const status = forcePendingApproval || submitForApproval ? 'pending_approval' : 'draft'

      const { data: { user } } = await supabase.auth.getUser()
      const { data: userData } = await supabase
        .from('brew_users')
        .select('id')
        .ilike('email', user?.email ?? '')
        .maybeSingle()

      const { data: newPO, error: poErr } = await supabase
        .from('purchase_orders')
        .insert({
          nomor,
          outlet_id: outletId,
          vendor_id: vendorId,
          tipe,
          tanggal_po: today,
          tanggal_dibutuhkan: tanggalDibutuhkan,
          status,
          total_nilai: totalNilai,
          catatan,
          quinos_pdf_url: quinosPdfUrl || null,
          created_by: userData?.id,
        })
        .select('id')
        .single()

      if (poErr || !newPO) throw new Error(poErr?.message ?? 'Gagal membuat PO')

      // Insert lines
      const lineInserts = lines.map(l => ({
        po_id: newPO.id,
        item_id: l.item_id,
        qty_order: l.qty,
        satuan: l.satuan,
        harga_satuan: l.harga_satuan!,
        catatan: l.catatan || null,
      }))
      await supabase.from('purchase_order_lines').insert(lineInserts)

      // Audit log
      if (userData?.id) {
        await supabase.from('purchasing_audit_log').insert({
          tabel: 'purchase_orders',
          record_id: newPO.id,
          aksi: 'create',
          nilai_baru: { nomor, status, total_nilai: totalNilai },
          dilakukan_oleh: userData.id,
        })
      }

      router.push(`/dashboard/purchasing/po/${newPO.id}`)
    } catch (err: any) {
      alert('Error: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const outlet = outlets.find(o => o.id === outletId)
  const vendor = vendors.find(v => v.id === vendorId)

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => step > 1 ? setStep(s => s - 1) : router.back()} className="text-gray-400 hover:text-gray-700 transition-colors">
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Buat Purchase Order</h1>
          <p className="text-gray-500 text-sm">Langkah {step} dari 3</p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {['Header PO', 'Line Items', 'Review'].map((label, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${step > i + 1 ? 'bg-[#82A13B] text-white' : step === i + 1 ? 'bg-[#037894] text-white' : 'bg-gray-100 text-gray-400'}`}>
              {step > i + 1 ? '✓' : i + 1}
            </div>
            <span className={`text-sm font-medium ${step === i + 1 ? 'text-gray-900' : 'text-gray-400'}`}>{label}</span>
            {i < 2 && <div className="w-8 h-px bg-gray-200" />}
          </div>
        ))}
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="space-y-2">
          {warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              {w}
            </div>
          ))}
        </div>
      )}

      {/* Step 1: Header */}
      {step === 1 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-5">
          <h2 className="font-bold text-gray-900">Detail PO</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Outlet *</label>
              <select value={outletId} onChange={e => setOutletId(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50 focus:ring-2 focus:ring-[#037894] outline-none">
                <option value="">Pilih outlet...</option>
                {outlets.map(o => <option key={o.id} value={o.id}>{o.kode} — {o.nama}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Tipe PO *</label>
              <select value={tipe} onChange={e => { setTipe(e.target.value); setVendorId(''); setLines([]) }}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50 focus:ring-2 focus:ring-[#037894] outline-none">
                <option value="">Pilih tipe...</option>
                {ALL_TIPES.map(t => <option key={t} value={t}>{TIPE_LABELS[t]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Vendor *</label>
              <select value={vendorId} onChange={e => setVendorId(e.target.value)}
                disabled={!tipe}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50 focus:ring-2 focus:ring-[#037894] outline-none disabled:opacity-50">
                <option value="">Pilih vendor...</option>
                {filteredVendors.map(v => <option key={v.id} value={v.id}>{v.nama}</option>)}
              </select>
              {tipe && filteredVendors.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">Belum ada vendor dengan kategori {TIPE_LABELS[tipe]}. Tambahkan vendor dulu.</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Tanggal Dibutuhkan *</label>
              <input type="date" value={tanggalDibutuhkan} min={today}
                onChange={e => setTanggalDibutuhkan(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50 focus:ring-2 focus:ring-[#037894] outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Catatan (opsional)</label>
            <textarea value={catatan} onChange={e => setCatatan(e.target.value)} rows={2}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50 focus:ring-2 focus:ring-[#037894] outline-none resize-none" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Upload PDF Quinos (opsional)</label>
            <label className="flex items-center gap-3 border-2 border-dashed border-gray-200 rounded-xl px-4 py-3 cursor-pointer hover:border-[#037894] hover:bg-blue-50 transition-colors">
              <Upload size={16} className="text-gray-400" />
              <span className="text-sm text-gray-500">{quinosPdfUrl ? '✓ PDF terupload' : uploadingPDF ? 'Mengupload...' : 'Drag & drop atau klik untuk upload PDF'}</span>
              <input type="file" accept=".pdf" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handlePDFUpload(f) }} />
            </label>
          </div>
          <button
            onClick={() => {
              const err = validateStep1()
              if (err) { alert(err); return }
              setStep(2)
            }}
            className="w-full py-3 bg-[#037894] hover:bg-[#02627a] text-white font-bold rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2"
          >
            Lanjut ke Line Items <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Step 2: Line Items */}
      {step === 2 && (
        <div className="space-y-4">
          {/* Item picker */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <h2 className="font-bold text-gray-900 mb-3">Tambah Item</h2>
            <input
              type="text"
              value={itemSearch}
              onChange={e => setItemSearch(e.target.value)}
              placeholder="Cari nama item atau kode Accurate..."
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:ring-2 focus:ring-[#037894] outline-none mb-3"
            />
            {itemSearch && (
              <div className="border border-gray-100 rounded-xl overflow-hidden">
                {searchedItems.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-gray-400">Tidak ditemukan</p>
                ) : (
                  searchedItems.map(item => (
                    <button key={item.id}
                      onClick={() => addItem(item)}
                      className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{item.nama}</p>
                        <p className="text-xs text-gray-400">{item.kode_accurate} · {item.satuan} · {TIPE_LABELS[item.tipe]}</p>
                      </div>
                      <Plus size={14} className="text-[#037894]" />
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Lines table */}
          {lines.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Item</th>
                      <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider w-24">Qty</th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider w-20">Satuan</th>
                      <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider">Harga / Satuan</th>
                      <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total</th>
                      <th className="px-4 py-3 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line, idx) => (
                      <tr key={idx} className="border-b border-gray-50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{line.nama}</p>
                          <p className="text-xs text-gray-400">{line.kode_accurate}</p>
                        </td>
                        <td className="px-4 py-3">
                          <input type="number" min="0.001" step="0.001" value={line.qty}
                            onChange={e => {
                              const v = parseFloat(e.target.value)
                              if (v <= 0) return
                              updateLine(idx, 'qty', v)
                            }}
                            className={`w-full text-center border rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-[#037894] outline-none ${line.qty <= 0 ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'}`} />
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-xs">{line.satuan}</td>
                        <td className="px-4 py-3 text-right">
                          {line.harga_satuan === null || line.harga_satuan === 0 ? (
                            <div className="flex items-center justify-end gap-1 text-[#FF4F31] text-xs">
                              <AlertTriangle size={12} />
                              <span>Belum ada harga</span>
                            </div>
                          ) : (
                            <span className="text-gray-900 text-xs font-mono">{formatIDR(line.harga_satuan)}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-xs font-semibold text-gray-900 font-mono">
                          {line.harga_satuan ? formatIDR(line.qty * line.harga_satuan) : '-'}
                        </td>
                        <td className="px-4 py-3">
                          <button onClick={() => removeLine(idx)} className="text-gray-300 hover:text-[#FF4F31] transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 border-t border-gray-200">
                      <td colSpan={4} className="px-4 py-3 text-right text-sm font-bold text-gray-700">Total Nilai PO:</td>
                      <td className="px-4 py-3 text-right font-bold text-[#037894] text-base">{formatIDR(totalNilai)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {totalNilai > 5_000_000 && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              PO di atas Rp 5 juta memerlukan approval Vetris sebelum dikirim ke vendor.
            </div>
          )}

          <button
            onClick={() => {
              const err = validateStep2()
              if (err) { alert(err); return }
              setStep(3)
            }}
            disabled={lines.length === 0}
            className="w-full py-3 bg-[#037894] hover:bg-[#02627a] text-white font-bold rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            Lanjut ke Review <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Step 3: Review */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
            <h2 className="font-bold text-gray-900">Review PO</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Outlet</p><p className="font-semibold text-gray-900">{outlet?.kode} — {outlet?.nama}</p></div>
              <div><p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Vendor</p><p className="font-semibold text-gray-900">{vendor?.nama}</p></div>
              <div><p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Tipe</p><p className="font-semibold text-gray-900">{TIPE_LABELS[tipe]}</p></div>
              <div><p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Dibutuhkan</p><p className="font-semibold text-gray-900">{tanggalDibutuhkan}</p></div>
              <div><p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Total Items</p><p className="font-semibold text-gray-900">{lines.length} item</p></div>
              <div><p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Total Nilai</p><p className="font-bold text-[#037894] text-lg">{formatIDR(totalNilai)}</p></div>
            </div>
          </div>

          {totalNilai > 5_000_000 && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              PO ini di atas Rp 5 juta — akan otomatis masuk ke status <strong>Menunggu Approval Vetris</strong>.
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleSave(false)}
              disabled={saving}
              className="py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : null}
              Simpan Draft
            </button>
            <button
              onClick={() => handleSave(true)}
              disabled={saving}
              className="py-3 bg-[#037894] hover:bg-[#02627a] text-white font-bold rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : null}
              Ajukan ke Vetris
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
