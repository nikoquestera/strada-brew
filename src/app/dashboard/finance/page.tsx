export default function FinanceDashboard() {
  return (
    <div className="p-6 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Finance Dashboard</h1>
        <p className="text-gray-500 mt-2">Kelola revenue, penjualan, pembayaran, dan stok opname Anda</p>
      </div>

      {/* Welcome card */}
      <div className="bg-gradient-to-br from-strada-blue/10 to-strada-dark-teal/10 rounded-xl p-6 border border-strada-blue/20">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Selamat datang di Finance Module</h2>
        <p className="text-gray-600">Gunakan menu di sebelah kiri untuk mengakses berbagai fitur finance dashboard.</p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
        <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
          <p className="text-gray-500 text-sm font-medium">Revenue Store</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">—</p>
          <p className="text-xs text-gray-400 mt-1">Laporan penjualan dari Quinos Cloud</p>
        </div>
        <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
          <p className="text-gray-500 text-sm font-medium">Penjualan</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">—</p>
          <p className="text-xs text-gray-400 mt-1">Segera hadir</p>
        </div>
        <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
          <p className="text-gray-500 text-sm font-medium">Pembayaran</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">—</p>
          <p className="text-xs text-gray-400 mt-1">Segera hadir</p>
        </div>
        <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
          <p className="text-gray-500 text-sm font-medium">Stok Opname</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">—</p>
          <p className="text-xs text-gray-400 mt-1">Segera hadir</p>
        </div>
      </div>
    </div>
  )
}
