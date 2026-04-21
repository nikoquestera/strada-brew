'use client'
import { Calculator } from 'lucide-react'

export default function PayrollPage() {
  return (
    <div className="p-8 md:p-12 min-h-[60vh] flex flex-col items-center justify-center text-center">
      <div className="w-20 h-20 bg-blue-50 rounded-[32px] flex items-center justify-center text-strada-blue mb-8">
        <Calculator size={40} strokeWidth={2.5} />
      </div>
      <h1 className="text-3xl font-[900] text-gray-900 tracking-tight mb-4">Modul Payroll</h1>
      <p className="text-lg text-gray-500 font-medium max-w-md">
        Sedang dikerjakan, fase berikutnya..
      </p>
    </div>
  )
}
