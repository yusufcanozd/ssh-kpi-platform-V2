'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Topbar from '@/components/layout/Topbar'
import { useAuth } from '@/context/AuthContext'
import { createClient } from '@/lib/supabase/client'
import {
  type AdminBrand,
  SEGMENT_OPTIONS,
  deleteBrand,
  getFallbackBrands,
  importFallbackBrands,
  isPersistedId,
  loadBrands,
  saveBrand,
  setBrandActive,
  slugifyBrandCode,
  validateBrand,
} from '@/lib/admin/brands-management'
import styles from '@/components/admin/KpiManagement.module.css'

const emptyBrand: AdminBrand = {
  id: 'draft',
  code: '',
  name: '',
  segment: SEGMENT_OPTIONS[0] ?? '',
  isActive: true,
  isHidden: false,
  dataSource: 'fallback',
  source: 'fallback',
}

function confirmPermanentDelete(label: string, warning: string) {
  if (typeof window === 'undefined') return false

  const firstConfirm = window.confirm(`${label} kalıcı olarak silinecek. Bu işlem geri alınamaz.\n\n${warning}\n\nDevam edilsin mi?`)
  if (!firstConfirm) return false

  const typed = window.prompt('Kalıcı silmeyi onaylamak için büyük harflerle SIL yazın.')
  return typed === 'SIL'
}

export default function BrandsAdminPage() {
  const router = useRouter()
  const { isSuperAdmin, loading } = useAuth()
  const supabase = useMemo(() => createClient(), [])

  const [brands, setBrands] = useState<AdminBrand[]>(() => getFallbackBrands())
  const [source, setSource] = useState<'supabase' | 'fallback'>('fallback')
  const [warning, setWarning] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draft, setDraft] = useState<AdminBrand>(emptyBrand)
  const [auditNote, setAuditNote] = useState('')
  const [dbError, setDbError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!loading && !isSuperAdmin) router.replace('/dashboard')
  }, [isSuperAdmin, loading, router])

  useEffect(() => {
    let cancelled = false
    loadBrands(supabase).then(result => {
      if (cancelled) return
      setBrands(result.brands)
      setSource(result.source)
      setWarning(result.warning ?? '')
    })
    return () => { cancelled = true }
  }, [supabase])

  const validationErrors = useMemo(() => validateBrand(draft, brands, selectedId ?? undefined), [draft, brands, selectedId])
  const activeCount = brands.filter(brand => brand.isActive).length
  const visibleCount = brands.filter(brand => brand.isActive && !brand.isHidden).length
  const privacyMasking = visibleCount >= 1 && visibleCount <= 3

  function resetForm() {
    setSelectedId(null)
    setDraft({ ...emptyBrand, segment: SEGMENT_OPTIONS[0] ?? '' })
    setAuditNote('')
    setDbError('')
  }

  function editBrand(brand: AdminBrand) {
    setSelectedId(brand.id)
    setDraft({ ...brand })
    setAuditNote('')
    setDbError('')
  }

  function updateName(name: string) {
    setDraft(current => ({
      ...current,
      name,
      code: selectedId ? current.code : slugifyBrandCode(name),
    }))
  }

  function upsertLocal(saved: AdminBrand) {
    setBrands(current => {
      const exists = current.some(item => item.id === saved.id)
      const next = exists ? current.map(item => item.id === saved.id ? saved : item) : [...current, saved]
      return next.sort((a, b) => a.name.localeCompare(b.name, 'tr-TR'))
    })
  }

  async function saveDraft() {
    if (validationErrors.length) return
    setDbError('')

    if (source === 'supabase') {
      setSaving(true)
      const editing = Boolean(selectedId) && isPersistedId(selectedId as string)
      const { data, error } = await saveBrand(supabase, { ...draft, dataSource: draft.dataSource }, editing)
      setSaving(false)
      if (error || !data) { setDbError(error ?? 'Marka kaydedilemedi.'); return }
      upsertLocal(data)
      setSelectedId(data.id)
      setDraft({ ...data })
      setAuditNote(`${data.name} ${editing ? 'güncellendi' : 'eklendi'} · Supabase'e yazıldı.`)
      return
    }

    setDbError('Markalar fallback modunda. Önce "Mevcut markaları içe aktar" ile brands tablosunu doldurun, sonra düzenleyin.')
  }

  async function toggleActive(brand: AdminBrand) {
    const nextActive = !brand.isActive
    setDbError('')
    if (source === 'supabase' && isPersistedId(brand.id)) {
      setSaving(true)
      const { data, error } = await setBrandActive(supabase, brand.id, nextActive)
      setSaving(false)
      if (error || !data) { setDbError(error ?? 'Durum güncellenemedi.'); return }
      upsertLocal(data)
      setDraft(current => current.id === data.id ? data : current)
      setAuditNote(`${data.name} ${nextActive ? 'aktifleştirildi' : 'pasifleştirildi'}.`)
      return
    }
    setDbError('Fallback modunda durum değiştirilemez. Önce içe aktarın.')
  }

  async function removeBrand(brand: AdminBrand) {
    if (!confirmPermanentDelete(`"${brand.name}" markası`, 'Bu marka geçmiş ranking, rule-of-3 gizlilik ve import eşleşmelerinde kullanılmış olabilir. Emin değilseniz önce Pasifleştir veya Gizli seçeneklerini kullanın.')) return
    setDbError('')
    if (source === 'supabase' && isPersistedId(brand.id)) {
      setSaving(true)
      const { error } = await deleteBrand(supabase, brand.id)
      setSaving(false)
      if (error) { setDbError(error); return }
    }
    setBrands(current => current.filter(item => item.id !== brand.id))
    if (selectedId === brand.id) resetForm()
    setAuditNote(`"${brand.name}" silindi.`)
  }

  async function handleImport() {
    setDbError('')
    setSaving(true)
    const { data, error } = await importFallbackBrands(supabase)
    setSaving(false)
    if (error) { setDbError(error); return }
    const reload = await loadBrands(supabase)
    setBrands(reload.brands)
    setSource(reload.source)
    setWarning(reload.warning ?? '')
    setAuditNote(`${data ?? 0} marka brands tablosuna aktarıldı.`)
  }

  if (loading) return <div className={styles.content}>Yetki kontrol ediliyor...</div>
  if (!isSuperAdmin) return <div className={styles.content}>Bu ekrana sadece Super Admin erişebilir.</div>

  return (
    <div className={styles.shell}>
      <Topbar
        title="Marka Yönetimi"
        subtitle="Marka ekleme/düzenleme, segment, gizlilik ve aktif/pasif yönetimi"
        pills={[{ label: source === 'supabase' ? 'Supabase' : 'Fallback (marka_scores)', variant: source === 'supabase' ? 'green' : 'amber' }]}
      />
      <div className={styles.content}>
        <div className={styles.inner}>
          <section className={styles.notice}>
            <div className={styles.noticeTitle}>Gizlilik kuralı (rule of 3)</div>
            <div className={styles.noticeText}>
              Görünür (aktif ve gizli olmayan) marka sayısı 1-3 ise dashboard maskeleme uygular. Şu an görünür marka: <strong>{visibleCount}</strong>{privacyMasking ? ' — maskeleme aktif.' : '.'} Kalıcı silme açıktır; emin değilseniz pasifleştirme veya gizleme kullanın.
            </div>
            {warning && <div className={styles.noticeText}>{warning}</div>}
          </section>

          <div className={styles.grid}>
            <section className={styles.card}>
              <div className={styles.toolbar}>
                <div>
                  <h2 className={styles.toolbarTitle}>Marka Listesi</h2>
                  <div className={styles.toolbarHint}>{brands.length} marka · {activeCount} aktif · {visibleCount} görünür</div>
                </div>
                <div className={styles.actions}>
                  {source === 'fallback' && (
                    <button type="button" className={styles.button} onClick={handleImport} disabled={saving}>{saving ? 'Aktarılıyor…' : 'Mevcut markaları içe aktar'}</button>
                  )}
                  <button type="button" className={styles.secondaryButton} onClick={resetForm}>Yeni marka</button>
                </div>
              </div>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Kod</th>
                      <th>Marka</th>
                      <th>Segment</th>
                      <th>Gizlilik</th>
                      <th>Durum</th>
                      <th>İşlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {brands.map(brand => (
                      <tr key={brand.id}>
                        <td><strong>{brand.code}</strong></td>
                        <td>
                          <div>{brand.name}</div>
                          <div className={`${styles.muted} ${styles.small}`}><span className={styles.sourceBadge}>{brand.source === 'supabase' ? 'SUPABASE' : 'FALLBACK'}</span></div>
                        </td>
                        <td>{brand.segment || '—'}</td>
                        <td>
                          <span className={`${styles.status} ${brand.isHidden ? styles.statusPassive : styles.statusActive}`}>
                            {brand.isHidden ? 'Gizli' : 'Görünür'}
                          </span>
                        </td>
                        <td>
                          <span className={`${styles.status} ${brand.isActive ? styles.statusActive : styles.statusPassive}`}>
                            {brand.isActive ? 'Aktif' : 'Pasif'}
                          </span>
                        </td>
                        <td>
                          <div className={styles.actions}>
                            <button type="button" className={styles.secondaryButton} onClick={() => editBrand(brand)}>Düzenle</button>
                            <button type="button" className={styles.dangerButton} onClick={() => toggleActive(brand)} disabled={saving}>{brand.isActive ? 'Pasifleştir' : 'Aktifleştir'}</button>
                            <button type="button" className={styles.dangerButton} onClick={() => removeBrand(brand)} disabled={saving} title="Kalıcı sil">Sil</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <aside className={styles.card}>
              <form className={styles.form} onSubmit={event => { event.preventDefault(); saveDraft() }}>
                <div>
                  <h2 className={styles.formTitle}>{selectedId ? 'Marka Düzenle' : 'Yeni Marka Ekle'}</h2>
                  <div className={styles.formHint}>Kaydet işlemi Supabase brands tablosuna yazılır. Gizli markalar dashboard’da maskelenir; Sil işlemi kalıcıdır ve audit_logs&apos;a yazılır.</div>
                </div>

                {validationErrors.length > 0 && (
                  <div className={styles.errors}>{validationErrors.map(error => <div key={error}>{error}</div>)}</div>
                )}
                {dbError && <div className={styles.errors}>{dbError}</div>}

                <div className={styles.field}>
                  <label>Marka adı</label>
                  <input className={styles.input} value={draft.name} onChange={event => updateName(event.target.value)} placeholder="Marka adı" />
                </div>

                <div className={styles.twoCols}>
                  <div className={styles.field}>
                    <label>Marka kodu</label>
                    <input className={styles.input} value={draft.code} onChange={event => setDraft({ ...draft, code: slugifyBrandCode(event.target.value) })} placeholder="MARKA-KODU" />
                  </div>
                  <div className={styles.field}>
                    <label>Segment</label>
                    <select className={styles.select} value={draft.segment} onChange={event => setDraft({ ...draft, segment: event.target.value })}>
                      <option value="">Segment seç</option>
                      {SEGMENT_OPTIONS.map(segment => <option key={segment} value={segment}>{segment}</option>)}
                    </select>
                  </div>
                </div>

                <label className={styles.checkboxRow}>
                  <input type="checkbox" checked={draft.isActive} onChange={event => setDraft({ ...draft, isActive: event.target.checked })} />
                  Aktif marka
                </label>
                <label className={styles.checkboxRow}>
                  <input type="checkbox" checked={draft.isHidden} onChange={event => setDraft({ ...draft, isHidden: event.target.checked })} />
                  Gizli (dashboard’da maskele)
                </label>

                <div className={styles.actions}>
                  <button type="submit" className={styles.button} disabled={validationErrors.length > 0 || saving}>{saving ? 'Kaydediliyor…' : (selectedId ? 'Güncelle' : 'Ekle')}</button>
                  <button type="button" className={styles.secondaryButton} onClick={resetForm}>Temizle</button>
                </div>

                {auditNote && <div className={styles.formHint}>{auditNote}</div>}
              </form>
            </aside>
          </div>
        </div>
      </div>
    </div>
  )
}
