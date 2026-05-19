'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/types'
import { useRouter } from 'next/navigation'

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
  const router = useRouter()
  const supabase = createClient()

  const fetchProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*, brands(id, code, name, segment)')
      .eq('id', userId)
      .single()
    return data as Profile | null
  }, [supabase])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const p = await fetchProfile(session.user.id)
        setProfile(p)
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          setProfile(null)
          router.push('/login')
          return
        }
        if (session?.user) {
          const p = await fetchProfile(session.user.id)
          setProfile(p)
        } else {
          setProfile(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [fetchProfile, supabase, router])

  // Çıkış — signOut çağrısı + state temizle + login'e yönlendir
  const logout = async () => {
    try {
      await supabase.auth.signOut()
    } catch (e) {
      console.error('signOut error:', e)
    } finally {
      setProfile(null)
      router.push('/login')
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
