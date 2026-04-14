'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Plus, Search, Filter } from 'lucide-react'
import { PO_STATUS_COLORS, PO_STATUS_LABELS, TIPE_LABELS, formatIDR } from '@/lib/purchasing/types'
import type { POStatus } from '@/lib/purchasing/types'

const ALL_STATUSES: POStatus[] = ['draft', 'pending_approval', 'approved', 'sent_vendor', 'partial_received', 'fully_received', 'cancelled']
const ALL_TIPES = ['fresh', 'dry_goods', 'frozen', 'packaging', 'roastery']

interface Props {
  outlets: { id: string; kode: string; nama: string }[]
  vendors: { id: string; kode: string; nama: string; kategori: string }[]
}

export default function POListClient({ outlets, vendors }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [pos, setPOs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterOutlet, setFilterOutlet] = useState('')
  const [filterTipe, setFilterTipe] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [dateFrom, setDateFrom] = useState(new Date().toISOString().slice(0, 10))
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0, 10))
  const [userRole, setUserRole] = useState('')

  useEffect(() => {
    fetch('/api/auth/role').then(r => r.json()).then(d => setUserRole(d.role?.toLowerCase() ?? ''))
  }, [])

  useEffect(() => {
    fetchPOs()
  }, [filterOutlet, filterTipe, filterStatus, dateFrom, dateTo])

  async function fetchPOs() {
    setLoading(true)
    let q = supabase
      .from('purchase_orders')
      .select('id, nomor, tipe, status, total_nilai, tanggal_po, tanggal_dibutuhkan, outlets(kode, nama), vendors(nama), purchase_order_lines(id)')
      .order('created_at', { ascending: false })
      .limit(100)

    if (filterOutlet) q = q.eq('outlet_id', filterOutlet)
    if (filterTipe) q = q.eq('tipe', filterTipe)
    if (filterStatus) q = q.eq('status', filterStatus)
    if (dateFrom) q = q.gte('tanggal_po', dateFrom)
    if (dateTo) q = q.lte('tanggal_po', dateTo)

    const { data } = await q
    setPOs(data ?? [])
    setLoading(false)
  }

  const filtered = (pos ?? []).filter(po => {
    if (!search) return true
    const s = search.toLowerCase()
    return (
      po.nomor?.toLowerCase().includes(s) ||
      (po.vendors as any)?.nama?.toLowerCase().includes(s) ||
      (po.outlets as any)?.kode?.toLowerCase().includes(s)
    )
  })

  return (
    <div className="p-6 md:p-8 space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchase Order</h1>
          <p className="text-gray-500 text-sm mt-0.5">{filtered.length} PO ditemukan</p>
        </div>
        {['purchasing', 'admin'].includes(userRole) && (
          <button
            onClick={() => router.push('/dashboard/purchasing/po/baru')}
            className="flex items-center gap-2 bg-[#037894] hover:bg-[#02627a] text-white px-4 py-2.5 rounded-xl font-semibold text-sm shadow-sm transition-colors"
          >
            <Plus size={16} /> Buat PO Baru
          </button>
        )}
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={14} className="text-gray-400 shrink-0" />
          <select
            value={filterOutlet}
            onChange={e => setFilterOutlet(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 focus:ring-2 focus:ring-[#037894] outline-none"
          >
            <option value="">Semua Outlet</option>
            {outlets.map(o => <option key={o.id} value={o.id}>{o.kode} — {o.nama}</option>)}
          </select>
          <select
            value={filterTipe}
            onChange={e => setFilterTipe(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 focus:ring-2 focus:ring-[#037894] outline-none"
          >
            <option value="">Semua Tipe</option>
            {ALL_TIPES.map(t => <option key={t} value={t}>{TIPE_LABELS[t]}</option>)}
          </select>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 focus:ring-2 focus:ring-[#037894] outline-none"
          >
            <option value="">Semua Status</option>
            {ALL_STATUSES.map(s => <option key={s} value={s}>{PO_STATUS_LABELS[s]}</option>)}
          </select>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 focus:ring-2 focus:ring-[#037894] outline-none" />
          <span className="text-gray-400 text-sm">s/d</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 focus:ring-2 focus:ring-[#037894] outline-none" />
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari nomor PO, vendor, outlet..."
            className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#037894] outline-none"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-10 text-center text-gray-400 text-sm">Memuat data...</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">Tidak ada PO ditemukan</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Nomor PO</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tanggal</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Outlet</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Vendor</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tipe</th>
                  <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider">Items</th>
                  <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider">Nilai</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((po: any) => (
                  <tr key={po.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs font-semibold text-gray-900">{po.nomor}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{po.tanggal_po}</td>
                    <td className="px-4 py-3 text-gray-700 text-xs">{(po.outlets as any)?.kode}</td>
                    <td className="px-4 py-3 text-gray-700 text-xs max-w-[140px] truncate">{(po.vendors as any)?.nama}</td>
                    <td className="px-4 py-3">
                      <span className="bg-gray-100 text-gray-600 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                        {TIPE_LABELS[po.tipe] ?? po.tipe}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-gray-500">{(po.purchase_order_lines as any[])?.length ?? 0}</td>
                    <td className="px-4 py-3 text-right text-xs font-semibold text-gray-900">{formatIDR(po.total_nilai)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-semibold ${PO_STATUS_COLORS[po.status as POStatus] ?? 'bg-gray-100 text-gray-600'}`}>
                        {PO_STATUS_LABELS[po.status as POStatus] ?? po.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => router.push(`/dashboard/purchasing/po/${po.id}`)}
                          className="text-[#037894] text-xs font-semibold hover:underline"
                        >
                          {po.status === 'draft' && ['purchasing', 'admin'].includes(userRole) ? 'Edit' : 'Lihat'}
                        </button>
                        {po.status === 'pending_approval' && ['purchasing_approver', 'admin'].includes(userRole) && (
                          <button
                            onClick={() => router.push(`/dashboard/purchasing/po/${po.id}`)}
                            className="bg-[#037894] text-white text-[10px] font-bold px-2.5 py-1 rounded-lg hover:bg-[#02627a] transition-colors"
                          >
                            Approve
                          </button>
                        )}
                        {po.status === 'sent_vendor' && ['warehouse', 'roastery', 'purchasing', 'admin'].includes(userRole) && (
                          <button
                            onClick={() => router.push(`/dashboard/purchasing/po/${po.id}`)}
                            className="bg-amber-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg hover:bg-amber-600 transition-colors"
                          >
                            Terima
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
