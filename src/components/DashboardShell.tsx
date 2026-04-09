'use client'
import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Users, FileText, Calculator, Home, LogOut, Menu, X, Briefcase, FolderOpen, Scale, Brain } from 'lucide-react'

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
  { label: 'Tes Kepribadian', href: '/dashboard/hrd/disc', icon: Brain },
  { label: 'Tes Intelegensi', href: '/dashboard/hrd/cfit', icon: Brain },
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
      <div className="px-6 py-6 border-b border-gray-100 flex items-center justify-between">
        <img
          src="/strada-logo.svg"
          alt="Strada Coffee BREW"
          className="h-10 w-auto block filter grayscale contrast-200 opacity-95 transition-opacity hover:opacity-100"
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
          // Fix: Ensure exact match for items that are prefixes of others
          const active = pathname === item.href || (pathname.startsWith(item.href + '/') && !hrdNav.some(n => n.href !== item.href && pathname.startsWith(n.href) && n.href.length > item.href.length))
          
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
          <img src="/strada-logo.svg" alt="Strada BREW" className="h-8 w-auto filter grayscale contrast-200 opacity-95" />
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
