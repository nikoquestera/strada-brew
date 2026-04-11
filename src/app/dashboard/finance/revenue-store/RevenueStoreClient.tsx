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

  // Bank and Payment Manual Inputs
  const [bcaIncome, setBcaIncome] = useState<string>('')
  const [gobizIncome, setGobizIncome] = useState<string>('')
  const [paymentCreditBca, setPaymentCreditBca] = useState<string>('')
  const [paymentDebitBca, setPaymentDebitBca] = useState<string>('')
  const [paymentQris, setPaymentQris] = useState<string>('')

  useEffect(() => {
    loadStores()
  }, [])

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
    let cleaned = val.replace(/[^\d,-]/g, '')
    if (!cleaned) return ''
    const parts = cleaned.split(',')
    if (parts.length > 2) parts.length = 2
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.')
    return parts.join(',')
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
    if (!bcaIncome || !gobizIncome) {
      addLog('❌ Mohon isi Uang Masuk Bank BCA dan Uang Masuk Gobiz', 'error')
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
            bca_income: parseCurrencyInput(bcaIncome),
            gobiz_income: parseCurrencyInput(gobizIncome),
            payment_credit_bca: parseCurrencyInput(paymentCreditBca),
            payment_debit_bca: parseCurrencyInput(paymentDebitBca),
            payment_qris: parseCurrencyInput(paymentQris),
          },
        }),
      })

      if (!response.ok) {
        const errText = await response.text()
        try {
           const errObj = JSON.parse(errText)
           throw new Error(errObj.message || response.statusText)
        } catch(e) {
           throw new Error(`API Error: ${response.statusText}`)
        }
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

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Revenue Store</h1>
        <p className="text-gray-500 mt-2">Otomatis tarik laporan penjualan dari Quinos Cloud</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Section */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
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

            {/* Bank BCA Input */}
            <div className="mb-6">
              <label htmlFor="bca-income" className="block text-sm font-medium text-gray-700 mb-2">
                💰 Uang Masuk Bank BCA
              </label>
              <input
                id="bca-income"
                type="text"
                value={bcaIncome}
                onChange={(e) => setBcaIncome(formatCurrencyInput(e.target.value))}
                disabled={isProcessing}
                placeholder="Masukkan dari bank statement"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-strada-blue disabled:bg-gray-50 disabled:text-gray-500"
              />
              <p className="text-xs text-gray-500 mt-1">Dari bank statement BCA</p>
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

            {/* Payment Details - Optional */}
            <details className="mb-6 border border-gray-200 rounded-lg p-3 bg-gray-50">
              <summary className="cursor-pointer font-medium text-gray-700 text-sm">
                📊 Detail Pembayaran (Opsional)
              </summary>
              
              <div className="mt-4 space-y-4">
                {/* Payment Credit BCA */}
                <div>
                  <label htmlFor="payment-credit" className="block text-xs font-medium text-gray-700 mb-1">
                    Payment Credit BCA
                  </label>
                  <input
                    id="payment-credit"
                    type="text"
                    value={paymentCreditBca}
                    onChange={(e) => setPaymentCreditBca(formatCurrencyInput(e.target.value))}
                    disabled={isProcessing}
                    placeholder="0"
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-strada-blue disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>

                {/* Payment Debit BCA */}
                <div>
                  <label htmlFor="payment-debit" className="block text-xs font-medium text-gray-700 mb-1">
                    Payment Debit BCA
                  </label>
                  <input
                    id="payment-debit"
                    type="text"
                    value={paymentDebitBca}
                    onChange={(e) => setPaymentDebitBca(formatCurrencyInput(e.target.value))}
                    disabled={isProcessing}
                    placeholder="0"
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-strada-blue disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>

                {/* Payment QRIS */}
                <div>
                  <label htmlFor="payment-qris" className="block text-xs font-medium text-gray-700 mb-1">
                    Payment QRIS
                  </label>
                  <input
                    id="payment-qris"
                    type="text"
                    value={paymentQris}
                    onChange={(e) => setPaymentQris(formatCurrencyInput(e.target.value))}
                    disabled={isProcessing}
                    placeholder="0"
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-strada-blue disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>

              </div>
            </details>

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

        {/* Logs Section */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 h-full">
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
                ].map(item => (
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { label: 'Academy 100 Vouc', value: result.payment_academy_100_vouc },
                  { label: 'CREDIT BCA', value: result.payment_credit_bca },
                  { label: 'DEBIT BCA', value: result.payment_debit_bca },
                  { label: 'GOBIZ', value: result.payment_gobiz },
                  { label: 'QRIS', value: result.payment_qris },
                  { label: 'STRADA + REWARD', value: result.payment_strada_reward },
                ].map(item => (
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
          {(result.bca_income || result.gobiz_income || result.biaya_admin_bank || result.biaya_penjualan_merchant_online) && (
            <>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 mt-6">🏦 Data Bank & Pembayaran</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {result.bca_income !== undefined && (
                  <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <p className="text-gray-600 text-sm mb-1">Uang Masuk BCA</p>
                    <p className="text-2xl font-bold text-green-600">
                      Rp {parseFloat(result.bca_income || 0).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                {result.biaya_admin_bank !== undefined && (
                  <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                    <p className="text-gray-600 text-sm mb-1">Biaya Admin Bank</p>
                    <p className="text-2xl font-bold text-orange-600">
                      Rp {parseFloat(result.biaya_admin_bank || 0).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      = (Credit + Debit + QRIS) - BCA + Gobiz
                    </p>
                  </div>
                )}
                {result.biaya_penjualan_merchant_online !== undefined && (
                  <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                    <p className="text-gray-600 text-sm mb-1">Biaya Merchant Online</p>
                    <p className="text-2xl font-bold text-orange-600">
                      Rp {parseFloat(result.biaya_penjualan_merchant_online || 0).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      = Payment Gobiz - Gobiz
                    </p>
                  </div>
                )}
              </div>
            </>
          )}

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
    </div>
  )
}
