'use client'
import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Users, FileText, Calculator, Home, LogOut, Menu, X, Briefcase, FolderOpen } from 'lucide-react'

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
      {/* Brand */}
      <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ color: '#E4DED8', fontWeight: 800, fontSize: '16px', fontStyle: 'italic', margin: 0, lineHeight: 1 }}>Strada</p>
          <p style={{ color: '#037894', fontSize: '10px', fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase', margin: 0 }}>BREW</p>
        </div>
        {/* Close button mobile only */}
        <button onClick={() => setSidebarOpen(false)}
          style={{ display: 'none', color: 'rgba(228,222,216,0.4)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
          className="sidebar-close-btn">
          <X size={18} />
        </button>
      </div>

      {/* Module label */}
      <div style={{ padding: '20px 24px 8px' }}>
        <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '10px', fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase', margin: 0 }}>HRD Module</p>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '0 12px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {hrdNav.map(item => {
          const Icon = item.icon
          const active = pathname === item.href || (item.href !== '/dashboard/hrd' && pathname.startsWith(item.href))
          return (
            <button key={item.href}
              onClick={() => { router.push(item.href); setSidebarOpen(false) }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 12px', borderRadius: '8px', fontSize: '14px',
                backgroundColor: active ? '#037894' : 'transparent',
                color: active ? '#ffffff' : 'rgba(228,222,216,0.45)',
                border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
              }}>
              <Icon size={16} />
              {item.label}
            </button>
          )
        })}
      </nav>

      {/* Coming soon */}
      <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '10px', fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase', margin: '0 0 8px' }}>Modul Lain</p>
        {['Finance', 'Warehouse', 'Purchasing', 'Audit'].map(m => (
          <div key={m} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
            <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '12px' }}>{m}</span>
            <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: '11px' }}>Soon</span>
          </div>
        ))}
      </div>

      {/* User */}
      <div style={{ padding: '16px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#037894', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ color: '#fff', fontSize: '12px', fontWeight: 700 }}>{userEmail?.[0]?.toUpperCase()}</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ color: 'rgba(228,222,216,0.6)', fontSize: '12px', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userEmail}</p>
          <p style={{ color: 'rgba(228,222,216,0.3)', fontSize: '11px', margin: 0 }}>HRD</p>
        </div>
        <button onClick={handleLogout} style={{ color: 'rgba(228,222,216,0.3)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
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
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 40 }} />
      )}

      {/* Mobile sidebar (drawer) */}
      <div className="mobile-sidebar" style={{
        position: 'fixed', top: 0, left: 0, bottom: 0, width: '260px',
        zIndex: 50, flexDirection: 'column'
      }}>
        <SidebarContent />
      </div>

      {/* Layout */}
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>

        {/* Desktop sidebar */}
        <div className="desktop-sidebar" style={{ width: '240px', flexShrink: 0, flexDirection: 'column' }}>
          <SidebarContent />
        </div>

        {/* Main content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Mobile header */}
          <div className="mobile-header" style={{
            backgroundColor: '#020000', padding: '16px 20px',
            alignItems: 'center', justifyContent: 'space-between', flexShrink: 0
          }}>
            <button onClick={() => setSidebarOpen(true)}
              style={{ color: '#E4DED8', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
              <Menu size={20} />
            </button>
            <div style={{ textAlign: 'center' }}>
              <span style={{ color: '#E4DED8', fontWeight: 800, fontSize: '14px', fontStyle: 'italic' }}>Strada</span>
              <span style={{ color: '#037894', fontWeight: 700, fontSize: '10px', letterSpacing: '2px', marginLeft: '6px' }}>BREW</span>
            </div>
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