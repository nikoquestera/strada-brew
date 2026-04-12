'use client'
import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Search, AlertTriangle, CheckCircle2, Loader2, Calendar, Store, Filter } from 'lucide-react'
import { DEFAULT_STORE_NAMES } from '@/lib/stores/defaults'

const STORE_OPENING_DATES: Record<string, string> = {
  'LA.PIAZZA': '2025-01-01',
  'MKG': '2025-01-01',
  'SMS': '2025-07-28',
  'BSD': '2025-12-10',
  'SMB': '2026-02-04',
  'SMB GOLD LOUNGE': '2026-03-18'
}

export default function BatchAuditClient() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [csvData, setCsvData] = useState<any[]>([])
  const [resolvedData, setResolvedData] = useState<any[]>([])
  const [userEmail, setUserEmail] = useState<string>('')
  const [markingId, setMarkingId] = useState<string | null>(null)
  
  // Filters
  const [selectedStore, setSelectedStore] = useState<string>('LA.PIAZZA')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [filterMode, setFilterMode] = useState<'all' | 'missing' | 'unbalanced'>('all')

  useEffect(() => {
    fetchUser()
    fetchData()
  }, [])

  async function fetchUser() {
    const { data } = await supabase.auth.getUser()
    if (data.user) {
      setUserEmail(data.user.email || 'Unknown User')
    }
  }

  async function fetchData() {
    setLoading(true)
    try {
      // 1. Fetch resolved keys from DB
      const { data: resData } = await supabase
        .from('abnormal_transactions')
        .select('transaction_date, store_name')
        .eq('status', 'RESOLVED')
      setResolvedData(resData || [])

      // 2. Fetch CSV data from Accurate extract
      const res = await fetch('/api/finance/accurate-extract')
      const result = await res.json()
      if (result.data) {
        setCsvData(result.data)
      }
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  // Generate dates for a specific store based on its opening date
  const getDatesForStore = (storeName: string) => {
    const dates = []
    const startStr = STORE_OPENING_DATES[storeName] || '2025-01-01'
    const start = new Date(startStr)
    const end = new Date()
    
    let current = new Date(start)
    while (current <= end) {
      dates.push(current.toISOString().split('T')[0])
      current.setDate(current.getDate() + 1)
    }
    return dates
  }

  // Map CSV data and DB data to dates for the selected store
  const tableData = useMemo(() => {
    const resolvedKeys = new Set(resolvedData.map(r => `${r.transaction_date}_${r.store_name}`))
    
    // Create maps for quick lookup
    const csvMap = new Map() // By transaction date (for Penjualan)
    const uangMasukMap = new Map() // By Date - 1 (for Uang Masuk alignment)

    csvData.forEach(row => {
      if (row.Toko === selectedStore) {
        csvMap.set(row.Tanggal, row)
        
        // Uang Masuk is H+1, so for date D, we look at CSV date D+1
        const dateObj = new Date(row.Tanggal)
        dateObj.setDate(dateObj.getDate() - 1)
        const shiftedDate = dateObj.toISOString().split('T')[0]
        uangMasukMap.set(shiftedDate, row)
      }
    })

    const storeDates = getDatesForStore(selectedStore)
    if (sortOrder === 'desc') storeDates.reverse()

    return storeDates.map(date => {
      const csvRow = csvMap.get(date)
      const umRow = uangMasukMap.get(date)
      const isResolved = resolvedKeys.has(`${date}_${selectedStore}`)
      
      const res = {
        date,
        store: selectedStore,
        csvRow: csvRow || null,
        umRow: umRow || null,
        isResolved
      }
      return res
    }).filter(item => {
      if (item.isResolved) return false
      
      const hasPenjualan = item.csvRow && (item.csvRow.penjualanDebit > 0 || item.csvRow.penjualanKredit > 0)
      const hasUangMasuk = item.umRow && (item.umRow.uangMasukDebit > 0 || item.umRow.uangMasukKredit > 0)
      
      if (filterMode === 'missing') {
        return !hasPenjualan || !hasUangMasuk
      }
      
      if (filterMode === 'unbalanced') {
        if (!hasPenjualan || !hasUangMasuk) return false
        const pD = item.csvRow.penjualanDebit
        const pK = item.csvRow.penjualanKredit
        const uD = item.umRow.uangMasukDebit
        const uK = item.umRow.uangMasukKredit
        
        // Unbalanced if any of the 4 values are not equal (within tolerance)
        const vals = [pD, pK, uD, uK]
        const first = vals[0]
        const isAllEqual = vals.every(v => Math.abs(v - first) < 2)
        return !isAllEqual
      }
      
      return true
    })
  }, [csvData, resolvedData, selectedStore, sortOrder, filterMode])

  const storeStats = useMemo(() => {
    const stats: Record<string, any> = {}
    
    DEFAULT_STORE_NAMES.forEach(store => {
      const storeDates = getDatesForStore(store)
      const totalJournalsRequired = storeDates.length * 2
      
      const csvForStore = csvData.filter(row => row.Toko === store)
      
      // We need a map to detect Uang Masuk H+1 for stats too
      const umMap = new Map()
      csvForStore.forEach(row => {
        const dateObj = new Date(row.Tanggal)
        dateObj.setDate(dateObj.getDate() - 1)
        umMap.set(dateObj.toISOString().split('T')[0], row)
      })

      let existingJournalsCount = 0
      storeDates.forEach(date => {
        const row = csvForStore.find(r => r.Tanggal === date)
        if (row && (row.penjualanDebit > 0 || row.penjualanKredit > 0)) existingJournalsCount++
        
        const umRow = umMap.get(date)
        if (umRow && (umRow.uangMasukDebit > 0 || umRow.uangMasukKredit > 0)) existingJournalsCount++
      })

      const percentage = totalJournalsRequired > 0 ? (existingJournalsCount / totalJournalsRequired) * 100 : 0
      
      const resolvedKeys = new Set(resolvedData.filter(r => r.store_name === store).map(r => r.transaction_date))
      
      let potentialErrors = 0
      storeDates.forEach(date => {
        if (resolvedKeys.has(date)) return
        
        const row = csvForStore.find(r => r.Tanggal === date)
        const umRow = umMap.get(date)
        
        if (row && umRow) {
          const vals = [row.penjualanDebit, row.penjualanKredit, umRow.uangMasukDebit, umRow.uangMasukKredit]
          const first = vals[0]
          const isAllEqual = vals.every(v => Math.abs(v - first) < 2)
          if (!isAllEqual) potentialErrors++
        }
      })

      stats[store] = {
        existingCount: existingJournalsCount,
        totalRequired: totalJournalsRequired,
        percentage,
        potentialErrors
      }
    })
    return stats
  }, [csvData, resolvedData])

  async function handleSudahOK(row: any) {
    if (!confirm(`Konfirmasi bahwa data ${selectedStore} pada ${row.date} sudah OK?`)) return

    setMarkingId(`${row.date}_${selectedStore}`)
    const { error } = await supabase
      .from('abnormal_transactions')
      .upsert({
        transaction_date: row.date,
        store_name: selectedStore,
        report_type: 'BATCH_AUDIT',
        issue_description: 'Audit Jurnal Manual via Batch Audit',
        status: 'RESOLVED',
        resolution_notes: 'Dikonfirmasi OK via Batch Audit Dashboard',
        resolved_by: userEmail,
        resolved_at: new Date().toISOString()
      }, { onConflict: 'store_name,transaction_date,report_type' })

    if (!error) {
      // Refresh local state to hide the item immediately
      setResolvedData(prev => [...prev, { transaction_date: row.date, store_name: selectedStore }])
    } else {
      alert(`Gagal menandai OK: ${error.message}`)
    }
    setMarkingId(null)
  }

  const buildReviewUrl = (row: any) => {
    const params = new URLSearchParams()
    params.set('date', row.date)
    params.set('store', selectedStore)
    params.set('auto_run', 'true')
    
    // Bank data for Review should come from the Uang Masuk row (H+1)
    if (row.umRow) {
      params.set('acc_kredit', (row.umRow['[DEBIT] payment_credit_bca'] || 0).toString())
      params.set('acc_debit', (row.umRow['[DEBIT] payment_debit_bca'] || 0).toString())
      params.set('acc_qris', (row.umRow['[DEBIT] payment_qris'] || 0).toString())
      params.set('acc_gobiz', (row.umRow['[DEBIT] payment_gobiz'] || 0).toString())
      params.set('acc_ovo', (row.umRow['[DEBIT] payment_ovo'] || 0).toString())
      params.set('acc_cash', (row.umRow['[DEBIT] payment_cash'] || 0).toString())
    }
    return `/dashboard/finance/revenue-store?${params.toString()}`
  }

  return (
    <div className="p-6 md:p-8 max-w-full mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <Search className="text-strada-blue" size={32} />
            Batch Audit
          </h1>
          <p className="text-gray-500 font-medium text-sm">
            Kewajiban Jurnal Harian (Sejak Store Buka)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 bg-white p-2 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 px-3 border-r border-gray-100">
            <Store size={16} className="text-gray-400" />
            <select 
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              className="text-sm font-bold bg-transparent outline-none cursor-pointer"
            >
              {DEFAULT_STORE_NAMES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          
          <div className="flex items-center gap-2 px-3 border-r border-gray-100">
            <Calendar size={16} className="text-gray-400" />
            <select 
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as any)}
              className="text-sm font-bold bg-transparent outline-none cursor-pointer"
            >
              <option value="desc">Terbaru</option>
              <option value="asc">Terlama</option>
            </select>
          </div>

          <div className="flex items-center gap-2 px-3 border-r border-gray-100">
            <Filter size={16} className="text-gray-400" />
            <select 
              value={filterMode}
              onChange={(e) => setFilterMode(e.target.value as any)}
              className="text-sm font-bold bg-transparent outline-none cursor-pointer"
            >
              <option value="all">Semua Jurnal</option>
              <option value="missing">Hanya Belum Ada</option>
              <option value="unbalanced">Hanya Unbalanced</option>
            </select>
          </div>

          <button 
            onClick={fetchData} 
            className="p-2 hover:bg-gray-50 rounded-xl transition-colors"
            title="Refresh Data"
          >
            <Loader2 className={`${loading ? 'animate-spin' : ''} text-gray-400`} size={20} />
          </button>
        </div>
      </div>

      {/* Store Summary Cards - Compact Single Row */}
      <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar">
        {DEFAULT_STORE_NAMES.map(store => {
          const stats = storeStats[store] || { existingCount: 0, totalRequired: 0, percentage: 0, potentialErrors: 0 }
          const isSelected = selectedStore === store
          
          return (
            <button
              key={store}
              onClick={() => setSelectedStore(store)}
              className={`flex-shrink-0 min-w-[160px] p-3 rounded-xl border transition-all active:scale-95 flex flex-col justify-between ${isSelected ? 'bg-strada-blue border-strada-blue shadow-lg' : 'bg-white border-gray-100 hover:border-strada-blue/30 shadow-sm'}`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className={`text-[10px] font-black uppercase tracking-tighter ${isSelected ? 'text-white/70' : 'text-gray-400'}`}>{store}</span>
                {stats.potentialErrors > 0 && (
                  <span className={`flex items-center gap-1 text-[9px] font-black px-1.5 py-0.5 rounded-full ${isSelected ? 'bg-white text-strada-blue' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                    <AlertTriangle size={8} /> {stats.potentialErrors}
                  </span>
                )}
              </div>
              
              <div className="flex items-end justify-between gap-1 mb-2">
                <div className="flex items-baseline gap-0.5">
                  <span className={`text-3xl font-black leading-none tracking-tighter ${isSelected ? 'text-white' : 'text-strada-blue'}`}>{stats.existingCount}</span>
                  <span className={`text-[12px] font-bold ${isSelected ? 'text-white/60' : 'text-gray-400'}`}>/ {stats.totalRequired}</span>
                </div>
                <div className="text-right">
                   <span className={`text-[14px] font-black block leading-none ${isSelected ? 'text-white' : 'text-strada-blue'}`}>{stats.percentage.toFixed(0)}%</span>
                   <span className={`text-[8px] font-bold uppercase ${isSelected ? 'text-white/50' : 'text-gray-400'}`}>Arsip</span>
                </div>
              </div>

              <div className={`w-full h-1.5 rounded-full overflow-hidden flex ${isSelected ? 'bg-white/20' : 'bg-gray-100'}`}>
                <div 
                  className={`h-full transition-all duration-700 ease-out ${isSelected ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.4)]' : 'bg-strada-blue'}`}
                  style={{ width: `${stats.percentage}%` }}
                ></div>
              </div>
            </button>
          )
        })}
      </div>

      {loading && tableData.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 bg-white rounded-3xl border border-gray-100 shadow-sm">
          <Loader2 className="animate-spin text-strada-blue mb-4" size={40} />
          <p className="text-gray-400 font-bold text-sm animate-pulse">Menyiapkan Log Harian...</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-3xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-strada-blue text-white font-black uppercase tracking-widest">
                <tr>
                  <th className="px-8 py-5">Tanggal</th>
                  <th className="px-8 py-5 text-center">Jurnal Penjualan</th>
                  <th className="px-8 py-5 text-center border-x border-white/10">Jurnal Uang Masuk</th>
                  <th className="px-8 py-5 text-right">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tableData.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-8 py-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 bg-green-50 text-green-500 rounded-full flex items-center justify-center">
                          <CheckCircle2 size={32} />
                        </div>
                        <p className="text-gray-400 font-bold italic">
                          {filterMode === 'unbalanced' 
                            ? 'Semua jurnal sudah balance sempurna. ⚖️' 
                            : `Semua kewajiban jurnal untuk ${selectedStore} sudah terpenuhi. 🎉`}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  tableData.map((row, idx) => {
                    const csv = row.csvRow
                    const um = row.umRow
                    const hasPenjualan = csv && (csv.penjualanDebit > 0 || csv.penjualanKredit > 0)
                    const hasUangMasuk = um && (um.uangMasukDebit > 0 || um.uangMasukKredit > 0)
                    
                    const isPenjualanBalanced = csv ? Math.abs(csv.penjualanDebit - csv.penjualanKredit) < 2 : false
                    const isUangMasukBalanced = um ? Math.abs(um.uangMasukDebit - um.uangMasukKredit) < 2 : false

                    // Deep Balance check (All 4 values must be equal)
                    let isDeepUnbalanced = false
                    if (hasPenjualan && hasUangMasuk) {
                      const vals = [csv.penjualanDebit, csv.penjualanKredit, um.uangMasukDebit, um.uangMasukKredit]
                      isDeepUnbalanced = !vals.every(v => Math.abs(v - vals[0]) < 2)
                    }

                    return (
                      <tr key={row.date} className="hover:bg-gray-50/80 transition-colors group">
                        <td className="px-8 py-6">
                          <div className="flex flex-col">
                            <span className="font-mono text-sm font-black text-gray-900">{row.date}</span>
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">{selectedStore}</span>
                          </div>
                        </td>
                        
                        <td className="px-8 py-6 text-center">
                          {hasPenjualan ? (
                            <div className="inline-flex flex-col items-center gap-1.5">
                              <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100">
                                <span className="font-mono text-blue-700 font-black">{csv.penjualanDebit.toLocaleString('id-ID')}</span>
                                <span className="text-blue-200">/</span>
                                <span className="font-mono text-blue-900 font-black">{csv.penjualanKredit.toLocaleString('id-ID')}</span>
                              </div>
                              {!isPenjualanBalanced && (
                                <span className="text-[9px] font-black text-red-500 bg-red-50 px-2 py-0.5 rounded-full border border-red-100 uppercase tracking-tighter animate-pulse">Selisih</span>
                              )}
                            </div>
                          ) : (
                            <div className="inline-block bg-orange-50 text-orange-600 px-4 py-2 rounded-xl border border-orange-100 font-black text-[10px] uppercase tracking-widest shadow-sm">
                              Belum Ada
                            </div>
                          )}
                        </td>

                        <td className="px-8 py-6 text-center border-x border-gray-50">
                          {hasUangMasuk ? (
                            <div className="inline-flex flex-col items-center gap-1.5">
                              <div className="flex items-center gap-2 bg-green-50 px-3 py-1.5 rounded-full border border-green-100">
                                <span className="font-mono text-green-700 font-black">{um.uangMasukDebit.toLocaleString('id-ID')}</span>
                                <span className="text-green-200">/</span>
                                <span className="font-mono text-green-900 font-black">{um.uangMasukKredit.toLocaleString('id-ID')}</span>
                              </div>
                              {!isUangMasukBalanced && (
                                <span className="text-[9px] font-black text-red-500 bg-red-50 px-2 py-0.5 rounded-full border border-red-100 uppercase tracking-tighter animate-pulse">Selisih</span>
                              )}
                            </div>
                          ) : (
                            <div className="inline-block bg-orange-50 text-orange-600 px-4 py-2 rounded-xl border border-orange-100 font-black text-[10px] uppercase tracking-widest shadow-sm">
                              Belum Ada
                            </div>
                          )}
                        </td>

                        <td className="px-8 py-6 text-right">
                          <div className="flex items-center justify-end gap-3">
                            <button
                              onClick={() => router.push(buildReviewUrl(row))}
                              className={`px-4 py-2 rounded-xl font-black flex items-center gap-2 transition-all active:scale-95 text-[10px] uppercase tracking-widest border shadow-sm ${
                                isDeepUnbalanced 
                                  ? 'bg-yellow-400 hover:bg-yellow-500 text-yellow-950 border-yellow-500' 
                                  : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-200'
                              }`}
                            >
                              🔍 {isDeepUnbalanced ? 'Fix Balance' : 'Review'}
                            </button>
                            <button 
                              onClick={() => handleSudahOK(row)}
                              disabled={markingId === `${row.date}_${selectedStore}`}
                              className="bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white px-5 py-2 rounded-xl font-black flex items-center gap-2 transition-all shadow-md active:scale-95 text-[10px] uppercase tracking-widest"
                            >
                              {markingId === `${row.date}_${selectedStore}` ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                              OK
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
