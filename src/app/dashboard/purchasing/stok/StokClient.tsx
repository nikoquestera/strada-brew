'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { RefreshCw, Play, Edit2, AlertTriangle, Loader2, Info } from 'lucide-react'
import { canEditParStock } from '@/lib/purchasing/types'

interface StockItem {
  id: string
  qty_saat_ini: number
  satuan: string
  par_stock_calculated: number | null
  par_stock_effective: number | null
  is_below_par: boolean
  last_synced_at: string
  updated_at: string
  items: {
    id: string
    nama: string
    kode_accurate: string
    kategori: string
    tipe: string
    par_stock_override: number | null
  }
}

interface Props {
  aaronStock: StockItem[]
  ndahStock: StockItem[]
  userRole: string
  userId: string
}

function StockStatusBadge({ qty, par }: { qty: number; par: number }) {
  if (qty === 0) return <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">HABIS</span>
  if (qty < par) return <span className="bg-red-100 text-[#FF4F31] text-[10px] font-bold px-2 py-0.5 rounded-full">Di Bawah Par</span>
  if (qty < par * 1.5) return <span className="bg-amber-100 text-[#DE9733] text-[10px] font-semibold px-2 py-0.5 rounded-full">Cukup</span>
  return <span className="bg-green-100 text-[#82A13B] text-[10px] font-semibold px-2 py-0.5 rounded-full">Aman</span>
}

export default function StokClient({ aaronStock, ndahStock, userRole, userId }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [tab, setTab] = useState<'aaron' | 'ndah'>('aaron')
  const [runningAgent, setRunningAgent] = useState(false)
  const [editingOverride, setEditingOverride] = useState<string | null>(null)
  const [overrideValue, setOverrideValue] = useState('')
  const [savingOverride, setSavingOverride] = useState(false)

  const stock = tab === 'aaron' ? aaronStock : ndahStock

  const habisCount = stock.filter(s => s.qty_saat_ini === 0).length
  const belowParCount = stock.filter(s => s.is_below_par && s.qty_saat_ini > 0).length
  const amanCount = stock.filter(s => !s.is_below_par).length

  const lastSynced = stock[0]?.last_synced_at
  const hoursSinceSync = lastSynced
    ? Math.round((Date.now() - new Date(lastSynced).getTime()) / (1000 * 60 * 60))
    : null

  async function handleRunAgent() {
    setRunningAgent(true)
    const res = await fetch('/api/purchasing/parstock-agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    const data = await res.json()
    setRunningAgent(false)
    if (res.ok) {
      alert(`Par Stock Agent selesai!\n${data.prs_created} PR dibuat, ${data.items_checked} item dicek.`)
      router.refresh()
    } else {
      alert('Error: ' + (data.error ?? 'Unknown'))
    }
  }

  async function handleSaveOverride(stockId: string, itemId: string) {
    const val = parseFloat(overrideValue)
    if (isNaN(val) || val <= 0) { alert('Par stock minimal 1 unit.'); return }
    setSavingOverride(true)

    await supabase.from('warehouse_stock').update({
      par_stock_effective: val,
      updated_at: new Date().toISOString(),
    }).eq('id', stockId)

    await supabase.from('items').update({ par_stock_override: val, updated_at: new Date().toISOString() }).eq('id', itemId)

    await supabase.from('purchasing_audit_log').insert({
      tabel: 'warehouse_stock', record_id: stockId, aksi: 'override',
      nilai_baru: { par_stock_override: val }, dilakukan_oleh: userId,
    })

    setSavingOverride(false)
    setEditingOverride(null)
    router.refresh()
  }

  async function handleResetOverride(stockId: string, itemId: string) {
    await supabase.from('items').update({ par_stock_override: null, updated_at: new Date().toISOString() }).eq('id', itemId)
    await supabase.from('warehouse_stock').update({
      par_stock_effective: null,
      updated_at: new Date().toISOString(),
    }).eq('id', stockId)
    router.refresh()
  }

  return (
    <div className="p-6 md:p-8 space-y-5 max-w-7xl mx-auto">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stok Gudang</h1>
          <p className="text-gray-500 text-sm mt-0.5">Monitor stok real-time vs par stock</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => alert('Sync dari Accurate akan tersedia segera. Update stok manual via tabel di bawah.')}
            className="flex items-center gap-2 border border-gray-200 text-gray-600 hover:bg-gray-50 px-3 py-2 rounded-xl text-sm font-semibold transition-colors"
          >
            <RefreshCw size={14} /> Sync dari Accurate
          </button>
          {['purchasing', 'admin'].includes(userRole) && (
            <button onClick={handleRunAgent} disabled={runningAgent}
              className="flex items-center gap-2 bg-[#037894] hover:bg-[#02627a] text-white px-3 py-2 rounded-xl text-sm font-bold shadow-sm transition-colors disabled:opacity-60">
              {runningAgent ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
              Jalankan Par Stock Agent
            </button>
          )}
        </div>
      </div>

      {/* Stale data warning */}
      {hoursSinceSync !== null && hoursSinceSync > 24 && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
          <AlertTriangle size={14} className="shrink-0" />
          Data stok terakhir diperbarui {hoursSinceSync} jam lalu. Sync dari Accurate untuk data terbaru.
        </div>
      )}

      {/* Summary chips */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="bg-red-100 text-[#FF4F31] text-xs font-bold px-3 py-1.5 rounded-full">{habisCount} item HABIS</span>
        <span className="bg-amber-100 text-[#DE9733] text-xs font-bold px-3 py-1.5 rounded-full">{belowParCount} item di bawah par</span>
        <span className="bg-green-100 text-[#82A13B] text-xs font-bold px-3 py-1.5 rounded-full">{amanCount} item aman</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {([['aaron', 'Gudang Aaron'], ['ndah', 'Gudang Ndah']] as ['aaron' | 'ndah', string][]).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        {stock.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">
            Belum ada data stok gudang {tab === 'aaron' ? 'Aaron' : 'Ndah'}.<br />
            Data akan muncul setelah sync dari Accurate atau input manual.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Item</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Kategori</th>
                  <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider">Stok Saat Ini</th>
                  <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider">Par Stock</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Last Updated</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {stock.map((s: StockItem) => {
                  const par = s.par_stock_effective ?? s.par_stock_calculated ?? 0
                  const hasOverride = s.items.par_stock_override !== null
                  const isEditing = editingOverride === s.id
                  return (
                    <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{s.items.nama}</p>
                        <p className="text-xs text-gray-400">{s.items.kode_accurate}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{s.items.kategori}</td>
                      <td className="px-4 py-3 text-right font-mono text-xs font-semibold">
                        <span className={s.qty_saat_ini === 0 ? 'text-[#FF4F31]' : s.is_below_par ? 'text-amber-600' : 'text-gray-900'}>
                          {s.qty_saat_ini} {s.satuan}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isEditing ? (
                          <div className="flex items-center gap-1 justify-end">
                            <input
                              type="number" min="1" step="0.001" value={overrideValue}
                              onChange={e => setOverrideValue(e.target.value)}
                              className="w-20 text-right border border-[#037894] rounded-lg px-2 py-1 text-xs focus:ring-2 focus:ring-[#037894] outline-none"
                              autoFocus
                            />
                            <button onClick={() => handleSaveOverride(s.id, s.items.id)} disabled={savingOverride}
                              className="text-[10px] bg-[#037894] text-white px-2 py-1 rounded font-bold">
                              {savingOverride ? '...' : 'OK'}
                            </button>
                            <button onClick={() => setEditingOverride(null)} className="text-[10px] text-gray-400 hover:text-gray-600 px-1">✕</button>
                          </div>
                        ) : (
                          <div className="text-right">
                            <span className="font-mono text-xs text-gray-700">{par} {s.satuan}</span>
                            {hasOverride && (
                              <div className="flex items-center justify-end gap-1 mt-0.5">
                                <Info size={10} className="text-amber-500" />
                                <span className="text-[9px] text-amber-600">(override manual)</span>
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <StockStatusBadge qty={s.qty_saat_ini} par={par} />
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {new Date(s.updated_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => router.push(`/dashboard/purchasing/pr/baru?item_id=${s.items.id}&gudang=${tab}`)}
                            className="text-[#037894] text-[10px] font-semibold hover:underline whitespace-nowrap">
                            + Buat PR
                          </button>
                          {canEditParStock(userRole) && (
                            <>
                              {!isEditing && (
                                <button onClick={() => { setEditingOverride(s.id); setOverrideValue(String(par || '')) }}
                                  className="text-gray-400 hover:text-gray-700 transition-colors">
                                  <Edit2 size={12} />
                                </button>
                              )}
                              {hasOverride && !isEditing && (
                                <button onClick={() => handleResetOverride(s.id, s.items.id)}
                                  className="text-[9px] text-amber-500 hover:text-amber-700 font-semibold whitespace-nowrap">
                                  Reset Auto
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
