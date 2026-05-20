'use client'

import { createContext, useContext, useEffect, useState, useRef } from 'react'
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
  profile: null,
  loading: true,
  logout: async () => {},
  isAdmin: false,
  isSuperAdmin: false,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current

  useEffect(() => {
    // İlk yükleme
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

    // Auth değişikliklerini dinle
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          setProfile(null)
          window.location.replace('/login')
          return
        }
        if (event === 'SIGNED_IN' && session.user) {
          const { data } = await supabase
            .from('profiles')
            .select('*, brands(id, code, name, segment)')
            .eq('id', session.user.id)
            .single()
          setProfile(data as Profile | null)
        }
      }
    )

    return () => subscription.unsubscribe()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Boş array — sadece bir kere çalışır

  const logout = async () => {
    await supabase.auth.signOut()
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
