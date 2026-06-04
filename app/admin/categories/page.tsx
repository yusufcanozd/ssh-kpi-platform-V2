'use client'

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import Topbar from '@/components/layout/Topbar'
import { createClient } from '@/lib/supabase/client'
import {
  type AdminCategoryDefinition,
  type AdminKpiDefinition,
  buildAuditDraft,
  deleteCategory,
  getFallbackCategories,
  getFallbackKpis,
  isPersistedId,
  loadAdminKpiConfig,
  saveCategory,
  setCategoryActive,
  validateCategoryDraft,
  writeAuditLog,
} from '@/lib/admin/kpi-management'
import {
  type CategoryBulkImportPreview,
  parseCategoryBulkImportFile,
  upsertCategoryDefinitionsFromPreview,
  exportCategoryDefinitionsToExcel,
} from '@/lib/admin/category-bulk-import'
import { currentUserIsSuperadmin } from '@/lib/admin/kpi-bulk-import'
import styles from '@/components/admin/KpiManagement.module.css'

const emptyCategory: AdminCategoryDefinition = {
  id: 'draft',
  key: '',
  name: '',
  shortName: '',
  description: '',
  color: '#64748b',
  sortOrder: 1,
  isActive: true,
  source: 'fallback',
}

function slugify(value: string) {
  return value
    .toLocaleLowerCase('tr-TR')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function getNextSortOrder(categories: AdminCategoryDefinition[]) {
  return Math.max(0, ...categories.map(category => category.sortOrder)) + 1
}

function confirmPermanentDelete(label: string, warning: string) {
  if (typeof window === 'undefined') return false

  const firstConfirm = window.confirm(`${label} kalıcı olarak silinecek. Bu işlem geri alınamaz.\n\n${warning}\n\nDevam edilsin mi?`)
  if (!firstConfirm) return false

  const typed = window.prompt('Kalıcı silmeyi onaylamak için büyük harflerle SIL yazın.')
  return typed === 'SIL'
}

export default function CategoriesAdminPage() {
  const supabase = useMemo(() => createClient(), [])
  const [categories, setCategories] = useState<AdminCategoryDefinition[]>(getFallbackCategories())
  const [kpis, setKpis] = useState<AdminKpiDefinition[]>(getFallbackKpis())
  const [source, setSource] = useState<'supabase' | 'fallback'>('fallback')
  const [warning, setWarning] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draft, setDraft] = useState<AdminCategoryDefinition>({ ...emptyCategory, sortOrder: getNextSortOrder(getFallbackCategories()) })
  const [auditNote, setAuditNote] = useState('')
  const [dbError, setDbError] = useState('')
  const [saving, setSaving] = useState(false)
  const [isSuperadmin, setIsSuperadmin] = useState(false)
  const [bulkPreview, setBulkPreview] = useState<CategoryBulkImportPreview | null>(null)
  const [bulkMessage, setBulkMessage] = useState('')
  const [bulkError, setBulkError] = useState('')
  const [bulkBusy, setBulkBusy] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    let cancelled = false
    loadAdminKpiConfig(supabase).then(config => {
      if (cancelled) return
      setCategories(config.categories)
      setKpis(config.kpis)
      setSource(config.source)
      setWarning(config.warning ?? '')
      setDraft(prev => ({ ...prev, sortOrder: getNextSortOrder(config.categories) }))
    })
    return () => { cancelled = true }
  }, [supabase])

  useEffect(() => {
    let cancelled = false
    currentUserIsSuperadmin().then(allowed => {
      if (!cancelled) setIsSuperadmin(allowed)
    })
    return () => { cancelled = true }
  }, [])

  const kpiCountByCategory = useMemo(() => {
    const counts = new Map<string, number>()
    kpis.forEach(kpi => counts.set(kpi.categoryKey, (counts.get(kpi.categoryKey) ?? 0) + 1))
    return counts
  }, [kpis])

  const validationErrors = useMemo(() => validateCategoryDraft(draft, categories, selectedId ?? undefined), [categories, draft, selectedId])

  function resetForm() {
    setSelectedId(null)
    setDraft({ ...emptyCategory, sortOrder: getNextSortOrder(categories) })
    setAuditNote('')
    setDbError('')
  }

  function editCategory(category: AdminCategoryDefinition) {
    setSelectedId(category.id)
    setDraft({ ...category })
    setAuditNote('')
    setDbError('')
  }

  function updateName(name: string) {
    setDraft(current => ({
      ...current,
      name,
      key: selectedId ? current.key : slugify(name),
      shortName: current.shortName || name,
    }))
  }

  function upsertLocal(saved: AdminCategoryDefinition) {
    setCategories(current => {
      const exists = current.some(item => item.id === saved.id)
      const next = exists
        ? current.map(item => item.id === saved.id ? saved : item)
        : [...current, saved]
      return next.sort((a, b) => a.sortOrder - b.sortOrder)
    })
  }

  async function saveDraft() {
    const errors = validateCategoryDraft(draft, categories, selectedId ?? undefined)
    if (errors.length) return
    setDbError('')

    const action = selectedId ? 'update' : 'create'

    if (source === 'supabase') {
      setSaving(true)
      const editing = Boolean(selectedId) && isPersistedId(selectedId as string)
      const { data, error } = await saveCategory(supabase, draft, editing)
      setSaving(false)
      if (error || !data) { setDbError(error ?? 'Kategori kaydedilemedi.'); return }
      upsertLocal(data)
      setSelectedId(data.id)
      setDraft({ ...data })
      await writeAuditLog(supabase, buildAuditDraft('kpi_category', data.id, action, {
        key: data.key, name: data.name, sortOrder: data.sortOrder, isActive: data.isActive,
      }))
      setAuditNote(`${data.name} ${action === 'create' ? 'eklendi' : 'güncellendi'} · Supabase'e yazıldı.`)
      return
    }

    const entityId = selectedId ?? `local-category-${draft.key}-${Date.now()}`
    const nextDraft: AdminCategoryDefinition = { ...draft, id: entityId, source: 'fallback' }
    upsertLocal(nextDraft)
    setSelectedId(entityId)
    setAuditNote('Fallback modunda: ekran güncellendi, DB yazımı yapılmadı (tablolar okunamadı).')
  }

  async function toggleActive(category: AdminCategoryDefinition) {
    const nextActive = !category.isActive
    setDbError('')

    if (source === 'supabase' && isPersistedId(category.id)) {
      setSaving(true)
      const { data, error } = await setCategoryActive(supabase, category.id, nextActive)
      setSaving(false)
      if (error || !data) { setDbError(error ?? 'Durum güncellenemedi.'); return }
      upsertLocal(data)
      setDraft(current => current.id === data.id ? data : current)
      await writeAuditLog(supabase, buildAuditDraft('kpi_category', data.id, nextActive ? 'reactivate' : 'deactivate', {
        key: data.key, isActive: data.isActive,
      }))
      setAuditNote(`${data.name} ${nextActive ? 'aktifleştirildi' : 'pasifleştirildi'} · Supabase'e yazıldı.`)
      return
    }

    const next = { ...category, isActive: nextActive }
    setCategories(current => current.map(item => item.id === category.id ? next : item))
    setDraft(current => current.id === category.id ? next : current)
    setAuditNote('Fallback modunda: ekran güncellendi, DB yazımı yapılmadı.')
  }

  async function removeCategory(category: AdminCategoryDefinition) {
    if (!confirmPermanentDelete(`"${category.name}" kategorisi`, 'Bu kategoriye bağlı KPI varsa Supabase silmeyi engelleyebilir. Dashboard ve geçmiş rapor bütünlüğü için emin değilseniz önce Pasifleştir seçeneğini kullanın.')) return
    setDbError('')
    if (source === 'supabase' && isPersistedId(category.id)) {
      setSaving(true)
      const { error } = await deleteCategory(supabase, category.id)
      setSaving(false)
      if (error) { setDbError(error); return }
      await writeAuditLog(supabase, buildAuditDraft('kpi_category', category.id, 'delete', { key: category.key, name: category.name, permanentDelete: true }))
    }
    setCategories(current => current.filter(item => item.id !== category.id))
    if (selectedId === category.id) resetForm()
    setAuditNote(`"${category.name}" kategorisi kalıcı olarak silindi.`)
  }

  async function handleBulkFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    setBulkMessage('')
    setBulkError('')
    setBulkPreview(null)
    if (!file) return

    setBulkBusy(true)
    try {
      const preview = await parseCategoryBulkImportFile(file, categories)
      setBulkPreview(preview)
      setBulkMessage(`${preview.fileName}: ${preview.validRows} geçerli, ${preview.errorRows} hatalı satır bulundu.`)
    } catch (error) {
      setBulkError(error instanceof Error ? error.message : 'Excel dosyası okunamadı.')
    } finally {
      setBulkBusy(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function commitBulkImport() {
    if (!bulkPreview) return
    setBulkBusy(true)
    setBulkError('')
    setBulkMessage('')
    try {
      const saved = await upsertCategoryDefinitionsFromPreview(bulkPreview)
      setCategories(current => {
        const byKey = new Map(current.map(category => [category.key, category]))
        saved.forEach(category => byKey.set(category.key, category))
        return Array.from(byKey.values()).sort((a, b) => a.sortOrder - b.sortOrder)
      })
      setBulkMessage(`${saved.length} kategori Supabase'e yazıldı/güncellendi.`)
      setBulkPreview(null)
    } catch (error) {
      setBulkError(error instanceof Error ? error.message : 'Toplu kategori import başarısız oldu.')
    } finally {
      setBulkBusy(false)
    }
  }

  async function downloadCategoryExport() {
    setBulkBusy(true)
    setBulkError('')
    setBulkMessage('')
    try {
      const file = await exportCategoryDefinitionsToExcel()
      const byteCharacters = atob(file.content)
      const bytes = new Uint8Array(byteCharacters.length)
      for (let index = 0; index < byteCharacters.length; index += 1) {
        bytes[index] = byteCharacters.charCodeAt(index)
      }
      const blob = new Blob([bytes], { type: file.mimeType })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = file.fileName
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
      setBulkMessage(`${file.rowCount} kategori Excel olarak indirildi.`)
    } catch (error) {
      setBulkError(error instanceof Error ? error.message : 'Kategori export başarısız oldu.')
    } finally {
      setBulkBusy(false)
    }
  }

  const activeCount = categories.filter(category => category.isActive).length

  return (
    <div className={styles.shell}>
      <Topbar
        title="Kategori Yönetimi"
        subtitle="Super Admin kategori adı, kısa adı, renk, sıralama ve aktif/pasif yönetimi"
        pills={[{ label: source === 'supabase' ? 'Supabase' : 'Fallback config', variant: source === 'supabase' ? 'green' : 'amber' }]}
      />
      <div className={styles.content}>
        <div className={styles.inner}>
          <section className={styles.notice}>
            <div className={styles.noticeTitle}>Metodoloji uyarısı</div>
            <div className={styles.noticeText}>
              Kategori değişiklikleri skor metodolojisini ve executive rapor yorumunu etkiler. Kaydet/Pasifleştir/Sil Supabase’e yazılır; silme kalıcıdır ve bağlı KPI varsa engellenebilir.
            </div>
            {warning && <div className={styles.noticeText}>{warning}</div>}
          </section>

          <section className={`${styles.card} ${styles.formCard}`}>
            <form className={styles.form} onSubmit={event => { event.preventDefault(); saveDraft() }}>
              <div className={styles.formHeader}>
                <div>
                  <h2 className={styles.formTitle}>{selectedId ? 'Kategori Düzenle' : 'Yeni Kategori Ekle'}</h2>
                  <div className={styles.formHint}>Kaydet/Güncelle Supabase’e yazılır. Silme kalıcıdır; emin değilseniz pasifleştirme kullanın.</div>
                </div>
                <button type="button" className={styles.secondaryButton} onClick={resetForm}>Yeni kategori</button>
              </div>

              {validationErrors.length > 0 && (
                <div className={styles.errors}>{validationErrors.map(error => <div key={error}>{error}</div>)}</div>
              )}
              {dbError && <div className={styles.errors}>{dbError}</div>}

              <div className={styles.formGrid}>
                <div className={styles.field}>
                  <label>Ad</label>
                  <input className={styles.input} value={draft.name} onChange={event => updateName(event.target.value)} placeholder="Kategori adı" />
                </div>

                <div className={styles.twoCols}>
                  <div className={styles.field}>
                    <label>Kısa ad</label>
                    <input className={styles.input} value={draft.shortName} onChange={event => setDraft({ ...draft, shortName: event.target.value })} placeholder="Kısa ad" />
                  </div>
                  <div className={styles.field}>
                    <label>Anahtar</label>
                    <input className={styles.input} value={draft.key} onChange={event => setDraft({ ...draft, key: slugify(event.target.value) })} placeholder="kategori-key" />
                  </div>
                </div>

                <div className={styles.field}>
                  <label>Açıklama</label>
                  <textarea className={styles.textarea} value={draft.description} onChange={event => setDraft({ ...draft, description: event.target.value })} placeholder="Kategori metodoloji açıklaması" />
                </div>

                <div className={styles.twoCols}>
                  <div className={styles.field}>
                    <label>Renk</label>
                    <input className={styles.input} type="color" value={draft.color} onChange={event => setDraft({ ...draft, color: event.target.value })} />
                  </div>
                  <div className={styles.field}>
                    <label>Sıralama</label>
                    <input className={styles.input} type="number" min={1} value={draft.sortOrder} onChange={event => setDraft({ ...draft, sortOrder: Number(event.target.value) })} />
                  </div>
                </div>

                <label className={styles.checkboxRow}>
                  <input type="checkbox" checked={draft.isActive} onChange={event => setDraft({ ...draft, isActive: event.target.checked })} />
                  Aktif kategori
                </label>
              </div>

              <div className={styles.actions}>
                <button type="submit" className={styles.button} disabled={validationErrors.length > 0 || saving}>{saving ? 'Kaydediliyor…' : (selectedId ? 'Güncelle' : 'Ekle')}</button>
                <button type="button" className={styles.secondaryButton} onClick={resetForm}>Temizle</button>
              </div>

              {auditNote && <div className={styles.formHint}>{auditNote}</div>}
            </form>
          </section>

          <section className={`${styles.card} ${styles.bulkCard}`}>
            <div className={styles.toolbar}>
              <div>
                <h2 className={styles.toolbarTitle}>Excel ile Toplu Kategori</h2>
                <div className={styles.toolbarHint}>
                  .xlsx/.xls dosyasında key, ad, kısa ad, renk, sıra ve aktif kolonlarını önizleyip geçerli satırları Supabase’e yazın. Anahtar yalnızca musteri, ticari, operasyonel, bayi, kapsam olabilir.
                </div>
              </div>
              <div className={styles.actions}>
                <input
                  ref={fileInputRef}
                  className={styles.hiddenFileInput}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleBulkFileChange}
                />
                <button type="button" className={styles.secondaryButton} onClick={() => fileInputRef.current?.click()} disabled={bulkBusy}>Excel Seç</button>
                {isSuperadmin && (
                  <button type="button" className={styles.secondaryButton} onClick={downloadCategoryExport} disabled={bulkBusy}>Excel Export</button>
                )}
              </div>
            </div>

            {!isSuperadmin && (
              <div className={styles.inlineNotice}>Excel export ve commit işlemleri yalnızca aktif super-admin kullanıcıya açıktır.</div>
            )}
            {bulkError && <div className={styles.errors}>{bulkError}</div>}
            {bulkMessage && <div className={styles.successBox}>{bulkMessage}</div>}

            {bulkPreview && (
              <div className={styles.bulkPreview}>
                <div className={styles.bulkSummary}>
                  <strong>{bulkPreview.totalRows}</strong> satır · <strong>{bulkPreview.validRows}</strong> geçerli · <strong>{bulkPreview.errorRows}</strong> hatalı
                </div>
                {bulkPreview.issues.length > 0 && (
                  <div className={styles.issueList}>
                    {bulkPreview.issues.slice(0, 12).map((issue, index) => (
                      <div key={`${issue.rowNumber}-${issue.message}-${index}`} className={issue.severity === 'error' ? styles.issueError : styles.issueWarning}>
                        Satır {issue.rowNumber}: {issue.message}
                      </div>
                    ))}
                    {bulkPreview.issues.length > 12 && (
                      <div className={styles.formHint}>+{bulkPreview.issues.length - 12} ek uyarı/hata daha var.</div>
                    )}
                  </div>
                )}
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Satır</th>
                        <th>Anahtar</th>
                        <th>Ad</th>
                        <th>Renk</th>
                        <th>Sıra</th>
                        <th>Aktif</th>
                        <th>Durum</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bulkPreview.rows.slice(0, 10).map(row => (
                        <tr key={row.rowNumber}>
                          <td>{row.rowNumber}</td>
                          <td>{row.category.key || '—'}</td>
                          <td>{row.category.name || '—'}</td>
                          <td><span className={styles.colorDot} style={{ background: row.category.color }} />{row.category.color}</td>
                          <td>{row.category.sortOrder}</td>
                          <td>{row.category.isActive ? 'Aktif' : 'Pasif'}</td>
                          <td>
                            <span className={`${styles.status} ${row.status === 'valid' ? styles.statusActive : styles.statusPassive}`}>
                              {row.status === 'valid' ? 'Geçerli' : 'Hatalı'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className={styles.formFooter}>
                  <div className={styles.formHint}>Önizlemede ilk 10 satır gösterilir. Commit yalnızca geçerli satırları yazar.</div>
                  <button type="button" className={styles.button} onClick={commitBulkImport} disabled={bulkBusy || bulkPreview.validRows === 0}>
                    Geçerli Satırları İçe Aktar
                  </button>
                </div>
              </div>
            )}
          </section>

          <section className={styles.card}>
            <div className={styles.toolbar}>
              <div>
                <h2 className={styles.toolbarTitle}>Kategori Listesi</h2>
                <div className={styles.toolbarHint}>{categories.length} kategori · {activeCount} aktif · KPI bağlantıları dinamik tanımdan okunur</div>
              </div>
            </div>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Sıra</th>
                    <th>Kategori</th>
                    <th>Kısa ad</th>
                    <th>Renk</th>
                    <th>KPI</th>
                    <th>Durum</th>
                    <th>İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map(category => (
                    <tr key={category.id}>
                      <td><strong>{category.sortOrder}</strong></td>
                      <td>
                        <div className={styles.kpiNameLine}>
                          <span>{category.name}</span>
                          <span className={styles.shortName}>{category.key}</span>
                          <span className={styles.sourceBadge}>{category.source}</span>
                        </div>
                      </td>
                      <td>{category.shortName}</td>
                      <td><span className={styles.colorDot} style={{ background: category.color }} />{category.color}</td>
                      <td>{kpiCountByCategory.get(category.key) ?? 0}</td>
                      <td>
                        <span className={`${styles.status} ${category.isActive ? styles.statusActive : styles.statusPassive}`}>
                          {category.isActive ? 'Aktif' : 'Pasif'}
                        </span>
                      </td>
                      <td>
                        <div className={styles.actions}>
                          <button type="button" className={styles.secondaryButton} onClick={() => editCategory(category)}>Düzenle</button>
                          <button type="button" className={styles.dangerButton} onClick={() => toggleActive(category)} disabled={saving}>{category.isActive ? 'Pasifleştir' : 'Aktifleştir'}</button>
                          <button type="button" className={styles.dangerButton} onClick={() => removeCategory(category)} disabled={saving} title="Kalıcı sil">Sil</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
