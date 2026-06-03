'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BOLGELER, SEGMENTLER } from '@/lib/kpi'
import Topbar from '@/components/layout/Topbar'
import type { UserRole } from '@/types'
import type { UserDataPermission, UserPermissionDraft } from '@/types/permissions'
import { createDefaultPermissionDraft, hasAnyDataRestriction, permissionRowToDraft } from '@/types/permissions'

type LoadState = 'idle' | 'loading' | 'ready' | 'error'

interface UserRow {
  id: string
  email: string | null
  full_name: string | null
  role: UserRole
  is_active: boolean
  brand_id: string | null
  created_at: string | null
}

interface BrandRow {
  id: string
  code: string | null
  name: string
  segment: string | null
  is_active: boolean | null
}

const ROLE_LABELS: Record<UserRole, string> = {
  superadmin: 'Süper Admin',
  admin: 'Admin',
  analyst: 'Analist',
  viewer: 'İzleyici',
}

const ROLE_OPTIONS: Array<{ value: UserRole; label: string }> = [
  { value: 'viewer', label: 'İzleyici' },
  { value: 'analyst', label: 'Analist' },
  { value: 'admin', label: 'Admin' },
  { value: 'superadmin', label: 'Süper Admin' },
]

const ROLE_COLORS: Record<UserRole, string> = {
  superadmin: '#ef4444',
  admin: '#f59e0b',
  analyst: '#3b82f6',
  viewer: '#8496b0',
}

function uniqueSorted(values: readonly string[]) {
  return Array.from(new Set(values.filter(value => value && value.trim().length > 0))).sort((a, b) => a.localeCompare(b, 'tr-TR'))
}

function toggleValue(values: string[], value: string) {
  return values.includes(value) ? values.filter(item => item !== value) : [...values, value]
}

function formatRestrictionSummary(draft: UserPermissionDraft) {
  const parts: string[] = []
  if (draft.allowed_segments.length) parts.push(`${draft.allowed_segments.length} segment`)
  if (draft.allowed_regions.length) parts.push(`${draft.allowed_regions.length} bölge`)
  if (draft.allowed_brand_ids.length) parts.push(`${draft.allowed_brand_ids.length} marka`)
  return parts.length ? parts.join(' · ') : 'Kısıt yok'
}

function safeRole(value: string | null | undefined): UserRole {
  if (value === 'superadmin' || value === 'admin' || value === 'analyst' || value === 'viewer') return value
  return 'viewer'
}

export default function UserPermissionsAdminPage() {
  const [state, setState] = useState<LoadState>('idle')
  const [users, setUsers] = useState<UserRow[]>([])
  const [brands, setBrands] = useState<BrandRow[]>([])
  const [drafts, setDrafts] = useState<Record<string, UserPermissionDraft>>({})
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [savingUserId, setSavingUserId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const segmentOptions = useMemo(() => uniqueSorted(SEGMENTLER), [])
  const regionOptions = useMemo(() => uniqueSorted(BOLGELER), [])

  const selectedUser = useMemo(
    () => users.find(user => user.id === selectedUserId) ?? users[0] ?? null,
    [selectedUserId, users]
  )

  const selectedDraft = selectedUser ? drafts[selectedUser.id] ?? createDefaultPermissionDraft() : createDefaultPermissionDraft()
  const restrictedUserCount = useMemo(
    () => Object.values(drafts).filter(draft => hasAnyDataRestriction(draft)).length,
    [drafts]
  )

  const fetchAll = useCallback(async () => {
    setState('loading')
    setError('')
    setNotice('')

    const supabase = createClient()

    const [userResult, brandResult, permissionResult] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, email, full_name, role, is_active, brand_id, created_at')
        .order('full_name', { ascending: true }),
      supabase
        .from('brands')
        .select('id, code, name, segment, is_active')
        .order('name', { ascending: true }),
      supabase
        .from('user_data_permissions')
        .select('*'),
    ])

    if (userResult.error) {
      setError(`Kullanıcılar okunamadı: ${userResult.error.message}`)
      setState('error')
      return
    }

    if (permissionResult.error) {
      setError(`Kullanıcı izinleri okunamadı: ${permissionResult.error.message}`)
      setState('error')
      return
    }

    const nextUsers = ((userResult.data ?? []) as Array<Partial<UserRow>>).map((user): UserRow => ({
      id: String(user.id ?? ''),
      email: typeof user.email === 'string' ? user.email : null,
      full_name: typeof user.full_name === 'string' ? user.full_name : null,
      role: safeRole(user.role),
      is_active: typeof user.is_active === 'boolean' ? user.is_active : true,
      brand_id: typeof user.brand_id === 'string' ? user.brand_id : null,
      created_at: typeof user.created_at === 'string' ? user.created_at : null,
    })).filter(user => user.id)

    const nextBrands = brandResult.error
      ? []
      : ((brandResult.data ?? []) as Array<Partial<BrandRow>>).map((brand): BrandRow => ({
          id: String(brand.id ?? ''),
          code: typeof brand.code === 'string' ? brand.code : null,
          name: typeof brand.name === 'string' ? brand.name : String(brand.code ?? 'Marka'),
          segment: typeof brand.segment === 'string' ? brand.segment : null,
          is_active: typeof brand.is_active === 'boolean' ? brand.is_active : true,
        })).filter(brand => brand.id && brand.name)

    const permissionMap = new Map<string, UserDataPermission>()
    ;((permissionResult.data ?? []) as UserDataPermission[]).forEach(row => {
      if (row.user_id) permissionMap.set(row.user_id, row)
    })

    const nextDrafts: Record<string, UserPermissionDraft> = {}
    nextUsers.forEach(user => {
      nextDrafts[user.id] = permissionRowToDraft(permissionMap.get(user.id))
    })

    setUsers(nextUsers)
    setBrands(nextBrands)
    setDrafts(nextDrafts)
    setSelectedUserId(prev => prev || nextUsers[0]?.id || '')
    setState('ready')

    if (brandResult.error) {
      setNotice('Marka tablosu okunamadı. Segment ve bölge izinleri yönetilebilir; marka kısıtları için brands tablosunu kontrol edin.')
    }
  }, [])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  function updateDraft(userId: string, patch: Partial<UserPermissionDraft>) {
    setDrafts(prev => ({
      ...prev,
      [userId]: {
        ...(prev[userId] ?? createDefaultPermissionDraft()),
        ...patch,
      },
    }))
  }

  async function savePermission(userId: string) {
    const draft = drafts[userId] ?? createDefaultPermissionDraft()
    const targetUser = users.find(user => user.id === userId)
    setSavingUserId(userId)
    setError('')
    setNotice('')

    const supabase = createClient()
    const row = {
      user_id: userId,
      allowed_segments: draft.allowed_segments,
      allowed_brand_ids: draft.allowed_brand_ids,
      allowed_regions: draft.allowed_regions,
      can_download_reports: draft.can_download_reports,
      can_import_data: draft.can_import_data,
      can_access_admin: draft.can_access_admin,
      updated_at: new Date().toISOString(),
    }

    const { error: saveError } = await supabase
      .from('user_data_permissions')
      .upsert(row, { onConflict: 'user_id' })

    if (saveError) {
      setError(`İzinler kaydedilemedi: ${saveError.message}`)
      setSavingUserId(null)
      return
    }

    try {
      const { data: authData } = await supabase.auth.getUser()
      await supabase.from('audit_logs').insert({
        actor_id: authData.user?.id ?? null,
        action: 'update',
        entity: 'user_data_permissions',
        entity_id: userId,
        summary: `${targetUser?.full_name || targetUser?.email || userId} için veri görünürlük izinleri güncellendi`,
        metadata: {
          allowed_segments: draft.allowed_segments,
          allowed_brand_ids: draft.allowed_brand_ids,
          allowed_regions: draft.allowed_regions,
          can_download_reports: draft.can_download_reports,
          can_import_data: draft.can_import_data,
          can_access_admin: draft.can_access_admin,
        },
      })
    } catch {
      // Audit kritik değil; kayıt başarısız olsa bile kullanıcı izni kaydı korunur.
    }

    setNotice('Kullanıcı izinleri kaydedildi.')
    setSavingUserId(null)
  }

  async function resetPermission(userId: string) {
    const confirmed = window.confirm('Bu kullanıcının tüm segment, marka ve bölge kısıtları kaldırılacak. Devam edilsin mi?')
    if (!confirmed) return

    const next = createDefaultPermissionDraft()
    updateDraft(userId, next)
    setSavingUserId(userId)
    setError('')
    setNotice('')

    const supabase = createClient()
    const { error: saveError } = await supabase
      .from('user_data_permissions')
      .upsert({
        user_id: userId,
        ...next,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })

    if (saveError) {
      setError(`Kısıtlar kaldırılamadı: ${saveError.message}`)
    } else {
      setNotice('Kullanıcı kısıtları kaldırıldı. Rol bazlı varsayılan davranış geçerli.')
    }
    setSavingUserId(null)
  }

  async function changeUserRole(userId: string, role: UserRole) {
    setSavingUserId(userId)
    setError('')
    setNotice('')

    const previousUsers = users
    setUsers(prev => prev.map(user => user.id === userId ? { ...user, role } : user))

    const res = await fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({})) as { error?: string }
      setUsers(previousUsers)
      setError(data.error || 'Kullanıcı rolü güncellenemedi.')
    } else {
      setNotice('Kullanıcı rolü güncellendi.')
    }

    setSavingUserId(null)
  }

  async function toggleUserActive(userId: string, isActive: boolean) {
    setSavingUserId(userId)
    setError('')
    setNotice('')

    const previousUsers = users
    setUsers(prev => prev.map(user => user.id === userId ? { ...user, is_active: !isActive } : user))

    const res = await fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !isActive }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({})) as { error?: string }
      setUsers(previousUsers)
      setError(data.error || 'Kullanıcı durumu güncellenemedi.')
    } else {
      setNotice(`Kullanıcı ${!isActive ? 'aktif' : 'pasif'} yapıldı.`)
    }

    setSavingUserId(null)
  }

  const renderCheckboxGroup = (
    title: string,
    hint: string,
    values: string[],
    selected: string[],
    onToggle: (value: string) => void,
    emptyText: string,
  ) => (
    <section style={sectionStyle}>
      <div style={{ marginBottom: 10 }}>
        <h3 style={sectionTitleStyle}>{title}</h3>
        <p style={hintStyle}>{hint}</p>
      </div>
      {values.length === 0 ? (
        <div style={emptyStyle}>{emptyText}</div>
      ) : (
        <div style={checkGridStyle}>
          {values.map(value => {
            const checked = selected.includes(value)
            return (
              <label key={value} style={{ ...checkItemStyle, borderColor: checked ? '#3b82f688' : 'var(--bd)' }}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggle(value)}
                />
                <span>{value}</span>
              </label>
            )
          })}
        </div>
      )}
    </section>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <Topbar
        title="Kullanıcı Marka / Segment Kısıtları"
        subtitle="Rol bazlı veri görünürlüğü, marka, segment ve bölge yetkileri"
        pills={[
          { label: `${users.length} kullanıcı`, variant: 'blue' },
          { label: `${restrictedUserCount} kısıtlı`, variant: restrictedUserCount ? 'amber' : 'green' },
        ]}
      />

      <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
        <div style={infoBoxStyle}>
          <strong>Varsayılan davranış:</strong> Boş segment, marka veya bölge listesi o alanda kısıt yok anlamına gelir. Superadmin her zaman tüm veriyi görür. Viewer ve analyst için girilen kısıtlar bir sonraki promptta dashboard filtrelerine merkezi helper ile uygulanacak.
        </div>

        {error && (
          <div style={errorStyle}>
            {error}
            <button type="button" onClick={fetchAll} style={inlineButtonStyle}>Tekrar yükle</button>
          </div>
        )}

        {notice && <div style={noticeStyle}>{notice}</div>}

        {state === 'loading' || state === 'idle' ? (
          <div style={loadingStyle}>Yükleniyor...</div>
        ) : users.length === 0 ? (
          <div style={emptyPageStyle}>Kullanıcı bulunamadı. profiles tablosu ve RLS politikalarını kontrol edin.</div>
        ) : (
          <div style={layoutStyle}>
            <aside style={userListStyle}>
              <div style={panelHeaderStyle}>
                <div>
                  <h2 style={panelTitleStyle}>Kullanıcılar</h2>
                  <p style={hintStyle}>Bir kullanıcı seç ve izinlerini düzenle.</p>
                </div>
                <button type="button" onClick={fetchAll} style={smallButtonStyle}>Yenile</button>
              </div>

              <div style={{ display: 'grid', gap: 8 }}>
                {users.map(user => {
                  const draft = drafts[user.id] ?? createDefaultPermissionDraft()
                  const selected = selectedUser?.id === user.id
                  return (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => setSelectedUserId(user.id)}
                      style={{
                        ...userCardStyle,
                        borderColor: selected ? '#3b82f6' : 'var(--bd)',
                        background: selected ? 'rgba(59,130,246,.08)' : 'var(--surf)',
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                        <span style={{ fontWeight: 700, color: 'var(--tx)' }}>{user.full_name || user.email || 'İsimsiz kullanıcı'}</span>
                        <span style={{ ...roleBadgeStyle, color: ROLE_COLORS[user.role], borderColor: `${ROLE_COLORS[user.role]}55` }}>{ROLE_LABELS[user.role]}</span>
                      </span>
                      <span style={{ display: 'block', fontSize: 10, color: 'var(--tx3)', marginTop: 4 }}>{user.email || user.id}</span>
                      <span style={{ display: 'block', fontSize: 10, color: hasAnyDataRestriction(draft) ? '#fbbf24' : 'var(--tx3)', marginTop: 6 }}>
                        {formatRestrictionSummary(draft)} · {user.is_active ? 'Aktif' : 'Pasif'}
                      </span>
                    </button>
                  )
                })}
              </div>
            </aside>

            {selectedUser && (
              <main style={detailPanelStyle}>
                <div style={detailHeaderStyle}>
                  <div>
                    <h2 style={{ fontSize: 20, margin: 0, color: 'var(--tx)' }}>{selectedUser.full_name || selectedUser.email || 'Kullanıcı'}</h2>
                    <p style={{ ...hintStyle, marginTop: 4 }}>{selectedUser.email || selectedUser.id}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => savePermission(selectedUser.id)}
                      disabled={savingUserId === selectedUser.id}
                      style={primaryButtonStyle}
                    >
                      {savingUserId === selectedUser.id ? 'Kaydediliyor...' : 'İzinleri Kaydet'}
                    </button>
                    <button
                      type="button"
                      onClick={() => resetPermission(selectedUser.id)}
                      disabled={savingUserId === selectedUser.id}
                      style={dangerGhostButtonStyle}
                    >
                      Kısıtları Kaldır
                    </button>
                  </div>
                </div>

                <section style={sectionStyle}>
                  <h3 style={sectionTitleStyle}>Rol ve hesap durumu</h3>
                  <p style={hintStyle}>Rol ve aktiflik değişiklikleri mevcut güvenli admin API üzerinden yapılır.</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 260px) 1fr', gap: 12, marginTop: 12 }}>
                    <label style={fieldStyle}>
                      <span style={labelStyle}>Rol</span>
                      <select
                        value={selectedUser.role}
                        onChange={event => changeUserRole(selectedUser.id, event.target.value as UserRole)}
                        disabled={savingUserId === selectedUser.id}
                        style={selectStyle}
                      >
                        {ROLE_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </label>
                    <div style={{ ...fieldStyle, justifyContent: 'flex-end' }}>
                      <span style={labelStyle}>Durum</span>
                      <button
                        type="button"
                        onClick={() => toggleUserActive(selectedUser.id, selectedUser.is_active)}
                        disabled={savingUserId === selectedUser.id}
                        style={selectedUser.is_active ? dangerGhostButtonStyle : successGhostButtonStyle}
                      >
                        {selectedUser.is_active ? 'Pasif Yap' : 'Aktif Yap'}
                      </button>
                    </div>
                  </div>
                </section>

                <section style={sectionStyle}>
                  <h3 style={sectionTitleStyle}>İşlem yetkileri</h3>
                  <div style={permissionToggleGridStyle}>
                    <label style={switchRowStyle}>
                      <input
                        type="checkbox"
                        checked={selectedDraft.can_download_reports}
                        onChange={event => updateDraft(selectedUser.id, { can_download_reports: event.target.checked })}
                      />
                      <span>
                        <strong>Rapor indirme</strong>
                        <small>PDF/print rapor çıktılarına izin verir.</small>
                      </span>
                    </label>
                    <label style={switchRowStyle}>
                      <input
                        type="checkbox"
                        checked={selectedDraft.can_import_data}
                        onChange={event => updateDraft(selectedUser.id, { can_import_data: event.target.checked })}
                      />
                      <span>
                        <strong>Data import</strong>
                        <small>Import ekranında işlem yapabilme yetkisi.</small>
                      </span>
                    </label>
                    <label style={switchRowStyle}>
                      <input
                        type="checkbox"
                        checked={selectedDraft.can_access_admin}
                        onChange={event => updateDraft(selectedUser.id, { can_access_admin: event.target.checked })}
                      />
                      <span>
                        <strong>Admin panel erişimi</strong>
                        <small>Rol bazlı guard devam eder; bu alan RLS/app filter dokümanı için tutulur.</small>
                      </span>
                    </label>
                  </div>
                </section>

                {renderCheckboxGroup(
                  'Segment kısıtı',
                  'Boş bırakılırsa kullanıcı tüm segmentleri görür. Seçim yapılırsa dashboard segment filtresi bu listeye daralır.',
                  segmentOptions,
                  selectedDraft.allowed_segments,
                  value => updateDraft(selectedUser.id, { allowed_segments: toggleValue(selectedDraft.allowed_segments, value) }),
                  'Segment listesi bulunamadı.',
                )}

                {renderCheckboxGroup(
                  'Bölge kısıtı',
                  'Boş bırakılırsa kullanıcı tüm bölgeleri görür. Seçim yapılırsa bölge filtresi bu listeye daralır.',
                  regionOptions,
                  selectedDraft.allowed_regions,
                  value => updateDraft(selectedUser.id, { allowed_regions: toggleValue(selectedDraft.allowed_regions, value) }),
                  'Bölge listesi bulunamadı.',
                )}

                <section style={sectionStyle}>
                  <div style={{ marginBottom: 10 }}>
                    <h3 style={sectionTitleStyle}>Marka kısıtı</h3>
                    <p style={hintStyle}>Boş bırakılırsa kullanıcı tüm markaları görür. Marka listesi Supabase brands tablosundan gelir.</p>
                  </div>
                  {brands.length === 0 ? (
                    <div style={emptyStyle}>Marka tablosu boş veya okunamadı. Marka kısıtı için önce Marka Yönetimi ekranından markaları DB&apos;ye taşıyın.</div>
                  ) : (
                    <div style={checkGridStyle}>
                      {brands.map(brand => {
                        const checked = selectedDraft.allowed_brand_ids.includes(brand.id)
                        return (
                          <label key={brand.id} style={{ ...checkItemStyle, borderColor: checked ? '#3b82f688' : 'var(--bd)' }}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => updateDraft(selectedUser.id, { allowed_brand_ids: toggleValue(selectedDraft.allowed_brand_ids, brand.id) })}
                            />
                            <span>
                              {brand.name}
                              <small style={{ display: 'block', color: 'var(--tx3)', marginTop: 2 }}>
                                {[brand.code, brand.segment, brand.is_active === false ? 'Pasif' : 'Aktif'].filter(Boolean).join(' · ')}
                              </small>
                            </span>
                          </label>
                        )
                      })}
                    </div>
                  )}
                </section>
              </main>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

const infoBoxStyle: React.CSSProperties = {
  background: 'rgba(59,130,246,.08)',
  border: '1px solid rgba(59,130,246,.28)',
  borderRadius: 10,
  padding: '12px 14px',
  marginBottom: 14,
  color: 'var(--tx2)',
  fontSize: 12,
  lineHeight: 1.55,
}

const errorStyle: React.CSSProperties = {
  background: 'rgba(239,68,68,.1)',
  border: '1px solid rgba(239,68,68,.45)',
  borderRadius: 10,
  padding: '10px 14px',
  marginBottom: 12,
  color: '#f87171',
  fontSize: 12,
}

const noticeStyle: React.CSSProperties = {
  background: 'rgba(16,185,129,.1)',
  border: '1px solid rgba(16,185,129,.36)',
  borderRadius: 10,
  padding: '10px 14px',
  marginBottom: 12,
  color: '#34d399',
  fontSize: 12,
}

const loadingStyle: React.CSSProperties = {
  padding: 60,
  textAlign: 'center',
  color: 'var(--tx3)',
}

const emptyPageStyle: React.CSSProperties = {
  padding: 60,
  textAlign: 'center',
  color: 'var(--tx3)',
  background: 'var(--surf)',
  border: '1px solid var(--bd)',
  borderRadius: 12,
}

const layoutStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '360px minmax(0, 1fr)',
  gap: 16,
  alignItems: 'start',
}

const userListStyle: React.CSSProperties = {
  background: 'var(--surf)',
  border: '1px solid var(--bd)',
  borderRadius: 12,
  padding: 14,
  position: 'sticky',
  top: 0,
}

const panelHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: 10,
  marginBottom: 12,
}

const panelTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 15,
  color: 'var(--tx)',
}

const userCardStyle: React.CSSProperties = {
  width: '100%',
  textAlign: 'left',
  border: '1px solid var(--bd)',
  borderRadius: 10,
  padding: 10,
  cursor: 'pointer',
}

const roleBadgeStyle: React.CSSProperties = {
  border: '1px solid',
  borderRadius: 999,
  padding: '2px 7px',
  fontSize: 9,
  fontWeight: 800,
  whiteSpace: 'nowrap',
}

const detailPanelStyle: React.CSSProperties = {
  display: 'grid',
  gap: 14,
}

const detailHeaderStyle: React.CSSProperties = {
  background: 'var(--surf)',
  border: '1px solid var(--bd)',
  borderRadius: 12,
  padding: 16,
  display: 'flex',
  justifyContent: 'space-between',
  gap: 12,
  alignItems: 'flex-start',
}

const sectionStyle: React.CSSProperties = {
  background: 'var(--surf)',
  border: '1px solid var(--bd)',
  borderRadius: 12,
  padding: 16,
}

const sectionTitleStyle: React.CSSProperties = {
  margin: 0,
  color: 'var(--tx)',
  fontSize: 14,
}

const hintStyle: React.CSSProperties = {
  margin: 0,
  color: 'var(--tx3)',
  fontSize: 11,
  lineHeight: 1.45,
}

const fieldStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
}

const labelStyle: React.CSSProperties = {
  fontSize: 10,
  color: 'var(--tx3)',
  fontWeight: 800,
  textTransform: 'uppercase',
  letterSpacing: '.06em',
}

const selectStyle: React.CSSProperties = {
  background: 'var(--surf2)',
  border: '1px solid var(--bd)',
  borderRadius: 8,
  color: 'var(--tx)',
  padding: '8px 10px',
  fontSize: 12,
}

const primaryButtonStyle: React.CSSProperties = {
  border: '1px solid rgba(59,130,246,.55)',
  background: 'rgba(59,130,246,.18)',
  color: '#60a5fa',
  borderRadius: 8,
  padding: '8px 12px',
  fontSize: 12,
  fontWeight: 800,
  cursor: 'pointer',
}

const smallButtonStyle: React.CSSProperties = {
  border: '1px solid var(--bd)',
  background: 'var(--surf2)',
  color: 'var(--tx2)',
  borderRadius: 8,
  padding: '6px 10px',
  fontSize: 11,
  cursor: 'pointer',
}

const inlineButtonStyle: React.CSSProperties = {
  marginLeft: 12,
  background: 'transparent',
  border: 0,
  color: '#60a5fa',
  cursor: 'pointer',
  fontSize: 12,
}

const dangerGhostButtonStyle: React.CSSProperties = {
  border: '1px solid rgba(239,68,68,.45)',
  background: 'rgba(239,68,68,.08)',
  color: '#f87171',
  borderRadius: 8,
  padding: '8px 12px',
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
}

const successGhostButtonStyle: React.CSSProperties = {
  border: '1px solid rgba(16,185,129,.45)',
  background: 'rgba(16,185,129,.08)',
  color: '#34d399',
  borderRadius: 8,
  padding: '8px 12px',
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
}

const permissionToggleGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gap: 10,
  marginTop: 12,
}

const switchRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 10,
  alignItems: 'flex-start',
  border: '1px solid var(--bd)',
  borderRadius: 10,
  padding: 10,
  color: 'var(--tx2)',
  fontSize: 12,
}

const checkGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
  gap: 8,
}

const checkItemStyle: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  alignItems: 'flex-start',
  border: '1px solid var(--bd)',
  borderRadius: 9,
  padding: '8px 10px',
  color: 'var(--tx2)',
  fontSize: 12,
}

const emptyStyle: React.CSSProperties = {
  border: '1px dashed var(--bd)',
  borderRadius: 10,
  padding: 16,
  color: 'var(--tx3)',
  fontSize: 12,
}
