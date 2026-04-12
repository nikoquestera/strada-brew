'use client'
import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AlertOctagon, CheckCircle2, Search, Loader2, MessageSquare, Calendar, Store } from 'lucide-react'

interface AbnormalTransaction {
  id: string
  transaction_date: string
  report_type: string
  store_name: string
  issue_description: string
  status: 'PENDING' | 'RESOLVED'
  resolution_notes: string | null
  resolved_by: string | null
  resolved_at: string | null
  created_at: string
}

export default function TransaksiAbnormalClient() {
  const supabase = createClient()
  const [transactions, setTransactions] = useState<AbnormalTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [resolvingId, setResolvingId] = useState<string | null>(null)
  const [resolutionText, setResolutionText] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string>('')

  useEffect(() => {
    fetchUser()
    fetchTransactions()
  }, [])

  async function fetchUser() {
    const { data } = await supabase.auth.getUser()
    if (data.user) {
      setUserEmail(data.user.email || 'Unknown User')
    }
  }

  async function fetchTransactions() {
    setLoading(true)
    const { data, error } = await supabase
      .from('abnormal_transactions')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (data && !error) {
      setTransactions(data)
    }
    setLoading(false)
  }

  const handleResolve = async (id: string) => {
    if (!resolutionText.trim()) {
      alert('Mohon isi solusi yang Anda lakukan.')
      return
    }

    setSavingId(id)
    const { error } = await supabase
      .from('abnormal_transactions')
      .update({
        status: 'RESOLVED',
        resolution_notes: resolutionText.trim(),
        resolved_by: userEmail,
        resolved_at: new Date().toISOString()
      })
      .eq('id', id)

    if (!error) {
      setResolutionText('')
      setResolvingId(null)
      fetchTransactions()
    } else {
      alert(`Gagal menyimpan solusi: ${error.message}`)
    }
    setSavingId(null)
  }

  const pendingTx = transactions.filter(t => t.status === 'PENDING')
  const resolvedTx = transactions.filter(t => t.status === 'RESOLVED')

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
          <AlertOctagon className="text-red-500" size={32} />
          Transaksi Perlu Review
        </h1>
        <p className="text-gray-500 mt-2 font-medium text-sm">
          Review dan kelola transaksi yang membutuhkan konfirmasi atau tindakan perbaikan.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="animate-spin text-strada-blue" size={32} />
        </div>
      ) : (
        <div className="space-y-10">
          {/* PENDING TABLE */}
          <div className="bg-white border border-red-100 rounded-xl shadow-sm overflow-hidden relative">
            <div className="absolute top-0 left-0 bottom-0 w-1 bg-red-500"></div>
            <div className="bg-red-50/50 px-6 py-4 border-b border-red-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-red-900 flex items-center gap-2">
                  Membutuhkan Review & Solusi
                  <span className="bg-red-100 text-red-700 py-0.5 px-2.5 rounded-full text-xs font-black">{pendingTx.length}</span>
                </h2>
              </div>
            </div>
            
            {pendingTx.length === 0 ? (
              <div className="p-8 text-center text-gray-400 italic font-medium">
                Semua transaksi sudah oke. 🎉
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-gray-50/50 text-gray-500 font-semibold tracking-wider text-[11px] uppercase">
                    <tr>
                      <th className="px-6 py-4">Tgl Transaksi</th>
                      <th className="px-6 py-4">Toko</th>
                      <th className="px-6 py-4">Jenis Laporan</th>
                      <th className="px-6 py-4">Keterangan Masalah</th>
                      <th className="px-6 py-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-700">
                    {pendingTx.map(tx => (
                      <React.Fragment key={tx.id}>
                        <tr className="hover:bg-red-50/30 transition-colors group">
                          <td className="px-6 py-4 font-mono font-medium text-gray-900">
                            {new Date(tx.transaction_date).toLocaleDateString('id-ID')}
                          </td>
                          <td className="px-6 py-4 font-bold text-gray-900">
                            {tx.store_name}
                          </td>
                          <td className="px-6 py-4">
                            <span className="bg-gray-100 text-gray-600 py-1 px-2.5 rounded-md text-xs font-bold border border-gray-200">
                              {tx.report_type}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="max-w-md whitespace-normal text-xs text-red-700 font-medium bg-red-50 p-2 rounded-lg border border-red-100 leading-relaxed text-pretty">
                              {tx.issue_description}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => {
                                setResolvingId(resolvingId === tx.id ? null : tx.id)
                                setResolutionText('')
                              }}
                              className="text-xs bg-strada-blue hover:bg-strada-dark-teal text-white px-4 py-2 rounded-lg font-bold shadow-sm transition-all active:scale-95 whitespace-nowrap"
                            >
                              {resolvingId === tx.id ? 'Batal' : 'Tambahkan Solusi'}
                            </button>
                          </td>
                        </tr>
                        {resolvingId === tx.id && (
                          <tr className="bg-blue-50/50 border-b border-blue-100">
                            <td colSpan={5} className="px-6 py-6">
                              <div className="max-w-3xl ml-auto bg-white p-5 rounded-xl border border-blue-200 shadow-sm animate-in fade-in slide-in-from-top-2">
                                <label className="block text-xs font-bold text-blue-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                                  <MessageSquare size={14} /> Solusi yang dilakukan:
                                </label>
                                <textarea
                                  value={resolutionText}
                                  onChange={(e) => setResolutionText(e.target.value)}
                                  placeholder="Jelaskan secara detail tindakan perbaikan yang telah Anda lakukan..."
                                  className="w-full p-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-strada-blue outline-none resize-none min-h-[100px] mb-4"
                                />
                                <div className="flex justify-end">
                                  <button
                                    onClick={() => handleResolve(tx.id)}
                                    disabled={savingId === tx.id || !resolutionText.trim()}
                                    className="bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white px-5 py-2.5 rounded-lg font-bold text-sm shadow-sm transition-all flex items-center gap-2"
                                  >
                                    {savingId === tx.id ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                                    Masalah Sudah Selesai
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* RESOLVED TABLE */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="bg-gray-50/80 px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <CheckCircle2 className="text-green-500" size={20} />
                Riwayat Terselesaikan
              </h2>
            </div>
            
            {resolvedTx.length === 0 ? (
              <div className="p-8 text-center text-gray-400 italic font-medium">
                Belum ada riwayat transaksi yang diselesaikan.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-gray-50 text-gray-500 font-semibold tracking-wider text-[11px] uppercase">
                    <tr>
                      <th className="px-6 py-4">Tgl Transaksi</th>
                      <th className="px-6 py-4">Keterangan Awal</th>
                      <th className="px-6 py-4">Solusi Penanganan</th>
                      <th className="px-6 py-4">Diselesaikan Oleh</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-700">
                    {resolvedTx.map(tx => (
                      <tr key={tx.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <span className="font-mono font-bold text-gray-900">{new Date(tx.transaction_date).toLocaleDateString('id-ID')}</span>
                            <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-bold w-max">{tx.store_name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="max-w-xs whitespace-normal text-xs text-gray-500 font-medium">
                            <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">{tx.report_type}</span>
                            {tx.issue_description}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="max-w-sm whitespace-normal text-xs text-green-800 font-medium bg-green-50 p-2.5 rounded-lg border border-green-100 leading-relaxed">
                            {tx.resolution_notes}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <span className="font-bold text-gray-900 text-xs">{tx.resolved_by}</span>
                            <span className="text-[10px] text-gray-400 font-mono">
                              {new Date(tx.resolved_at!).toLocaleString('id-ID')}
                            </span>
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
      )}
    </div>
  )
}
