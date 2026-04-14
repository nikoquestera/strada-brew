import { createClient as createAdminClient } from '@supabase/supabase-js'
import Link from 'next/link'
import { formatIDR } from '@/lib/purchasing/types'
import { TrendingUp, Package, AlertTriangle, ArrowRight } from 'lucide-react'

const SERVICE_KEY =
  process.env.SERVICE_SUPABASE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY

export default async function LaporanPage() {
  const db = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, SERVICE_KEY!)

  const now = new Date()
  const months = Array.from({ length: 3 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    return {
      label: d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }),
      from: d.toISOString().slice(0, 10),
      to: new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10),
    }
  })

  const monthlyStats = await Promise.all(
    months.map(async m => {
      const [{ data: pos }, { data: grs }, { count: discCount }] = await Promise.all([
        db.from('purchase_orders').select('total_nilai, status, tipe').gte('tanggal_po', m.from).lte('tanggal_po', m.to).not('status', 'eq', 'cancelled'),
        db.from('goods_receipts').select('id, status').gte('tanggal_terima', m.from).lte('tanggal_terima', m.to),
        db.from('goods_receipts').select('*', { count: 'exact', head: true }).eq('status', 'discrepancy').gte('tanggal_terima', m.from).lte('tanggal_terima', m.to),
      ])
      const totalNilai = (pos ?? []).reduce((s: number, p: any) => s + (p.total_nilai || 0), 0)
      const poByTipe: Record<string, number> = {}
      for (const po of (pos ?? [])) {
        poByTipe[po.tipe] = (poByTipe[po.tipe] ?? 0) + (po.total_nilai || 0)
      }
      return {
        ...m,
        totalNilai,
        poCount: (pos ?? []).length,
        grCount: (grs ?? []).length,
        discrepancyCount: discCount ?? 0,
        poByTipe,
      }
    })
  )

  // Stock alerts
  const { data: stockAlerts } = await db
    .from('warehouse_stock')
    .select('id, gudang, qty_saat_ini, satuan, par_stock_calculated, items(nama, kode_accurate)')
    .eq('is_below_par', true)
    .order('qty_saat_ini', { ascending: true })
    .limit(20)

  const TIPE_LABELS: Record<string, string> = {
    fresh: 'Fresh', dry_goods: 'Dry Goods', frozen: 'Frozen', packaging: 'Packaging', roastery: 'Roastery'
  }

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Laporan</h1>
        <p className="text-gray-500 text-sm mt-0.5">Ringkasan operasional 3 bulan terakhir</p>
      </div>

      {/* Monthly stats */}
      <div className="space-y-4">
        <h2 className="font-bold text-gray-700 text-base flex items-center gap-2">
          <TrendingUp size={16} className="text-[#037894]" /> Statistik Bulanan
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {monthlyStats.map((m, i) => (
            <div key={i} className={`bg-white rounded-2xl border p-5 shadow-sm space-y-4 ${i === 0 ? 'border-[#037894]/30' : 'border-gray-100'}`}>
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-900 text-sm">{m.label}</h3>
                {i === 0 && <span className="text-[10px] bg-blue-100 text-[#037894] font-bold px-2 py-0.5 rounded-full">Bulan Ini</span>}
              </div>
              <div>
                <p className="text-gray-400 text-xs font-medium">Total Nilai PO</p>
                <p className="text-[#037894] font-bold text-xl">{formatIDR(m.totalNilai)}</p>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-gray-50 rounded-xl p-2">
                  <p className="text-lg font-bold text-gray-900">{m.poCount}</p>
                  <p className="text-[10px] text-gray-400">PO</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-2">
                  <p className="text-lg font-bold text-gray-900">{m.grCount}</p>
                  <p className="text-[10px] text-gray-400">GR</p>
                </div>
                <div className={`rounded-xl p-2 ${m.discrepancyCount > 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
                  <p className={`text-lg font-bold ${m.discrepancyCount > 0 ? 'text-[#FF4F31]' : 'text-gray-900'}`}>{m.discrepancyCount}</p>
                  <p className="text-[10px] text-gray-400">Selisih</p>
                </div>
              </div>
              {/* By tipe */}
              <div className="space-y-1">
                {Object.entries(m.poByTipe).map(([tipe, nilai]) => (
                  <div key={tipe} className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">{TIPE_LABELS[tipe] ?? tipe}</span>
                    <span className="font-semibold text-gray-700">{formatIDR(nilai as number)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stock alerts */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-gray-700 text-base flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-500" /> Stok Di Bawah Par Stock
          </h2>
          <Link href="/dashboard/purchasing/stok"
            className="text-[#037894] text-xs font-semibold flex items-center gap-1 hover:underline">
            Kelola Stok <ArrowRight size={12} />
          </Link>
        </div>
        {!stockAlerts || stockAlerts.length === 0 ? (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-5 text-center text-sm text-green-700 font-medium">
            ✓ Semua stok gudang di atas par stock
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Item</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Gudang</th>
                    <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider">Stok</th>
                    <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider">Par Stock</th>
                    <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider">Kekurangan</th>
                  </tr>
                </thead>
                <tbody>
                  {stockAlerts.map((s: any) => {
                    const par = s.par_stock_calculated ?? 0
                    return (
                      <tr key={s.id} className="border-b border-gray-50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{s.items?.nama}</p>
                          <p className="text-xs text-gray-400">{s.items?.kode_accurate}</p>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 capitalize">{s.gudang}</td>
                        <td className="px-4 py-3 text-right font-mono text-xs">
                          {s.qty_saat_ini === 0
                            ? <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">HABIS</span>
                            : <span className="text-[#FF4F31] font-bold">{s.qty_saat_ini} {s.satuan}</span>
                          }
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-xs text-gray-500">{par} {s.satuan}</td>
                        <td className="px-4 py-3 text-right font-mono text-xs font-bold text-[#FF4F31]">
                          {Math.ceil(par - s.qty_saat_ini)} {s.satuan}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Buat PO Baru', href: '/dashboard/purchasing/po/baru', color: 'bg-[#037894] text-white' },
          { label: 'Lihat Semua PO', href: '/dashboard/purchasing/po', color: 'bg-white text-gray-700 border border-gray-200' },
          { label: 'Kamus Harga', href: '/dashboard/purchasing/kamus-harga', color: 'bg-white text-gray-700 border border-gray-200' },
          { label: 'Stok Gudang', href: '/dashboard/purchasing/stok', color: 'bg-white text-gray-700 border border-gray-200' },
        ].map(link => (
          <Link key={link.href} href={link.href}
            className={`${link.color} rounded-xl px-4 py-3 text-sm font-semibold text-center hover:opacity-90 transition-opacity shadow-sm`}>
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  )
}
