'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useTheme } from '@/context/ThemeContext'
import styles from './page.module.css'

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const router  = useRouter()
  const supabase = createClient()
  const { theme, toggleTheme } = useTheme()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      const msgs: Record<string, string> = {
        'Invalid login credentials': 'E-posta veya şifre hatalı.',
        'Email not confirmed':       'E-posta adresiniz onaylanmamış.',
        'Too many requests':         'Çok fazla deneme. Lütfen bekleyin.',
      }
      setError(msgs[authError.message] || 'Giriş başarısız. Tekrar deneyin.')
      setLoading(false)
      return
    }

    // Profil çek → role göre yönlendir
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_active')
      .eq('id', data.user!.id)
      .single()

    if (!profile?.is_active) {
      await supabase.auth.signOut()
      setError('Hesabınız deaktif. Yöneticinizle iletişime geçin.')
      setLoading(false)
      return
    }

    const isAdmin = ['superadmin', 'admin'].includes(profile?.role || '')
    router.push(isAdmin ? '/admin' : '/dashboard')
  }

  return (
    <div className={styles.wrap}>

      {/* Tema butonu */}
      <button className={styles.themeBtn} onClick={toggleTheme} title="Tema değiştir">
        {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
      </button>

      <div className={styles.card}>
        {/* Logo */}
        <div className={styles.logo}>
          <div className={styles.logoIcon}>
            <ShieldIcon />
          </div>
          <div>
            <h1 className={styles.logoTitle}>SSH KPI Platformu</h1>
            <p className={styles.logoSub}>Türkiye Otomotiv Sektörü</p>
          </div>
        </div>

        <div className={styles.desc}>
          Rekabet kuruluna uyumlu, anonim KPI raporlama platformu.
          Erişim için sistem yöneticinizle iletişime geçin.
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className={styles.form}>
          {error && <div className={styles.errBox}>{error}</div>}

          <div className={styles.field}>
            <label>E-posta adresi</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="ornek@marka.com"
              autoComplete="email"
              autoFocus
              required
            />
          </div>

          <div className={styles.field}>
            <label>Şifre</label>
            <div className={styles.pwWrap}>
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
              <button type="button" className={styles.eyeBtn} onClick={() => setShowPw(v => !v)}>
                {showPw ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
          </button>
        </form>

        <div className={styles.hint}>
          <InfoIcon />
          Şifrenizi unuttuysanız yöneticinize başvurun.
        </div>
      </div>
    </div>
  )
}

function ShieldIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  )
}
function InfoIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  )
}
function EyeIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  )
}
function EyeOffIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  )
}
function SunIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="5"/>
      <line x1="12" y1="1" x2="12" y2="3"/>
      <line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1" y1="12" x2="3" y2="12"/>
      <line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
  )
}
function MoonIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  )
}
