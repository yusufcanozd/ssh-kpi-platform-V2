'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Topbar from '@/components/layout/Topbar'
import { useAuth } from '@/context/AuthContext'
import { createClient } from '@/lib/supabase/client'
import {
  type AdminUserPermission,
  type PermissionOptions,
  clearUserPermission,
  loadPermissionOptions,
  loadUserPermissions,
  saveUserPermission,
} from '@/lib/admin/permissions-management'
import styles from '@/components/admin/KpiManagement.module.css'

function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter(item => item !== value) : [...list, value]
}

export default function PermissionsAdminPage() {
  const router = useRouter()
  const { isSuperAdmin, loading } = useAuth()
  const supabase = useMemo(() => createClient(), [])

  const [users, setUsers] = useState<AdminUserPermission[]>([])
  const [options, setOptions] = useState<PermissionOptions>({ segments: [], brands: [], regions: [] })
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [buffer, setBuffer] = useState<AdminUserPermission | null>(null)
  const [warning, setWarning] = useState('')
  const [dbError, setDbError] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!loading && !isSuperAdmin) router.replace('/dashboard')
  }, [isSuperAdmin, loading, router])

  useEffect(() => {
    let cancelled = false
    loadUserPermissions(supabase).then(result => {
      if (cancelled) return
      setUsers(result.users)
      setWarning(result.warning ?? '')
    })
    loadPermissionOptions(supabase).then(result => {
      if (cancelled) return
      setOptions(result)
    })
    return () => { cancelled = true }
  }, [supabase])

  function selectUser(user: AdminUserPermission) {
    setSelectedId(user.userId)
    setBuffer({ ...user, allowedSegments: [...user.allowedSegments], allowedBrandIds: [...user.allowedBrandIds], allowedRegions: [...user.allowedRegions] })
    setDbError('')
    setNote('')
  }

  const brandNameById = useMemo(() => new Map(options.brands.map(brand => [brand.id, brand.name])), [options.brands])

  async function save() {
    if (!buffer) return
    setDbError('')
    setSaving(true)
    const { error } = await saveUserPermission(supabase, buffer)
    setSaving(false)
    if (error) { setDbError(error); return }
    setUsers(current => current.map(user => user.userId === buffer.userId ? { ...buffer, hasRow: true } : user))
    setNote(`${buffer.fullName} izinleri kaydedildi.`)
  }

  async function clearAll() {
    if (!buffer) return
    if (typeof window !== 'undefined' && !window.confirm(`${buffer.fullName} için tüm kısıtlar kaldırılacak (rol bazlı default'a döner). Devam?`)) return
    setSaving(true)
    const { error } = await clearUserPermission(supabase, buffer.userId)
    setSaving(false)
    if (error) { setDbError(error); return }
    const cleared: AdminUserPermission = { ...buffer, allowedSegments: [], allowedBrandIds: [], allowedRegions: [], canDownloadReports: true, canImportData: false, canAccessAdmin: false, hasRow: false }
    setBuffer(cleared)
    setUsers(current => current.map(user => user.userId === buffer.userId ? cleared : user))
    setNote(`${buffer.fullName} kısıtları temizlendi.`)
  }

  if (loading) return <div className={styles.content}>Yetki kontrol ediliyor...</div>
  if (!isSuperAdmin) return <div className={styles.content}>Bu ekrana sadece Super Admin erişebilir.</div>

  const isSelectedSuperadmin = buffer?.role === 'superadmin'

  return (
    <div className={styles.shell}>
      <Topbar
        title="Kullanıcı Kısıtları"
        subtitle="Kullanıcı bazlı segment / marka / bölge görünürlüğü ve yetkiler"
        pills={[{ label: 'Supabase', variant: 'green' }]}
      />
      <div className={styles.content}>
        <div className={styles.inner}>
          <section className={styles.notice}>
            <div className={styles.noticeTitle}>Kısıt mantığı</div>
            <div className={styles.noticeText}>
              Boş bırakılan alan = kısıt yok (rol bazlı varsayılan: kullanıcı tüm ilgili veriyi görür). Bir alana en az bir seçim eklenince kullanıcı yalnızca seçilenleri görür. Super Admin her zaman sınırsızdır. (Dashboard sorgularına filtre uygulaması bir sonraki adımda devreye girecek.)
            </div>
            {warning && <div className={styles.noticeText}>{warning}</div>}
          </section>

          <div className={styles.grid}>
            <section className={styles.card}>
              <div className={styles.toolbar}>
                <div>
                  <h2 className={styles.toolbarTitle}>Kullanıcılar</h2>
                  <div className={styles.toolbarHint}>{users.length} kullanıcı · özel kısıtı olanlar “Özel” etiketli</div>
                </div>
              </div>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Kullanıcı</th>
                      <th>Rol</th>
                      <th>Durum</th>
                      <th>Kısıt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(user => (
                      <tr key={user.userId} onClick={() => selectUser(user)} style={{ cursor: 'pointer', background: selectedId === user.userId ? 'var(--surf2)' : undefined }}>
                        <td>
                          <div>{user.fullName}</div>
                          <div className={`${styles.muted} ${styles.small}`}>{user.email || '—'}</div>
                        </td>
                        <td>{user.role}</td>
                        <td>
                          <span className={`${styles.status} ${user.isActive ? styles.statusActive : styles.statusPassive}`}>{user.isActive ? 'Aktif' : 'Pasif'}</span>
                        </td>
                        <td>
                          <span className={`${styles.status} ${user.hasRow ? styles.statusActive : styles.statusPassive}`}>{user.hasRow ? 'Özel' : 'Default'}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <aside className={styles.card}>
              {!buffer ? (
                <div className={styles.form}>
                  <div className={styles.formHint}>Düzenlemek için soldan bir kullanıcı seçin.</div>
                </div>
              ) : (
                <div className={styles.form}>
                  <div>
                    <h2 className={styles.formTitle}>{buffer.fullName}</h2>
                    <div className={styles.formHint}>{buffer.email || '—'} · rol: {buffer.role}</div>
                  </div>

                  {dbError && <div className={styles.errors}>{dbError}</div>}
                  {isSelectedSuperadmin && <div className={styles.errors}>Super Admin her zaman sınırsızdır; kısıtlar uygulanmaz (kayıt yine de saklanır).</div>}

                  <div className={styles.field}>
                    <label>İzin verilen segmentler {buffer.allowedSegments.length === 0 && '(boş = hepsi)'}</label>
                    <div className={styles.actions} style={{ marginBottom: 6 }}>
                      <button type="button" className={styles.secondaryButton} onClick={() => setBuffer({ ...buffer, allowedSegments: [...options.segments] })}>Tümü</button>
                      <button type="button" className={styles.secondaryButton} onClick={() => setBuffer({ ...buffer, allowedSegments: [] })}>Hiçbiri</button>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {options.segments.map(segment => (
                        <label key={segment} className={styles.checkboxRow}>
                          <input type="checkbox" checked={buffer.allowedSegments.includes(segment)} onChange={() => setBuffer({ ...buffer, allowedSegments: toggle(buffer.allowedSegments, segment) })} />
                          {segment}
                        </label>
                      ))}
                      {options.segments.length === 0 && <span className={styles.muted}>Segment bulunamadı.</span>}
                    </div>
                  </div>

                  <div className={styles.field}>
                    <label>İzin verilen bölgeler {buffer.allowedRegions.length === 0 && '(boş = hepsi)'}</label>
                    <div className={styles.actions} style={{ marginBottom: 6 }}>
                      <button type="button" className={styles.secondaryButton} onClick={() => setBuffer({ ...buffer, allowedRegions: [...options.regions] })}>Tümü</button>
                      <button type="button" className={styles.secondaryButton} onClick={() => setBuffer({ ...buffer, allowedRegions: [] })}>Hiçbiri</button>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {options.regions.map(region => (
                        <label key={region} className={styles.checkboxRow}>
                          <input type="checkbox" checked={buffer.allowedRegions.includes(region)} onChange={() => setBuffer({ ...buffer, allowedRegions: toggle(buffer.allowedRegions, region) })} />
                          {region}
                        </label>
                      ))}
                      {options.regions.length === 0 && <span className={styles.muted}>Bölge bulunamadı.</span>}
                    </div>
                  </div>

                  <div className={styles.field}>
                    <label>İzin verilen markalar {buffer.allowedBrandIds.length === 0 && '(boş = hepsi)'}</label>
                    <div className={styles.actions} style={{ marginBottom: 6 }}>
                      <button type="button" className={styles.secondaryButton} onClick={() => setBuffer({ ...buffer, allowedBrandIds: options.brands.map(brand => brand.id) })}>Tümü</button>
                      <button type="button" className={styles.secondaryButton} onClick={() => setBuffer({ ...buffer, allowedBrandIds: [] })}>Hiçbiri</button>
                    </div>
                    <div style={{ maxHeight: 220, overflow: 'auto', display: 'grid', gap: 6, border: '1px solid var(--bd)', borderRadius: 10, padding: 10 }}>
                      {options.brands.map(brand => (
                        <label key={brand.id} className={styles.checkboxRow}>
                          <input type="checkbox" checked={buffer.allowedBrandIds.includes(brand.id)} onChange={() => setBuffer({ ...buffer, allowedBrandIds: toggle(buffer.allowedBrandIds, brand.id) })} />
                          {brand.name}
                        </label>
                      ))}
                      {options.brands.length === 0 && <span className={styles.muted}>Kısıtlanabilir marka yok (markalar DB’de değilse görünmez).</span>}
                    </div>
                  </div>

                  <div className={styles.field}>
                    <label>Yetkiler</label>
                    <label className={styles.checkboxRow}>
                      <input type="checkbox" checked={buffer.canDownloadReports} onChange={event => setBuffer({ ...buffer, canDownloadReports: event.target.checked })} />
                      Rapor indirme
                    </label>
                    <label className={styles.checkboxRow}>
                      <input type="checkbox" checked={buffer.canImportData} onChange={event => setBuffer({ ...buffer, canImportData: event.target.checked })} />
                      Data import
                    </label>
                    <label className={styles.checkboxRow}>
                      <input type="checkbox" checked={buffer.canAccessAdmin} onChange={event => setBuffer({ ...buffer, canAccessAdmin: event.target.checked })} />
                      Admin panel erişimi
                    </label>
                  </div>

                  <div className={styles.actions}>
                    <button type="button" className={styles.button} onClick={save} disabled={saving}>{saving ? 'Kaydediliyor…' : 'İzinleri kaydet'}</button>
                    <button type="button" className={styles.dangerButton} onClick={clearAll} disabled={saving}>Kısıtları temizle</button>
                  </div>

                  {note && <div className={styles.formHint}>{note}</div>}
                </div>
              )}
            </aside>
          </div>
        </div>
      </div>
    </div>
  )
}
