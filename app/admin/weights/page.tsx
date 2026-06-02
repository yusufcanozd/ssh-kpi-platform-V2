'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Topbar from '@/components/layout/Topbar'
import { useAuth } from '@/context/AuthContext'
import { createClient } from '@/lib/supabase/client'
import {
  buildFallbackVersion,
  buildFallbackWeights,
  buildWeightAuditDraft,
  isWeightTotalValid,
  parseSupabaseVersions,
  parseSupabaseWeights,
  totalWeight,
  type ManagedCategoryWeight,
  type ManagedMethodologyVersion,
} from '@/lib/admin/weights-management'
import styles from '@/components/admin/KpiManagement.module.css'

type VersionFormState = {
  name: string
  description: string
  effectiveDate: string
  isActive: boolean
}

const emptyVersionForm: VersionFormState = {
  name: '',
  description: '',
  effectiveDate: new Date().toISOString().slice(0, 10),
  isActive: true,
}

export default function WeightsAdminPage() {
  const router = useRouter()
  const { isSuperAdmin, loading } = useAuth()

  const [weights, setWeights] = useState<ManagedCategoryWeight[]>(() => buildFallbackWeights())
  const [versions, setVersions] = useState<ManagedMethodologyVersion[]>(() => [buildFallbackVersion()])
  const [dataSource, setDataSource] = useState<'supabase' | 'fallback'>('fallback')
  const [versionForm, setVersionForm] = useState<VersionFormState>(emptyVersionForm)
  const [errors, setErrors] = useState<string[]>([])
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!loading && !isSuperAdmin) router.replace('/dashboard')
  }, [isSuperAdmin, loading, router])

  useEffect(() => {
    let mounted = true
    const supabase = createClient()

    async function load() {
      const { data: versionRows, error: versionError } = await supabase
        .from('kpi_methodology_versions')
        .select('*')
        .order('effective_date', { ascending: false })

      if (!mounted) return

      const parsedVersions = !versionError ? parseSupabaseVersions(versionRows as unknown) : []
      if (parsedVersions.length === 0) {
        setVersions([buildFallbackVersion()])
        setWeights(buildFallbackWeights())
        setDataSource('fallback')
        return
      }

      setVersions(parsedVersions)
      setDataSource('supabase')

      const activeVersion = parsedVersions.find(version => version.isActive) ?? parsedVersions[0]
      const { data: weightRows, error: weightError } = await supabase
        .from('kpi_category_weights')
        .select('*')
        .eq('methodology_version_id', activeVersion.id)

      if (!mounted) return
      const parsedWeights = !weightError ? parseSupabaseWeights(weightRows as unknown) : []
      setWeights(parsedWeights.length > 0 ? parsedWeights : buildFallbackWeights())
    }

    load().catch(() => {
      if (!mounted) return
      setVersions([buildFallbackVersion()])
      setWeights(buildFallbackWeights())
      setDataSource('fallback')
    })

    return () => { mounted = false }
  }, [])

  const total = useMemo(() => totalWeight(weights), [weights])
  const valid = isWeightTotalValid(weights)
  const activeVersion = versions.find(version => version.isActive) ?? versions[0]

  function updateWeight(categoryKey: string, raw: string) {
    const value = Number(raw)
    setWeights(prev => prev.map(item =>
      item.categoryKey === categoryKey
        ? { ...item, weight: Number.isFinite(value) ? value : 0 }
        : item
    ))
    setMessage('')
  }

  function saveWeights() {
    if (!valid) {
      setErrors([`Toplam ağırlık ${total} — kaydetmek için tam olarak 100 olmalı.`])
      return
    }
    setErrors([])
    buildWeightAuditDraft({
      action: 'update_weights',
      versionId: activeVersion?.id ?? 'fallback',
      summary: `Kategori ağırlıkları güncellendi (${weights.map(w => `${w.shortName}:${w.weight}`).join(', ')})`,
    })
    setMessage('Ağırlıklar ekran durumunda kaydedildi. Kalıcı DB yazımı (kpi_category_weights upsert + audit_logs) Batch 2’de bağlanacak.')
  }

  function createVersion() {
    const nextErrors: string[] = []
    if (!versionForm.name.trim()) nextErrors.push('Versiyon adı zorunludur.')
    if (!versionForm.description.trim()) nextErrors.push('Açıklama zorunludur.')
    if (!/^\d{4}-\d{2}-\d{2}$/.test(versionForm.effectiveDate)) nextErrors.push('Geçerlilik tarihi YYYY-AA-GG olmalı.')
    if (!valid) nextErrors.push(`Yeni versiyon için toplam ağırlık 100 olmalı (şu an ${total}).`)
    setErrors(nextErrors)
    if (nextErrors.length > 0) return

    const newId = `draft-version-${Date.now()}`
    const newVersion: ManagedMethodologyVersion = {
      id: newId,
      name: versionForm.name.trim(),
      description: versionForm.description.trim(),
      effectiveDate: versionForm.effectiveDate,
      isActive: versionForm.isActive,
      source: dataSource,
    }

    setVersions(prev => {
      const next = versionForm.isActive
        ? prev.map(version => ({ ...version, isActive: false }))
        : [...prev]
      return [newVersion, ...next]
    })

    buildWeightAuditDraft({
      action: 'create_version',
      versionId: newId,
      summary: `Yeni metodoloji versiyonu: ${newVersion.name}`,
    })
    setVersionForm(emptyVersionForm)
    setMessage(`"${newVersion.name}" versiyonu ekran durumunda oluşturuldu. Kalıcı kayıt Batch 2’de bağlanacak.`)
  }

  if (loading) return <div className={styles.body}>Yetki kontrol ediliyor...</div>
  if (!isSuperAdmin) return <div className={styles.body}>Bu ekrana sadece Super Admin erişebilir.</div>

  return (
    <div className={styles.shell}>
      <Topbar
        title="Kategori Ağırlıkları"
        subtitle="Kategori ağırlık editörü, toplam-100 kontrolü ve metodoloji versiyonlama"
        pills={[
          { label: dataSource === 'supabase' ? 'Supabase kaynaklı' : 'Config fallback', variant: dataSource === 'supabase' ? 'green' : 'amber' },
          { label: valid ? 'Toplam 100 ✓' : `Toplam ${total}`, variant: valid ? 'green' : 'amber' },
        ]}
        actions={<button className={`${styles.button} ${styles.buttonPrimary}`} onClick={saveWeights} type="button" disabled={!valid}>Ağırlıkları kaydet</button>}
      />
      <main className={styles.body}>
        <div className={styles.inner}>
          <div className={styles.notice}>
            <strong>Metodoloji uyarısı:</strong> Ağırlıklar genel ve kategori skorlarını doğrudan etkiler. Toplam 100 olmadan kayıt yapılamaz. Aktif versiyon: <strong>{activeVersion?.name ?? '—'}</strong>.
          </div>

          <section className={styles.metricGrid}>
            <Metric label="Kategori" value={weights.length} hint="Ağırlığı yönetilen kategori" />
            <Metric label="Toplam ağırlık" value={`${total}`} hint={valid ? 'Geçerli (100)' : 'Kaydetmek için 100 olmalı'} />
            <Metric label="Versiyon" value={versions.length} hint="Metodoloji versiyon sayısı" />
            <Metric label="Kaynak" value={dataSource === 'supabase' ? 'DB' : 'Config'} hint="Supabase yoksa fallback" />
          </section>

          <section className={styles.grid}>
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <h2 className={styles.cardTitle}>Ağırlık editörü</h2>
                  <p className={styles.cardSub}>Her kategori için yüzde gir. Toplam canlı hesaplanır; 100 değilse kayıt kapalıdır.</p>
                </div>
              </div>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr><th>Kategori</th><th>Renk</th><th>Ağırlık (%)</th></tr>
                  </thead>
                  <tbody>
                    {weights.map(item => (
                      <tr key={item.categoryKey}>
                        <td>
                          <div className={styles.primaryText}>{item.name}</div>
                          <div className={styles.muted}>{item.shortName}</div>
                        </td>
                        <td><span className={styles.colorChip} style={{ background: item.color }} /></td>
                        <td>
                          <input
                            className={styles.input}
                            type="number"
                            min={0}
                            max={100}
                            step={1}
                            value={item.weight}
                            onChange={e => updateWeight(item.categoryKey, e.target.value)}
                            style={{ maxWidth: 110 }}
                          />
                        </td>
                      </tr>
                    ))}
                    <tr>
                      <td colSpan={2}><span className={styles.primaryText}>Toplam</span></td>
                      <td>
                        <span className={`${styles.badge} ${valid ? styles.active : styles.passive}`}>{total} / 100</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              {errors.length > 0 && <div className={styles.errorBox}>{errors.map(error => <div key={error}>• {error}</div>)}</div>}
              {message && <div className={styles.successBox}>{message}</div>}
            </div>

            <aside className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <h2 className={styles.cardTitle}>Metodoloji versiyonları</h2>
                  <p className={styles.cardSub}>Yeni versiyon mevcut ağırlık dağılımını kaydeder. Aktif tek versiyon dashboard skorunu belirler.</p>
                </div>
              </div>

              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr><th>Versiyon</th><th>Tarih</th><th>Durum</th></tr>
                  </thead>
                  <tbody>
                    {versions.map(version => (
                      <tr key={version.id}>
                        <td>
                          <div className={styles.primaryText}>{version.name}</div>
                          <div className={styles.muted}>{version.description}</div>
                        </td>
                        <td><span className={styles.muted}>{version.effectiveDate}</span></td>
                        <td><span className={`${styles.badge} ${version.isActive ? styles.active : styles.passive}`}>{version.isActive ? 'Aktif' : 'Pasif'}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <form className={styles.form} onSubmit={event => { event.preventDefault(); createVersion() }}>
                <label className={styles.field}>
                  <span className={styles.label}>Versiyon adı</span>
                  <input className={styles.input} value={versionForm.name} onChange={e => setVersionForm(prev => ({ ...prev, name: e.target.value }))} placeholder="ör. v2 — 2026 Revizyonu" />
                </label>
                <label className={styles.field}>
                  <span className={styles.label}>Açıklama</span>
                  <textarea className={styles.textarea} value={versionForm.description} onChange={e => setVersionForm(prev => ({ ...prev, description: e.target.value }))} />
                </label>
                <div className={styles.twoFields}>
                  <label className={styles.field}>
                    <span className={styles.label}>Geçerlilik tarihi</span>
                    <input className={styles.input} type="date" value={versionForm.effectiveDate} onChange={e => setVersionForm(prev => ({ ...prev, effectiveDate: e.target.value }))} />
                  </label>
                  <label className={styles.checkRow} style={{ alignSelf: 'end' }}>
                    <input type="checkbox" checked={versionForm.isActive} onChange={e => setVersionForm(prev => ({ ...prev, isActive: e.target.checked }))} /> Aktif yap
                  </label>
                </div>
                <button className={`${styles.button} ${styles.buttonPrimary}`} type="submit">Yeni metodoloji versiyonu oluştur</button>
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
