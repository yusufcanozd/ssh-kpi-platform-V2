'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import clsx from 'clsx'
import styles from './Sidebar.module.css'

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
  adminOnly?: boolean
}

const DASHBOARD_NAV: NavItem[] = [
  { href: '/dashboard',          label: 'Genel Bakış',      icon: <GridIcon /> },
  { href: '/dashboard/markalar', label: 'Marka Sıralaması', icon: <BarIcon /> },
  { href: '/dashboard/kpiler',   label: 'KPI Detay',        icon: <ActivityIcon /> },
  { href: '/dashboard/bolgeler', label: 'Bölge Analizi',    icon: <MapIcon /> },
  { href: '/dashboard/trend',    label: 'Dönemsel Trend',   icon: <TrendIcon /> },
]

const ADMIN_NAV: NavItem[] = [
  { href: '/admin/users', label: 'Kullanıcılar', icon: <UsersIcon /> },
]

interface SidebarProps {
  variant: 'dashboard' | 'admin'
  filters?: React.ReactNode
}

export default function Sidebar({ variant, filters }: SidebarProps) {
  const pathname = usePathname()
  const router   = useRouter()
  const { profile, isAdmin, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()

  const nav = variant === 'admin' ? ADMIN_NAV : DASHBOARD_NAV

  const handleLogout = async () => {
    await logout()
    router.replace('/login')
  }

  return (
    <aside className={styles.sidebar}>
      {/* Logo */}
      <div className={styles.brand}>
        <div className={styles.brandTag}>SSH · {variant === 'admin' ? 'Admin' : 'KPI'}</div>
        <div className={styles.brandName}>
          {variant === 'admin' ? 'Yönetim Merkezi' : 'Rekabet Skorkartı'}
        </div>
        <div className={styles.brandSub}>Türkiye Otomotiv Sektörü</div>
      </div>

      {/* Nav */}
      <nav className={styles.nav}>
        <div className={styles.navGrp}>
          {variant === 'admin' ? 'Yönetim' : 'Görünümler'}
        </div>

        {nav.map(item => {
          const isActive = pathname === item.href ||
            (item.href !== '/dashboard' && item.href !== '/admin' && pathname.startsWith(item.href))
          return (
            <Link key={item.href} href={item.href}
              className={clsx(styles.navBtn, isActive && styles.navBtnActive)}>
              {item.icon}{item.label}
            </Link>
          )
        })}

        {/* Geçiş linkleri */}
        <div className={styles.navGrp} style={{ marginTop: 12 }}>Geçiş</div>
        {variant === 'admin' ? (
          <Link href="/dashboard" className={styles.navBtn}><GridIcon />KPI Dashboard</Link>
        ) : isAdmin ? (
          <Link href="/admin/users" className={styles.navBtn}><ShieldIcon />Admin Paneli</Link>
        ) : null}
      </nav>

      {/* Filtreler */}
      {filters && <div className={styles.filters}>{filters}</div>}

      {/* Footer */}
      <div className={styles.footer}>
        {profile && (
          <div className={styles.userBlock}>
            <div className={styles.userName}>{profile.full_name}</div>
            <div className={clsx(styles.userRole)}>
              {profile.role === 'superadmin' ? 'Süper Admin' :
               profile.role === 'admin'      ? 'Admin' :
               profile.role === 'analyst'    ? 'Analist' : 'İzleyici'}
            </div>
            {profile.brands && (
              <div className={styles.userBrand}>{profile.brands.name}</div>
            )}
          </div>
        )}
        <div className={styles.footerActions}>
          <button className={styles.themeBtn} onClick={toggleTheme} title="Tema">
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>
          <button
            className={styles.logoutBtn}
            onClick={handleLogout}
            type="button"
          >
            Çıkış Yap
          </button>
        </div>
      </div>
    </aside>
  )
}

function GridIcon()     { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> }
function BarIcon()      { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> }
function UsersIcon()    { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg> }
function ActivityIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> }
function MapIcon()      { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="10" r="3"/><path d="M12 2a8 8 0 0 1 8 8c0 5.25-8 12-8 12S4 15.25 4 10a8 8 0 0 1 8-8z"/></svg> }
function TrendIcon()    { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 7 13 16 8 11 2 17"/><polyline points="16 7 22 7 22 13"/></svg> }
function ShieldIcon()   { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> }
function SunIcon()      { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg> }
function MoonIcon()     { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg> }
