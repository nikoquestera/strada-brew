'use client'
import { useEffect, useState } from 'react'
import { ChevronDown, Play, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { DEFAULT_STORE_NAMES } from '@/lib/stores/defaults'

interface ProcessingLog {
  timestamp: string
  message: string
  type: 'info' | 'success' | 'error' | 'warning'
}

export default function RevenueStoreClient() {
  const supabase = createClient()
  const [stores, setStores] = useState<string[]>([...DEFAULT_STORE_NAMES])
  const [selectedStore, setSelectedStore] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  )
  const [isProcessing, setIsProcessing] = useState(false)
  const [logs, setLogs] = useState<ProcessingLog[]>([])
  const [result, setResult] = useState<any>(null)
  const [expandedStores, setExpandedStores] = useState(false)
  const [isVerified, setIsVerified] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [accurateConnected, setAccurateConnected] = useState(false)
  const [submitUangMasuk, setSubmitUangMasuk] = useState(true)
  const [submitPenjualan, setSubmitPenjualan] = useState(true)

  // Bank and Payment Manual Inputs
  const [bcaKreditIncome, setBcaKreditIncome] = useState<string>('')
  const [bcaDebitIncome, setBcaDebitIncome] = useState<string>('')
  const [bcaQrisIncome, setBcaQrisIncome] = useState<string>('')
  const [gobizIncome, setGobizIncome] = useState<string>('')
  const [ovoIncome, setOvoIncome] = useState<string>('')
  const [paymentCreditBca, setPaymentCreditBca] = useState<string>('')
  const [paymentDebitBca, setPaymentDebitBca] = useState<string>('')
  const [paymentQris, setPaymentQris] = useState<string>('')

  useEffect(() => {
    loadStores()
    checkAccurateConnection()
  }, [])

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
    if (!val) return ''
    
    // Remove characters that aren't digits, comma, dot, or minus
    let cleaned = val.replace(/[^\d.,-]/g, '')
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
    if (val.includes(',') || (val.includes('.') && decimalPart)) {
      result += ',' + decimalPart.substring(0, 2)
    }
    
    return val.startsWith('-') ? '-' + result : result
  }

  const parseCurrencyInput = (val: string) => {
    if (!val) return 0
    const cleaned = val.replace(/\./g, '').replace(/,/g, '.')
    return parseFloat(cleaned) || 0
  }

  const handleProses = async () => {
    if (!selectedStore) {
      addLog('❌ Pilih satu toko', 'error')
      return
    }

    // Validate bank inputs
    if (!bcaKreditIncome || !bcaDebitIncome || !bcaQrisIncome || !gobizIncome || !ovoIncome) {
      addLog('❌ Mohon isi Uang Masuk KREDIT BCA, DEBIT BCA, QRIS BCA, Gobiz, dan OVO', 'error')
      return
    }

    setIsProcessing(true)
    setLogs([])
    setResult(null)

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
      
      let allResults = []
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        
        // Keep the last incomplete line in the buffer
        buffer = lines.pop() || ''
        
        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const log = JSON.parse(line)
            if (log.type === 'result') {
              allResults.push(log.data)
              setResult(log.data)
            } else if (log.message) {
              addLog(log.message, log.type || 'info')
            }
          } catch (e) {
            console.log("Chunk parse error", e, line)
          }
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
    // Clear logs or keep them? User said log process should move to bottom.
    // Let's not clear logs from Quinos process, just append.
    addLog('🚀 Memulai pengiriman jurnal ke Accurate...', 'info')

    try {
      const response = await fetch('/api/finance/submit-accurate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...result,
          options: {
            submitUangMasuk,
            submitPenjualan
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
            if (log.message) {
              addLog(log.message, log.type || 'info')
            }
          } catch (e) {
            console.log("Accurate chunk parse error", e, line)
          }
        }
      }
      
      addLog('✅ Semua proses Accurate selesai', 'success')
    } catch (error: any) {
      addLog(`❌ Error Accurate: ${error.message}`, 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Revenue Store</h1>
        <p className="text-gray-500 mt-2">Otomatis tarik laporan penjualan dari Quinos Cloud</p>
      </div>

      <div className="w-full">
        {/* Form Section */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Integrasi Accurate</h2>
            {!accurateConnected ? (
              <button
                onClick={handleConnectAccurate}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-bold hover:bg-orange-600 transition-colors shadow-sm"
              >
                🔌 Hubungkan ke Accurate
              </button>
            ) : (
              <span className="flex items-center gap-2 text-green-600 text-sm font-bold bg-green-50 px-3 py-1.5 rounded-lg border border-green-100">
                <CheckCircle2 size={16} /> Terhubung ke Accurate
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 -mt-4 mb-6">
            Otorisasi diperlukan sekali untuk mengizinkan portal mengirim jurnal otomatis.
          </p>
          <hr className="border-gray-100 mb-6" />
          
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Filter Report</h2>

            {/* Date Input */}
            <div className="mb-6">
              <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
                Tanggal Transaksi
              </label>
              <input
                id="date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                disabled={isProcessing}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-strada-blue disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>

            {/* Store Selection */}
            <div className="mb-6">
              <label htmlFor="store" className="block text-sm font-medium text-gray-700 mb-2">
                Pilih Toko
              </label>
              <select
                id="store"
                value={selectedStore}
                onChange={(e) => setSelectedStore(e.target.value)}
                disabled={isProcessing}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-strada-blue disabled:bg-gray-50 disabled:text-gray-500"
              >
                <option value="" disabled>-- Pilih Toko --</option>
                {stores.map(store => (
                  <option key={store} value={store}>{store}</option>
                ))}
              </select>
            </div>

            {/* Bank BCA Inputs */}
            <div className="mb-6 grid grid-cols-1 gap-4 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
              <label className="block text-sm font-semibold text-blue-900">
                💰 Uang Masuk BCA (Mutasi)
              </label>
              
              <div>
                <label htmlFor="bca-kredit" className="block text-xs font-medium text-gray-600 mb-1">
                  Uang Masuk KREDIT BCA
                </label>
                <input
                  id="bca-kredit"
                  type="text"
                  value={bcaKreditIncome}
                  onChange={(e) => setBcaKreditIncome(formatCurrencyInput(e.target.value))}
                  disabled={isProcessing}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-strada-blue disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>

              <div>
                <label htmlFor="bca-debit" className="block text-xs font-medium text-gray-600 mb-1">
                  Uang Masuk DEBIT BCA
                </label>
                <input
                  id="bca-debit"
                  type="text"
                  value={bcaDebitIncome}
                  onChange={(e) => setBcaDebitIncome(formatCurrencyInput(e.target.value))}
                  disabled={isProcessing}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-strada-blue disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>

              <div>
                <label htmlFor="bca-qris" className="block text-xs font-medium text-gray-600 mb-1">
                  Uang Masuk QRIS BCA
                </label>
                <input
                  id="bca-qris"
                  type="text"
                  value={bcaQrisIncome}
                  onChange={(e) => setBcaQrisIncome(formatCurrencyInput(e.target.value))}
                  disabled={isProcessing}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-strada-blue disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>
            </div>

            {/* Gobiz Income Input */}
            <div className="mb-6">
              <label htmlFor="gobiz-income" className="block text-sm font-medium text-gray-700 mb-2">
                💰 Uang Masuk Gobiz
              </label>
              <input
                id="gobiz-income"
                type="text"
                value={gobizIncome}
                onChange={(e) => setGobizIncome(formatCurrencyInput(e.target.value))}
                disabled={isProcessing}
                placeholder="Masukkan dari Gobiz statement"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-strada-blue disabled:bg-gray-50 disabled:text-gray-500"
              />
              <p className="text-xs text-gray-500 mt-1">Dari Gobiz statement</p>
            </div>

            {/* OVO Income Input */}
            <div className="mb-6">
              <label htmlFor="ovo-income" className="block text-sm font-medium text-gray-700 mb-2">
                💰 Uang Masuk OVO
              </label>
              <input
                id="ovo-income"
                type="text"
                value={ovoIncome}
                onChange={(e) => setOvoIncome(formatCurrencyInput(e.target.value))}
                disabled={isProcessing}
                placeholder="Masukkan dari OVO statement"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-strada-blue disabled:bg-gray-50 disabled:text-gray-500"
              />
              <p className="text-xs text-gray-500 mt-1">Dari OVO statement</p>
            </div>

            {/* Process Button */}
            <button
              onClick={handleProses}
              disabled={isProcessing || !selectedStore}
              className={`w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all ${
                isProcessing || !selectedStore
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : 'bg-strada-blue text-white hover:bg-strada-dark-teal'
              }`}
            >
              <Play size={18} />
              {isProcessing ? 'Sedang Memproses...' : 'Proses'}
            </button>
          </div>
        </div>

      {/* Results Section */}
      {result && (
        <div className="mt-6 bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <CheckCircle2 size={20} className="text-green-500" />
            Hasil Report
          </h2>

          {/* Store & Date Summary */}
          <div className="grid grid-cols-2 gap-4 mb-6 bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div>
              <p className="text-xs font-medium text-gray-600 uppercase">Toko</p>
              <p className="text-lg font-bold text-gray-900">{result.store}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-600 uppercase">Tanggal</p>
              <p className="text-lg font-bold text-gray-900">{result.date}</p>
            </div>
          </div>

          {/* Revenue Data */}
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">🛒 Sales per Department</h3>
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
                  <div key={item.label} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <p className="text-gray-600 text-sm mb-1">{item.label}</p>
                    <p className="text-2xl font-bold text-gray-900">
                      Rp {parseFloat(item.value || 0).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">💳 Payment Method</h3>
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
                .filter(item => item.value > 0) // Only show active payment methods to avoid UI clutter
                .map(item => (
                  <div key={item.label} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <p className="text-gray-600 text-sm mb-1">{item.label}</p>
                    <p className="text-2xl font-bold text-gray-900">
                      Rp {parseFloat(item.value as any || 0).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">💰 Revenue & Potongan</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Discount', value: result.revenue_discount },
                  { label: 'Hutang Service', value: result.hutang_service },
                  { label: 'Hutang Pajak Pemkot', value: result.hutang_pajak_pemkot },
                  { label: 'Total Penjualan', value: (parseFloat(result.payment_credit_bca || 0) + parseFloat(result.payment_debit_bca || 0) + parseFloat(result.payment_qris || 0)) },
                ].map(item => (
                  <div key={item.label} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <p className="text-gray-600 text-sm mb-1">{item.label}</p>
                    <p className="text-2xl font-bold text-gray-900">
                      Rp {parseFloat(item.value as any || 0).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bank Data Section */}
          {(result.bca_kredit_income !== undefined || result.gobiz_income !== undefined || result.ovo_income !== undefined) && (
            <>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 mt-6">🏦 Data Bank & Pembayaran</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 lg:col-span-2">
                  <p className="text-gray-600 text-sm mb-1 font-semibold text-blue-900">Total Uang Masuk (Semua Metode Quinos)</p>
                  <p className="text-3xl font-bold text-blue-700">
                    Rp {parseFloat(result.total_payment_quinos || 0).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                {result.bca_kredit_income !== undefined && (
                  <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <p className="text-gray-600 text-sm mb-1">Uang Masuk KREDIT BCA</p>
                    <p className="text-2xl font-bold text-green-600">
                      Rp {parseFloat(result.bca_kredit_income || 0).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                )}
                {result.bca_debit_income !== undefined && (
                  <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <p className="text-gray-600 text-sm mb-1">Uang Masuk DEBIT BCA</p>
                    <p className="text-2xl font-bold text-green-600">
                      Rp {parseFloat(result.bca_debit_income || 0).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                )}
                {result.bca_qris_income !== undefined && (
                  <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <p className="text-gray-600 text-sm mb-1">Uang Masuk QRIS BCA</p>
                    <p className="text-2xl font-bold text-green-600">
                      Rp {parseFloat(result.bca_qris_income || 0).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                )}
                {result.gobiz_income !== undefined && (
                  <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <p className="text-gray-600 text-sm mb-1">Uang Masuk Gobiz</p>
                    <p className="text-2xl font-bold text-green-600">
                      Rp {parseFloat(result.gobiz_income || 0).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                )}
                {result.ovo_income !== undefined && (
                  <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <p className="text-gray-600 text-sm mb-1">Uang Masuk OVO</p>
                    <p className="text-2xl font-bold text-green-600">
                      Rp {parseFloat(result.ovo_income || 0).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                )}
                {result.biaya_admin_bank !== undefined && (
                  <div className="bg-orange-50 rounded-lg p-4 border border-orange-200 lg:col-span-2">
                    <p className="text-gray-600 text-sm mb-1">Biaya Admin Bank</p>
                    <p className="text-2xl font-bold text-orange-600">
                      Rp {parseFloat(result.biaya_admin_bank || 0).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <div className="text-xs text-gray-500 mt-2 space-y-1">
                      <p className="font-semibold">= (Credit Quinos - Input Credit) + (Debit Quinos - Input Debit) + (QRIS Quinos - Input QRIS)</p>
                      <p>• Persentase Admin Credit BCA: {parseFloat(result.pct_credit || 0).toFixed(2)}%</p>
                      <p>• Persentase Admin Debit BCA: {parseFloat(result.pct_debit || 0).toFixed(2)}%</p>
                      <p>• Persentase Admin QRIS BCA: {parseFloat(result.pct_qris || 0).toFixed(2)}%</p>
                    </div>
                  </div>
                )}
                {result.biaya_penjualan_merchant_online !== undefined && (
                  <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                    <p className="text-gray-600 text-sm mb-1">Biaya Merchant Online</p>
                    <p className="text-2xl font-bold text-orange-600">
                      Rp {parseFloat(result.biaya_penjualan_merchant_online || 0).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      = (Gobiz + OVO) - (Masuk Gobiz + Masuk OVO)
                    </p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Submit to Accurate Section */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Post ke Jurnal Umum Accurate</h3>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 space-y-6">
              
              {/* Journal Selection */}
              <div>
                <p className="text-sm font-semibold text-blue-900 mb-3">Pilih Jurnal yang akan dibuat:</p>
                <div className="flex flex-col gap-3">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      checked={submitPenjualan} 
                      onChange={(e) => setSubmitPenjualan(e.target.checked)}
                      disabled={isSubmitting}
                      className="w-5 h-5 rounded border-gray-300 text-strada-blue focus:ring-strada-blue"
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-gray-900 group-hover:text-strada-blue transition-colors">Jurnal Penjualan Cafe</span>
                      <span className="text-xs text-gray-500">Mencatat pendapatan (Bar, Kitchen, dll) dan piutang.</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      checked={submitUangMasuk} 
                      onChange={(e) => setSubmitUangMasuk(e.target.checked)}
                      disabled={isSubmitting}
                      className="w-5 h-5 rounded border-gray-300 text-strada-blue focus:ring-strada-blue"
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-gray-900 group-hover:text-strada-blue transition-colors">Jurnal Uang Masuk Penjualan Cafe</span>
                      <span className="text-xs text-gray-500">Mencatat pelunasan piutang ke Kas/Bank Settlement.</span>
                    </div>
                  </label>
                </div>
              </div>

              <hr className="border-blue-100" />

              <label className="flex items-start gap-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={isVerified} 
                  onChange={(e) => setIsVerified(e.target.checked)}
                  disabled={isSubmitting}
                  className="mt-1 w-5 h-5 rounded border-gray-300 text-strada-blue focus:ring-strada-blue"
                />
                <span className="text-sm text-blue-900 leading-relaxed font-medium">
                  Saya menyatakan bahwa saya sudah memverifikasi angka-angka Penjualan dan Bank di atas. 
                </span>
              </label>

              <button
                onClick={handleSubmitAccurate}
                disabled={!isVerified || isSubmitting}
                className={`mt-4 w-full py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                  !isVerified || isSubmitting
                    ? 'bg-blue-200 text-white cursor-not-allowed'
                    : 'bg-strada-blue text-white hover:bg-strada-dark-teal shadow-md hover:shadow-lg'
                }`}
              >
                {isSubmitting ? 'Mengirim Data ke Accurate...' : 'Submit to Accurate'}
              </button>
            </div>
          </div>

          {/* Raw JSON */}
          <details className="border-t border-gray-200 pt-4 mt-6">
            <summary className="cursor-pointer font-medium text-gray-700 hover:text-gray-900">
              📄 Raw JSON Data
            </summary>
            <pre className="mt-4 bg-gray-50 p-4 rounded-lg text-xs overflow-x-auto border border-gray-200">
              {JSON.stringify(result, null, 2)}
            </pre>
          </details>
        </div>
      )}

      {/* Logs Section */}
      <div className="mt-6 bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Log Proses</h2>
        <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm h-96 overflow-y-auto">
          {logs.length === 0 ? (
            <div className="text-gray-500 flex items-center justify-center h-full">
              Klik tombol "Proses" untuk memulai...
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map((log, idx) => (
                <div key={idx} className="flex gap-3">
                  <span className="text-gray-500 shrink-0 w-24">[{log.timestamp}]</span>
                  <span
                    className={`flex-1 ${
                      log.type === 'success'
                        ? 'text-green-400'
                        : log.type === 'error'
                        ? 'text-red-400'
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
  )
}
