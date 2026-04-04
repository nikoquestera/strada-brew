'use client'
import { useState } from 'react'
import { Upload, FileSpreadsheet, CheckCircle } from 'lucide-react'

type PayrollRow = {
  employee_id: string
  name: string
  present_days: number
  absent_days: number
  late_under_30: number
  late_over_30: number
  base_salary: number
  late_deduction: number
  absent_deduction: number
  gross: number
  net: number
}

const LATE_UNDER_30_PENALTY = 15000   // Rp 15.000 per kejadian
const LATE_OVER_30_PENALTY = 30000    // Rp 30.000 per kejadian
const ABSENT_PENALTY_RATIO = 1 / 25  // 1 hari = 1/25 gaji pokok

export default function PayrollPage() {
  const [rows, setRows] = useState<PayrollRow[]>([])
  const [month, setMonth] = useState('')
  const [entity, setEntity] = useState('CV_KTN')
  const [step, setStep] = useState<'upload' | 'preview' | 'done'>('upload')
  const [error, setError] = useState('')

  function parseCSV(text: string): PayrollRow[] {
    const lines = text.trim().split('\n')
    // Skip header row
    return lines.slice(1).map(line => {
      const cols = line.split(',').map(c => c.trim().replace(/"/g, ''))
      const base = parseFloat(cols[5]) || 0
      const present = parseInt(cols[2]) || 0
      const absent = parseInt(cols[3]) || 0
      const lateUnder = parseInt(cols[4]) || 0
      const lateOver = parseInt(cols[5 + 1]) || 0  // adjust column index per Talenta export

      const lateDeduction = (lateUnder * LATE_UNDER_30_PENALTY) + (lateOver * LATE_OVER_30_PENALTY)
      const absentDeduction = absent * (base * ABSENT_PENALTY_RATIO)
      const gross = base
      const net = gross - lateDeduction - absentDeduction

      return {
        employee_id: cols[0],
        name: cols[1],
        present_days: present,
        absent_days: absent,
        late_under_30: lateUnder,
        late_over_30: lateOver,
        base_salary: base,
        late_deduction: lateDeduction,
        absent_deduction: absentDeduction,
        gross,
        net,
      }
    }).filter(r => r.name)
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.csv')) {
      setError('File harus berformat CSV. Export dari Talenta → pilih format CSV.')
      return
    }

    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const text = ev.target?.result as string
        const parsed = parseCSV(text)
        if (parsed.length === 0) {
          setError('File CSV kosong atau format tidak dikenali.')
          return
        }
        setRows(parsed)
        setStep('preview')
        setError('')
      } catch {
        setError('Gagal membaca file. Pastikan format CSV dari Talenta.')
      }
    }
    reader.readAsText(file)
  }

  const fmt = (n: number) => 'Rp ' + n.toLocaleString('id-ID')
  const totalNet = rows.reduce((sum, r) => sum + r.net, 0)

  if (step === 'upload') return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Payroll Calculator</h1>
        <p className="text-gray-500 text-sm mt-1">Upload CSV dari Talenta untuk menghitung gaji otomatis</p>
      </div>

      <div className="max-w-2xl">
        {/* Settings */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-4">
          <h2 className="font-semibold text-gray-800 mb-4">Setting Payroll Run</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bulan</label>
              <input
                type="month"
                value={month}
                onChange={e => setMonth(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Entity</label>
              <select
                value={entity}
                onChange={e => setEntity(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              >
                <option value="CV_KTN">CV KTN (Jakarta)</option>
                <option value="CV_PRI">CV PRI (Semarang)</option>
                <option value="PT_BSB">PT BSB (Roastery)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Upload area */}
        <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-10 text-center">
          <FileSpreadsheet className="mx-auto mb-3 text-gray-300" size={40} />
          <p className="text-gray-600 font-medium mb-1">Upload file CSV dari Talenta</p>
          <p className="text-gray-400 text-sm mb-4">Export absensi bulan {month || '...'} dari aplikasi Talenta</p>

          <label className="cursor-pointer bg-[#1a1a1a] text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors inline-flex items-center gap-2">
            <Upload size={16} />
            Pilih File CSV
            <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
          </label>

          {error && <p className="mt-3 text-red-500 text-sm">{error}</p>}
        </div>

        {/* Rules info */}
        <div className="bg-amber-50 rounded-2xl p-4 mt-4">
          <p className="text-amber-800 text-sm font-medium mb-2">Aturan potongan yang dipakai:</p>
          <ul className="text-amber-700 text-xs space-y-1">
            <li>• Telat &lt; 30 menit: Rp 15.000 per kejadian</li>
            <li>• Telat ≥ 30 menit: Rp 30.000 per kejadian</li>
            <li>• Tidak masuk: 1/25 × gaji pokok per hari</li>
          </ul>
          <p className="text-amber-600 text-xs mt-2">* Aturan ini bisa disesuaikan setelah kamu konfirmasi detail lengkapnya</p>
        </div>
      </div>
    </div>
  )

  if (step === 'preview') return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Preview Payroll</h1>
          <p className="text-gray-500 text-sm mt-1">{rows.length} karyawan · {entity} · {month}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setStep('upload')} className="border border-gray-200 text-gray-700 px-4 py-2 rounded-xl text-sm hover:bg-gray-50 transition-colors">
            ← Upload Ulang
          </button>
          <button
            onClick={() => setStep('done')}
            className="bg-[#1a1a1a] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            Approve & Simpan
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          <p className="text-sm text-gray-500">Total Karyawan</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{rows.length}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          <p className="text-sm text-gray-500">Total Potongan</p>
          <p className="text-2xl font-bold text-red-600 mt-1">
            {fmt(rows.reduce((s, r) => s + r.late_deduction + r.absent_deduction, 0))}
          </p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          <p className="text-sm text-gray-500">Total Gaji Bersih</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{fmt(totalNet)}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">Karyawan</th>
              <th className="text-right px-4 py-3 text-xs text-gray-500 font-medium">Hadir</th>
              <th className="text-right px-4 py-3 text-xs text-gray-500 font-medium">Absen</th>
              <th className="text-right px-4 py-3 text-xs text-gray-500 font-medium">Telat</th>
              <th className="text-right px-4 py-3 text-xs text-gray-500 font-medium">Potongan</th>
              <th className="text-right px-4 py-3 text-xs text-gray-500 font-medium">Gaji Bersih</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map((r, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{r.name}</p>
                  <p className="text-xs text-gray-400">{r.employee_id}</p>
                </td>
                <td className="px-4 py-3 text-right text-gray-600">{r.present_days}</td>
                <td className="px-4 py-3 text-right">
                  <span className={r.absent_days > 0 ? 'text-red-500' : 'text-gray-400'}>{r.absent_days}</span>
                </td>
                <td className="px-4 py-3 text-right text-gray-600">
                  {r.late_under_30 + r.late_over_30}x
                </td>
                <td className="px-4 py-3 text-right text-red-500">
                  {fmt(r.late_deduction + r.absent_deduction)}
                </td>
                <td className="px-4 py-3 text-right font-semibold text-gray-900">
                  {fmt(r.net)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )

  return (
    <div className="p-8 flex items-center justify-center min-h-96">
      <div className="text-center">
        <CheckCircle className="mx-auto mb-4 text-green-500" size={48} />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Payroll tersimpan!</h2>
        <p className="text-gray-500 text-sm mb-6">Payroll {entity} bulan {month} sudah di-approve.</p>
        <button
          onClick={() => { setStep('upload'); setRows([]); setMonth('') }}
          className="bg-[#1a1a1a] text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors"
        >
          Proses Payroll Baru
        </button>
      </div>
    </div>
  )
}