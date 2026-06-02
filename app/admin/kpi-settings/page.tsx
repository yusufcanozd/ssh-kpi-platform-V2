'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Topbar from '@/components/layout/Topbar'
import { useAuth } from '@/context/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { CATEGORY_SHORT_NAMES, KAT_YAPILAR } from '@/lib/kpi'
import {
  KPI_DATA_TYPE_OPTIONS,
  buildAuditDraft,
  buildFallbackKpis,
  parseSupabaseKpis,
  type KpiDataType,
  type KpiDirection,
  type ManagedKpiDefinition,
} from '@/lib/admin/kpi-management'
import styles from '@/components/admin/KpiManagement.module.css'

type KpiFormState = Omit<ManagedKpiDefinition, 'id' | 'source'>

const emptyForm: KpiFormState = {
  no: 1,
  name: '',
  shortName: '',
  description: '',
  categoryKey: 'musteri',
  isActive: true,
  direction: 'higher_is_better',
  dataType: 'index',
  coverageRule: '',
}

function toForm(kpi: ManagedKpiDefinition): KpiFormState {
  return {
    no: kpi.no,
    name: kpi.name,
    shortName: kpi.shortName,
    description: kpi.description,
    categoryKey: kpi.categoryKey,
    isActive: kpi.isActive,
    direction: kpi.direction,
    dataType: kpi.dataType,
    coverageRule: kpi.coverageRule,
  }
}

export default function KpiSettingsAdminPage() {
  const router = useRouter()
  const { isSuperAdmin, loading } = useAuth()
  const [kpis, setKpis] = useState<ManagedKpiDefinition[]>(() => buildFallbackKpis())
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [form, setForm] = useState<KpiFormState>(emptyForm)
  const [errors, setErrors] = useState<string[]>([])
  const [message, setMessage] = useState('')
  const [dataSource, setDataSource] = useState<'supabase' | 'fallback'>('fallback')

  useEffect(() => {
    if (!loading && !isSuperAdmin) router.replace('/dashboard')
  }, [isSuperAdmin, loading, router])

  useEffect(() => {
    let mounted = true
    const supabase = createClient()

    async function loadKpis() {
      const { data, error } = await supabase
        .from('kpi_definitions')
        .select('*')
        .order('no', { ascending: true })

      if (!mounted) return
      const parsed = !error ? parseSupabaseKpis(data as unknown) : []
      if (parsed.length > 0) {
        setKpis(parsed)
        setDataSource('supabase')
      } else {
        setKpis(buildFallbackKpis())
        setDataSource('fallback')
      }
    }

    loadKpis().catch(() => {
      if (!mounted) return
      setKpis(buildFallbackKpis())
      setDataSource('fallback')
    })

    return () => { mounted = false }
  }, [])

  const selected = useMemo(
    () => kpis.find(kpi => kpi.id === selectedId) ?? null,
    [kpis, selectedId]
  )
  const activeCount = kpis.filter(kpi => kpi.isActive).length
  const lowerBetterCount = kpis.filter(kpi => kpi.direction === 'lower_is_better').length

  function startCreate() {
    setSelectedId(null)
    setForm({ ...emptyForm, no: Math.max(0, ...kpis.map(kpi => kpi.no)) + 1 })
    setErrors([])
    setMessage('Yeni KPI taslağı açıldı. Kaydetme bu aşamada ekran durumunu günceller; kalıcı DB yazımı audit TODO ile hazırlandı.')
  }

  function startEdit(kpi: ManagedKpiDefinition) {
    setSelectedId(kpi.id)
    setForm(toForm(kpi))
    setErrors([])
    setMessage('')
  }

  function validate(): string[] {
    const nextErrors: string[] = []
    if (!Number.isInteger(form.no) || form.no <= 0) nextErrors.push('KPI no pozitif tam sayı olmalı.')
    if (!form.name.trim()) nextErrors.push('KPI adı zorunludur.')
    if (!form.shortName.trim()) nextErrors.push('Kısa ad zorunludur.')
    if (!form.description.trim()) nextErrors.push('Açıklama zorunludur.')
    if (!form.coverageRule.trim()) nextErrors.push('Coverage kuralı zorunludur.')

    const duplicate = kpis.some(kpi => kpi.no === form.no && kpi.id !== selectedId)
    if (duplicate) nextErrors.push(`KPI no ${form.no} zaten kullanılıyor.`)
    return nextErrors
  }

  function saveForm() {
    const nextErrors = validate()
    setErrors(nextErrors)
    if (nextErrors.length > 0) return

    const nowId = selectedId ?? `draft-kpi-${form.no}-${Date.now()}`
    const nextItem: ManagedKpiDefinition = {
      id: nowId,
      ...form,
      name: form.name.trim(),
      shortName: form.shortName.trim(),
      description: form.description.trim(),
      coverageRule: form.coverageRule.trim(),
      source: dataSource,
    }

    setKpis(prev => {
      const exists = prev.some(kpi => kpi.id === nowId)
      const next = exists ? prev.map(kpi => kpi.id === nowId ? nextItem : kpi) : [...prev, nextItem]
      return next.sort((a, b) => a.no - b.no)
    })
    setSelectedId(nowId)
    buildAuditDraft({
      action: selectedId ? 'update' : 'create',
      entity: 'kpi_definition',
      entityId: nowId,
      summary: `KPI ${form.no} ${selectedId ? 'güncellendi' : 'oluşturuldu'}: ${form.name.trim()}`,
    })
    setMessage('KPI ekran durumunda kaydedildi. Kalıcı Supabase yazımı ve audit_logs kaydı migration aktif olduğunda bağlanacak.')
  }

  function deactivate(kpi: ManagedKpiDefinition) {
    setKpis(prev => prev.map(item => item.id === kpi.id ? { ...item, isActive: false } : item))
    if (selectedId === kpi.id) setForm(prev => ({ ...prev, isActive: false }))
    buildAuditDraft({ action: 'deactivate', entity: 'kpi_definition', entityId: kpi.id, summary: `KPI ${kpi.no} pasifleştirildi.` })
    setMessage(`KPI ${kpi.no} pasifleştirildi. Kalıcı silme yapılmadı.`)
  }

  if (loading) return <div className={styles.body}>Yetki kontrol ediliyor...</div>
  if (!isSuperAdmin) return <div className={styles.body}>Bu ekrana sadece Super Admin erişebilir.</div>

  return (
    <div className={styles.shell}>
      <Topbar
        title="KPI Ayarları"
        subtitle="KPI tanımları, kategori bağlantısı, aktif/pasif durumu ve coverage kuralları"
        pills={[{ label: dataSource === 'supabase' ? 'Supabase kaynaklı' : 'Config fallback', variant: dataSource === 'supabase' ? 'green' : 'amber' }]}
        actions={<button className={`${styles.button} ${styles.buttonPrimary}`} onClick={startCreate} type="button">Yeni KPI</button>}
      />
      <main className={styles.body}>
        <div className={styles.inner}>
          <div className={styles.notice}>
            <strong>Metodoloji uyarısı:</strong> Bu ayarlar skor metodolojisini etkiler. Prompt 4 kapsamında dinamik skor motoru değiştirilmedi; ekran Supabase tablosu varsa okur, yoksa mevcut config verisini fallback gösterir.
          </div>

          <section className={styles.metricGrid}>
            <Metric label="Toplam KPI" value={kpis.length} hint="Aktif ve pasif tanımlar" />
            <Metric label="Aktif KPI" value={activeCount} hint="Dashboard motoru şu an fallback yapıdadır" />
            <Metric label="Düşük daha iyi" value={lowerBetterCount} hint="Ters yönlü normalize edilen KPI" />
            <Metric label="Kategori" value={KAT_YAPILAR.length} hint="Mevcut kategori matrisi" />
          </section>

          <section className={styles.grid}>
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <h2 className={styles.cardTitle}>KPI listesi</h2>
                  <p className={styles.cardSub}>Silme yerine pasifleştirme kullanılır. KPI no çakışması formda engellenir.</p>
                </div>
              </div>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr><th>No</th><th>KPI</th><th>Kategori</th><th>Yön / Tip</th><th>Durum</th><th>İşlem</th></tr>
                  </thead>
                  <tbody>
                    {kpis.map(kpi => (
                      <tr key={kpi.id}>
                        <td><span className={styles.primaryText}>KPI {kpi.no}</span></td>
                        <td>
                          <div className={styles.primaryText}>{kpi.name}</div>
                          <div className={styles.muted}>{kpi.shortName} · {kpi.description}</div>
                        </td>
                        <td>{CATEGORY_SHORT_NAMES[kpi.categoryKey]}</td>
                        <td>
                          <div>{kpi.direction === 'lower_is_better' ? 'Düşük daha iyi' : 'Yüksek daha iyi'}</div>
                          <div className={styles.muted}>{KPI_DATA_TYPE_OPTIONS.find(option => option.value === kpi.dataType)?.label}</div>
                        </td>
                        <td>
                          <span className={`${styles.badge} ${kpi.isActive ? styles.active : styles.passive}`}>{kpi.isActive ? 'Aktif' : 'Pasif'}</span>{' '}
                          <span className={`${styles.badge} ${kpi.source === 'supabase' ? styles.supabase : styles.fallback}`}>{kpi.source}</span>
                        </td>
                        <td>
                          <div className={styles.actions}>
                            <button className={styles.button} onClick={() => startEdit(kpi)} type="button">Düzenle</button>
                            <button className={`${styles.button} ${styles.buttonDanger}`} onClick={() => deactivate(kpi)} type="button" disabled={!kpi.isActive}>Pasifleştir</button>
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
                  <h2 className={styles.cardTitle}>{selected ? `KPI ${selected.no} düzenle` : 'KPI formu'}</h2>
                  <p className={styles.cardSub}>KPI no, kategori, hesap yönü, veri tipi ve coverage kuralı.</p>
                </div>
              </div>
              <form className={styles.form} onSubmit={event => { event.preventDefault(); saveForm() }}>
                {errors.length > 0 && <div className={styles.errorBox}>{errors.map(error => <div key={error}>• {error}</div>)}</div>}
                {message && <div className={styles.successBox}>{message}</div>}

                <div className={styles.twoFields}>
                  <label className={styles.field}>
                    <span className={styles.label}>KPI no</span>
                    <input className={styles.input} type="number" min={1} value={form.no} onChange={e => setForm(prev => ({ ...prev, no: Number(e.target.value) }))} />
                  </label>
                  <label className={styles.field}>
                    <span className={styles.label}>Kısa ad</span>
                    <input className={styles.input} value={form.shortName} onChange={e => setForm(prev => ({ ...prev, shortName: e.target.value }))} placeholder="KPI 13" />
                  </label>
                </div>

                <label className={styles.field}>
                  <span className={styles.label}>Ad</span>
                  <input className={styles.input} value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} placeholder="KPI adı" />
                </label>

                <label className={styles.field}>
                  <span className={styles.label}>Açıklama</span>
                  <textarea className={styles.textarea} value={form.description} onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))} />
                </label>

                <label className={styles.field}>
                  <span className={styles.label}>Kategori</span>
                  <select className={styles.select} value={form.categoryKey} onChange={e => setForm(prev => ({ ...prev, categoryKey: e.target.value as KpiFormState['categoryKey'] }))}>
                    {KAT_YAPILAR.map(category => <option key={category.key} value={category.key}>{category.ad}</option>)}
                  </select>
                </label>

                <div className={styles.twoFields}>
                  <label className={styles.field}>
                    <span className={styles.label}>Hesap yönü</span>
                    <select className={styles.select} value={form.direction} onChange={e => setForm(prev => ({ ...prev, direction: e.target.value as KpiDirection }))}>
                      <option value="higher_is_better">Yüksek daha iyi</option>
                      <option value="lower_is_better">Düşük daha iyi</option>
                    </select>
                  </label>
                  <label className={styles.field}>
                    <span className={styles.label}>Veri tipi</span>
                    <select className={styles.select} value={form.dataType} onChange={e => setForm(prev => ({ ...prev, dataType: e.target.value as KpiDataType }))}>
                      {KPI_DATA_TYPE_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </label>
                </div>

                <label className={styles.field}>
                  <span className={styles.label}>Coverage kuralı</span>
                  <textarea className={styles.textarea} value={form.coverageRule} onChange={e => setForm(prev => ({ ...prev, coverageRule: e.target.value }))} />
                </label>

                <label className={styles.checkRow}>
                  <input type="checkbox" checked={form.isActive} onChange={e => setForm(prev => ({ ...prev, isActive: e.target.checked }))} /> Aktif KPI
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
