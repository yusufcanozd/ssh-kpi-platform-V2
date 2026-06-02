'use client'

import { useEffect, useMemo, useState } from 'react'
import Topbar from '@/components/layout/Topbar'
import { createClient } from '@/lib/supabase/client'
import {
  type AdminCategoryDefinition,
  type AdminKpiDefinition,
  buildAuditDraft,
  getFallbackCategories,
  getFallbackKpis,
  loadAdminKpiConfig,
  validateCategoryDraft,
} from '@/lib/admin/kpi-management'
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

export default function CategoriesAdminPage() {
  const [categories, setCategories] = useState<AdminCategoryDefinition[]>(getFallbackCategories())
  const [kpis, setKpis] = useState<AdminKpiDefinition[]>(getFallbackKpis())
  const [source, setSource] = useState<'supabase' | 'fallback'>('fallback')
  const [warning, setWarning] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draft, setDraft] = useState<AdminCategoryDefinition>({ ...emptyCategory, sortOrder: getNextSortOrder(getFallbackCategories()) })
  const [auditNote, setAuditNote] = useState('')

  useEffect(() => {
    let cancelled = false
    const supabase = createClient()
    loadAdminKpiConfig(supabase).then(config => {
      if (cancelled) return
      setCategories(config.categories)
      setKpis(config.kpis)
      setSource(config.source)
      setWarning(config.warning ?? '')
      setDraft(prev => ({ ...prev, sortOrder: getNextSortOrder(config.categories) }))
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
  }

  function editCategory(category: AdminCategoryDefinition) {
    setSelectedId(category.id)
    setDraft({ ...category })
    setAuditNote('')
  }

  function updateName(name: string) {
    setDraft(current => ({
      ...current,
      name,
      key: selectedId ? current.key : slugify(name),
      shortName: current.shortName || name,
    }))
  }

  function saveDraft() {
    const errors = validateCategoryDraft(draft, categories, selectedId ?? undefined)
    if (errors.length) return

    const action = selectedId ? 'update' : 'create'
    const entityId = selectedId ?? `local-category-${draft.key}-${Date.now()}`
    const nextDraft: AdminCategoryDefinition = {
      ...draft,
      id: entityId,
      source: source === 'supabase' ? 'supabase' : 'fallback',
    }

    setCategories(current => {
      if (selectedId) return current.map(item => item.id === selectedId ? nextDraft : item).sort((a, b) => a.sortOrder - b.sortOrder)
      return [...current, nextDraft].sort((a, b) => a.sortOrder - b.sortOrder)
    })

    const auditDraft = buildAuditDraft('kpi_category', entityId, action, {
      key: nextDraft.key,
      name: nextDraft.name,
      sortOrder: nextDraft.sortOrder,
      isActive: nextDraft.isActive,
    })
    setAuditNote(`${auditDraft.action} audit taslağı hazırlandı · ${auditDraft.note}`)
    setSelectedId(entityId)
  }

  function toggleActive(category: AdminCategoryDefinition) {
    const next = { ...category, isActive: !category.isActive }
    setCategories(current => current.map(item => item.id === category.id ? next : item))
    setDraft(current => current.id === category.id ? next : current)
    const auditDraft = buildAuditDraft('kpi_category', category.id, next.isActive ? 'reactivate' : 'deactivate', {
      key: category.key,
      isActive: next.isActive,
    })
    setAuditNote(`${auditDraft.action} audit taslağı hazırlandı · ${auditDraft.note}`)
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
              Kategori değişiklikleri skor metodolojisini ve executive rapor yorumunu etkiler. Prompt 4 kapsamında skor motoru değiştirilmez; silme yerine pasifleştirme kullanılır.
            </div>
            {warning && <div className={styles.noticeText}>{warning}</div>}
          </section>

          <div className={styles.grid}>
            <section className={styles.card}>
              <div className={styles.toolbar}>
                <div>
                  <h2 className={styles.toolbarTitle}>Kategori Listesi</h2>
                  <div className={styles.toolbarHint}>{categories.length} kategori · {activeCount} aktif · KPI bağlantıları fallback/dinamik tanımdan okunur</div>
                </div>
                <div className={styles.actions}>
                  <button type="button" className={styles.secondaryButton} onClick={resetForm}>Yeni kategori</button>
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
                          <div>{category.name}</div>
                          <div className={`${styles.muted} ${styles.small}`}>{category.key} · <span className={styles.sourceBadge}>{category.source}</span></div>
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
                            <button type="button" className={styles.dangerButton} onClick={() => toggleActive(category)}>{category.isActive ? 'Pasifleştir' : 'Aktifleştir'}</button>
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
                  <h2 className={styles.formTitle}>{selectedId ? 'Kategori Düzenle' : 'Yeni Kategori Ekle'}</h2>
                  <div className={styles.formHint}>Kategori silinmez; dashboard ve geçmiş rapor bütünlüğü için pasifleştirme uygulanır.</div>
                </div>

                {validationErrors.length > 0 && (
                  <div className={styles.errors}>{validationErrors.map(error => <div key={error}>{error}</div>)}</div>
                )}

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

                <div className={styles.actions}>
                  <button type="submit" className={styles.button} disabled={validationErrors.length > 0}>{selectedId ? 'Güncelle' : 'Ekle'}</button>
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
