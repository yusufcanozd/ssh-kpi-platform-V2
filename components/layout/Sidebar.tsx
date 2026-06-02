'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import clsx from 'clsx'
import styles from './Sidebar.module.css'

const DASHBOARD_NAV = [
  { href:'/dashboard',            label:'Genel Bakış',      icon:<GridIcon/> },
  { href:'/dashboard/markalar',   label:'Marka Sıralaması', icon:<BarIcon/> },
  { href:'/dashboard/kpiler',     label:'KPI Detay',        icon:<ActivityIcon/> },
  { href:'/dashboard/bolgeler',   label:'Bölge Analizi',    icon:<MapIcon/> },
  { href:'/dashboard/trend',      label:'Dönemsel Trend',   icon:<TrendIcon/> },
  { href:'/dashboard/ozet-rapor', label:'Özet Rapor',       icon:<ReportIcon/> },
]
const ADMIN_NAV = [
  { href:'/admin',              label:'Yönetim Özeti',      icon:<ShieldIcon/> },
  { href:'/admin/users',        label:'Kullanıcılar',       icon:<UsersIcon/> },
  { href:'/admin/kpi-settings', label:'KPI Ayarları',      icon:<ActivityIcon/> },
  { href:'/admin/categories',   label:'Kategoriler',       icon:<GridIcon/> },
  { href:'/admin/weights',      label:'Kategori Ağırlıkları', icon:<BarIcon/> },
  { href:'/admin/brands',       label:'Markalar',          icon:<BarIcon/> },
  { href:'/admin/data-import',  label:'Data Import',       icon:<ReportIcon/> },
  { href:'/admin/permissions',  label:'Kullanıcı Kısıtları', icon:<UsersIcon/> },
  { href:'/admin/theme',        label:'Tema / Görsel',     icon:<SunIcon/> },
]

interface SidebarProps {
  variant: 'dashboard' | 'admin'
  filters?: React.ReactNode
  collapsed?: boolean
  onToggle?: () => void
}

export default function Sidebar({ variant, filters, collapsed: collapsedProp, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const router   = useRouter()
  const { profile, isAdmin, loading, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  // Dashboard'dan prop gelirse onu kullan, yoksa internal state
  const [internalCollapsed, setInternalCollapsed] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const collapsed = collapsedProp !== undefined ? collapsedProp : internalCollapsed
  const toggle = onToggle || (() => setInternalCollapsed(v=>!v))

  const nav = variant === 'admin' ? ADMIN_NAV : DASHBOARD_NAV

  const handleLogout = async () => {
    if (loggingOut) return
    setLoggingOut(true)
    await logout()
  }

  return (
    <aside className={clsx(styles.sidebar, collapsed && styles.collapsed)}>
      {/* Logo + Toggle */}
      <div className={styles.brand} style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',flexWrap:'nowrap'}}>
        <div className={styles.brandTag}>SSH · {variant === 'admin' ? 'Admin' : 'KPI'}</div>
        {!collapsed && (
          <>
            <div className={styles.brandName}>
              {variant === 'admin' ? 'Yönetim Merkezi' : 'Rekabet Skorkartı'}
            </div>
            <div className={styles.brandSub}>Türkiye Otomotiv Sektörü</div>
          </>
        )}
        <button
          className={styles.toggleBtn}
          onClick={toggle}
          title={collapsed ? 'Menüyü aç' : 'Menüyü gizle'}
          style={{flexShrink:0,marginTop:2}}
        >
          {collapsed ? <ChevronRightIcon/> : <ChevronLeftIcon/>}
        </button>
      </div>

      {/* Nav */}
      <nav className={styles.nav}>
        {!collapsed && (
          <div className={styles.navGrp}>
            {variant === 'admin' ? 'Yönetim' : 'Görünümler'}
          </div>
        )}
        {nav.map(item => {
          const isActive = pathname === item.href ||
            (item.href !== '/dashboard' && item.href !== '/admin' && pathname.startsWith(item.href))
          return (
            <Link key={item.href} href={item.href}
              className={clsx(styles.navBtn, isActive && styles.navBtnActive)}
              title={collapsed ? item.label : undefined}>
              {item.icon}
              {!collapsed && item.label}
            </Link>
          )
        })}

        {!loading && (
          <>
            {!collapsed && (
              <div className={styles.navGrp} style={{marginTop:12}}>Geçiş</div>
            )}
            {variant === 'admin' ? (
              <Link href="/dashboard" className={styles.navBtn} title={collapsed?'KPI Dashboard':undefined}>
                <GridIcon/>{!collapsed && 'KPI Dashboard'}
              </Link>
            ) : isAdmin ? (
              <Link href="/admin" className={styles.navBtn} title={collapsed?'Admin Paneli':undefined}>
                <ShieldIcon/>{!collapsed && 'Admin Paneli'}
              </Link>
            ) : null}
          </>
        )}
      </nav>

      {/* Filtreler — sadece açıkken */}
      {filters && !collapsed && <div className={styles.filters}>{filters}</div>}

      {/* Footer */}
      <div className={styles.footer}>
        {profile && !collapsed && (
          <div className={styles.userBlock}>
            <div className={styles.userName}>{profile.full_name}</div>
            <div className={styles.userRole}>
              {profile.role==='superadmin'?'Süper Admin':profile.role==='admin'?'Admin':profile.role==='analyst'?'Analist':'İzleyici'}
            </div>
            {profile.brands && <div className={styles.userBrand}>{profile.brands.name}</div>}
          </div>
        )}
        <div className={styles.footerActions}>
          <button className={styles.themeBtn} onClick={toggleTheme} title="Tema">
            {theme==='dark'?<SunIcon/>:<MoonIcon/>}
          </button>
          {!collapsed && (
            <button className={styles.logoutBtn} onClick={handleLogout} type="button" disabled={loggingOut}>
              {loggingOut ? 'Çıkılıyor...' : 'Çıkış Yap'}
            </button>
          )}
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
function ReportIcon()   { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg> }
function ChevronLeftIcon()  { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg> }
function ChevronRightIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg> }
