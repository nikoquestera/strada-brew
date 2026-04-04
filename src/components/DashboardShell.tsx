'use client'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Users, FileText, Calculator, Home, LogOut } from 'lucide-react'

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
    <div className="flex h-screen" style={{ backgroundColor: '#E4DED8' }}>
      {/* Sidebar */}
      <aside className="w-60 flex flex-col" style={{ backgroundColor: '#020000' }}>
        {/* Brand */}
        <div className="px-6 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#037894' }}>
              <span className="text-white font-bold text-sm">B</span>
            </div>
            <div>
              <p className="text-white font-semibold text-sm tracking-wide">BREW</p>
              <p className="text-xs" style={{ color: 'rgba(228,222,216,0.4)' }}>Strada Coffee</p>
            </div>
          </div>
        </div>

        {/* Module label */}
        <div className="px-6 pt-6 pb-2">
          <p className="text-xs font-medium uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.25)' }}>HRD Module</p>
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
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all"
                style={{
                  backgroundColor: active ? '#037894' : 'transparent',
                  color: active ? '#ffffff' : 'rgba(228,222,216,0.45)',
                }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.color = '#E4DED8' }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.color = 'rgba(228,222,216,0.45)' }}
              >
                <Icon size={16} />
                {item.label}
              </button>
            )
          })}
        </nav>

        {/* Other modules */}
        <div className="px-6 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <p className="text-xs font-medium uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.2)' }}>Modul Lain</p>
          {['Finance', 'Warehouse', 'Purchasing', 'Audit'].map(m => (
            <div key={m} className="flex items-center justify-between py-1.5">
              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>{m}</span>
              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.15)' }}>Soon</span>
            </div>
          ))}
        </div>

        {/* User */}
        <div className="px-4 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#037894' }}>
              <span className="text-white text-xs font-medium">
                {userEmail?.[0]?.toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs truncate" style={{ color: 'rgba(228,222,216,0.6)' }}>{userEmail}</p>
              <p className="text-xs" style={{ color: 'rgba(228,222,216,0.3)' }}>HRD</p>
            </div>
            <button onClick={handleLogout} style={{ color: 'rgba(228,222,216,0.3)' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#E4DED8'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'rgba(228,222,216,0.3)'}>
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