'use client'
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Search, History, Edit2, Upload, Loader2, X } from 'lucide-react'
import { formatIDR, TIPE_LABELS } from '@/lib/purchasing/types'

interface Vendor { id: string; kode: string; nama: string; kategori: string }
interface Price {
  id: string
  item_id: string
  vendor_id: string
  outlet_id: string | null
  harga_beli: number
  satuan: string
  berlaku_dari: string
  berlaku_sampai: string | null
  nama_item: string
  kode_accurate: string
  kategori_item: string
  nama_vendor: string
}

interface Props {
  vendors: Vendor[]
  prices: Price[]
}

export default function KamusHargaClient({ vendors, prices }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null)
  const [search, setSearch] = useState('')
  const [filterKategori, setFilterKategori] = useState('')
  const [editingPrice, setEditingPrice] = useState<Price | null>(null)
  const [editHarga, setEditHarga] = useState('')
  const [editBerlakuDari, setEditBerlakuDari] = useState(new Date().toISOString().slice(0, 10))
  const [saving, setSaving] = useState(false)
  const [historyItem, setHistoryItem] = useState<Price | null>(null)
  const [priceHistory, setPriceHistory] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  const vendorPrices = useMemo(() => {
    if (!selectedVendor) return []
    return prices.filter(p => p.vendor_id === selectedVendor.id)
  }, [prices, selectedVendor])

  const filteredPrices = useMemo(() => {
    let list = vendorPrices
    if (filterKategori) list = list.filter(p => p.kategori_item === filterKategori)
    if (search) {
      const s = search.toLowerCase()
      list = list.filter(p => p.nama_item.toLowerCase().includes(s) || p.kode_accurate.toLowerCase().includes(s))
    }
    return list
  }, [vendorPrices, search, filterKategori])

  const kategoriSet = [...new Set(prices.map(p => p.kategori_item))].filter(Boolean)

  async function handleSavePrice() {
    if (!editingPrice || !editHarga) return
    const harga = parseFloat(editHarga)
    if (isNaN(harga) || harga <= 0) { alert('Harga harus lebih dari 0.'); return }

    setSaving(true)
    const { data: userData } = await supabase.from('brew_users').select('id').ilike('email', (await supabase.auth.getUser()).data.user?.email ?? '').maybeSingle()

    // Set berlaku_sampai on old entry
    await supabase.from('kamus_harga')
      .update({ berlaku_sampai: editBerlakuDari })
      .eq('id', editingPrice.id)

    // Insert new entry
    await supabase.from('kamus_harga').insert({
      item_id: editingPrice.item_id,
      vendor_id: editingPrice.vendor_id,
      outlet_id: editingPrice.outlet_id,
      harga_beli: harga,
      satuan: editingPrice.satuan,
      berlaku_dari: editBerlakuDari,
      sumber: 'manual',
      created_by: userData?.id,
    })

    setSaving(false)
    setEditingPrice(null)
    router.refresh()
  }

  async function loadHistory(price: Price) {
    setHistoryItem(price)
    setLoadingHistory(true)
    const { data } = await supabase
      .from('kamus_harga')
      .select('harga_beli, berlaku_dari, berlaku_sampai, sumber')
      .eq('item_id', price.item_id)
      .eq('vendor_id', price.vendor_id)
      .order('berlaku_dari', { ascending: false })
      .limit(10)
    setPriceHistory(data ?? [])
    setLoadingHistory(false)
  }

  return (
    <div className="p-6 md:p-8 space-y-5 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kamus Harga</h1>
          <p className="text-gray-500 text-sm mt-0.5">Master harga per vendor</p>
        </div>
        <button
          onClick={() => router.push('/dashboard/purchasing/kamus-harga/import')}
          className="flex items-center gap-2 bg-[#037894] hover:bg-[#02627a] text-white px-4 py-2.5 rounded-xl font-semibold text-sm shadow-sm transition-colors"
        >
          <Upload size={16} /> Import dari File Vendor
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Vendor sidebar */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Vendor</p>
          </div>
          <div className="overflow-y-auto max-h-[600px]">
            {vendors.map(v => (
              <button key={v.id} onClick={() => setSelectedVendor(v)}
                className={`w-full text-left px-4 py-3 border-b border-gray-50 transition-colors ${selectedVendor?.id === v.id ? 'bg-blue-50 border-l-2 border-l-[#037894]' : 'hover:bg-gray-50'}`}>
                <p className={`text-sm font-semibold ${selectedVendor?.id === v.id ? 'text-[#037894]' : 'text-gray-900'}`}>{v.nama}</p>
                <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full capitalize">{TIPE_LABELS[v.kategori] ?? v.kategori}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Price table */}
        <div className="lg:col-span-3 space-y-4">
          {!selectedVendor ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center shadow-sm text-gray-400 text-sm">
              Pilih vendor di kiri untuk melihat daftar harga
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Cari item..."
                    className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#037894] outline-none" />
                </div>
                <select value={filterKategori} onChange={e => setFilterKategori(e.target.value)}
                  className="text-sm border border-gray-200 rounded-xl px-3 py-2.5 bg-white focus:ring-2 focus:ring-[#037894] outline-none">
                  <option value="">Semua Kategori</option>
                  {kategoriSet.map(k => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                {filteredPrices.length === 0 ? (
                  <div className="p-10 text-center text-gray-400 text-sm">
                    Belum ada harga untuk {selectedVendor.nama}.<br />
                    Import dari file vendor atau tambah manual.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 bg-gray-50">
                          <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Item</th>
                          <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Kode</th>
                          <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Satuan</th>
                          <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider">Harga Berlaku</th>
                          <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Berlaku Dari</th>
                          <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPrices.map((p: Price) => (
                          <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3">
                              <p className="font-medium text-gray-900">{p.nama_item}</p>
                              <p className="text-xs text-gray-400">{p.kategori_item}</p>
                            </td>
                            <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.kode_accurate}</td>
                            <td className="px-4 py-3 text-xs text-gray-600">{p.satuan}</td>
                            <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatIDR(p.harga_beli)}</td>
                            <td className="px-4 py-3 text-xs text-gray-500">{p.berlaku_dari}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <button onClick={() => { setEditingPrice(p); setEditHarga(String(p.harga_beli)) }}
                                  className="text-gray-400 hover:text-[#037894] transition-colors">
                                  <Edit2 size={12} />
                                </button>
                                <button onClick={() => loadHistory(p)}
                                  className="text-gray-400 hover:text-[#037894] transition-colors" title="Lihat riwayat harga">
                                  <History size={12} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Edit price modal */}
      {editingPrice && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Edit Harga</h3>
              <button onClick={() => setEditingPrice(null)} className="text-gray-400 hover:text-gray-700">
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-gray-600">{editingPrice.nama_item} · {editingPrice.satuan}</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Harga Baru (IDR)</label>
                <input type="number" min="0" value={editHarga} onChange={e => setEditHarga(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50 focus:ring-2 focus:ring-[#037894] outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Berlaku Dari</label>
                <input type="date" value={editBerlakuDari} onChange={e => setEditBerlakuDari(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50 focus:ring-2 focus:ring-[#037894] outline-none" />
              </div>
            </div>
            <button onClick={handleSavePrice} disabled={saving}
              className="w-full py-3 bg-[#037894] hover:bg-[#02627a] text-white font-bold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {saving ? <Loader2 size={16} className="animate-spin" /> : null}
              Simpan Harga Baru
            </button>
          </div>
        </div>
      )}

      {/* History modal */}
      {historyItem && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Riwayat Harga</h3>
              <button onClick={() => setHistoryItem(null)} className="text-gray-400 hover:text-gray-700">
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-gray-500">{historyItem.nama_item} · {historyItem.nama_vendor}</p>
            {loadingHistory ? (
              <div className="text-center py-6"><Loader2 size={20} className="animate-spin text-gray-300 mx-auto" /></div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="pb-2 text-left text-xs font-bold text-gray-400 uppercase">Berlaku Dari</th>
                    <th className="pb-2 text-left text-xs font-bold text-gray-400 uppercase">Berlaku Sampai</th>
                    <th className="pb-2 text-right text-xs font-bold text-gray-400 uppercase">Harga</th>
                  </tr>
                </thead>
                <tbody>
                  {priceHistory.map((h, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      <td className="py-2 text-xs text-gray-600">{h.berlaku_dari}</td>
                      <td className="py-2 text-xs text-gray-400">{h.berlaku_sampai ?? 'Aktif'}</td>
                      <td className="py-2 text-right text-xs font-semibold">{formatIDR(h.harga_beli)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
