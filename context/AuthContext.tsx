'use client'

import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/types'

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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const supabaseRef = useRef(createClient())
  const supabase    = supabaseRef.current
  const router      = useRouter()

  useEffect(() => {
    // Oturum kontrolü
    supabase.auth.getUser().then(async ({ data: { user } }) => {
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

    // ── Sayfa kapatılınca / tab kapatılınca oturumu sonlandır ──
    const handleUnload = () => {
      // sessionStorage'a flag koy — tab kapandı
      sessionStorage.setItem('tab_closing', '1')
    }

    const handleVisibilityChange = async () => {
      // Sayfa gizlenince (tab kapatma veya başka sekmeye geçme)
      // Tab kapatılıyorsa (beforeunload tetiklendiyse) çıkış yap
      if (document.visibilityState === 'hidden' &&
          sessionStorage.getItem('tab_closing') === '1') {
        sessionStorage.removeItem('tab_closing')
        await supabase.auth.signOut()
      }
    }

    window.addEventListener('beforeunload', handleUnload)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      subscription.unsubscribe()
      window.removeEventListener('beforeunload', handleUnload)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const logout = async () => {
    try {
      await supabase.auth.signOut()
      // router.replace SIGNED_OUT event'inde çalışacak
    } catch (e) {
      // Hata olursa direkt yönlendir
      router.replace('/login')
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
