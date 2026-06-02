'use client'

import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/types'
import { clearSupabaseBrowserSession, clearSupabaseAuthCookies, hasActiveBrowserSession } from '@/lib/auth/session'

interface AuthContextType {
  profile: Profile | null
  loading: boolean
  logout: () => Promise<void>
  isAdmin: boolean
  isSuperAdmin: boolean
}

const AuthContext = createContext<AuthContextType>({
  profile: null, loading: true,
  logout: async () => {}, isAdmin: false, isSuperAdmin: false,
})

function goLoginFallback() {
  if (typeof window !== 'undefined') {
    window.location.replace('/login')
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const supabaseRef = useRef(createClient())
  const supabase    = supabaseRef.current
  const router      = useRouter()

  useEffect(() => {
    // Oturum kontrolü
    // Güvenlik kuralı: tarayıcı/sekme kapatılıp tekrar açıldıysa
    // sessionStorage marker kaybolur. Supabase cookie kalsa bile kullanıcı
    // tekrar kullanıcı adı/şifre ile girişe zorlanır.
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user && !hasActiveBrowserSession()) {
        setProfile(null)
        try { await supabase.auth.signOut({ scope: 'global' }) } catch {}
        clearSupabaseBrowserSession()
        clearSupabaseAuthCookies()
        router.replace('/login')
        setTimeout(goLoginFallback, 150)
        return
      }

      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('*, brands(id, code, name, segment)')
          .eq('id', user.id)
          .single()
        setProfile(data as Profile | null)
      }
      setLoading(false)
    })

    // Auth state değişikliklerini dinle
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          setProfile(null)
          clearSupabaseBrowserSession()
          clearSupabaseAuthCookies()
          router.replace('/login')
        } else if (event === 'SIGNED_IN' && session?.user) {
          const { data } = await supabase
            .from('profiles')
            .select('*, brands(id, code, name, segment)')
            .eq('id', session.user.id)
            .single()
          setProfile(data as Profile | null)
        }
      }
    )

    // ── Tab kapatılınca oturumu sonlandır ──
    // NOT: beforeunload + visibilitychange kombinasyonu
    // normal navigasyonda da tetiklenebilir, bu yüzden
    // sadece gerçek tab kapatmada çalışacak şekilde düzenlendi
    let isClosing = false

    const handleBeforeUnload = () => {
      isClosing = true
      // 500ms sonra sıfırla (navigasyon ise tekrar false olur)
      setTimeout(() => { isClosing = false }, 500)
    }

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'hidden' && isClosing) {
        isClosing = false
        await supabase.auth.signOut()
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      subscription.unsubscribe()
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const logout = async () => {
    setLoading(true)
    setProfile(null)

    try {
      await supabase.auth.signOut({ scope: 'global' })
    } catch {
      // Ağ/Supabase kaynaklı hata olsa bile istemci oturumu temizlenir.
    } finally {
      clearSupabaseBrowserSession()
      clearSupabaseAuthCookies()
      router.replace('/login')
      router.refresh()
      setTimeout(goLoginFallback, 150)
    }
  }

  const isAdmin      = ['superadmin', 'admin'].includes(profile?.role || '')
  const isSuperAdmin = profile?.role === 'superadmin'

  return (
    <AuthContext.Provider value={{ profile, loading, logout, isAdmin, isSuperAdmin }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
