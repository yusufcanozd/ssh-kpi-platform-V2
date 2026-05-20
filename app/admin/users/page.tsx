'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/context/AuthContext'
import Topbar from '@/components/layout/Topbar'

interface UserRow {
  id: string
  full_name: string
  role: string
  is_active: boolean
  created_at: string
  brand_id: string | null
  brands: { name: string; segment: string } | null
}

const ROLE_LABELS: Record<string, string> = {
  superadmin: 'Süper Admin', admin: 'Admin', analyst: 'Analist', viewer: 'İzleyici'
}
const ROLE_COLORS: Record<string, string> = {
  superadmin: '#ef4444', admin: '#f59e0b', analyst: '#3b82f6', viewer: '#8496b0'
}

export default function AdminUsersPage() {
  const { isSuperAdmin, loading: authLoading } = useAuth()
  const [users, setUsers]     = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [saving, setSaving]   = useState<string | null>(null)
  const [dbgMsg, setDbgMsg]   = useState('')

  useEffect(() => {
    if (!authLoading) fetchUsers()
  }, [authLoading])

  async function fetchUsers() {
    setLoading(true)
    setError('')
    setDbgMsg('')

    const supabase = createClient()

    // Önce session kontrol
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('Oturum bulunamadı. Lütfen yeniden giriş yapın.')
      setLoading(false)
      return
    }
    setDbgMsg(`Kullanıcı: ${user.email}`)

    const { data, error: fetchError } = await supabase
      .from('profiles')
      .select('id, full_name, role, is_active, created_at, brand_id, brands(name, segment)')
      .order('created_at', { ascending: false })

    if (fetchError) {
      setError(`Hata: ${fetchError.message} (${fetchError.code})`)
      setLoading(false)
      return
    }

    setUsers((data || []) as UserRow[])
    setDbgMsg(`${data?.length || 0} kullanıcı yüklendi`)
    setLoading(false)
  }

  async function toggleActive(userId: string, current: boolean) {
    setSaving(userId)
    // Önce UI'ı anında güncelle (optimistic update)
    setUsers(prev => prev.map(u => u.id === userId ? {...u, is_active: !current} : u))
    const supabase = createClient()
    const { error } = await supabase
      .from('profiles')
      .update({ is_active: !current })
      .eq('id', userId)
    if (error) {
      // Hata olursa geri al
      setUsers(prev => prev.map(u => u.id === userId ? {...u, is_active: current} : u))
      setError(error.message)
    }
    setSaving(null)
  }

  async function changeRole(userId: string, role: string) {
    setSaving(userId)
    // Önce UI'ı anında güncelle
    setUsers(prev => prev.map(u => u.id === userId ? {...u, role} : u))
    const supabase = createClient()
    const { error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', userId)
    if (error) {
      setError(error.message)
      // Hata olursa yeniden yükle
      await fetchUsers()
    }
    setSaving(null)
  }



  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh', overflow:'hidden' }}>
      <Topbar title="Kullanıcı Yönetimi"
        subtitle={`${users.length} kullanıcı`}
        pills={[{ label: isSuperAdmin ? '● Süper Admin' : '● Admin', variant: 'green' }]}
      />
      <div style={{ flex:1, overflow:'auto', padding:'20px 24px' }}>

        {/* Debug mesajı */}
        {dbgMsg && (
          <div style={{ fontSize:11, color:'var(--tx3)', marginBottom:10, padding:'6px 10px', background:'var(--surf2)', borderRadius:6 }}>
            {dbgMsg}
          </div>
        )}

        {/* Hata */}
        {error && (
          <div style={{ background:'rgba(239,68,68,.1)', border:'1px solid #ef4444', borderRadius:8, padding:'10px 14px', marginBottom:14, fontSize:12, color:'#f87171' }}>
            {error}
            <button onClick={fetchUsers} style={{ marginLeft:12, fontSize:11, color:'#60a5fa', background:'none', border:'none', cursor:'pointer' }}>
              Tekrar dene
            </button>
          </div>
        )}

        {loading || authLoading ? (
          <div style={{ textAlign:'center', padding:60, color:'var(--tx3)' }}>Yükleniyor...</div>
        ) : users.length === 0 ? (
          <div style={{ textAlign:'center', padding:60, color:'var(--tx3)' }}>
            Kullanıcı bulunamadı. Supabase RLS politikalarını kontrol edin.
          </div>
        ) : (
          <div style={{ background:'var(--surf)', border:'1px solid var(--bd)', borderRadius:10, overflow:'hidden' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead>
                <tr style={{ background:'var(--surf2)', borderBottom:'1px solid var(--bd)' }}>
                  {['Ad Soyad','Rol','Marka','Durum','İşlem'].map(h => (
                    <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:10, fontWeight:700, color:'var(--tx3)', textTransform:'uppercase', letterSpacing:'.06em' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} style={{ borderBottom:'1px solid var(--bd)', opacity: saving===u.id ? 0.5 : 1 }}>
                    <td style={{ padding:'10px 14px' }}>
                      <div style={{ fontWeight:600, color:'var(--tx)' }}>{u.full_name || '—'}</div>
                      <div style={{ fontSize:10, color:'var(--tx3)', marginTop:1 }}>{u.id.slice(0,12)}...</div>
                    </td>
                    <td style={{ padding:'10px 14px' }}>
                      {isSuperAdmin ? (
                        <select value={u.role} onChange={e => changeRole(u.id, e.target.value)}
                          disabled={saving === u.id}
                          style={{ background:'var(--surf2)', border:`1px solid ${ROLE_COLORS[u.role] || '#aaa'}44`,
                            borderRadius:6, padding:'3px 8px', fontSize:11, color: ROLE_COLORS[u.role] || 'var(--tx)', fontWeight:600, cursor:'pointer' }}>
                          {Object.entries(ROLE_LABELS).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                        </select>
                      ) : (
                        <span style={{ fontSize:11, fontWeight:600, color: ROLE_COLORS[u.role] || 'var(--tx)',
                          background:`${ROLE_COLORS[u.role] || '#aaa'}18`, padding:'2px 8px', borderRadius:20 }}>
                          {ROLE_LABELS[u.role] || u.role}
                        </span>
                      )}
                    </td>
                    <td style={{ padding:'10px 14px' }}>
                      {u.brands ? (
                        <>
                          <div style={{ fontWeight:600, color:'var(--tx)', fontSize:12 }}>{u.brands.name}</div>
                          <div style={{ fontSize:10, color:'var(--tx3)' }}>{u.brands.segment}</div>
                        </>
                      ) : <span style={{ color:'var(--tx3)' }}>—</span>}
                    </td>
                    <td style={{ padding:'10px 14px' }}>
                      <span style={{ fontSize:10, fontWeight:700, padding:'3px 10px', borderRadius:20,
                        background: u.is_active ? 'rgba(16,185,129,.12)' : 'rgba(239,68,68,.1)',
                        color: u.is_active ? '#10b981' : '#f87171',
                        border: `1px solid ${u.is_active ? '#10b98144' : '#ef444444'}` }}>
                        {u.is_active ? '● Aktif' : '○ Pasif'}
                      </span>
                    </td>
                    <td style={{ padding:'10px 14px' }}>
                      {isSuperAdmin && (
                        <button onClick={() => toggleActive(u.id, u.is_active)}
                          disabled={saving === u.id}
                          style={{ padding:'4px 12px', borderRadius:6, fontSize:11, cursor:'pointer',
                            border:`1px solid ${u.is_active ? '#ef444466' : '#10b98166'}`,
                            background: u.is_active ? 'rgba(239,68,68,.08)' : 'rgba(16,185,129,.08)',
                            color: u.is_active ? '#f87171' : '#10b981' }}>
                          {u.is_active ? 'Pasif Yap' : 'Aktif Yap'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
