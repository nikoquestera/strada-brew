'use client'
import { useState } from 'react'
import { ChevronDown, Play, AlertCircle, CheckCircle2 } from 'lucide-react'
import financeConfig from '@/lib/finance/config'

interface ProcessingLog {
  timestamp: string
  message: string
  type: 'info' | 'success' | 'error' | 'warning'
}

export default function RevenueStoreClient() {
  const [selectedStores, setSelectedStores] = useState<string[]>([])
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  )
  const [isProcessing, setIsProcessing] = useState(false)
  const [logs, setLogs] = useState<ProcessingLog[]>([])
  const [result, setResult] = useState<any>(null)
  const [expandedStores, setExpandedStores] = useState(false)

  const addLog = (message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') => {
    const timestamp = new Date().toLocaleTimeString('id-ID')
    setLogs(prev => [...prev, { timestamp, message, type }])
  }

  const toggleStore = (store: string) => {
    setSelectedStores(prev =>
      prev.includes(store)
        ? prev.filter(s => s !== store)
        : [...prev, store]
    )
  }

  const toggleAllStores = () => {
    if (selectedStores.length === financeConfig.stores.length) {
      setSelectedStores([])
    } else {
      setSelectedStores([...financeConfig.stores])
    }
  }

  const handleProses = async () => {
    if (selectedStores.length === 0) {
      addLog('❌ Pilih minimal satu toko', 'error')
      return
    }

    setIsProcessing(true)
    setLogs([])
    setResult(null)

    try {
      addLog('🚀 Memulai proses revenue report...', 'info')
      addLog(`📅 Tanggal: ${selectedDate}`, 'info')
      addLog(`🏪 Toko: ${selectedStores.join(', ')}`, 'info')

      // Call the API endpoint
      const response = await fetch('/api/finance/process-revenue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          stores: selectedStores,
        }),
      })

      if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`)
      }

      const data = await response.json()

      if (data.success) {
        addLog('✅ Report berhasil diproses', 'success')
        setResult(data.data)
      } else {
        addLog(`❌ Error: ${data.error}`, 'error')
      }
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
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  Pilih Toko
                </label>
                <button
                  onClick={toggleAllStores}
                  disabled={isProcessing}
                  className="text-xs text-strada-blue hover:underline disabled:text-gray-400"
                >
                  {selectedStores.length === financeConfig.stores.length ? 'Batal Semua' : 'Pilih Semua'}
                </button>
              </div>

              {/* Collapsed/Expanded Store List */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => setExpandedStores(!expandedStores)}
                  className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors disabled:opacity-50"
                  disabled={isProcessing}
                >
                  <span className="text-sm font-medium text-gray-700">
                    {selectedStores.length} dari {financeConfig.stores.length} toko dipilih
                  </span>
                  <ChevronDown
                    size={18}
                    className={`transition-transform ${expandedStores ? 'rotate-180' : ''}`}
                  />
                </button>

                {expandedStores && (
                  <div className="max-h-48 overflow-y-auto border-t border-gray-200">
                    {financeConfig.stores.map(store => (
                      <label
                        key={store}
                        className="flex items-center px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedStores.includes(store)}
                          onChange={() => toggleStore(store)}
                          disabled={isProcessing}
                          className="rounded border-gray-300 disabled:opacity-50"
                        />
                        <span className="ml-3 text-sm text-gray-700">{store}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Store Tags */}
              {selectedStores.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedStores.map(store => (
                    <span
                      key={store}
                      className="inline-flex items-center gap-1 bg-strada-blue text-white text-xs px-2 py-1 rounded-full"
                    >
                      {store}
                      <button
                        onClick={() => toggleStore(store)}
                        disabled={isProcessing}
                        className="hover:text-gray-200 disabled:opacity-50"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Process Button */}
            <button
              onClick={handleProses}
              disabled={isProcessing || selectedStores.length === 0}
              className={`w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all ${
                isProcessing || selectedStores.length === 0
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {Object.entries(result).map(([key, value]: [string, any]) => {
              if (key === 'date' || key === 'store' || key === 'raw_json') return null
              return (
                <div key={key} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <p className="text-gray-600 text-sm mb-1 capitalize">
                    {key.replace(/_/g, ' ')}
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    Rp {parseFloat(value || 0).toLocaleString('id-ID')}
                  </p>
                </div>
              )
            })}
          </div>

          {/* Raw JSON */}
          <details className="border-t border-gray-200 pt-4">
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
