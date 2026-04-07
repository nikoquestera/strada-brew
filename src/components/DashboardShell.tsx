'use client'
import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Users, FileText, Calculator, Home, LogOut, Menu, X, Briefcase, FolderOpen, Scale } from 'lucide-react'

interface Props {
  children: React.ReactNode
  userEmail?: string
}

const hrdNav = [
  { label: 'Overview', href: '/dashboard/hrd', icon: Home },
  { label: 'Karyawan', href: '/dashboard/hrd/karyawan', icon: Users },
  { label: 'Rekrutmen', href: '/dashboard/hrd/rekrutmen', icon: FileText },
  { label: 'Job Posting', href: '/dashboard/hrd/jobs', icon: Briefcase },
  { label: 'Dokumen', href: '/dashboard/hrd/dokumen', icon: FolderOpen },
  { label: 'Payroll', href: '/dashboard/hrd/payroll', icon: Calculator },
  { label: 'Scoring Weights', href: '/dashboard/hrd/rekrutmen/weights', icon: Scale },
]

export default function DashboardShell({ children, userEmail }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const sidebarContent = (
    <aside className="bg-white/80 backdrop-blur-xl border-r border-gray-200/50 flex flex-col h-full w-full">
      {/* Brand / Logo */}
      <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
        <img
          src="/strada-logo.svg"
          alt="Strada Coffee BREW"
          className="h-8 w-auto block filter grayscale contrast-200 opacity-90"
        />
        <button 
          onClick={() => setSidebarOpen(false)}
          className="md:hidden text-gray-400 hover:text-gray-600 transition-colors p-1"
        >
          <X size={20} />
        </button>
      </div>

      {/* Module label */}
      <div className="px-6 pt-6 pb-2">
        <p className="text-gray-400 text-[10px] font-bold tracking-[3px] uppercase m-0">HRD Module</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 flex flex-col gap-1 overflow-y-auto">
        {hrdNav.map(item => {
          const Icon = item.icon
          const active = pathname === item.href || (item.href !== '/dashboard/hrd' && pathname.startsWith(item.href))
          return (
            <button key={item.href}
              onClick={() => { router.push(item.href); setSidebarOpen(false) }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-200 ${
                active 
                  ? 'bg-strada-blue text-white shadow-sm' 
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <Icon size={16} className={active ? "text-white" : "text-gray-400"} />
              {item.label}
            </button>
          )
        })}
      </nav>

      {/* Coming soon modules */}
      <div className="px-6 py-5 border-t border-gray-100 bg-gray-50/50">
        <p className="text-gray-400 text-[10px] font-bold tracking-[3px] uppercase mb-3">Segera Hadir</p>
        <div className="flex flex-col gap-2.5">
          {['Finance', 'Warehouse', 'Purchasing', 'Audit'].map(m => (
            <div key={m} className="flex justify-between items-center">
              <span className="text-gray-500 text-xs font-medium">{m}</span>
              <span className="bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider">SOON</span>
            </div>
          ))}
        </div>
      </div>

      {/* User section */}
      <div className="p-4 border-t border-gray-100 bg-white flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-strada-blue to-strada-dark-teal flex items-center justify-center shrink-0 shadow-sm">
          <span className="text-white text-xs font-bold">{userEmail?.[0]?.toUpperCase()}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-gray-900 text-sm font-semibold m-0 truncate">{userEmail}</p>
          <p className="text-gray-400 text-[10px] m-0 tracking-wider uppercase font-medium">HRD Administrator</p>
        </div>
        <button onClick={handleLogout} title="Keluar"
          className="text-gray-400 hover:text-strada-coral hover:bg-red-50 p-2 rounded-full transition-all duration-200">
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-[#F5F5F7]">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-40 transition-opacity md:hidden" 
        />
      )}

      {/* Mobile sidebar drawer */}
      <div className={`fixed top-0 left-0 bottom-0 w-[280px] z-50 transform transition-transform duration-300 ease-in-out md:hidden ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {sidebarContent}
      </div>

      {/* Desktop sidebar */}
      <div className="hidden md:flex w-[260px] lg:w-[280px] shrink-0 flex-col shadow-[1px_0_10px_rgba(0,0,0,0.02)] z-10 relative">
        {sidebarContent}
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Mobile header */}
        <div className="md:hidden bg-white/80 backdrop-blur-xl border-b border-gray-200/50 px-4 py-3 flex items-center justify-between shrink-0 sticky top-0 z-30 shadow-sm">
          <button onClick={() => setSidebarOpen(true)}
            className="text-gray-600 hover:text-gray-900 p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <Menu size={20} />
          </button>
          <img src="/strada-logo.svg" alt="Strada BREW" className="h-6 w-auto filter grayscale contrast-200 opacity-90" />
          <div className="w-8" /> {/* spacer for center alignment */}
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}