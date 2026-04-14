'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ClipboardList } from 'lucide-react'

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  reviewed: 'bg-blue-100 text-[#037894]',
  converted: 'bg-green-100 text-[#82A13B]',
  cancelled: 'bg-red-100 text-[#FF4F31]',
}
const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft', reviewed: 'Direview', converted: 'Converted ke PO', cancelled: 'Dibatalkan'
}

type Tab = 'auto_parstock' | 'manual' | 'quinos_pdf'

export default function PRListClient({ prs }: { prs: any[] }) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('auto_parstock')

  const filtered = prs.filter(pr => pr.sumber === tab)

  return (
    <div className="p-6 md:p-8 space-y-5 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Permohonan Barang</h1>
          <p className="text-gray-500 text-sm mt-0.5">{filtered.length} PR ditemukan</p>
        </div>
        <button
          onClick={() => router.push('/dashboard/purchasing/pr/baru')}
          className="flex items-center gap-2 bg-[#037894] hover:bg-[#02627a] text-white px-4 py-2.5 rounded-xl font-semibold text-sm shadow-sm transition-colors"
        >
          + Buat PR Manual
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {([['auto_parstock', '🤖 Auto (Par Stock)'], ['manual', 'Manual'], ['quinos_pdf', 'Dari Quinos PDF']] as [Tab, string][]).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
            {label} <span className="ml-1 text-xs text-gray-400">({prs.filter(p => p.sumber === key).length})</span>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        {filtered.length === 0 ? (
          <div className="p-10 text-center">
            <ClipboardList size={32} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Belum ada permohonan barang</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Nomor PR</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tanggal</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Outlet</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Dibutuhkan</th>
                  <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider">Items</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Sumber</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((pr: any) => (
                  <tr key={pr.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-900">{pr.nomor}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{pr.tanggal_permintaan}</td>
                    <td className="px-4 py-3 text-xs text-gray-700">{(pr.outlets as any)?.kode}</td>
                    <td className="px-4 py-3 text-xs text-gray-700">{pr.tanggal_dibutuhkan}</td>
                    <td className="px-4 py-3 text-right text-xs text-gray-500">{(pr.purchase_request_lines as any[])?.length ?? 0}</td>
                    <td className="px-4 py-3">
                      {pr.sumber === 'auto_parstock' && (
                        <span className="bg-blue-100 text-[#037894] text-[10px] font-bold px-2 py-0.5 rounded-full">🤖 Auto</span>
                      )}
                      {pr.sumber === 'manual' && (
                        <span className="bg-gray-100 text-gray-600 text-[10px] font-semibold px-2 py-0.5 rounded-full">Manual</span>
                      )}
                      {pr.sumber === 'quinos_pdf' && (
                        <span className="bg-purple-100 text-purple-700 text-[10px] font-semibold px-2 py-0.5 rounded-full">Quinos PDF</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-semibold ${STATUS_COLORS[pr.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {STATUS_LABELS[pr.status] ?? pr.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => router.push(`/dashboard/purchasing/pr/${pr.id}`)}
                          className="text-[#037894] text-xs font-semibold hover:underline">
                          Lihat
                        </button>
                        {pr.status === 'draft' && (
                          <button onClick={() => router.push(`/dashboard/purchasing/po/baru?pr_id=${pr.id}`)}
                            className="bg-[#037894] text-white text-[10px] font-bold px-2.5 py-1 rounded-lg hover:bg-[#02627a] transition-colors whitespace-nowrap">
                            Konversi ke PO
                          </button>
                        )}
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
  )
}
