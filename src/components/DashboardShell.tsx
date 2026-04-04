'use client'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Users, FileText, Calculator, Home, LogOut, ChevronRight } from 'lucide-react'

interface Props {
  children: React.ReactNode
  userEmail?: string
}

const hrdNav = [
  { label: 'Overview', href: '/dashboard/hrd', icon: Home },
  { label: 'Karyawan', href: '/dashboard/hrd/karyawan', icon: Users },
  { label: 'Rekrutmen', href: '/dashboard/hrd/rekrutmen', icon: FileText },
  { label: 'Payroll', href: '/dashboard/hrd/payroll', icon: Calculator },
]

export default function DashboardShell({ children, userEmail }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="flex h-screen bg-[#F7F5F2]">
      {/* Sidebar */}
      <aside className="w-60 bg-[#1a1a1a] flex flex-col">
        {/* Brand */}
        <div className="px-6 py-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">B</span>
            </div>
            <div>
              <p className="text-white font-semibold text-sm">BREW</p>
              <p className="text-white/40 text-xs">Strada Coffee</p>
            </div>
          </div>
        </div>

        {/* Module label */}
        <div className="px-6 pt-6 pb-2">
          <p className="text-white/30 text-xs font-medium uppercase tracking-wider">HRD Module</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 space-y-0.5">
          {hrdNav.map(item => {
            const Icon = item.icon
            const active = pathname === item.href
            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  active
                    ? 'bg-white/15 text-white'
                    : 'text-white/50 hover:text-white hover:bg-white/8'
                }`}
              >
                <Icon size={16} />
                {item.label}
              </button>
            )
          })}
        </nav>

        {/* Other modules — coming soon */}
        <div className="px-6 py-4 border-t border-white/10">
          <p className="text-white/20 text-xs font-medium uppercase tracking-wider mb-2">Modul Lain</p>
          {['Finance', 'Warehouse', 'Purchasing', 'Audit'].map(m => (
            <div key={m} className="flex items-center justify-between py-1.5">
              <span className="text-white/25 text-xs">{m}</span>
              <span className="text-white/20 text-xs">Soon</span>
            </div>
          ))}
        </div>

        {/* User */}
        <div className="px-4 py-4 border-t border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center">
              <span className="text-white/60 text-xs font-medium">
                {userEmail?.[0]?.toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white/70 text-xs truncate">{userEmail}</p>
              <p className="text-white/30 text-xs">HRD</p>
            </div>
            <button onClick={handleLogout} className="text-white/30 hover:text-white/70 transition-colors">
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}