'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Topbar from '@/components/layout/Topbar'
import { useAuth } from '@/context/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { KAT_YAPILAR, KPI_META, type CategoryKey } from '@/lib/kpi'
import {
  buildAuditDraft,
  buildFallbackCategories,
  parseSupabaseCategories,
  type ManagedCategoryDefinition,
} from '@/lib/admin/kpi-management'
import styles from '@/components/admin/KpiManagement.module.css'

type CategoryFormState = Omit<ManagedCategoryDefinition, 'id' | 'source'>

const emptyForm: CategoryFormState = {
  key: 'musteri',
  name: '',
  shortName: '',
  description: '',
  color: '#64748b',
  sortOrder: 1,
  isActive: true,
}

function toForm(category: ManagedCategoryDefinition): CategoryFormState {
  return {
    key: category.key,
    name: category.name,
    shortName: category.shortName,
    description: category.description,
    color: category.color,
    sortOrder: category.sortOrder,
    isActive: category.isActive,
  }
}

function kpiNamesForCategory(key: CategoryKey): string {
  const category = KAT_YAPILAR.find(item => item.key === key)
  if (!category) return 'Bağlı KPI yok'
  return category.kpis.map(index => KPI_META[index]?.ad ?? `KPI ${index + 1}`).join(', ')
}

export default function CategoriesAdminPage() {
  const router = useRouter()
  const { isSuperAdmin, loading } = useAuth()
  const [categories, setCategories] = useState<ManagedCategoryDefinition[]>(() => buildFallbackCategories())
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [form, setForm] = useState<CategoryFormState>(emptyForm)
  const [errors, setErrors] = useState<string[]>([])
  const [message, setMessage] = useState('')
  const [dataSource, setDataSource] = useState<'supabase' | 'fallback'>('fallback')

  useEffect(() => {
    if (!loading && !isSuperAdmin) router.replace('/dashboard')
  }, [isSuperAdmin, loading, router])

  useEffect(() => {
    let mounted = true
    const supabase = createClient()

    async function loadCategories() {
      const { data, error } = await supabase
        .from('kpi_categories')
        .select('*')
        .order('sort_order', { ascending: true })

      if (!mounted) return
      const parsed = !error ? parseSupabaseCategories(data as unknown) : []
      if (parsed.length > 0) {
        setCategories(parsed)
        setDataSource('supabase')
      } else {
        setCategories(buildFallbackCategories())
        setDataSource('fallback')
      }
    }

    loadCategories().catch(() => {
      if (!mounted) return
      setCategories(buildFallbackCategories())
      setDataSource('fallback')
    })

    return () => { mounted = false }
  }, [])

  const selected = useMemo(
    () => categories.find(category => category.id === selectedId) ?? null,
    [categories, selectedId]
  )
  const activeCount = categories.filter(category => category.isActive).length
  const linkedKpiCount = KAT_YAPILAR.reduce((sum, category) => sum + category.kpis.length, 0)

  function startCreate() {
    setSelectedId(null)
    setForm({ ...emptyForm, sortOrder: Math.max(0, ...categories.map(category => category.sortOrder)) + 1 })
    setErrors([])
    setMessage('Yeni kategori taslağı açıldı. Kaydetme ekran durumunu günceller; kalıcı DB yazımı migration sonrası bağlanacak.')
  }

  function startEdit(category: ManagedCategoryDefinition) {
    setSelectedId(category.id)
    setForm(toForm(category))
    setErrors([])
    setMessage('')
  }

  function validate(): string[] {
    const nextErrors: string[] = []
    if (!form.name.trim()) nextErrors.push('Kategori adı zorunludur.')
    if (!form.shortName.trim()) nextErrors.push('Kısa ad zorunludur.')
    if (!form.description.trim()) nextErrors.push('Açıklama zorunludur.')
    if (!/^#[0-9a-fA-F]{6}$/.test(form.color)) nextErrors.push('Renk #RRGGBB formatında olmalı.')
    if (!Number.isInteger(form.sortOrder) || form.sortOrder <= 0) nextErrors.push('Sıralama pozitif tam sayı olmalı.')

    const duplicate = categories.some(category => category.name.trim().toLocaleLowerCase('tr-TR') === form.name.trim().toLocaleLowerCase('tr-TR') && category.id !== selectedId)
    if (duplicate) nextErrors.push(`${form.name.trim()} adlı kategori zaten var.`)
    return nextErrors
  }

  function saveForm() {
    const nextErrors = validate()
    setErrors(nextErrors)
    if (nextErrors.length > 0) return

    const nowId = selectedId ?? `draft-category-${form.key}-${Date.now()}`
    const nextItem: ManagedCategoryDefinition = {
      id: nowId,
      ...form,
      name: form.name.trim(),
      shortName: form.shortName.trim(),
      description: form.description.trim(),
      color: form.color.trim(),
      source: dataSource,
    }

    setCategories(prev => {
      const exists = prev.some(category => category.id === nowId)
      const next = exists ? prev.map(category => category.id === nowId ? nextItem : category) : [...prev, nextItem]
      return next.sort((a, b) => a.sortOrder - b.sortOrder)
    })
    setSelectedId(nowId)
    buildAuditDraft({
      action: selectedId ? 'update' : 'create',
      entity: 'kpi_category',
      entityId: nowId,
      summary: `${form.name.trim()} kategorisi ${selectedId ? 'güncellendi' : 'oluşturuldu'}`,
    })
    setMessage('Kategori ekran durumunda kaydedildi. Silme yerine aktif/pasif yaklaşımı korunur; audit_logs TODO hazır.')
  }

  function deactivate(category: ManagedCategoryDefinition) {
    setCategories(prev => prev.map(item => item.id === category.id ? { ...item, isActive: false } : item))
    if (selectedId === category.id) setForm(prev => ({ ...prev, isActive: false }))
    buildAuditDraft({ action: 'deactivate', entity: 'kpi_category', entityId: category.id, summary: `${category.name} pasifleştirildi.` })
    setMessage(`${category.name} pasifleştirildi. Kalıcı silme yapılmadı.`)
  }

  if (loading) return <div className={styles.body}>Yetki kontrol ediliyor...</div>
  if (!isSuperAdmin) return <div className={styles.body}>Bu ekrana sadece Super Admin erişebilir.</div>

  return (
    <div className={styles.shell}>
      <Topbar
        title="Kategori Yönetimi"
        subtitle="Kategori listesi, açıklama, renk, sıralama ve aktif/pasif yönetimi"
        pills={[{ label: dataSource === 'supabase' ? 'Supabase kaynaklı' : 'Config fallback', variant: dataSource === 'supabase' ? 'green' : 'amber' }]}
        actions={<button className={`${styles.button} ${styles.buttonPrimary}`} onClick={startCreate} type="button">Yeni kategori</button>}
      />
      <main className={styles.body}>
        <div className={styles.inner}>
          <div className={styles.notice}>
            <strong>Metodoloji uyarısı:</strong> Kategori değişiklikleri skor metodolojisini etkiler. Prompt 4 kapsamında ağırlık editörü ve dinamik skor motoru değiştirilmedi; kategori CRUD altyapısı güvenli fallback ile hazırlandı.
          </div>

          <section className={styles.metricGrid}>
            <Metric label="Toplam kategori" value={categories.length} hint="Aktif ve pasif tanımlar" />
            <Metric label="Aktif kategori" value={activeCount} hint="Kullanılabilir kategori sayısı" />
            <Metric label="Bağlı KPI" value={linkedKpiCount} hint="Mevcut kategori matrisi" />
            <Metric label="Kaynak" value={dataSource === 'supabase' ? 'DB' : 'Config'} hint="Supabase yoksa fallback" />
          </section>

          <section className={styles.grid}>
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <h2 className={styles.cardTitle}>Kategori listesi</h2>
                  <p className={styles.cardSub}>Silme yerine pasifleştirme kullanılır. Renk, açıklama ve sıralama formdan yönetilir.</p>
                </div>
              </div>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr><th>Sıra</th><th>Kategori</th><th>Renk</th><th>Bağlı KPI</th><th>Durum</th><th>İşlem</th></tr>
                  </thead>
                  <tbody>
                    {categories.map(category => (
                      <tr key={category.id}>
                        <td><span className={styles.primaryText}>{category.sortOrder}</span></td>
                        <td>
                          <div className={styles.primaryText}>{category.name}</div>
                          <div className={styles.muted}>{category.shortName} · {category.description}</div>
                        </td>
                        <td><span className={styles.colorChip} style={{ background: category.color }} />{category.color}</td>
                        <td><div className={styles.muted}>{kpiNamesForCategory(category.key)}</div></td>
                        <td>
                          <span className={`${styles.badge} ${category.isActive ? styles.active : styles.passive}`}>{category.isActive ? 'Aktif' : 'Pasif'}</span>{' '}
                          <span className={`${styles.badge} ${category.source === 'supabase' ? styles.supabase : styles.fallback}`}>{category.source}</span>
                        </td>
                        <td>
                          <div className={styles.actions}>
                            <button className={styles.button} onClick={() => startEdit(category)} type="button">Düzenle</button>
                            <button className={`${styles.button} ${styles.buttonDanger}`} onClick={() => deactivate(category)} type="button" disabled={!category.isActive}>Pasifleştir</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <aside className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <h2 className={styles.cardTitle}>{selected ? `${selected.shortName} düzenle` : 'Kategori formu'}</h2>
                  <p className={styles.cardSub}>Ad, kısa ad, açıklama, renk, sıralama ve aktif/pasif.</p>
                </div>
              </div>
              <form className={styles.form} onSubmit={event => { event.preventDefault(); saveForm() }}>
                {errors.length > 0 && <div className={styles.errorBox}>{errors.map(error => <div key={error}>• {error}</div>)}</div>}
                {message && <div className={styles.successBox}>{message}</div>}

                <label className={styles.field}>
                  <span className={styles.label}>Kategori anahtarı</span>
                  <select className={styles.select} value={form.key} onChange={e => setForm(prev => ({ ...prev, key: e.target.value as CategoryKey }))}>
                    {KAT_YAPILAR.map(category => <option key={category.key} value={category.key}>{category.key}</option>)}
                  </select>
                </label>

                <div className={styles.twoFields}>
                  <label className={styles.field}>
                    <span className={styles.label}>Ad</span>
                    <input className={styles.input} value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} placeholder="Kategori adı" />
                  </label>
                  <label className={styles.field}>
                    <span className={styles.label}>Kısa ad</span>
                    <input className={styles.input} value={form.shortName} onChange={e => setForm(prev => ({ ...prev, shortName: e.target.value }))} placeholder="Kısa ad" />
                  </label>
                </div>

                <label className={styles.field}>
                  <span className={styles.label}>Açıklama</span>
                  <textarea className={styles.textarea} value={form.description} onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))} />
                </label>

                <div className={styles.twoFields}>
                  <label className={styles.field}>
                    <span className={styles.label}>Renk</span>
                    <input className={styles.input} value={form.color} onChange={e => setForm(prev => ({ ...prev, color: e.target.value }))} placeholder="#64748b" />
                  </label>
                  <label className={styles.field}>
                    <span className={styles.label}>Sıralama</span>
                    <input className={styles.input} type="number" min={1} value={form.sortOrder} onChange={e => setForm(prev => ({ ...prev, sortOrder: Number(e.target.value) }))} />
                  </label>
                </div>

                <label className={styles.checkRow}>
                  <input type="checkbox" checked={form.isActive} onChange={e => setForm(prev => ({ ...prev, isActive: e.target.checked }))} /> Aktif kategori
                </label>

                <button className={`${styles.button} ${styles.buttonPrimary}`} type="submit">Kaydet</button>
              </form>
            </aside>
          </section>
        </div>
      </main>
    </div>
  )
}

function Metric({ label, value, hint }: { label: string; value: string | number; hint: string }) {
  return <div className={styles.metric}><div className={styles.metricLabel}>{label}</div><div className={styles.metricValue}>{value}</div><div className={styles.metricHint}>{hint}</div></div>
}
