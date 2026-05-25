'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useTheme } from '@/context/ThemeContext'
import styles from './page.module.css'

type Mode = 'login' | 'signup' | 'forgot' | 'otp' | 'reset'

export default function LoginPage() {
  const router   = useRouter()
  const supabase = createClient()
  const { theme, toggleTheme } = useTheme()

  const [mode, setMode]         = useState<Mode>('login')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [newPass, setNewPass]   = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [otp, setOtp]           = useState('')
  // Signup fields
  const [firstName, setFirstName] = useState('')
  const [lastName,  setLastName]  = useState('')
  const [phone,     setPhone]     = useState('')
  const [error, setError]   = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  // reset sadece yeni submit başladığında çağrılır
  const reset = () => { setError(''); setSuccess('') }

  // Error'ı kalıcı göster — sadece kullanıcı bir şey değiştirince temizle
  const clearOnChange = () => { if (error) setError('') }

  // ── Giriş ──────────────────────────────────────────────────
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault(); reset(); setLoading(true)
    try {
      const { data, error: err } = await supabase.auth.signInWithPassword({ email, password })
      if (err) {
        const msgs: Record<string,string> = {
          'Invalid login credentials': 'E-posta veya şifre hatalı.',
          'Email not confirmed':       'E-posta adresiniz onaylanmamış.',
          'Too many requests':         'Çok fazla deneme. Lütfen bekleyin.',
        }
        setError(msgs[err.message] || 'Giriş başarısız.')
        return
      }
      const { data: profile, error: profileErr } = await supabase
        .from('profiles').select('role, is_active').eq('id', data.user!.id).single()
      if (profileErr || !profile) {
        setError('Profil bilgisi alınamadı. Lütfen tekrar deneyin.')
        return
      }
      if (!profile.is_active) {
        await supabase.auth.signOut()
        setError('Hesabınız deaktif. Yöneticinizle iletişime geçin.')
        return
      }
      // setLoading(false) router.push'tan ÖNCE — unmount öncesi state temizlenir
      setLoading(false)
      router.push(['superadmin','admin'].includes(profile.role || '') ? '/admin' : '/dashboard')
    } catch {
      setError('Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.')
    } finally {
      setLoading(false)
    }
  }

  // ── Kayıt ──────────────────────────────────────────────────
  async function handleSignup(e: React.FormEvent) {
    e.preventDefault(); reset(); setLoading(true)
    const { error: err } = await supabase.auth.signUp({
      email, password,
      options: {
        data: { full_name: `${firstName} ${lastName}`, phone },
        emailRedirectTo: `${location.origin}/login`,
      }
    })
    if (err) { setError(err.message); setLoading(false); return }
    setSuccess('Kayıt talebiniz alındı. E-posta adresinizi onaylayın. Süper admin hesabınızı inceleyip aktifleştirdikten sonra giriş yapabileceksiniz.')
    setLoading(false)
  }

  // ── Şifremi Unuttum — OTP gönder ──────────────────────────
  async function handleForgot(e: React.FormEvent) {
    e.preventDefault(); reset(); setLoading(true)
    const { error: err } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } })
    if (err) { setError(err.message); setLoading(false); return }
    setSuccess(`${email} adresine tek kullanımlık kod gönderildi.`)
    setMode('otp')
    setLoading(false)
  }

  // ── OTP Doğrulama ──────────────────────────────────────────
  async function handleOtp(e: React.FormEvent) {
    e.preventDefault(); reset(); setLoading(true)
    const { error: err } = await supabase.auth.verifyOtp({ email, token: otp, type: 'email' })
    if (err) { setError('Kod hatalı veya süresi dolmuş.'); setLoading(false); return }
    setSuccess('Doğrulama başarılı. Yeni şifrenizi belirleyin.')
    setMode('reset')
    setLoading(false)
  }

  // ── Şifre Yenileme ─────────────────────────────────────────
  async function handleReset(e: React.FormEvent) {
    e.preventDefault(); reset(); setLoading(true)
    const { error: err } = await supabase.auth.updateUser({ password: newPass })
    if (err) { setError(err.message); setLoading(false); return }
    setSuccess('Şifreniz güncellendi. Giriş yapabilirsiniz.')
    setMode('login')
    setLoading(false)
  }

  const titles: Record<Mode,string> = {
    login:  'Giriş Yap',
    signup: 'Hesap Oluştur',
    forgot: 'Şifremi Unuttum',
    otp:    'Kodu Doğrula',
    reset:  'Yeni Şifre Belirle',
  }

  return (
    <div className={styles.wrap}>
      <button className={styles.themeBtn} onClick={toggleTheme} title="Tema">
        {theme==='dark' ? <SunIcon/> : <MoonIcon/>}
      </button>

      <div className={styles.card}>
        {/* Logo */}
        <div className={styles.logo}>
          <div className={styles.logoIcon}><ShieldIcon/></div>
          <div>
            <h1 className={styles.logoTitle}>SSH KPI Platformu</h1>
            <p className={styles.logoSub}>Türkiye Otomotiv Sektörü</p>
          </div>
        </div>

        <h2 className={styles.modeTitle}>{titles[mode]}</h2>

        {error   && <div className={styles.errBox}>{error}</div>}
        {success && <div className={styles.sucBox}>{success}</div>}

        {/* ── Giriş formu ── */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className={styles.form}>
            <div className={styles.field}>
              <label>E-posta</label>
              <input type="email" value={email} onChange={e=>{setEmail(e.target.value);clearOnChange()}} placeholder="ornek@marka.com" required autoFocus/>
            </div>
            <div className={styles.field}>
              <label>Şifre</label>
              <div className={styles.pwWrap}>
                <input type={showPw?'text':'password'} value={password} onChange={e=>{setPassword(e.target.value);clearOnChange()}} placeholder="••••••••" required/>
                <button type="button" className={styles.eyeBtn} onClick={()=>setShowPw(v=>!v)}>
                  {showPw?<EyeOffIcon/>:<EyeIcon/>}
                </button>
              </div>
            </div>
            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
            </button>
            <div className={styles.links}>
              <button type="button" className={styles.linkBtn} onClick={()=>{reset();setMode('forgot')}}>Şifremi unuttum</button>
              <button type="button" className={styles.linkBtn} onClick={()=>{reset();setMode('signup')}}>Hesap oluştur</button>
            </div>
          </form>
        )}

        {/* ── Kayıt formu ── */}
        {mode === 'signup' && (
          <form onSubmit={handleSignup} className={styles.form}>
            <div className={styles.twoField}>
              <div className={styles.field}>
                <label>Ad</label>
                <input value={firstName} onChange={e=>setFirstName(e.target.value)} placeholder="Ahmet" required/>
              </div>
              <div className={styles.field}>
                <label>Soyad</label>
                <input value={lastName} onChange={e=>setLastName(e.target.value)} placeholder="Yılmaz" required/>
              </div>
            </div>
            <div className={styles.field}>
              <label>Telefon</label>
              <div className={styles.pwWrap}>
                <span style={{padding:'0 8px',color:'var(--tx2)',fontSize:12,borderRight:'1px solid var(--bd2)',
                  display:'flex',alignItems:'center',background:'var(--surf3)',borderRadius:'6px 0 0 6px',
                  whiteSpace:'nowrap',height:'100%',minWidth:44}}>🇹🇷 +90</span>
                <input type="tel" value={phone} onChange={e=>setPhone(e.target.value.replace(/\D/g,'').slice(0,10))}
                  placeholder="5XX XXX XXXX" required
                  style={{borderRadius:'0 6px 6px 0',borderLeft:'none'}}/>
              </div>
            </div>
            <div className={styles.field}>
              <label>E-posta</label>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="ornek@marka.com" required/>
            </div>
            <div className={styles.field}>
              <label>Şifre</label>
              <div className={styles.pwWrap}>
                <input type={showPw?'text':'password'} value={password} onChange={e=>{setPassword(e.target.value);clearOnChange()}} placeholder="••••••••" required/>
                <button type="button" className={styles.eyeBtn} onClick={()=>setShowPw(v=>!v)}>
                  {showPw?<EyeOffIcon/>:<EyeIcon/>}
                </button>
              </div>
            </div>
            <div className={styles.infoBox}>
              Hesabınız yönetici onayından sonra aktifleştirilecektir.
            </div>
            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? 'Gönderiliyor...' : 'Kayıt Talebi Gönder'}
            </button>
            <div className={styles.links}>
              <button type="button" className={styles.linkBtn} onClick={()=>{reset();setMode('login')}}>← Giriş ekranına dön</button>
            </div>
          </form>
        )}

        {/* ── Şifremi unuttum ── */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgot} className={styles.form}>
            <div className={styles.infoBox}>
              E-posta adresinize tek kullanımlık giriş kodu göndereceğiz.
            </div>
            <div className={styles.field}>
              <label>E-posta</label>
              <input type="email" value={email} onChange={e=>{setEmail(e.target.value);clearOnChange()}} placeholder="ornek@marka.com" required autoFocus/>
            </div>
            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? 'Gönderiliyor...' : 'Kod Gönder'}
            </button>
            <div className={styles.links}>
              <button type="button" className={styles.linkBtn} onClick={()=>{reset();setMode('login')}}>← Geri dön</button>
            </div>
          </form>
        )}

        {/* ── OTP kodu ── */}
        {mode === 'otp' && (
          <form onSubmit={handleOtp} className={styles.form}>
            <div className={styles.infoBox}>
              <strong>{email}</strong> adresine gönderilen 6 haneli kodu girin.
            </div>
            <div className={styles.field}>
              <label>Tek Kullanımlık Kod</label>
              <input value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g,'').slice(0,6))}
                placeholder="123456" maxLength={6} required autoFocus
                style={{letterSpacing:'0.3em',fontSize:20,textAlign:'center'}}/>
            </div>
            <button type="submit" className={styles.submitBtn} disabled={loading||otp.length<6}>
              {loading ? 'Doğrulanıyor...' : 'Kodu Doğrula'}
            </button>
            <div className={styles.links}>
              <button type="button" className={styles.linkBtn} onClick={()=>{reset();setMode('forgot')}}>Kodu tekrar gönder</button>
            </div>
          </form>
        )}

        {/* ── Şifre yenileme ── */}
        {mode === 'reset' && (
          <form onSubmit={handleReset} className={styles.form}>
            <div className={styles.field}>
              <label>Yeni Şifre</label>
              <div className={styles.pwWrap}>
                <input type={showPw?'text':'password'} value={newPass} onChange={e=>setNewPass(e.target.value)}
                  placeholder="••••••••" required autoFocus/>
                <button type="button" className={styles.eyeBtn} onClick={()=>setShowPw(v=>!v)}>
                  {showPw?<EyeOffIcon/>:<EyeIcon/>}
                </button>
              </div>
            </div>
            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? 'Güncelleniyor...' : 'Şifreyi Güncelle'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

function ShieldIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> }
function EyeIcon()    { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> }
function EyeOffIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg> }
function SunIcon()    { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg> }
function MoonIcon()   { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg> }
