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

  const SidebarContent = () => (
    <aside style={{ backgroundColor: '#020000', display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Brand / Logo */}
      <div style={{ padding: '18px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <img
          src="/strada-logo.svg"
          alt="Strada Coffee BREW"
          style={{ height: '38px', width: 'auto', display: 'block' }}
        />
        <button onClick={() => setSidebarOpen(false)}
          style={{ display: 'none', color: 'rgba(228,222,216,0.4)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
          className="sidebar-close-btn brew-icon-btn">
          <X size={18} />
        </button>
      </div>

      {/* Module label */}
      <div style={{ padding: '20px 24px 8px' }}>
        <p style={{ color: 'rgba(255,255,255,0.22)', fontSize: '10px', fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase', margin: 0 }}>HRD Module</p>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '0 12px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {hrdNav.map(item => {
          const Icon = item.icon
          const active = pathname === item.href || (item.href !== '/dashboard/hrd' && pathname.startsWith(item.href))
          return (
            <button key={item.href}
              onClick={() => { router.push(item.href); setSidebarOpen(false) }}
              className={active ? undefined : 'brew-nav-btn'}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                backgroundColor: active ? '#037894' : 'transparent',
                color: active ? '#ffffff' : 'rgba(228,222,216,0.5)',
                border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
              }}>
              <Icon size={15} />
              {item.label}
            </button>
          )
        })}
      </nav>

      {/* Coming soon modules */}
      <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <p style={{ color: 'rgba(255,255,255,0.18)', fontSize: '10px', fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase', margin: '0 0 8px' }}>Segera Hadir</p>
        {['Finance', 'Warehouse', 'Purchasing', 'Audit'].map(m => (
          <div key={m} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
            <span style={{ color: 'rgba(255,255,255,0.18)', fontSize: '12px' }}>{m}</span>
            <span style={{ color: 'rgba(255,255,255,0.12)', fontSize: '10px', letterSpacing: '1px' }}>SOON</span>
          </div>
        ))}
      </div>

      {/* User section */}
      <div style={{ padding: '14px 16px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#037894', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ color: '#fff', fontSize: '12px', fontWeight: 700 }}>{userEmail?.[0]?.toUpperCase()}</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ color: 'rgba(228,222,216,0.65)', fontSize: '12px', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userEmail}</p>
          <p style={{ color: 'rgba(228,222,216,0.28)', fontSize: '10px', margin: 0, letterSpacing: '1px', textTransform: 'uppercase' }}>HRD</p>
        </div>
        <button onClick={handleLogout} title="Keluar"
          style={{ color: 'rgba(228,222,216,0.28)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', transition: 'color 0.15s' }}
          className="brew-icon-btn">
          <LogOut size={14} />
        </button>
      </div>
    </aside>
  )

  return (
    <>
      <style>{`
        @media (max-width: 768px) {
          .desktop-sidebar { display: none !important; }
          .mobile-header { display: flex !important; }
          .mobile-sidebar { display: ${sidebarOpen ? 'flex' : 'none'} !important; }
          .sidebar-close-btn { display: block !important; }
        }
        @media (min-width: 769px) {
          .mobile-header { display: none !important; }
          .mobile-sidebar { display: none !important; }
          .desktop-sidebar { display: flex !important; }
        }
      `}</style>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 40 }} />
      )}

      {/* Mobile sidebar drawer */}
      <div className="mobile-sidebar" style={{
        position: 'fixed', top: 0, left: 0, bottom: 0, width: '260px',
        zIndex: 50, flexDirection: 'column'
      }}>
        <SidebarContent />
      </div>

      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>

        {/* Desktop sidebar */}
        <div className="desktop-sidebar" style={{ width: '240px', flexShrink: 0, flexDirection: 'column' }}>
          <SidebarContent />
        </div>

        {/* Main content area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Mobile header */}
          <div className="mobile-header" style={{
            backgroundColor: '#020000', padding: '14px 20px',
            alignItems: 'center', justifyContent: 'space-between', flexShrink: 0
          }}>
            <button onClick={() => setSidebarOpen(true)}
              style={{ color: '#E4DED8', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
              className="brew-icon-btn">
              <Menu size={20} />
            </button>
            <img src="/strada-logo.svg" alt="Strada BREW" style={{ height: '30px', width: 'auto' }} />
            <div style={{ width: '28px' }} />
          </div>

          {/* Page content */}
          <main style={{ flex: 1, overflowY: 'auto' }}>
            {children}
          </main>
        </div>
      </div>
    </>
  )
}
