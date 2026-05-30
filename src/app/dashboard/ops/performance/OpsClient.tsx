'use client'
import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, TrendingUp, TrendingDown, AlertCircle, BarChart2 } from 'lucide-react'
import type { AllPerformanceData, OutletPerformanceData } from '@/lib/ops/performanceParser'

// ============================================================
// HELPERS
// ============================================================

function formatRp(n: number | null): string {
  if (n === null || n === undefined) return '—'
  return 'Rp ' + Math.round(n).toLocaleString('id-ID')
}

function formatPct(n: number | null): string {
  if (n === null || n === undefined) return '—'
  return `${n.toFixed(1)}%`
}

function achievementColor(pct: number | null): string {
  if (pct === null) return '#8A8A8D'
  if (pct >= 100) return '#037894'
  if (pct >= 80)  return '#DE9733'
  return '#FF4F31'
}

function achievementBg(pct: number | null): string {
  if (pct === null) return 'bg-gray-50'
  if (pct >= 100) return 'bg-teal-50'
  if (pct >= 80)  return 'bg-amber-50'
  return 'bg-red-50'
}

type ReportType = 'daily' | 'weekly' | 'monthly'

const REPORT_TABS: { key: ReportType; label: string }[] = [
  { key: 'daily',   label: 'Hari Ini' },
  { key: 'weekly',  label: 'Minggu Ini' },
  { key: 'monthly', label: 'Bulan Ini' },
]

const OUTLET_ORDER = ['la-piazza', 'bsd', 'mkg', 'sms', 'smb', 'smb-gl', 'panen']

// ============================================================
// SUB-COMPONENTS
// ============================================================

function MetricRow({ label, target, actual }: { label: string; target: number | null; actual: number | null }) {
  return (
    <div className="flex items-center justify-between text-xs py-0.5">
      <span className="text-gray-500">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-gray-400">{formatRp(target)}</span>
        <span className="text-gray-300">→</span>
        <span className="font-semibold text-gray-800">{formatRp(actual)}</span>
      </div>
    </div>
  )
}

function ItemList({ items }: { items: { label: string; value: string | null }[] }) {
  const nonNull = items.filter(i => i.value)
  if (!nonNull.length) return null
  return (
    <div className="mt-2 space-y-0.5">
      {nonNull.map(({ label, value }) => (
        <div key={label} className="flex items-start gap-1.5 text-xs">
          <span className="text-gray-400 shrink-0 w-24">{label}</span>
          <span className="text-gray-700 font-medium truncate" title={value!}>{value}</span>
        </div>
      ))}
    </div>
  )
}

function COGSSummary({ data }: { data: OutletPerformanceData }) {
  const cogsItems = [
    { label: 'Bar', cogs: data.cogsBar },
    { label: 'Kitchen', cogs: data.cogsKitchen },
    { label: 'Floor', cogs: data.cogsFloor },
    { label: 'Merch', cogs: data.cogsMerch },
  ].filter(i => i.cogs)
  if (!cogsItems.length) return null
  return (
    <div className="mt-3 pt-3 border-t border-gray-100">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">COGS</p>
      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
        {cogsItems.map(({ label, cogs }) => (
          <div key={label} className="flex items-center justify-between text-xs">
            <span className="text-gray-500">{label}</span>
            <span className="font-semibold text-gray-700">{cogs!.pct.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function OutletCard({ outletId, data }: { outletId: string; data: OutletPerformanceData | null }) {
  const outletName = data?.outletName ?? outletId.toUpperCase()
  const pct = data?.achievementPct ?? null

  if (!data) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <p className="font-bold text-gray-900 text-sm">{outletName}</p>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Belum ada data</span>
        </div>
        <p className="text-xs text-gray-400 mt-1">Spreadsheet ID belum dikonfigurasi atau data tidak tersedia.</p>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-1 ${achievementBg(pct)} border-l-4`}
      style={{ borderLeftColor: achievementColor(pct) }}>
      {/* Header */}
      <div className="flex items-start justify-between mb-1">
        <div>
          <p className="font-bold text-gray-900 text-sm">{outletName}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">{data.period}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black" style={{ color: achievementColor(pct) }}>
            {formatPct(pct)}
          </p>
          <p className="text-[10px] text-gray-400">achievement</p>
        </div>
      </div>

      {/* Net Sales */}
      <MetricRow label="Net Sales" target={data.netSalesTarget} actual={data.netSalesActual} />
      <MetricRow label="AT" target={data.atTarget} actual={data.atActual} />

      {/* Top items */}
      {data.reportType === 'monthly' && (
        <>
          <ItemList items={[
            { label: '🥤 Top Bev', value: data.topBeverage },
            { label: '🥤 Bot Bev', value: data.bottomBeverage },
            { label: '🍽️ Top MC', value: data.topMainCourse },
            { label: '🎂 Top Cake', value: data.topCake },
            { label: '🛍️ Top Merch', value: data.topMerchandise },
          ]} />
          <COGSSummary data={data} />
        </>
      )}
      {data.reportType === 'weekly' && (
        <ItemList items={[
          { label: '🥤 Top Bev', value: data.topBeverage },
          { label: '🎂 Top Cake', value: data.topCake },
          { label: '🗑️ Top Waste', value: data.topWaste },
        ]} />
      )}
    </div>
  )
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function OpsClient() {
  const [reportType, setReportType] = useState<ReportType>('daily')
  const [data, setData] = useState<AllPerformanceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastFetched, setLastFetched] = useState<string | null>(null)
  const [errors, setErrors] = useState<string[]>([])

  const fetchData = useCallback(async () => {
    setLoading(true)
    setErrors([])
    try {
      const res = await fetch('/api/ops/refresh')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json: AllPerformanceData = await res.json()
      setData(json)
      setErrors(json.errors ?? [])
      setLastFetched(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }))
    } catch (err) {
      setErrors([err instanceof Error ? err.message : 'Gagal mengambil data'])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // ---- Summary stats ----
  const outletResults = data
    ? OUTLET_ORDER.map(id => ({
        id,
        data: data.outlets[id]?.[reportType] ?? null,
      }))
    : OUTLET_ORDER.map(id => ({ id, data: null }))

  const validResults = outletResults.filter(o => o.data?.achievementPct !== null)
  const avgAchievement = validResults.length > 0
    ? validResults.reduce((sum, o) => sum + (o.data!.achievementPct ?? 0), 0) / validResults.length
    : null
  const aboveTarget = validResults.filter(o => (o.data?.achievementPct ?? 0) >= 100).length
  const belowTarget = validResults.filter(o => (o.data?.achievementPct ?? 0) < 80).length

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Performance Outlet</h1>
          {lastFetched && (
            <p className="text-xs text-gray-400 mt-0.5">
              Diperbarui {lastFetched} — data dari Google Sheets langsung
            </p>
          )}
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-strada-blue hover:bg-strada-dark-teal text-white text-sm font-semibold rounded-xl shadow-sm transition-all disabled:opacity-50"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Memuat...' : 'Refresh'}
        </button>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle size={16} className="text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Beberapa data tidak dapat dimuat</p>
            <ul className="mt-1 space-y-0.5">
              {errors.map((e, i) => (
                <li key={i} className="text-xs text-amber-700">{e}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Report type tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {REPORT_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setReportType(tab.key)}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
              reportType === tab.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Summary bar */}
      {!loading && data && validResults.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
            <p className="text-3xl font-black" style={{ color: achievementColor(avgAchievement) }}>
              {formatPct(avgAchievement)}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">Rata-rata Achievement</p>
          </div>
          <div className="bg-teal-50 rounded-2xl border border-teal-100 shadow-sm p-4 text-center">
            <p className="text-3xl font-black text-strada-blue">{aboveTarget}</p>
            <p className="text-xs text-gray-500 mt-0.5">Outlet ≥ Target</p>
          </div>
          <div className="bg-red-50 rounded-2xl border border-red-100 shadow-sm p-4 text-center">
            <p className="text-3xl font-black text-red-500">{belowTarget}</p>
            <p className="text-xs text-gray-500 mt-0.5">Outlet &lt; 80%</p>
          </div>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {OUTLET_ORDER.map(id => (
            <div key={id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 animate-pulse">
              <div className="h-4 w-24 bg-gray-200 rounded mb-3" />
              <div className="h-8 w-16 bg-gray-200 rounded mb-2" />
              <div className="h-3 w-full bg-gray-100 rounded mb-1" />
              <div className="h-3 w-3/4 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Outlet grid */}
      {!loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {outletResults.map(({ id, data: outletData }) => (
            <OutletCard key={id} outletId={id} data={outletData} />
          ))}
        </div>
      )}
    </div>
  )
}
