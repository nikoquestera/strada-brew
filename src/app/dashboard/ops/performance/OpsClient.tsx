'use client'
import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, AlertCircle, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { AllPerformanceData, OutletPerformanceData } from '@/lib/ops/performanceParser'

// ============================================================
// HELPERS
// ============================================================

function formatRp(n: number | null, compact = false): string {
  if (n === null || n === undefined) return '—'
  if (compact) {
    if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1)}M`
    if (n >= 1_000_000)     return `Rp ${(n / 1_000_000).toFixed(0)}jt`
    if (n >= 1_000)         return `Rp ${(n / 1_000).toFixed(0)}rb`
    return `Rp ${Math.round(n).toLocaleString('id-ID')}`
  }
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
  if (pct === null) return 'bg-gray-50 border-gray-200'
  if (pct >= 100) return 'bg-teal-50/60 border-teal-200'
  if (pct >= 80)  return 'bg-amber-50/60 border-amber-200'
  return 'bg-red-50/60 border-red-200'
}

type ReportType = 'daily' | 'weekly' | 'monthly'

const REPORT_TABS: { key: ReportType; label: string; desc: string }[] = [
  { key: 'daily',   label: 'Hari Ini',   desc: 'Data hari ini' },
  { key: 'weekly',  label: 'Minggu Ini', desc: 'Minggu berjalan' },
  { key: 'monthly', label: 'Bulan Ini',  desc: 'Bulan berjalan' },
]

const OUTLET_ORDER = ['la-piazza', 'bsd', 'mkg', 'sms', 'smb', 'smb-gl', 'summitmas']

// ============================================================
// SUB-COMPONENTS
// ============================================================

function SalesBar({ actual, target }: { actual: number | null; target: number | null }) {
  if (!actual || !target) return null
  const pct = Math.min((actual / target) * 100, 100)
  const color = actual >= target ? '#037894' : actual / target >= 0.8 ? '#DE9733' : '#FF4F31'
  return (
    <div className="mt-2">
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}

function COGSPill({ label, pct }: { label: string; pct: number }) {
  const color = pct <= 28 ? '#037894' : pct <= 34 ? '#DE9733' : '#FF4F31'
  return (
    <div className="flex items-center justify-between">
      <span className="text-[10px] text-gray-400">{label}</span>
      <span className="text-[10px] font-bold" style={{ color }}>{pct.toFixed(1)}%</span>
    </div>
  )
}

function OutletCard({ outletId, data }: { outletId: string; data: OutletPerformanceData | null }) {
  const outletName = data?.outletName ?? outletId.replace(/-/g, ' ').toUpperCase()
  const pct = data?.achievementPct ?? null
  const color = achievementColor(pct)

  if (!data) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold text-gray-900 text-sm">{outletName}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Belum ada data</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
            <span className="text-gray-300 text-xs font-black">—</span>
          </div>
        </div>
        <p className="text-xs text-gray-400">
          Spreadsheet ID belum dikonfigurasi atau data tidak tersedia untuk periode ini.
        </p>
      </div>
    )
  }

  const cogsItems = [
    { label: 'Bar', cogs: data.cogsBar },
    { label: 'Kitchen', cogs: data.cogsKitchen },
    { label: 'Floor', cogs: data.cogsFloor },
    { label: 'Merch', cogs: data.cogsMerch },
  ].filter(i => i.cogs !== null)

  const topItems = [
    data.topBeverage    && { emoji: '🥤', label: 'Top Bev',   value: data.topBeverage },
    data.bottomBeverage && { emoji: '↓',  label: 'Bot Bev',   value: data.bottomBeverage },
    data.topMainCourse  && { emoji: '🍽️', label: 'Top MC',    value: data.topMainCourse },
    data.topCake        && { emoji: '🎂', label: 'Top Cake',  value: data.topCake },
    data.topMerchandise && { emoji: '🛍️', label: 'Top Merch', value: data.topMerchandise },
    data.topWaste       && { emoji: '🗑️', label: 'Top Waste', value: data.topWaste },
    data.topWasteBar    && { emoji: '🗑️', label: 'Waste Bar', value: data.topWasteBar },
  ].filter(Boolean) as { emoji: string; label: string; value: string }[]

  return (
    <div className={`bg-white rounded-2xl border shadow-sm p-5 flex flex-col gap-3 ${achievementBg(pct)}`}>
      {/* Header row */}
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-900 text-sm leading-tight">{outletName}</p>
          <p className="text-[10px] text-gray-400 mt-0.5 truncate">{data.period}</p>
        </div>
        <div
          className="ml-3 shrink-0 w-12 h-12 rounded-xl flex flex-col items-center justify-center text-white shadow-sm"
          style={{ backgroundColor: color }}
        >
          <span className="text-sm font-black leading-none">{pct !== null ? `${Math.round(pct)}` : '—'}</span>
          <span className="text-[9px] opacity-80">%</span>
        </div>
      </div>

      {/* Net Sales */}
      <div>
        <div className="flex items-baseline justify-between">
          <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Net Sales</span>
          <div className="text-right">
            <span className="text-sm font-bold text-gray-900">{formatRp(data.netSalesActual, true)}</span>
            <span className="text-[10px] text-gray-400 ml-1">/ {formatRp(data.netSalesTarget, true)}</span>
          </div>
        </div>
        <SalesBar actual={data.netSalesActual} target={data.netSalesTarget} />
      </div>

      {/* AT */}
      {(data.atActual !== null || data.atTarget !== null) && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-400">Avg Transaction</span>
          <span className="font-semibold text-gray-700">
            {formatRp(data.atActual, true)}
            {data.atTarget && <span className="text-gray-400 font-normal"> / {formatRp(data.atTarget, true)}</span>}
          </span>
        </div>
      )}

      {/* Top items */}
      {topItems.length > 0 && (
        <div className="pt-2 border-t border-gray-100 space-y-1">
          {topItems.slice(0, 4).map(item => (
            <div key={item.label} className="flex items-center gap-1.5 text-xs">
              <span className="text-[11px] shrink-0">{item.emoji}</span>
              <span className="text-gray-400 shrink-0 w-16 text-[10px]">{item.label}</span>
              <span className="text-gray-700 font-medium truncate flex-1" title={item.value}>{item.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* COGS breakdown (monthly only) */}
      {cogsItems.length > 0 && (
        <div className="pt-2 border-t border-gray-100">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">COGS</p>
          <div className="grid grid-cols-2 gap-x-4">
            {cogsItems.map(({ label, cogs }) => (
              <COGSPill key={label} label={label} pct={cogs!.pct} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================
// SUMMARY STAT CARD
// ============================================================

function StatCard({
  label, value, sub, color,
}: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-black" style={{ color: color ?? '#111827' }}>{value}</p>
      {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
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

  const outletResults = data
    ? OUTLET_ORDER.map(id => ({
        id,
        data: data.outlets[id]?.[reportType] ?? null,
      }))
    : OUTLET_ORDER.map(id => ({ id, data: null }))

  // Summary stats
  const withData = outletResults.filter(o => o.data?.achievementPct !== null)
  const avgAchievement = withData.length > 0
    ? withData.reduce((s, o) => s + (o.data!.achievementPct ?? 0), 0) / withData.length
    : null
  const totalSales = outletResults.reduce((s, o) => s + (o.data?.netSalesActual ?? 0), 0)
  const aboveTarget = withData.filter(o => (o.data?.achievementPct ?? 0) >= 100).length
  const belowTarget = withData.filter(o => (o.data?.achievementPct ?? 0) < 80).length

  const TrendIcon = avgAchievement === null ? Minus
    : avgAchievement >= 100 ? TrendingUp : TrendingDown

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {/* ── PAGE HEADER ── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Performance Outlet</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {lastFetched
              ? `Diperbarui pukul ${lastFetched} · data langsung dari Google Sheets`
              : 'Mengambil data dari Google Sheets...'}
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 bg-strada-blue hover:bg-strada-dark-teal text-white text-sm font-semibold rounded-xl shadow-sm transition-all disabled:opacity-50 shrink-0"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Memuat...' : 'Refresh Data'}
        </button>
      </div>

      {/* ── ERRORS ── */}
      {errors.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle size={16} className="text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800 mb-1">
              Beberapa outlet tidak dapat dimuat
            </p>
            <ul className="space-y-0.5">
              {errors.map((e, i) => (
                <li key={i} className="text-xs text-amber-700">• {e}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* ── REPORT TYPE TABS ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
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
        <p className="text-xs text-gray-400">
          {REPORT_TABS.find(t => t.key === reportType)?.desc}
        </p>
      </div>

      {/* ── SUMMARY BAR ── */}
      {!loading && data && withData.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            label="Total Net Sales"
            value={formatRp(totalSales, true)}
            sub={`${withData.length} outlet terlaporkan`}
            color="#037894"
          />
          <StatCard
            label="Rata-rata Achievement"
            value={formatPct(avgAchievement)}
            color={achievementColor(avgAchievement)}
          />
          <StatCard
            label="≥ Target"
            value={String(aboveTarget)}
            sub="outlet"
            color="#037894"
          />
          <StatCard
            label="< 80% Target"
            value={String(belowTarget)}
            sub="perlu perhatian"
            color={belowTarget > 0 ? '#FF4F31' : '#8A8A8D'}
          />
        </div>
      )}

      {/* ── LOADING SKELETON ── */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {OUTLET_ORDER.map(id => (
            <div key={id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 animate-pulse">
              <div className="flex justify-between mb-3">
                <div className="h-4 w-20 bg-gray-200 rounded" />
                <div className="w-12 h-12 bg-gray-200 rounded-xl" />
              </div>
              <div className="h-2 w-full bg-gray-100 rounded mb-1.5" />
              <div className="h-2 w-3/4 bg-gray-100 rounded mb-3" />
              <div className="h-1.5 w-full bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      )}

      {/* ── OUTLET GRID ── */}
      {!loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {outletResults.map(({ id, data: outletData }) => (
            <OutletCard key={id} outletId={id} data={outletData} />
          ))}
        </div>
      )}

      {/* ── TOTAL ROW (monthly only) ── */}
      {!loading && reportType === 'monthly' && withData.length > 1 && (
        <div className="bg-strada-blue rounded-2xl p-5 text-white flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <TrendIcon size={24} className="opacity-80" />
            <div>
              <p className="font-black text-lg">Total Net Sales — Semua Outlet</p>
              <p className="text-white/70 text-xs">{withData.length} outlet · bulan ini</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-3xl font-black">{formatRp(totalSales, true)}</p>
            <p className="text-white/70 text-xs">avg achievement: {formatPct(avgAchievement)}</p>
          </div>
        </div>
      )}
    </div>
  )
}
