'use client'
import { useRouter } from 'next/navigation'
import { PackageCheck, CheckCircle, AlertTriangle } from 'lucide-react'

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  verified: 'bg-blue-100 text-[#037894]',
  discrepancy: 'bg-red-100 text-[#FF4F31]',
  finalized: 'bg-green-100 text-[#82A13B]',
}
const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft', verified: 'Terverifikasi', discrepancy: 'Ada Selisih', finalized: 'Finalisasi'
}

export default function GRListClient({ grs }: { grs: any[] }) {
  const router = useRouter()
  return (
    <div className="p-6 md:p-8 space-y-5 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Penerimaan Barang</h1>
          <p className="text-gray-500 text-sm mt-0.5">{grs.length} GR</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        {grs.length === 0 ? (
          <div className="p-10 text-center">
            <PackageCheck size={32} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Belum ada penerimaan barang</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Nomor GR</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tanggal Terima</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">PO Terkait</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Outlet</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Penerima</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Surat Jalan</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {grs.map((gr: any) => (
                  <tr key={gr.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-900">{gr.nomor}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{gr.tanggal_terima}</td>
                    <td className="px-4 py-3">
                      <p className="font-mono text-xs text-[#037894]">{(gr.purchase_orders as any)?.nomor}</p>
                      <p className="text-[10px] text-gray-400">{(gr.purchase_orders as any)?.vendors?.nama}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-700">{(gr.outlets as any)?.kode}</td>
                    <td className="px-4 py-3 text-xs text-gray-700">{gr.penerima}</td>
                    <td className="px-4 py-3">
                      {gr.surat_jalan_url ? (
                        <a href={gr.surat_jalan_url} target="_blank"
                          className="flex items-center gap-1 text-[#037894] text-xs hover:underline">
                          <CheckCircle size={12} /> Uploaded
                        </a>
                      ) : (
                        <span className="flex items-center gap-1 text-gray-400 text-xs">
                          <AlertTriangle size={12} /> Belum upload
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-semibold ${STATUS_COLORS[gr.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {STATUS_LABELS[gr.status] ?? gr.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => router.push(`/dashboard/purchasing/terima/${gr.id}`)}
                        className="text-[#037894] text-xs font-semibold hover:underline">
                        Lihat
                      </button>
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
