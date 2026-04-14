import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ShoppingCart, AlertTriangle, Package, ClipboardList, TrendingUp, ArrowRight } from 'lucide-react'
import { formatIDR, PO_STATUS_COLORS, PO_STATUS_LABELS } from '@/lib/purchasing/types'

const SERVICE_KEY =
  process.env.SERVICE_SUPABASE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY

export default async function PurchasingOverviewPage() {
  let user: any = null
  try {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser()
    if (!data.user) redirect('/login')
    user = data.user
  } catch {
    redirect('/login')
  }

  const db = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, SERVICE_KEY!)

  const today = new Date().toISOString().slice(0, 10)
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)

  // Alert counts
  const [
    { count: pendingApprovalCount },
    { count: belowParCount },
    { count: autoprToday },
    { count: unverifiedGR },
  ] = await Promise.all([
    db.from('purchase_orders').select('*', { count: 'exact', head: true }).eq('status', 'pending_approval'),
    db.from('warehouse_stock').select('*', { count: 'exact', head: true }).eq('is_below_par', true),
    db.from('purchase_requests').select('*', { count: 'exact', head: true }).eq('sumber', 'auto_parstock').eq('tanggal_permintaan', today),
    db.from('goods_receipts').select('*', { count: 'exact', head: true }).eq('status', 'draft'),
  ])

  // Today's POs
  const { data: todayPOs } = await db
    .from('purchase_orders')
    .select('id, nomor, tipe, status, total_nilai, tanggal_po, outlets(kode, nama), vendors(nama)')
    .eq('tanggal_po', today)
    .order('created_at', { ascending: false })
    .limit(10)

  // Critical stock
  const { data: criticalStock } = await db
    .from('warehouse_stock')
    .select('id, gudang, qty_saat_ini, satuan, par_stock_calculated, par_stock_effective, items(nama, kode_accurate)')
    .eq('is_below_par', true)
    .order('qty_saat_ini', { ascending: true })
    .limit(10)

  // Monthly stats
  const { data: monthlyPOs } = await db
    .from('purchase_orders')
    .select('total_nilai, status')
    .gte('tanggal_po', firstOfMonth)

  const totalNilaiMonth = (monthlyPOs ?? []).reduce((s: number, po: any) => s + (po.total_nilai || 0), 0)
  const poSelesai = (monthlyPOs ?? []).filter((po: any) => po.status === 'fully_received').length
  const poTotal = (monthlyPOs ?? []).length

  // GR discrepancy value this month
  const { data: discGRs } = await db
    .from('goods_receipts')
    .select('id')
    .eq('status', 'discrepancy')
    .gte('tanggal_terima', firstOfMonth)
  const discrepancyCount = discGRs?.length ?? 0

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Purchasing & Gudang</h1>
        <p className="text-gray-500 text-sm mt-1">Overview operasional hari ini — {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      {/* Alert cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {(pendingApprovalCount ?? 0) > 0 && (
          <Link href="/dashboard/purchasing/po?status=pending_approval"
            className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3 hover:bg-red-100 transition-colors">
            <div className="w-9 h-9 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
              <ShoppingCart size={16} className="text-[#FF4F31]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#FF4F31]">{pendingApprovalCount}</p>
              <p className="text-xs text-red-600 font-medium leading-tight">PO menunggu<br/>approval Vetris</p>
            </div>
          </Link>
        )}

        {(belowParCount ?? 0) > 0 && (
          <Link href="/dashboard/purchasing/stok"
            className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 hover:bg-amber-100 transition-colors">
            <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
              <Package size={16} className="text-[#DE9733]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#DE9733]">{belowParCount}</p>
              <p className="text-xs text-amber-700 font-medium leading-tight">Stok gudang<br/>di bawah par</p>
            </div>
          </Link>
        )}

        {(autoprToday ?? 0) > 0 && (
          <Link href="/dashboard/purchasing/pr?sumber=auto_parstock"
            className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3 hover:bg-blue-100 transition-colors">
            <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
              <ClipboardList size={16} className="text-[#037894]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#037894]">{autoprToday}</p>
              <p className="text-xs text-blue-700 font-medium leading-tight">PR auto<br/>hari ini</p>
            </div>
          </Link>
        )}

        {(unverifiedGR ?? 0) > 0 && (
          <Link href="/dashboard/purchasing/terima?status=draft"
            className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-start gap-3 hover:bg-orange-100 transition-colors">
            <div className="w-9 h-9 bg-orange-100 rounded-xl flex items-center justify-center shrink-0">
              <AlertTriangle size={16} className="text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-600">{unverifiedGR}</p>
              <p className="text-xs text-orange-700 font-medium leading-tight">GR belum<br/>diverifikasi</p>
            </div>
          </Link>
        )}

        {/* If no alerts, show a calm state */}
        {(pendingApprovalCount ?? 0) === 0 && (belowParCount ?? 0) === 0 && (autoprToday ?? 0) === 0 && (unverifiedGR ?? 0) === 0 && (
          <div className="col-span-2 lg:col-span-4 bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
            <p className="text-green-700 font-semibold text-sm">✓ Semua aman — tidak ada item yang perlu perhatian segera.</p>
          </div>
        )}
      </div>

      {/* Middle row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's POs */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-bold text-gray-900">PO Hari Ini</h2>
            <Link href="/dashboard/purchasing/po" className="text-[#037894] text-xs font-semibold flex items-center gap-1 hover:underline">
              Lihat Semua <ArrowRight size={12} />
            </Link>
          </div>
          {!todayPOs || todayPOs.length === 0 ? (
            <div className="px-5 py-8 text-center text-gray-400 text-sm">Belum ada PO hari ini</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-50">
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Nomor PO</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Outlet</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Vendor</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Nilai</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {todayPOs.map((po: any) => (
                    <tr key={po.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/dashboard/purchasing/po/${po.id}`} className="text-[#037894] font-mono text-xs font-semibold hover:underline">
                          {po.nomor}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{(po.outlets as any)?.kode}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs truncate max-w-[120px]">{(po.vendors as any)?.nama}</td>
                      <td className="px-4 py-3 text-gray-900 text-xs font-medium">{formatIDR(po.total_nilai)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-semibold ${PO_STATUS_COLORS[po.status as keyof typeof PO_STATUS_COLORS] ?? 'bg-gray-100 text-gray-600'}`}>
                          {PO_STATUS_LABELS[po.status as keyof typeof PO_STATUS_LABELS] ?? po.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Critical stock */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-bold text-gray-900">Stok Kritis</h2>
            <Link href="/dashboard/purchasing/stok" className="text-[#037894] text-xs font-semibold flex items-center gap-1 hover:underline">
              Lihat Semua <ArrowRight size={12} />
            </Link>
          </div>
          {!criticalStock || criticalStock.length === 0 ? (
            <div className="px-5 py-8 text-center text-gray-400 text-sm">Semua stok di atas par stock</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-50">
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Item</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Gudang</th>
                    <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider">Stok</th>
                    <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider">Par</th>
                    <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider">Selisih</th>
                  </tr>
                </thead>
                <tbody>
                  {criticalStock.map((s: any) => {
                    const par = s.par_stock_effective ?? s.par_stock_calculated ?? 0
                    const selisih = s.qty_saat_ini - par
                    return (
                      <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <p className="text-gray-900 text-xs font-medium">{(s.items as any)?.nama}</p>
                          <p className="text-gray-400 text-[10px]">{(s.items as any)?.kode_accurate}</p>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs capitalize">{s.gudang}</td>
                        <td className="px-4 py-3 text-right text-xs font-mono">
                          {s.qty_saat_ini === 0
                            ? <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">HABIS</span>
                            : <span className="text-[#FF4F31] font-bold">{s.qty_saat_ini} {s.satuan}</span>
                          }
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-gray-500 font-mono">{par} {s.satuan}</td>
                        <td className="px-4 py-3 text-right text-xs text-[#FF4F31] font-bold font-mono">{selisih} {s.satuan}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Mini stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <TrendingUp size={18} className="text-[#037894]" />
            </div>
            <div>
              <p className="text-gray-400 text-xs font-medium">Total Nilai PO Bulan Ini</p>
              <p className="text-gray-900 text-lg font-bold">{formatIDR(totalNilaiMonth)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
              <Package size={18} className="text-[#82A13B]" />
            </div>
            <div>
              <p className="text-gray-400 text-xs font-medium">PO Selesai Diterima</p>
              <p className="text-gray-900 text-lg font-bold">{poSelesai} / {poTotal} PO</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center">
              <AlertTriangle size={18} className="text-orange-500" />
            </div>
            <div>
              <p className="text-gray-400 text-xs font-medium">GR Dengan Selisih (Bulan Ini)</p>
              <p className="text-gray-900 text-lg font-bold">{discrepancyCount} GR</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
