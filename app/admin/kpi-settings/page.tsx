'use client'

import { useEffect, useMemo, useState } from 'react'
import Topbar from '@/components/layout/Topbar'
import { createClient } from '@/lib/supabase/client'
import {
  type AdminCategoryDefinition,
  type AdminKpiDefinition,
  buildAuditDraft,
  deleteKpi,
  getFallbackCategories,
  getFallbackKpis,
  isPersistedId,
  loadAdminKpiConfig,
  saveKpi,
  setKpiActive,
  validateKpiDraft,
  writeAuditLog,
} from '@/lib/admin/kpi-management'
import styles from '@/components/admin/KpiManagement.module.css'

const emptyKpi: AdminKpiDefinition = {
  id: 'draft',
  kpiNo: 13,
  name: '',
  shortName: '',
  description: '',
  categoryKey: '',
  isActive: true,
  direction: 'higher_is_better',
  dataType: 'index',
  coverageRule: 'included',
  source: 'fallback',
}

function getNextKpiNo(kpis: AdminKpiDefinition[]) {
  return Math.max(0, ...kpis.map(kpi => kpi.kpiNo)) + 1
}

function confirmPermanentDelete(label: string, warning: string) {
  if (typeof window === 'undefined') return false

  const firstConfirm = window.confirm(`${label} kalıcı olarak silinecek. Bu işlem geri alınamaz.\n\n${warning}\n\nDevam edilsin mi?`)
  if (!firstConfirm) return false

  const typed = window.prompt('Kalıcı silmeyi onaylamak için büyük harflerle SIL yazın.')
  return typed === 'SIL'
}

export default function KpiSettingsAdminPage() {
  const supabase = useMemo(() => createClient(), [])
  const [kpis, setKpis] = useState<AdminKpiDefinition[]>(getFallbackKpis())
  const [categories, setCategories] = useState<AdminCategoryDefinition[]>(getFallbackCategories())
  const [source, setSource] = useState<'supabase' | 'fallback'>('fallback')
  const [warning, setWarning] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draft, setDraft] = useState<AdminKpiDefinition>({ ...emptyKpi, kpiNo: getNextKpiNo(getFallbackKpis()) })
  const [auditNote, setAuditNote] = useState('')
  const [dbError, setDbError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    loadAdminKpiConfig(supabase).then(config => {
      if (cancelled) return
      setKpis(config.kpis)
      setCategories(config.categories)
      setSource(config.source)
      setWarning(config.warning ?? '')
      setDraft(prev => ({ ...prev, kpiNo: getNextKpiNo(config.kpis), categoryKey: config.categories[0]?.key ?? '' }))
    })
    return () => { cancelled = true }
  }, [supabase])

  const categoryNameByKey = useMemo(() => {
    return new Map(categories.map(category => [category.key, category.name]))
  }, [categories])

  const validationErrors = useMemo(() => validateKpiDraft(draft, kpis, selectedId ?? undefined), [draft, kpis, selectedId])

  function resetForm() {
    setSelectedId(null)
    setDraft({ ...emptyKpi, id: 'draft', kpiNo: getNextKpiNo(kpis), categoryKey: categories[0]?.key ?? '' })
    setAuditNote('')
    setDbError('')
  }

  function editKpi(kpi: AdminKpiDefinition) {
    setSelectedId(kpi.id)
    setDraft({ ...kpi })
    setAuditNote('')
    setDbError('')
  }

  function upsertLocal(saved: AdminKpiDefinition) {
    setKpis(current => {
      const exists = current.some(item => item.id === saved.id)
      const next = exists
        ? current.map(item => item.id === saved.id ? saved : item)
        : [...current, saved]
      return next.sort((a, b) => a.kpiNo - b.kpiNo)
    })
  }

  async function saveDraft() {
    const errors = validateKpiDraft(draft, kpis, selectedId ?? undefined)
    if (errors.length) return
    setDbError('')

    const action = selectedId ? 'update' : 'create'

    if (source === 'supabase') {
      setSaving(true)
      const editing = Boolean(selectedId) && isPersistedId(selectedId as string)
      const { data, error } = await saveKpi(supabase, draft, editing)
      setSaving(false)
      if (error || !data) { setDbError(error ?? 'KPI kaydedilemedi.'); return }
      upsertLocal(data)
      setSelectedId(data.id)
      setDraft({ ...data })
      await writeAuditLog(supabase, buildAuditDraft('kpi_definition', data.id, action, {
        kpiNo: data.kpiNo, name: data.name, categoryKey: data.categoryKey, isActive: data.isActive,
      }))
      setAuditNote(`KPI ${data.kpiNo} ${action === 'create' ? 'eklendi' : 'güncellendi'} · Supabase'e yazıldı.`)
      return
    }

    // Fallback: DB kapalı/okunamıyor → sadece ekran state'i güncellenir.
    const entityId = selectedId ?? `local-kpi-${draft.kpiNo}-${Date.now()}`
    const nextDraft: AdminKpiDefinition = { ...draft, id: entityId, source: 'fallback' }
    upsertLocal(nextDraft)
    setSelectedId(entityId)
    setAuditNote('Fallback modunda: ekran güncellendi, DB yazımı yapılmadı (tablolar okunamadı).')
  }

  async function toggleActive(kpi: AdminKpiDefinition) {
    const nextActive = !kpi.isActive
    setDbError('')

    if (source === 'supabase' && isPersistedId(kpi.id)) {
      setSaving(true)
      const { data, error } = await setKpiActive(supabase, kpi.id, nextActive)
      setSaving(false)
      if (error || !data) { setDbError(error ?? 'Durum güncellenemedi.'); return }
      upsertLocal(data)
      setDraft(current => current.id === data.id ? data : current)
      await writeAuditLog(supabase, buildAuditDraft('kpi_definition', data.id, nextActive ? 'reactivate' : 'deactivate', {
        kpiNo: data.kpiNo, isActive: data.isActive,
      }))
      setAuditNote(`KPI ${data.kpiNo} ${nextActive ? 'aktifleştirildi' : 'pasifleştirildi'} · Supabase'e yazıldı.`)
      return
    }

    const next = { ...kpi, isActive: nextActive }
    setKpis(current => current.map(item => item.id === kpi.id ? next : item))
    setDraft(current => current.id === kpi.id ? next : current)
    setAuditNote('Fallback modunda: ekran güncellendi, DB yazımı yapılmadı.')
  }

  async function removeKpi(kpi: AdminKpiDefinition) {
    if (!confirmPermanentDelete(`KPI ${kpi.kpiNo}`, 'Bu KPI geçmiş raporlar, kategori ortalamaları ve metodoloji karşılaştırmalarında referans alınmış olabilir. Emin değilseniz önce Pasifleştir seçeneğini kullanın.')) return
    setDbError('')
    if (source === 'supabase' && isPersistedId(kpi.id)) {
      setSaving(true)
      const { error } = await deleteKpi(supabase, kpi.id)
      setSaving(false)
      if (error) { setDbError(error); return }
      await writeAuditLog(supabase, buildAuditDraft('kpi_definition', kpi.id, 'delete', { kpiNo: kpi.kpiNo, name: kpi.name, permanentDelete: true }))
    }
    setKpis(current => current.filter(item => item.id !== kpi.id))
    if (selectedId === kpi.id) resetForm()
    setAuditNote(`KPI ${kpi.kpiNo} kalıcı olarak silindi.`)
  }

  const activeCount = kpis.filter(kpi => kpi.isActive).length
  const lowerBetterCount = kpis.filter(kpi => kpi.direction === 'lower_is_better').length

  return (
    <div className={styles.shell}>
      <Topbar
        title="KPI Ayarları"
        subtitle="Super Admin KPI tanımı, kategori bağlantısı, aktif/pasif ve coverage yönetimi"
        pills={[{ label: source === 'supabase' ? 'Supabase' : 'Fallback config', variant: source === 'supabase' ? 'green' : 'amber' }]}
      />
      <div className={styles.content}>
        <div className={styles.inner}>
          <section className={styles.notice}>
            <div className={styles.noticeTitle}>Metodoloji uyarısı</div>
            <div className={styles.noticeText}>
              Bu ayarlar skor metodolojisini etkiler. Kaydet/Pasifleştir işlemleri Supabase’e yazılır ve audit_logs’a düşer; dinamik skor motoru (Prompt 9) henüz değiştirilmez.
            </div>
            {warning && <div className={styles.noticeText}>{warning}</div>}
          </section>

          <div className={styles.grid}>
            <section className={styles.card}>
              <div className={styles.toolbar}>
                <div>
                  <h2 className={styles.toolbarTitle}>KPI Listesi</h2>
                  <div className={styles.toolbarHint}>{kpis.length} KPI · {activeCount} aktif · {lowerBetterCount} düşük daha iyi</div>
                </div>
                <div className={styles.actions}>
                  <button type="button" className={styles.secondaryButton} onClick={resetForm}>Yeni KPI</button>
                </div>
              </div>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>No</th>
                      <th>KPI</th>
                      <th>Kategori</th>
                      <th>Yön</th>
                      <th>Coverage</th>
                      <th>Durum</th>
                      <th>İşlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kpis.map(kpi => (
                      <tr key={kpi.id}>
                        <td><strong>KPI {kpi.kpiNo}</strong></td>
                        <td>
                          <div>{kpi.name}</div>
                          <div className={`${styles.muted} ${styles.small}`}>{kpi.shortName} · <span className={styles.sourceBadge}>{kpi.source}</span></div>
                        </td>
                        <td>{categoryNameByKey.get(kpi.categoryKey) ?? kpi.categoryKey}</td>
                        <td>{kpi.direction === 'lower_is_better' ? 'Düşük daha iyi' : 'Yüksek daha iyi'}</td>
                        <td>{kpi.coverageRule}</td>
                        <td>
                          <span className={`${styles.status} ${kpi.isActive ? styles.statusActive : styles.statusPassive}`}>
                            {kpi.isActive ? 'Aktif' : 'Pasif'}
                          </span>
                        </td>
                        <td>
                          <div className={styles.actions}>
                            <button type="button" className={styles.secondaryButton} onClick={() => editKpi(kpi)}>Düzenle</button>
                            <button type="button" className={styles.dangerButton} onClick={() => toggleActive(kpi)} disabled={saving}>{kpi.isActive ? 'Pasifleştir' : 'Aktifleştir'}</button>
                            <button type="button" className={styles.dangerButton} onClick={() => removeKpi(kpi)} disabled={saving} title="Kalıcı sil">Sil</button>
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
                  <h2 className={styles.formTitle}>{selectedId ? 'KPI Düzenle' : 'Yeni KPI Ekle'}</h2>
                  <div className={styles.formHint}>Kaydet/Güncelle işlemleri Supabase’e yazılır. Silme kalıcıdır; metodoloji geçmişi için emin değilseniz Pasifleştir kullanın.</div>
                </div>

                {validationErrors.length > 0 && (
                  <div className={styles.errors}>{validationErrors.map(error => <div key={error}>{error}</div>)}</div>
                )}
                {dbError && <div className={styles.errors}>{dbError}</div>}

                <div className={styles.twoCols}>
                  <div className={styles.field}>
                    <label>KPI no</label>
                    <input className={styles.input} type="number" min={1} value={draft.kpiNo} onChange={event => setDraft({ ...draft, kpiNo: Number(event.target.value) })} />
                  </div>
                  <div className={styles.field}>
                    <label>Kısa ad</label>
                    <input className={styles.input} value={draft.shortName} onChange={event => setDraft({ ...draft, shortName: event.target.value })} placeholder="KPI 13" />
                  </div>
                </div>

                <div className={styles.field}>
                  <label>Ad</label>
                  <input className={styles.input} value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value })} placeholder="KPI adı" />
                </div>

                <div className={styles.field}>
                  <label>Açıklama</label>
                  <textarea className={styles.textarea} value={draft.description} onChange={event => setDraft({ ...draft, description: event.target.value })} placeholder="KPI metodoloji açıklaması" />
                </div>

                <div className={styles.field}>
                  <label>Kategori</label>
                  <select className={styles.select} value={draft.categoryKey} onChange={event => setDraft({ ...draft, categoryKey: event.target.value })}>
                    <option value="">Kategori seç</option>
                    {categories.filter(category => category.isActive).map(category => <option key={category.key} value={category.key}>{category.name}</option>)}
                  </select>
                </div>

                <div className={styles.twoCols}>
                  <div className={styles.field}>
                    <label>Hesap yönü</label>
                    <select className={styles.select} value={draft.direction} onChange={event => setDraft({ ...draft, direction: event.target.value === 'lower_is_better' ? 'lower_is_better' : 'higher_is_better' })}>
                      <option value="higher_is_better">Yüksek daha iyi</option>
                      <option value="lower_is_better">Düşük daha iyi</option>
                    </select>
                  </div>
                  <div className={styles.field}>
                    <label>Veri tipi</label>
                    <select className={styles.select} value={draft.dataType} onChange={event => setDraft({ ...draft, dataType: event.target.value as AdminKpiDefinition['dataType'] })}>
                      <option value="index">Endeks</option>
                      <option value="ratio">Rasyo</option>
                      <option value="percentage">Yüzde</option>
                      <option value="currency">Tutar</option>
                      <option value="duration">Süre</option>
                      <option value="count">Adet</option>
                    </select>
                  </div>
                </div>

                <div className={styles.field}>
                  <label>Coverage kuralı</label>
                  <select className={styles.select} value={draft.coverageRule} onChange={event => setDraft({ ...draft, coverageRule: event.target.value as AdminKpiDefinition['coverageRule'] })}>
                    <option value="included">Coverage dahil</option>
                    <option value="excluded_zero_variance">Zero-variance nedeniyle coverage dışı</option>
                    <option value="optional">Opsiyonel</option>
                    <option value="required">Zorunlu</option>
                  </select>
                </div>

                <label className={styles.checkboxRow}>
                  <input type="checkbox" checked={draft.isActive} onChange={event => setDraft({ ...draft, isActive: event.target.checked })} />
                  Aktif KPI
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
