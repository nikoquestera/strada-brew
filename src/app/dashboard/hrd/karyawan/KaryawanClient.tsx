'use client'
import { useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Users, Clock, AlertTriangle, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Employee {
  id: string
  employee_id: string
  full_name: string
  position: string
  department: string
  entity: string
  outlet: string
  status: string
  contract_end: string | null
  base_salary: number | null
  join_date: string | null
}

interface Props {
  employees: Employee[]
  now: string // ISO string, passed from server
}

const statusStyle: Record<string, { bg: string; color: string }> = {
  active: { bg: 'bg-teal-50', color: 'text-teal-700' },
  inactive: { bg: 'bg-gray-100', color: 'text-gray-600' },
  resigned: { bg: 'bg-amber-50', color: 'text-amber-700' },
  terminated: { bg: 'bg-red-50', color: 'text-red-600' },
}

const FILTERS = [
  { key: '', label: 'Semua' },
  { key: 'active', label: 'Karyawan Aktif' },
  { key: 'expiring', label: 'Kontrak Berakhir' },
  { key: 'inactive', label: 'Tidak Aktif' },
]

export default function KaryawanClient({ employees: initialEmployees, now: nowStr }: Props) {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const router = useRouter()
  const now = new Date(nowStr)

  const [employees, setEmployees] = useState(initialEmployees)
  const [activeFilter, setActiveFilter] = useState(searchParams.get('filter') || '')
  const [search, setSearch] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const confirmEmployee = employees.find(e => e.id === confirmDeleteId)

  async function handleDelete() {
    if (!confirmDeleteId) return
    setDeleting(true)
    const { error } = await supabase.from('employees').delete().eq('id', confirmDeleteId)
    if (!error) {
      setEmployees(prev => prev.filter(e => e.id !== confirmDeleteId))
    }
    setDeleting(false)
    setConfirmDeleteId(null)
  }

  // Sync filter with URL
  function applyFilter(f: string) {
    setActiveFilter(f)
    const params = new URLSearchParams(searchParams.toString())
    if (f) params.set('filter', f)
    else params.delete('filter')
    router.replace(`/dashboard/hrd/karyawan?${params.toString()}`, { scroll: false })
  }

  const filtered = employees.filter(emp => {
    const daysLeft = emp.contract_end
      ? Math.ceil((new Date(emp.contract_end).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : null
    const isExpiring = daysLeft !== null && daysLeft <= 30 && daysLeft >= 0

    if (activeFilter === 'active' && emp.status !== 'active') return false
    if (activeFilter === 'expiring' && !isExpiring) return false
    if (activeFilter === 'inactive' && emp.status === 'active') return false

    if (search) {
      const q = search.toLowerCase()
      return (
        emp.full_name?.toLowerCase().includes(q) ||
        emp.employee_id?.toLowerCase().includes(q) ||
        emp.position?.toLowerCase().includes(q) ||
        emp.outlet?.toLowerCase().includes(q) ||
        emp.department?.toLowerCase().includes(q)
      )
    }
    return true
  })

  const stats = {
    total: employees.length,
    active: employees.filter(e => e.status === 'active').length,
    expiring: employees.filter(e => {
      if (!e.contract_end) return false
      const days = Math.ceil((new Date(e.contract_end).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      return days >= 0 && days <= 30
    }).length,
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Confirm Delete Modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setConfirmDeleteId(null)} />
          <div className="relative bg-white rounded-2xl p-7 w-full max-w-sm shadow-2xl">
            <p className="text-lg font-extrabold text-gray-900 mb-2">Hapus Karyawan?</p>
            <p className="text-sm text-gray-700 mb-1">
              <strong>{confirmEmployee?.full_name}</strong> ({confirmEmployee?.employee_id})
            </p>
            <p className="text-sm text-gray-500 mb-6">Data karyawan akan dihapus permanen dari sistem.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDeleteId(null)}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors">
                Batal
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className={`flex-1 py-3 rounded-xl text-sm font-bold text-white transition-colors ${deleting ? 'bg-red-300 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'}`}>
                {deleting ? 'Menghapus...' : 'Hapus Permanen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] text-strada-blue uppercase mb-1">HRD Module</p>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">Data Karyawan</h1>
          <p className="text-sm font-medium text-gray-500 mt-1">{stats.total} karyawan terdaftar di sistem</p>
        </div>
        <Link href="/dashboard/hrd/karyawan/baru"
          className="apple-btn-primary flex items-center justify-center gap-2">
          <Plus size={18} /> Tambah Karyawan
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Karyawan', value: stats.total, color: 'text-gray-900', icon: Users, filter: '' },
          { label: 'Karyawan Aktif', value: stats.active, color: 'text-strada-blue', icon: Clock, filter: 'active' },
          { label: 'Kontrak ≤30 Hari', value: stats.expiring, color: 'text-strada-coral', icon: AlertTriangle, filter: 'expiring' },
        ].map((s) => {
          const Icon = s.icon
          const isSelected = activeFilter === s.filter
          return (
            <button key={s.label} onClick={() => applyFilter(s.filter)}
              className={`apple-card p-6 flex flex-col items-center justify-center text-center transition-all duration-150 ${isSelected ? 'ring-2 ring-strada-blue' : 'hover:ring-1 hover:ring-gray-200'}`}>
              <Icon size={24} className={`${s.color} mb-3 opacity-80`} />
              <p className={`text-3xl font-extrabold ${s.color} mb-1 tracking-tight`}>{s.value}</p>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{s.label}</p>
            </button>
          )
        })}
      </div>

      {/* Filter + Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="flex gap-2 flex-wrap">
          {FILTERS.map(f => (
            <button key={f.key} onClick={() => applyFilter(f.key)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-150 border ${activeFilter === f.key ? 'bg-strada-blue text-white border-strada-blue' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}>
              {f.label}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Cari nama, ID, posisi..."
          className="ml-auto px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-strada-blue w-full sm:w-64"
        />
      </div>

      {/* Table */}
      <div className="apple-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                {['ID Karyawan', 'Nama Karyawan', 'Posisi', 'Outlet', 'Gaji Dasar', 'Kontrak Berakhir', 'Status'].map(h => (
                  <th key={h} className="px-5 py-4 text-[11px] font-extrabold text-gray-400 uppercase tracking-widest whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(emp => {
                const contractEnd = emp.contract_end ? new Date(emp.contract_end) : null
                const daysLeft = contractEnd ? Math.ceil((contractEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null
                const isExpiring = daysLeft !== null && daysLeft <= 30 && daysLeft >= 0
                const s = statusStyle[emp.status] ?? statusStyle.inactive

                return (
                  <tr key={emp.id} className="hover:bg-gray-50/80 transition-colors duration-150 group cursor-pointer">
                    <td className="px-5 py-4 whitespace-nowrap">
                      <Link href={`/dashboard/hrd/karyawan/${emp.id}`} className="text-strada-blue font-bold text-[13px] group-hover:text-strada-dark-teal transition-colors">
                        {emp.employee_id}
                      </Link>
                    </td>
                    <td className="px-5 py-4">
                      <Link href={`/dashboard/hrd/karyawan/${emp.id}`} className="block">
                        <p className="text-[14px] font-bold text-gray-900 group-hover:text-strada-blue transition-colors truncate max-w-[200px]">{emp.full_name}</p>
                        <p className="text-[11px] font-medium text-gray-500 mt-0.5 truncate max-w-[200px]">{emp.department} · {emp.entity}</p>
                      </Link>
                    </td>
                    <td className="px-5 py-4 text-[13px] font-medium text-gray-700 whitespace-nowrap">{emp.position}</td>
                    <td className="px-5 py-4 text-[13px] font-medium text-gray-500 whitespace-nowrap">{emp.outlet || '-'}</td>
                    <td className="px-5 py-4 text-[13px] font-semibold text-gray-900 whitespace-nowrap">
                      {emp.base_salary ? `Rp ${(emp.base_salary / 1000000).toFixed(1)}jt` : '-'}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className={`flex items-center gap-1.5 ${isExpiring ? 'text-strada-coral font-bold' : 'text-gray-600 font-medium'} text-[13px]`}>
                        {contractEnd ? contractEnd.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: '2-digit' }) : '-'}
                        {isExpiring && <span className="text-[10px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded font-bold">({daysLeft}hr)</span>}
                      </div>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-md tracking-wider uppercase ${s.bg} ${s.color}`}>
                          {emp.status || 'UNKNOWN'}
                        </span>
                        <button
                          onClick={() => setConfirmDeleteId(emp.id)}
                          title="Hapus karyawan"
                          className="p-1.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 transition-colors">
                          <Trash2 size={14} className="text-red-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-16">
            <Users size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 text-sm font-medium">Tidak ada karyawan yang sesuai filter.</p>
          </div>
        )}
      </div>
    </div>
  )
}
