import { createClient as createAdminClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ArrowRight } from 'lucide-react'

const SERVICE_KEY =
  process.env.SERVICE_SUPABASE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY

export default async function PRDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, SERVICE_KEY!)

  const { data: pr } = await db
    .from('purchase_requests')
    .select(`
      *,
      outlets(kode, nama),
      purchase_request_lines(
        id, qty_diminta, qty_disetujui, satuan, tipe, gudang_sumber, catatan,
        items(id, nama, kode_accurate, tipe, satuan)
      )
    `)
    .eq('id', id)
    .single()

  if (!pr) notFound()

  const lines: any[] = pr.purchase_request_lines ?? []

  const SOURCE_LABELS: Record<string, string> = {
    auto_parstock: '🤖 Auto Par Stock',
    manual: 'Manual',
    quinos_pdf: 'Quinos PDF',
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/purchasing/pr" className="text-gray-400 hover:text-gray-700">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900 font-mono">{pr.nomor}</h1>
          <p className="text-gray-500 text-sm">{(pr.outlets as any)?.kode} — {(pr.outlets as any)?.nama} · {SOURCE_LABELS[pr.sumber] ?? pr.sumber}</p>
        </div>
      </div>

      {/* Info */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          ['Tanggal Permintaan', pr.tanggal_permintaan],
          ['Dibutuhkan', pr.tanggal_dibutuhkan],
          ['Status', pr.status],
          ['Sumber', SOURCE_LABELS[pr.sumber] ?? pr.sumber],
        ].map(([label, value]) => (
          <div key={label as string}>
            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1">{label}</p>
            <p className="text-gray-900 text-sm font-semibold">{value}</p>
          </div>
        ))}
      </div>

      {/* Lines */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-gray-900">Daftar Barang ({lines.length} item)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Item</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tipe</th>
                <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider">Qty Diminta</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Gudang Sumber</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line: any) => (
                <tr key={line.id} className="border-b border-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{line.items?.nama}</p>
                    <p className="text-xs text-gray-400">{line.items?.kode_accurate}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="bg-gray-100 text-gray-600 text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize">{line.tipe}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs font-semibold">{line.qty_diminta} {line.satuan}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 capitalize">{line.gudang_sumber}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {pr.catatan && (
        <div className="bg-gray-50 rounded-2xl border border-gray-100 p-5">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Catatan</p>
          <p className="text-sm text-gray-700">{pr.catatan}</p>
        </div>
      )}

      {/* Convert to PO */}
      {pr.status === 'draft' && (
        <Link
          href={`/dashboard/purchasing/po/baru?pr_id=${pr.id}`}
          className="flex items-center justify-center gap-2 bg-[#037894] hover:bg-[#02627a] text-white px-6 py-3 rounded-xl font-bold text-sm shadow-sm transition-colors"
        >
          Konversi ke Purchase Order <ArrowRight size={16} />
        </Link>
      )}
    </div>
  )
}
