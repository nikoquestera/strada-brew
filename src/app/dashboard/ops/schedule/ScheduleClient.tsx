'use client'
import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, Calendar, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import type { OutletDaySchedule, StaffSchedule, DivisionType } from '@/lib/ops/scheduleParser'

// ============================================================
// CONSTANTS
// ============================================================

const OUTLET_TABS = [
  { id: 'bsd',       label: 'BSD' },
  { id: 'la-piazza', label: 'La Piazza' },
  { id: 'mkg',       label: 'MKG' },
  { id: 'smb',       label: 'SMB' },
  { id: 'smb-gl',    label: 'SMB GL' },
]

const DIVISION_LABELS: Record<DivisionType, string> = {
  PIC:     '👔 PIC',
  BAR:     '☕ Bar',
  FLOOR:   '🛎️ Floor',
  KITCHEN: '🍳 Kitchen',
  HK:      '🧹 HK',
  UNKNOWN: '—',
}

const DIVISION_ORDER: DivisionType[] = ['PIC', 'BAR', 'FLOOR', 'KITCHEN', 'HK', 'UNKNOWN']

// ============================================================
// HELPERS
// ============================================================

function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}

function formatDateDisplay(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function shiftDate(iso: string, delta: number): string {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + delta)
  return d.toISOString().split('T')[0]
}

// ============================================================
// SUB-COMPONENTS
// ============================================================

function ShiftBadge({ staff }: { staff: StaffSchedule }) {
  if (!staff.shift) return <span className="text-gray-300 text-xs">—</span>

  const bg = staff.shiftColor
  const isLeave = staff.shiftType === 'leave'
  const isOff = staff.shiftType === 'off'
  const isBackup = staff.shiftType === 'backup'

  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-bold"
      style={{
        backgroundColor: isLeave || isOff ? '#F3F4F6' : bg + '18',
        color: isLeave || isOff ? '#8A8A8D' : bg,
        border: `1px solid ${isLeave || isOff ? '#E5E7EB' : bg + '40'}`,
      }}
    >
      {staff.shift}
      {isBackup && <span className="ml-1 text-[9px] opacity-60">backup</span>}
    </span>
  )
}

function DivisionSection({ division, staff }: { division: DivisionType; staff: StaffSchedule[] }) {
  if (staff.length === 0) return null

  const working = staff.filter(s => s.shiftType !== 'off' && s.shiftType !== 'leave' && s.shift !== '')
  const offOrLeave = staff.filter(s => s.shiftType === 'off' || s.shiftType === 'leave')

  return (
    <div>
      <div className="flex items-center gap-2 mb-2 px-1">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
          {DIVISION_LABELS[division]}
        </p>
        <div className="flex-1 h-px bg-gray-100" />
        <span className="text-[10px] text-gray-400">{working.length} masuk</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {staff.map((s, i) => (
          <div
            key={i}
            className={`flex items-center justify-between px-3 py-2 rounded-xl border ${
              s.shiftType === 'off' || s.shiftType === 'leave'
                ? 'bg-gray-50 border-gray-100 opacity-60'
                : 'bg-white border-gray-100 shadow-sm'
            }`}
          >
            <span className="text-sm text-gray-800 font-medium truncate mr-2">{s.name}</span>
            <ShiftBadge staff={s} />
          </div>
        ))}
      </div>
    </div>
  )
}

function ScheduleView({ schedule }: { schedule: OutletDaySchedule | null }) {
  if (!schedule) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <Calendar size={36} className="mb-3 opacity-40" />
        <p className="text-sm">Pilih tanggal dan klik Muat Jadwal</p>
      </div>
    )
  }

  if (schedule.error) {
    return (
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 mt-2">
        <AlertCircle size={16} className="text-amber-500 shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800">{schedule.error}</p>
      </div>
    )
  }

  if (schedule.staff.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p className="text-sm">Tidak ada data jadwal untuk tanggal ini.</p>
        <p className="text-xs mt-1">Pastikan tab sheet sudah ada untuk bulan ini.</p>
      </div>
    )
  }

  // Group by division
  const grouped = DIVISION_ORDER.reduce<Record<DivisionType, StaffSchedule[]>>(
    (acc, div) => ({ ...acc, [div]: [] }),
    {} as Record<DivisionType, StaffSchedule[]>
  )
  for (const s of schedule.staff) {
    grouped[s.division].push(s)
  }

  const totalStaff = schedule.staff.length
  const working = schedule.staff.filter(s => s.shiftType !== 'off' && s.shiftType !== 'leave' && s.shift !== '').length
  const onLeave = schedule.staff.filter(s => s.shiftType === 'leave').length

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="flex gap-4 flex-wrap">
        <div className="bg-teal-50 rounded-xl px-4 py-2.5 text-center min-w-[72px]">
          <p className="text-xl font-black text-strada-blue">{working}</p>
          <p className="text-[10px] text-gray-500">Masuk</p>
        </div>
        <div className="bg-gray-50 rounded-xl px-4 py-2.5 text-center min-w-[72px]">
          <p className="text-xl font-black text-gray-500">{totalStaff - working - onLeave}</p>
          <p className="text-[10px] text-gray-500">OFF</p>
        </div>
        <div className="bg-amber-50 rounded-xl px-4 py-2.5 text-center min-w-[72px]">
          <p className="text-xl font-black text-amber-600">{onLeave}</p>
          <p className="text-[10px] text-gray-500">Cuti/Izin</p>
        </div>
      </div>

      {/* Shift legend */}
      <div className="flex items-center gap-3 flex-wrap text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: '#DE9733' }} />
          Pagi (&lt;08:00)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: '#037894' }} />
          Siang (08–12)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: '#FF4F31' }} />
          Sore (≥12:00)
        </span>
      </div>

      {/* Division sections */}
      {DIVISION_ORDER.map(div => (
        <DivisionSection key={div} division={div} staff={grouped[div]} />
      ))}
    </div>
  )
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function ScheduleClient() {
  const [selectedDate, setSelectedDate] = useState(todayISO())
  const [selectedOutlet, setSelectedOutlet] = useState('bsd')
  const [schedules, setSchedules] = useState<Record<string, OutletDaySchedule>>({})
  const [loading, setLoading] = useState(false)
  const [fetched, setFetched] = useState(false)

  const fetchSchedule = useCallback(async (date: string, outlet: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/ops/schedule?date=${date}&outlet=${outlet}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json: { outlets: OutletDaySchedule[] } = await res.json()
      const outletData = json.outlets.find(o => o.outletId === outlet)
      if (outletData) {
        setSchedules(prev => ({ ...prev, [`${outlet}:${date}`]: outletData }))
      }
      setFetched(true)
    } catch (err) {
      console.error('[ScheduleClient] fetch error:', err)
      setSchedules(prev => ({
        ...prev,
        [`${outlet}:${date}`]: {
          outletId: outlet,
          outletName: OUTLET_TABS.find(o => o.id === outlet)?.label ?? outlet,
          date,
          staff: [],
          error: err instanceof Error ? err.message : 'Gagal mengambil jadwal',
        },
      }))
    } finally {
      setLoading(false)
    }
  }, [])

  // Auto-load on mount and on date/outlet change
  useEffect(() => {
    fetchSchedule(selectedDate, selectedOutlet)
  }, [selectedDate, selectedOutlet, fetchSchedule])

  const cacheKey = `${selectedOutlet}:${selectedDate}`
  const currentSchedule = schedules[cacheKey] ?? null

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Jadwal Outlet</h1>
          <p className="text-xs text-gray-400 mt-0.5">Jadwal harian dari Google Drive (Excel)</p>
        </div>
        <button
          onClick={() => {
            // Clear cache for current key and re-fetch
            setSchedules(prev => { const next = { ...prev }; delete next[cacheKey]; return next })
            fetchSchedule(selectedDate, selectedOutlet)
          }}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-strada-blue hover:bg-strada-dark-teal text-white text-sm font-semibold rounded-xl shadow-sm transition-all disabled:opacity-50"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Memuat...' : 'Refresh'}
        </button>
      </div>

      {/* Date navigation */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setSelectedDate(d => shiftDate(d, -1))}
          className="p-2 rounded-xl hover:bg-gray-100 text-gray-600 transition-colors"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="flex-1 text-center">
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-strada-blue outline-none cursor-pointer"
          />
          <p className="text-xs text-gray-400 mt-1">{formatDateDisplay(selectedDate)}</p>
        </div>
        <button
          onClick={() => setSelectedDate(d => shiftDate(d, 1))}
          className="p-2 rounded-xl hover:bg-gray-100 text-gray-600 transition-colors"
        >
          <ChevronRight size={18} />
        </button>
        {selectedDate !== todayISO() && (
          <button
            onClick={() => setSelectedDate(todayISO())}
            className="text-xs text-strada-blue font-semibold px-3 py-1.5 bg-teal-50 rounded-lg hover:bg-teal-100 transition-colors"
          >
            Hari Ini
          </button>
        )}
      </div>

      {/* Outlet tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {OUTLET_TABS.map(tab => {
          const tabKey = `${tab.id}:${selectedDate}`
          const hasData = schedules[tabKey]?.staff?.length ?? 0
          const hasError = !!schedules[tabKey]?.error
          return (
            <button
              key={tab.id}
              onClick={() => setSelectedOutlet(tab.id)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                selectedOutlet === tab.id
                  ? 'bg-strada-blue text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab.label}
              {hasError && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
              )}
              {!hasError && hasData > 0 && (
                <span className={`text-[10px] font-normal ${selectedOutlet === tab.id ? 'opacity-75' : 'text-gray-400'}`}>
                  {hasData}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Schedule content */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        {loading && !currentSchedule ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-3 w-32 bg-gray-200 rounded" />
            <div className="grid grid-cols-2 gap-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-10 bg-gray-100 rounded-xl" />
              ))}
            </div>
          </div>
        ) : (
          <ScheduleView schedule={currentSchedule} />
        )}
      </div>
    </div>
  )
}
