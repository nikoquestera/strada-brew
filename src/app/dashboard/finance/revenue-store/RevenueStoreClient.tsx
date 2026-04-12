'use client'
import { useEffect, useState, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { ChevronDown, Play, CheckCircle2, Copy, AlertTriangle, Info, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { DEFAULT_STORE_NAMES } from '@/lib/stores/defaults'

interface ProcessingLog {
  timestamp: string
  message: string
  type: 'info' | 'success' | 'error' | 'warning'
}

function RevenueStoreForm() {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const defaultDate = searchParams.get('date') || new Date().toISOString().split('T')[0]
  const defaultStore = searchParams.get('store') || ''
  const autoRun = searchParams.get('auto_run') === 'true'

  const scrollRef = useRef<HTMLDivElement>(null)
  const [stores, setStores] = useState<string[]>([...DEFAULT_STORE_NAMES])
  const [selectedStore, setSelectedStore] = useState<string>(defaultStore)
  const [selectedDate, setSelectedDate] = useState<string>(defaultDate)
  const [isProcessing, setIsProcessing] = useState(false)
  const [logs, setLogs] = useState<ProcessingLog[]>([])
  const [result, setResult] = useState<any>(null)
  const [isVerified, setIsVerified] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [accurateConnected, setAccurateConnected] = useState(false)
  const [submitUangMasuk, setSubmitUangMasuk] = useState(true)
  const [submitPenjualan, setSubmitPenjualan] = useState(true)
  const [showInvestigation, setShowInvestigation] = useState(false)
  const [isBalanceApproved, setIsBalanceApproved] = useState(false)
  const [isMarkingResolved, setIsMarkingResolved] = useState(false)

  // Track if there's active/unsaved data
  const hasUnsavedChanges = isProcessing || isSubmitting || !!result || logs.length > 0

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  const formatCurrencyValue = (val: string | null) => {
    if (!val || val === '0') return '0'
    return parseFloat(val).toLocaleString('id-ID')
  }

  // Bank and Payment Manual Inputs
  const [bcaKreditIncome, setBcaKreditIncome] = useState<string>(formatCurrencyValue(searchParams.get('acc_kredit')))
  const [bcaDebitIncome, setBcaDebitIncome] = useState<string>(formatCurrencyValue(searchParams.get('acc_debit')))
  const [bcaQrisIncome, setBcaQrisIncome] = useState<string>(formatCurrencyValue(searchParams.get('acc_qris')))
  const [gobizIncome, setGobizIncome] = useState<string>(formatCurrencyValue(searchParams.get('acc_gobiz')))
  const [ovoIncome, setOvoIncome] = useState<string>(formatCurrencyValue(searchParams.get('acc_ovo')))
  const [cashIncome, setCashIncome] = useState<string>(formatCurrencyValue(searchParams.get('acc_cash')))

  // Simple caching
  useEffect(() => {
    if (!autoRun) {
      const cached = localStorage.getItem('revenue_store_cache')
      if (cached) {
        try {
          const data = JSON.parse(cached)
          if (!defaultStore) setSelectedStore(data.store || '')
          setBcaKreditIncome(data.bcaKredit || '0')
          setBcaDebitIncome(data.bcaDebit || '0')
          setBcaQrisIncome(data.bcaQris || '0')
          setGobizIncome(data.gobiz || '0')
          setOvoIncome(data.ovo || '0')
          setCashIncome(data.cash || '0')
        } catch (e) {}
      }
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('revenue_store_cache', JSON.stringify({
      store: selectedStore,
      bcaKredit: bcaKreditIncome,
      bcaDebit: bcaDebitIncome,
      bcaQris: bcaQrisIncome,
      gobiz: gobizIncome,
      ovo: ovoIncome,
      cash: cashIncome
    }))
  }, [selectedStore, bcaKreditIncome, bcaDebitIncome, bcaQrisIncome, gobizIncome, ovoIncome, cashIncome])
  
  const [paymentCreditBca, setPaymentCreditBca] = useState<string>('0')
  const [paymentDebitBca, setPaymentDebitBca] = useState<string>('0')
  const [paymentQris, setPaymentQris] = useState<string>('0')

  useEffect(() => {
    loadStores()
    checkAccurateConnection()
    if (autoRun && defaultStore && defaultDate) {
      handleProses()
    }
  }, [])

  // Auto-scroll logs
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [logs])

  const copyLogs = () => {
    const text = logs.map(l => `[${l.timestamp}] ${l.message}`).join('\n')
    navigator.clipboard.writeText(text)
    alert('Log berhasil disalin ke clipboard!')
  }

  async function checkAccurateConnection() {
    const { data } = await supabase.from('accurate_tokens').select('id').maybeSingle()
    setAccurateConnected(!!data)
  }

  const handleConnectAccurate = () => {
    window.location.href = '/api/accurate/auth'
  }

  async function loadStores() {
    const { data, error } = await supabase
      .from('stores')
      .select('name')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true })

    if (!error && data && data.length > 0) {
      setStores(data.map((row: { name: string }) => row.name))
    }
  }

  const addLog = (message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') => {
    const timestamp = new Date().toLocaleTimeString('id-ID')
    setLogs(prev => [...prev, { timestamp, message, type }])
  }

  const formatCurrencyInput = (val: string) => {
    if (!val) return '0'
    
    // Remove characters that aren't digits, comma, dot, or minus
    let cleaned = val.toString().replace(/[^\d.,-]/g, '')
    if (cleaned === '-' || !cleaned) return cleaned

    // Find all separators
    const lastDot = cleaned.lastIndexOf('.')
    const lastComma = cleaned.lastIndexOf(',')
    
    let integerPart = ''
    let decimalPart = ''
    
    // Determine which is the decimal separator
    if (lastComma > -1 && lastDot > -1) {
      if (lastComma > lastDot) {
        integerPart = cleaned.substring(0, lastComma).replace(/\D/g, '')
        decimalPart = cleaned.substring(lastComma + 1).replace(/\D/g, '')
      } else {
        integerPart = cleaned.substring(0, lastDot).replace(/\D/g, '')
        decimalPart = cleaned.substring(lastDot + 1).replace(/\D/g, '')
      }
    } else if (lastComma > -1) {
      const count = (cleaned.match(/,/g) || []).length
      if (count === 1 && cleaned.length - lastComma <= 3) {
        integerPart = cleaned.substring(0, lastComma).replace(/\D/g, '')
        decimalPart = cleaned.substring(lastComma + 1).replace(/\D/g, '')
      } else {
        integerPart = cleaned.replace(/\D/g, '')
        decimalPart = ''
      }
    } else if (lastDot > -1) {
      const count = (cleaned.match(/\./g) || []).length
      if (count === 1 && cleaned.length - lastDot <= 3) {
        integerPart = cleaned.substring(0, lastDot).replace(/\D/g, '')
        decimalPart = cleaned.substring(lastDot + 1).replace(/\D/g, '')
      } else {
        integerPart = cleaned.replace(/\D/g, '')
        decimalPart = ''
      }
    } else {
      integerPart = cleaned.replace(/\D/g, '')
      decimalPart = ''
    }

    let result = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
    if (val.toString().includes(',') || (val.toString().includes('.') && decimalPart)) {
      result += ',' + decimalPart.substring(0, 2)
    }
    
    return val.toString().startsWith('-') ? '-' + result : result
  }

  const handleMarkResolved = async () => {
    if (!result) return
    setIsMarkingResolved(true)
    const { error } = await supabase.from('abnormal_transactions').upsert({
      transaction_date: result.date,
      store_name: result.store,
      report_type: 'Revenue Report',
      issue_description: 'Audited from Accurate Data - Approved as is.',
      status: 'RESOLVED',
      resolution_notes: 'Confirmed by staff that Accurate data is correct.',
      resolved_at: new Date().toISOString()
    }, { onConflict: 'store_name,transaction_date,report_type' })

    if (!error) {
      addLog('✅ Transaksi telah ditandai SELESAI dan dihapus dari antrean audit.', 'success')
      alert('Berhasil! Transaksi ini sekarang dianggap benar dan masuk ke riwayat terselesaikan.')
    } else {
      addLog(`❌ Gagal menandai: ${error.message}`, 'error')
    }
    setIsMarkingResolved(false)
  }

  const parseCurrencyInput = (val: string) => {
    if (!val || val === '0') return 0
    const cleaned = val.toString().replace(/\./g, '').replace(/,/g, '.')
    return parseFloat(cleaned) || 0
  }

  const handleProses = async () => {
    if (!selectedStore) {
      addLog('❌ Pilih satu toko', 'error')
      return
    }

    setIsProcessing(true)
    setLogs([])
    setResult(null)
    setShowInvestigation(false)
    setIsBalanceApproved(false)

    try {
      addLog('🚀 Memulai proses revenue report...', 'info')
      addLog(`📅 Tanggal: ${selectedDate}`, 'info')
      addLog(`🏪 Toko: ${selectedStore}`, 'info')

      // Call the API endpoint which now streams
      const response = await fetch('/api/finance/process-revenue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          stores: [selectedStore],
          bankData: {
            bca_kredit_income: parseCurrencyInput(bcaKreditIncome),
            bca_debit_income: parseCurrencyInput(bcaDebitIncome),
            bca_qris_income: parseCurrencyInput(bcaQrisIncome),
            gobiz_income: parseCurrencyInput(gobizIncome),
            ovo_income: parseCurrencyInput(ovoIncome),
            cash_income: parseCurrencyInput(cashIncome),
          },
        }),
      })

      if (!response.ok) {
        const errText = await response.text()
        let errorMessage = response.statusText || `Server Error (${response.status})`
        try {
           const errObj = JSON.parse(errText)
           errorMessage = errObj.message || errObj.error || errorMessage
        } catch(e) {
           if (errText) errorMessage = errText.substring(0, 100)
        }
        throw new Error(errorMessage)
      }

      if (!response.body) throw new Error('No body returned from API')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let finalData = null

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const log = JSON.parse(line)
            if (log.type === 'result') {
              finalData = log.data
              setResult(log.data)
            } else if (log.message) {
              addLog(log.message, log.type || 'info')
            }
          } catch (e) {
            console.log("Chunk parse error", e, line)
          }
        }
      }

      if (finalData) {
        const val = getValidation(finalData)
        if (val?.isSalahKamar || val?.isUnbalanced) {
          const issueDesc = []
          if (val.isSalahKamar) issueDesc.push('Terdeteksi Salah Kamar (Selisih mutasi vs Quinos melebihi toleransi)')
          if (val.isUnbalanced) issueDesc.push(`Jurnal tidak seimbang (Selisih Rp ${val.absDiff.toLocaleString('id-ID')})`)

          await supabase.from('abnormal_transactions').upsert({
            transaction_date: finalData.date,
            report_type: 'Revenue Report',
            store_name: finalData.store,
            issue_description: issueDesc.join('. '),
            status: 'PENDING'
          }, { onConflict: 'store_name,transaction_date,report_type' })

          addLog('⚠️ Transaksi ini ditandai sebagai PERLU REVIEW dan telah dikirim ke tim Finance.', 'warning')
        }
      }

      addLog('✅ Proses selesai', 'success')
    } catch (error: any) {
      addLog(`❌ Error: ${error.message}`, 'error')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSubmitAccurate = async () => {
    if (!isVerified) {
      addLog('❌ Mohon centang verifikasi terlebih dahulu', 'error')
      return
    }

    if (!submitUangMasuk && !submitPenjualan) {
      addLog('❌ Pilih minimal satu jenis jurnal yang ingin dikirim', 'error')
      return
    }

    setIsSubmitting(true)
    addLog('🚀 Memulai pengiriman jurnal ke Accurate...', 'info')

    try {
      const response = await fetch('/api/finance/submit-accurate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...result,
          options: {
            submitUangMasuk,
            submitPenjualan,
            isBalanceApproved,
            balancingData: validation?.proposal
          }
        }),
      })

      if (!response.ok) {
        const errText = await response.text()
        let errorMessage = response.statusText || `Server Error (${response.status})`
        try {
           const errObj = JSON.parse(errText)
           errorMessage = errObj.message || errObj.error || errorMessage
        } catch(e) {
           if (errText) errorMessage = errText.substring(0, 100)
        }
        throw new Error(errorMessage)
      }

      if (!response.body) throw new Error('No body returned from API')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      let hasError = false
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        
        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const log = JSON.parse(line)
            if (log.type === 'error') hasError = true
            
            if (log.message) {
              addLog(log.message, log.type || 'info')
            }
          } catch (e) {
            console.log("Accurate chunk parse error", e, line)
          }
        }
      }
      
      if (!hasError) {
        addLog('✅ Semua proses Accurate berhasil terkirim!', 'success')
      } else {
        addLog('⚠️ Proses Accurate selesai dengan beberapa kesalahan.', 'warning')
      }
    } catch (error: any) {
      addLog(`❌ Error Accurate: ${error.message}`, 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  // --- VALIDATION LOGIC ---
  const getValidation = (data = result) => {
    if (!data) return null

    // 1. Validasi Salah Kamar
    const diffCredit = Math.abs((data.payment_credit_bca || 0) - (data.bca_kredit_income || 0))
    const pctCredit = (data.payment_credit_bca || 0) > 0 ? (diffCredit / data.payment_credit_bca) : 0
    
    const diffDebit = Math.abs((data.payment_debit_bca || 0) - (data.bca_debit_income || 0))
    const pctDebit = (data.payment_debit_bca || 0) > 0 ? (diffDebit / data.payment_debit_bca) : 0
    
    const diffQris = Math.abs((data.payment_qris || 0) - (data.bca_qris_income || 0))
    const pctQris = (data.payment_qris || 0) > 0 ? (diffQris / data.payment_qris) : 0

    const isSalahKamar = (pctCredit > 0.021) || (pctDebit > 0.008) || (pctQris > 0.0085)

    // 2. Validasi Balance
    // Must include ALL payment methods from Quinos for Journal 1 validation
    const allPaymentsGross = Object.entries(data)
      .filter(([key]) => key.startsWith('payment_'))
      .reduce((sum, [_, val]) => sum + (val as number || 0), 0)

    const totalDebit = allPaymentsGross + (data.revenue_discount || 0)
    const totalCredit = (data.penjualan_bar || 0) + (data.penjualan_coffee_beans || 0) + 
                        (data.penjualan_makanan || 0) + (data.penjualan_konsinyasi || 0) + 
                        (data.penjualan_bundling || 0) + (data.penjualan_inventory || 0) + 
                        (data.penjualan_modifier || 0) + (data.penjualan_konsinyasi_no_brand || 0) + 
                        (data.hutang_service || 0) + (data.hutang_pajak_pemkot || 0)
    
    const diffBalance = totalDebit - totalCredit
    const absDiff = Math.abs(diffBalance)
    const isUnbalanced = absDiff > 1 // Tolerance 1 Rupiah

    // Proposal for balancing
    let proposal = null
    if (isUnbalanced) {
      const isRounding = absDiff <= 5
      const isMisc = absDiff > 5 && absDiff <= 15000
      const canAutoFix = isRounding || isMisc
      
      proposal = {
        amount: absDiff,
        type: diffBalance > 0 ? 'CREDIT' : 'DEBIT', // If Debit is higher, add Credit to balance
        code: isRounding ? '7200.02' : '4000.90',
        label: isRounding ? 'Pembulatan' : 'Pendapatan Lain-lain',
        canAutoFix
      }
    }

    return {
      isSalahKamar,
      isUnbalanced,
      absDiff,
      proposal,
      details: { pctCredit, pctDebit, pctQris }
    }
  }

  const validation = getValidation()

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Revenue Store</h1>
        <p className="text-gray-500 mt-2 font-medium text-sm">Otomatisasi Laporan Penjualan Quinos Cloud & Integrasi Accurate Online</p>
      </div>

      <div className="w-full space-y-6">
        {/* Connection Section */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${accurateConnected ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
              <CheckCircle2 size={24} />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">Integrasi Accurate Online</h2>
              <p className="text-xs text-gray-500">Otorisasi diperlukan sekali untuk mengizinkan pengiriman jurnal otomatis.</p>
            </div>
          </div>
          {!accurateConnected ? (
            <button
              onClick={handleConnectAccurate}
              className="px-5 py-2 bg-orange-500 text-white rounded-lg text-sm font-bold hover:bg-orange-600 transition-all shadow-md active:scale-95"
            >
              🔌 Hubungkan ke Accurate
            </button>
          ) : (
            <span className="flex items-center gap-2 text-green-600 text-xs font-bold bg-green-50 px-3 py-2 rounded-lg border border-green-100">
              TERHUBUNG
            </span>
          )}
        </div>

        {/* Form Section - Horizontal & Compact Grid */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Filter & Input Mutasi Bank</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-4">
              {/* Date Input */}
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Tanggal</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  disabled={isProcessing}
                  className="w-full px-2 py-1.5 h-[34px] text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-strada-blue outline-none disabled:bg-gray-50 flex items-center"
                />
              </div>

              {/* Store Selection */}
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Toko</label>
                <select
                  value={selectedStore}
                  onChange={(e) => setSelectedStore(e.target.value)}
                  disabled={isProcessing}
                  className="w-full px-2 h-[34px] text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-strada-blue outline-none disabled:bg-gray-50 font-medium"
                >
                  <option value="" disabled>Pilih</option>
                  {stores.map(store => (
                    <option key={store} value={store}>{store}</option>
                  ))}
                </select>
              </div>

              {/* BCA Inputs */}
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 text-blue-600">KREDIT BCA</label>
                <input
                  type="text"
                  value={bcaKreditIncome}
                  onChange={(e) => setBcaKreditIncome(formatCurrencyInput(e.target.value))}
                  disabled={isProcessing}
                  className="w-full px-2 py-1.5 h-[34px] text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-strada-blue outline-none disabled:bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 text-blue-600">DEBIT BCA</label>
                <input
                  type="text"
                  value={bcaDebitIncome}
                  onChange={(e) => setBcaDebitIncome(formatCurrencyInput(e.target.value))}
                  disabled={isProcessing}
                  className="w-full px-2 py-1.5 h-[34px] text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-strada-blue outline-none disabled:bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 text-blue-600">QRIS BCA</label>
                <input
                  type="text"
                  value={bcaQrisIncome}
                  onChange={(e) => setBcaQrisIncome(formatCurrencyInput(e.target.value))}
                  disabled={isProcessing}
                  className="w-full px-2 py-1.5 h-[34px] text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-strada-blue outline-none disabled:bg-gray-50"
                />
              </div>

              {/* Other Payments */}
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Masuk GOBIZ</label>
                <input
                  type="text"
                  value={gobizIncome}
                  onChange={(e) => setGobizIncome(formatCurrencyInput(e.target.value))}
                  disabled={isProcessing}
                  className="w-full px-2 py-1.5 h-[34px] text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-strada-blue outline-none disabled:bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Masuk OVO</label>
                <input
                  type="text"
                  value={ovoIncome}
                  onChange={(e) => setOvoIncome(formatCurrencyInput(e.target.value))}
                  disabled={isProcessing}
                  className="w-full px-2 py-1.5 h-[34px] text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-strada-blue outline-none disabled:bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 text-orange-600">Masuk CASH</label>
                <input
                  type="text"
                  value={cashIncome}
                  onChange={(e) => setCashIncome(formatCurrencyInput(e.target.value))}
                  disabled={isProcessing}
                  className="w-full px-2 py-1.5 h-[34px] text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-strada-blue outline-none disabled:bg-gray-50"
                />
              </div>

              <div className="flex items-end lg:col-span-4 xl:col-span-1">
                <button
                  onClick={handleProses}
                  disabled={isProcessing || !selectedStore}
                  className={`w-full h-[34px] rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm ${
                    isProcessing || !selectedStore
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      : 'bg-strada-blue text-white hover:bg-strada-dark-teal active:scale-95'
                  }`}
                >
                  <Play size={12} />
                  {isProcessing ? 'Proses...' : 'RUN'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Results Section */}
        {result && (
          <div className="space-y-6">
            {/* Validation Alerts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {validation?.isSalahKamar ? (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 shadow-sm">
                  <AlertTriangle className="text-red-600 shrink-0 mt-0.5" size={20} />
                  <div>
                    <p className="text-sm font-bold text-red-900">Terdeteksi Salah Kamar</p>
                    <p className="text-[11px] text-red-700 mt-1 font-medium leading-relaxed">
                      Selisih Mutasi Bank vs Quinos melebihi batas toleransi.<br/>
                      <span className="opacity-80 font-mono mt-1 block space-y-0.5">
                        • Credit: {((validation?.details?.pctCredit || 0) * 100).toFixed(2)}% (Limit: 2.10%)<br/>
                        • Debit: {((validation?.details?.pctDebit || 0) * 100).toFixed(2)}% (Limit: 0.80%)<br/>
                        • QRIS: {((validation?.details?.pctQris || 0) * 100).toFixed(2)}% (Limit: 0.85%)
                      </span>
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3 shadow-sm">
                  <CheckCircle2 className="text-green-600 shrink-0 mt-0.5" size={20} />
                  <div>
                    <p className="text-sm font-bold text-green-900">Tidak Terdeteksi Salah Kamar</p>
                    <p className="text-[11px] text-green-700 mt-1 font-medium leading-relaxed">
                      Selisih mutasi bank berada dalam batas wajar.<br/>
                      <span className="opacity-80 font-mono mt-1 block space-y-0.5">
                        • Credit: {((validation?.details?.pctCredit || 0) * 100).toFixed(2)}%<br/>
                        • Debit: {((validation?.details?.pctDebit || 0) * 100).toFixed(2)}%<br/>
                        • QRIS: {((validation?.details?.pctQris || 0) * 100).toFixed(2)}%
                      </span>
                    </p>
                  </div>
                </div>
              )}

              {validation?.isUnbalanced ? (
                <div className={`${isBalanceApproved ? 'bg-orange-50 border-orange-200' : 'bg-red-50 border-red-200'} border rounded-xl p-4 flex flex-col gap-3 shadow-sm transition-colors`}>
                  <div className="flex items-start gap-3">
                    {isBalanceApproved ? <CheckCircle2 className="text-orange-600 shrink-0 mt-0.5" size={20} /> : <AlertTriangle className="text-red-600 shrink-0 mt-0.5" size={20} />}
                    <div className="flex-1">
                      <p className={`text-sm font-bold ${isBalanceApproved ? 'text-orange-900' : 'text-red-900'}`}>
                        {isBalanceApproved ? 'Masalah Balance (Diterima)' : 'Masalah Balance Terdeteksi'}
                      </p>
                      <p className={`text-[11px] mt-1 font-medium leading-relaxed ${isBalanceApproved ? 'text-orange-700' : 'text-red-700'}`}>
                        Jurnal tidak seimbang (Selisih: Rp {validation.absDiff.toLocaleString('id-ID')}).<br/>
                        {!isBalanceApproved && (
                          <button 
                            onClick={() => setShowInvestigation(!showInvestigation)}
                            className="mt-2 text-[10px] bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded font-bold uppercase tracking-wider transition-all"
                          >
                            {showInvestigation ? 'Tutup Investigasi' : '🔍 Investigasi / Cek Solusi'}
                          </button>
                        )}
                      </p>
                    </div>
                  </div>

                  {showInvestigation && !isBalanceApproved && (
                    <div className="bg-white/60 rounded-lg p-3 text-[11px] border border-red-100 space-y-2 animate-in fade-in slide-in-from-top-1">
                      <p className="font-bold text-gray-800 underline">Proposal Solusi Pembulatan:</p>
                      <div className="grid grid-cols-2 gap-2 font-mono">
                        <div className="text-gray-500">Nominal Selisih:</div>
                        <div className="font-bold text-red-600">Rp {validation.absDiff.toLocaleString('id-ID')}</div>
                        <div className="text-gray-500">Posisi Akun:</div>
                        <div className="font-bold">{validation.proposal?.type}</div>
                        <div className="text-gray-500">Kode Akun:</div>
                        <div className="font-bold">{validation.proposal?.code}</div>
                        <div className="text-gray-500">Keterangan:</div>
                        <div className="font-bold uppercase">{validation.proposal?.label}</div>
                      </div>
                      
                      {validation.proposal?.canAutoFix ? (
                        <div className="pt-2 border-t border-red-100 flex flex-col gap-2">
                          <p className="text-[10px] text-gray-600 italic text-pretty">Selisih masih dalam batas toleransi (≤ Rp 15.000). Anda dapat menyetujui proposal ini untuk melanjutkan.</p>
                          <button 
                            onClick={() => {
                              setIsBalanceApproved(true)
                              setShowInvestigation(false)
                              addLog(`⚠️ User menyetujui balancing otomatis: ${validation.proposal?.label} (Rp ${validation.absDiff})`, 'warning')
                            }}
                            className="w-full py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-bold uppercase tracking-tighter text-[10px] shadow-sm transition-all active:scale-95"
                          >
                            Saya sudah membaca dan setuju dengan pembulatan ini
                          </button>
                        </div>
                      ) : (
                        <p className="pt-2 border-t border-red-100 text-[10px] text-red-600 font-bold italic text-pretty">
                          ⚠️ Selisih diatas Rp 15.000. Investigasi manual wajib dilakukan pada data Quinos/Mutasi. Proses Submit dihentikan.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3 shadow-sm">
                  <CheckCircle2 className="text-green-600 shrink-0 mt-0.5" size={20} />
                  <div>
                    <p className="text-sm font-bold text-green-900">Jurnal Balance</p>
                    <p className="text-[11px] text-green-700 mt-1 font-medium leading-relaxed">
                      Sisi Debit dan Kredit sudah seimbang sempurna.<br/>
                      <span className="opacity-80 font-mono mt-1 block">
                        Debit: (Payment + Disc) | Kredit: (Sales + Tax + Svc)
                      </span>
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                <CheckCircle2 size={20} className="text-green-500" />
                Hasil Tarikan Quinos: {result.store} ({result.date})
              </h2>

              <div className="space-y-8">
                {/* 🛒 Sales per Department */}
                <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">🛒 Sales per Department</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { label: 'Bar', value: result.penjualan_bar },
                      { label: 'Coffee Beans', value: result.penjualan_coffee_beans },
                      { label: 'Kitchen', value: result.penjualan_makanan },
                      { label: 'Konsinyasi', value: result.penjualan_konsinyasi },
                      { label: 'Bundling', value: result.penjualan_bundling },
                      { label: 'Inventory', value: result.penjualan_inventory },
                      { label: 'Modifier', value: result.penjualan_modifier },
                      { label: 'Konsiyasi No Brand', value: result.penjualan_konsinyasi_no_brand },
                    ]
                    .filter(item => item.value > 0)
                    .map(item => (
                      <div key={item.label} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                        <p className="text-gray-500 text-[11px] font-bold uppercase mb-1">{item.label}</p>
                        <p className="text-xl font-extrabold text-gray-900">
                          Rp {parseFloat(item.value || 0).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 💳 Payment Method */}
                <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">💳 Payment Method</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { label: 'Academy 100 Vouc', value: result.payment_academy_100_vouc },
                      { label: 'Academy 50 Vouch', value: result.payment_academy_50_vouch },
                      { label: 'CASH', value: result.payment_cash },
                      { label: 'CL UPPERWEST', value: result.payment_cl_upperwest },
                      { label: 'CREDIT BCA', value: result.payment_credit_bca },
                      { label: 'DEBIT BCA', value: result.payment_debit_bca },
                      { label: 'Go Dine In Vou', value: result.payment_go_dine_in_vou },
                      { label: 'GOBIZ', value: result.payment_gobiz },
                      { label: 'OVO', value: result.payment_ovo },
                      { label: 'QRIS', value: result.payment_qris },
                      { label: 'Strada+ Gift Vou', value: result.payment_strada_gift_vou },
                      { label: 'STRADA + REWARD', value: result.payment_strada_reward },
                      { label: 'TRANSFER', value: result.payment_transfer },
                      { label: 'Voucher 50 SMB', value: result.payment_voucher_50_smb },
                      { label: 'BSD Workshop Vou', value: result.payment_bsd_workshop_vou },
                      { label: 'Voucher Bogo', value: result.payment_voucher_bogo },
                      { label: 'Voucher CKT 50.0', value: result.payment_voucher_ckt_50_0 },
                      { label: 'Voucher Chope', value: result.payment_voucher_chope },
                      { label: 'Voucher Florist', value: result.payment_voucher_florist },
                      { label: 'Voucher Harris P', value: result.payment_voucher_harris_p },
                      { label: 'Voucher JustYoga', value: result.payment_voucher_justyoga },
                      { label: 'Voucher Padel Sp', value: result.payment_voucher_padel_sp },
                      { label: 'Voucher SMKG', value: result.payment_voucher_smkg },
                      { label: 'Voucher Telkomsel', value: result.payment_voucher_telkomsel },
                      { label: 'Voucher Timezone', value: result.payment_voucher_timezone },
                      { label: 'Voucher Workshop', value: result.payment_voucher_workshop },
                      { label: 'Workshop SMS Vou', value: result.payment_workshop_sms_voucher },
                    ]
                    .filter(item => item.value > 0)
                    .map(item => (
                      <div key={item.label} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                        <p className="text-gray-500 text-[11px] font-bold uppercase mb-1">{item.label}</p>
                        <p className="text-xl font-extrabold text-gray-900">
                          Rp {parseFloat(item.value as any || 0).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* 💰 Revenue & Potongan */}
                  <div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">💰 Revenue & Potongan</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { label: 'Discount', value: result.revenue_discount },
                        { label: 'Hutang Service', value: result.hutang_service },
                        { label: 'Hutang Pajak Pemkot', value: result.hutang_pajak_pemkot },
                        { label: 'Total Penjualan', value: (parseFloat(result.payment_credit_bca || 0) + parseFloat(result.payment_debit_bca || 0) + parseFloat(result.payment_qris || 0)) },
                      ].map(item => (
                        <div key={item.label} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                          <p className="text-gray-500 text-[11px] font-bold uppercase mb-1">{item.label}</p>
                          <p className="text-xl font-extrabold text-gray-900">
                            Rp {parseFloat(item.value as any || 0).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 🏦 Data Bank & Pembayaran */}
                  <div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">🏦 Data Bank & Pembayaran</h3>
                    <div className="space-y-4">
                      <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 shadow-sm">
                        <p className="text-blue-600 text-[11px] font-bold uppercase mb-1 text-pretty">Total Uang Masuk (Gross BCA + GOBIZ + OVO)</p>
                        <p className="text-2xl font-black text-blue-800">
                          Rp {parseFloat(result.total_payment_quinos || 0).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        {[
                          { label: 'KREDIT BCA', value: result.bca_kredit_income, color: 'text-green-600' },
                          { label: 'DEBIT BCA', value: result.bca_debit_income, color: 'text-green-600' },
                          { label: 'QRIS BCA', value: result.bca_qris_income, color: 'text-green-600' },
                          { label: 'Gobiz', value: result.gobiz_income, color: 'text-green-600' },
                          { label: 'OVO', value: result.ovo_income, color: 'text-green-600' },
                          { label: 'CASH (Manual)', value: result.cash_income, color: 'text-orange-600' },
                        ].map(item => (
                          <div key={item.label} className="bg-white rounded-lg p-3 border border-gray-100 shadow-sm">
                            <p className="text-gray-400 text-[10px] font-bold uppercase mb-1">{item.label}</p>
                            <p className={`text-sm font-bold ${item.color}`}>
                              Rp {parseFloat(item.value || 0).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Fees and Persentase */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-50">
                  {result.biaya_admin_bank !== undefined && (
                    <div className="bg-orange-50 rounded-xl p-5 border border-orange-100">
                      <p className="text-orange-600 text-[11px] font-bold uppercase mb-1">Biaya Admin Bank (EDC)</p>
                      <p className="text-2xl font-black text-orange-700">
                        Rp {parseFloat(result.biaya_admin_bank || 0).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <div className="text-[10px] text-orange-800/70 mt-3 space-y-1 font-medium">
                        <p className="font-bold underline decoration-orange-300 mb-1">Rincian Persentase Admin:</p>
                        <p>• Credit BCA: {parseFloat(result.pct_credit || 0).toFixed(2)}% <span className="opacity-50">(Batas: 2.10%)</span></p>
                        <p>• Debit BCA: {parseFloat(result.pct_debit || 0).toFixed(2)}% <span className="opacity-50">(Batas: 0.80%)</span></p>
                        <p>• QRIS BCA: {parseFloat(result.pct_qris || 0).toFixed(2)}% <span className="opacity-50">(Batas: 0.85%)</span></p>
                      </div>
                    </div>
                  )}
                  {result.biaya_penjualan_merchant_online !== undefined && (
                    <div className="bg-orange-50 rounded-xl p-5 border border-orange-100">
                      <p className="text-orange-600 text-[11px] font-bold uppercase mb-1">Biaya Merchant Online (Gobiz & OVO)</p>
                      <p className="text-2xl font-black text-orange-700">
                        Rp {parseFloat(result.biaya_penjualan_merchant_online || 0).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <p className="text-[10px] text-orange-800/70 mt-3 font-medium uppercase tracking-wider">
                        = (Total Gobiz + OVO) - (Total Mutasi Masuk)
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Submit to Accurate Section */}
              <div className="mt-10 pt-8 border-t border-gray-100">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 bg-strada-blue rounded-lg flex items-center justify-center text-white shadow-sm">
                    <CheckCircle2 size={18} />
                  </div>
                  <h3 className="text-lg font-extrabold text-gray-900 tracking-tight">Kirim ke Accurate Online</h3>
                </div>
                
                <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-6 space-y-6 shadow-inner">
                  {/* Journal Selection */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-100 cursor-pointer hover:border-strada-blue transition-all group shadow-sm">
                      <input 
                        type="checkbox" 
                        checked={submitPenjualan} 
                        onChange={(e) => setSubmitPenjualan(e.target.checked)}
                        disabled={isSubmitting}
                        className="w-5 h-5 rounded border-gray-300 text-strada-blue focus:ring-strada-blue"
                      />
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-900 group-hover:text-strada-blue transition-colors">Jurnal Penjualan Cafe</span>
                        <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">Pendapatan & Piutang</span>
                      </div>
                    </label>

                    <label className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-100 cursor-pointer hover:border-strada-blue transition-all group shadow-sm">
                      <input 
                        type="checkbox" 
                        checked={submitUangMasuk} 
                        onChange={(e) => setSubmitUangMasuk(e.target.checked)}
                        disabled={isSubmitting}
                        className="w-5 h-5 rounded border-gray-300 text-strada-blue focus:ring-strada-blue"
                      />
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-900 group-hover:text-strada-blue transition-colors">Jurnal Uang Masuk</span>
                        <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">Pelunasan Piutang ke Bank</span>
                      </div>
                    </label>
                  </div>

                  <hr className="border-blue-100/50" />

                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      checked={isVerified} 
                      onChange={(e) => setIsVerified(e.target.checked)}
                      disabled={isSubmitting}
                      className="mt-1 w-5 h-5 rounded border-gray-300 text-strada-blue focus:ring-strada-blue"
                    />
                    <span className="text-sm text-blue-900 font-bold leading-relaxed">
                      Saya sudah memverifikasi angka Penjualan dan Bank di atas sudah benar.
                    </span>
                  </label>

                  <button
                    onClick={handleSubmitAccurate}
                    disabled={!isVerified || isSubmitting || (validation?.isSalahKamar) || (validation?.isUnbalanced && !isBalanceApproved)}
                    className={`w-full py-4 rounded-xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
                      !isVerified || isSubmitting || (validation?.isSalahKamar) || (validation?.isUnbalanced && !isBalanceApproved)
                        ? 'bg-blue-200 text-white cursor-not-allowed'
                        : 'bg-strada-blue text-white hover:bg-strada-dark-teal shadow-lg hover:shadow-xl active:scale-[0.98]'
                    }`}
                  >
                    {isSubmitting ? '⌛ MENGIRIM...' : '🚀 SUBMIT REVISI KE ACCURATE'}
                  </button>

                  {autoRun && (
                    <button
                      onClick={handleMarkResolved}
                      disabled={isMarkingResolved}
                      className="w-full py-3 mt-2 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
                    >
                      {isMarkingResolved ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                      Data Accurate Sudah Benar
                    </button>
                  )}
                </div>
              </div>

              {/* Raw JSON */}
              <details className="border-t border-gray-100 pt-6 mt-8">
                <summary className="cursor-pointer text-[10px] font-bold text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors">
                  📄 View Raw JSON Payload
                </summary>
                <pre className="mt-4 bg-gray-900 text-green-400 p-4 rounded-xl text-[10px] overflow-x-auto border border-gray-800 shadow-inner">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </details>
            </div>
          </div>
        )}

        {/* Logs Section - Always at Bottom */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Log Progres Sistem</h2>
            <button 
              onClick={copyLogs}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95"
            >
              <Copy size={14} /> Salin Log
            </button>
          </div>
          <div 
            ref={scrollRef}
            className="bg-gray-900 text-gray-100 p-5 rounded-xl font-mono text-[13px] h-80 overflow-y-auto shadow-inner leading-relaxed"
          >
            {logs.length === 0 ? (
              <div className="text-gray-600 flex items-center justify-center h-full italic">
                Sistem menunggu perintah. Klik "RUN" untuk memulai...
              </div>
            ) : (
              <div className="space-y-1.5">
                {logs.map((log, idx) => (
                  <div key={idx} className="flex gap-3 border-b border-gray-800/50 pb-1 last:border-0">
                    <span className="text-gray-600 shrink-0 select-none font-bold">[{log.timestamp}]</span>
                    <span
                      className={`flex-1 ${
                        log.type === 'success'
                          ? 'text-green-400 font-bold'
                          : log.type === 'error'
                          ? 'text-red-400 font-bold'
                          : log.type === 'warning'
                          ? 'text-yellow-400'
                          : 'text-blue-400'
                      }`}
                    >
                      {log.message}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function RevenueStoreClient() {
  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <RevenueStoreForm />
    </Suspense>
  )
}
