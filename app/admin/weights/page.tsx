'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Topbar from '@/components/layout/Topbar'
import { useAuth } from '@/context/AuthContext'
import { createClient } from '@/lib/supabase/client'
import {
  buildFallbackVersion,
  buildFallbackWeights,
  createMethodologyVersion,
  isPersistedVersionId,
  isWeightTotalValid,
  parseSupabaseVersions,
  parseSupabaseWeights,
  saveWeights,
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
  const supabase = useMemo(() => createClient(), [])

  const [weights, setWeights] = useState<ManagedCategoryWeight[]>(() => buildFallbackWeights())
  const [versions, setVersions] = useState<ManagedMethodologyVersion[]>(() => [buildFallbackVersion()])
  const [source, setSource] = useState<'supabase' | 'fallback'>('fallback')
  const [versionForm, setVersionForm] = useState<VersionFormState>(emptyVersionForm)
  const [errors, setErrors] = useState<string[]>([])
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!loading && !isSuperAdmin) router.replace('/dashboard')
  }, [isSuperAdmin, loading, router])

  useEffect(() => {
    let cancelled = false

    async function load() {
      const { data: versionRows, error: versionError } = await supabase
        .from('kpi_methodology_versions')
        .select('*')
        .order('effective_date', { ascending: false })

      if (cancelled) return

      const parsedVersions = !versionError ? parseSupabaseVersions(versionRows as unknown) : []
      if (parsedVersions.length === 0) {
        setVersions([buildFallbackVersion()])
        setWeights(buildFallbackWeights())
        setSource('fallback')
        return
      }

      setVersions(parsedVersions)
      setSource('supabase')

      const activeVersion = parsedVersions.find(version => version.isActive) ?? parsedVersions[0]
      const { data: weightRows, error: weightError } = await supabase
        .from('kpi_category_weights')
        .select('*')
        .eq('methodology_version_id', activeVersion.id)

      if (cancelled) return
      const parsedWeights = !weightError ? parseSupabaseWeights(weightRows as unknown) : []
      setWeights(parsedWeights.length > 0 ? parsedWeights : buildFallbackWeights())
    }

    load().catch(() => {
      if (cancelled) return
      setVersions([buildFallbackVersion()])
      setWeights(buildFallbackWeights())
      setSource('fallback')
    })

    return () => { cancelled = true }
  }, [supabase])

  const total = useMemo(() => totalWeight(weights), [weights])
  const valid = isWeightTotalValid(weights)
  const activeVersion = versions.find(version => version.isActive) ?? versions[0]

  function updateWeight(categoryKey: string, raw: string) {
    const value = Number(raw)
    setWeights(current => current.map(item =>
      item.categoryKey === categoryKey
        ? { ...item, weight: Number.isFinite(value) ? value : 0 }
        : item
    ))
    setMessage('')
  }

  async function handleSaveWeights() {
    if (!valid) {
      setErrors([`Toplam ağırlık ${total} — kaydetmek için tam olarak 100 olmalı.`])
      return
    }
    setErrors([])

    if (source === 'supabase' && activeVersion && isPersistedVersionId(activeVersion.id)) {
      setSaving(true)
      const { error } = await saveWeights(supabase, activeVersion.id, weights)
      setSaving(false)
      if (error) { setErrors([error]); return }
      setMessage(`Ağırlıklar "${activeVersion.name}" versiyonuna kaydedildi (Supabase).`)
      return
    }

    setMessage('Fallback modunda: ekran güncellendi, DB yazımı yapılmadı (aktif DB versiyonu yok).')
  }

  async function createVersion() {
    const nextErrors: string[] = []
    if (!versionForm.name.trim()) nextErrors.push('Versiyon adı zorunludur.')
    if (!versionForm.description.trim()) nextErrors.push('Açıklama zorunludur.')
    if (!/^\d{4}-\d{2}-\d{2}$/.test(versionForm.effectiveDate)) nextErrors.push('Geçerlilik tarihi YYYY-AA-GG olmalı.')
    if (!valid) nextErrors.push(`Yeni versiyon için toplam ağırlık 100 olmalı (şu an ${total}).`)
    setErrors(nextErrors)
    if (nextErrors.length > 0) return

    if (source === 'supabase') {
      setSaving(true)
      const { data, error } = await createMethodologyVersion(supabase, {
        name: versionForm.name.trim(),
        description: versionForm.description.trim(),
        effectiveDate: versionForm.effectiveDate,
        isActive: versionForm.isActive,
      }, weights)
      setSaving(false)
      if (error || !data) { setErrors([error ?? 'Versiyon oluşturulamadı.']); return }

      setVersions(current => {
        const deactivated = data.isActive ? current.map(v => ({ ...v, isActive: false })) : current
        return [data, ...deactivated]
      })
      setVersionForm(emptyVersionForm)
      setMessage(`"${data.name}" versiyonu oluşturuldu ve ağırlıklar kaydedildi (Supabase).`)
      return
    }

    const newId = `local-version-${Date.now()}`
    const newVersion: ManagedMethodologyVersion = {
      id: newId,
      name: versionForm.name.trim(),
      description: versionForm.description.trim(),
      effectiveDate: versionForm.effectiveDate,
      isActive: versionForm.isActive,
      source: 'fallback',
    }
    setVersions(current => {
      const next = versionForm.isActive ? current.map(version => ({ ...version, isActive: false })) : [...current]
      return [newVersion, ...next]
    })
    setVersionForm(emptyVersionForm)
    setMessage('Fallback modunda: versiyon ekranda oluşturuldu, DB yazımı yapılmadı.')
  }

  if (loading) return <div className={styles.content}>Yetki kontrol ediliyor...</div>
  if (!isSuperAdmin) return <div className={styles.content}>Bu ekrana sadece Super Admin erişebilir.</div>

  return (
    <div className={styles.shell}>
      <Topbar
        title="Kategori Ağırlıkları"
        subtitle="Kategori ağırlık editörü, toplam-100 kontrolü ve metodoloji versiyonlama"
        pills={[
          { label: source === 'supabase' ? 'Supabase' : 'Fallback config', variant: source === 'supabase' ? 'green' : 'amber' },
          { label: valid ? 'Toplam 100 ✓' : `Toplam ${total}`, variant: valid ? 'green' : 'amber' },
        ]}
      />
      <div className={styles.content}>
        <div className={styles.inner}>
          <section className={styles.notice}>
            <div className={styles.noticeTitle}>Metodoloji uyarısı</div>
            <div className={styles.noticeText}>
              Ağırlıklar genel ve kategori skorlarını doğrudan etkiler. Toplam 100 olmadan kayıt yapılamaz. Aktif versiyon: <strong>{activeVersion?.name ?? '—'}</strong>.
            </div>
          </section>

          <div className={styles.grid}>
            <section className={styles.card}>
              <div className={styles.toolbar}>
                <div>
                  <h2 className={styles.toolbarTitle}>Ağırlık Editörü</h2>
                  <div className={styles.toolbarHint}>
                    {weights.length} kategori · toplam {total}/100 · kaynak {source === 'supabase' ? 'DB' : 'Config'}
                  </div>
                </div>
                <div className={styles.actions}>
                  <button type="button" className={styles.button} onClick={handleSaveWeights} disabled={!valid || saving}>{saving ? 'Kaydediliyor…' : 'Ağırlıkları kaydet'}</button>
                </div>
              </div>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Kategori</th>
                      <th>Renk</th>
                      <th>Ağırlık (%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weights.map(item => (
                      <tr key={item.categoryKey}>
                        <td>
                          <div>{item.name}</div>
                          <div className={`${styles.muted} ${styles.small}`}>{item.shortName}</div>
                        </td>
                        <td><span className={styles.colorDot} style={{ background: item.color }} />{item.color}</td>
                        <td>
                          <input
                            className={styles.input}
                            type="number"
                            min={0}
                            max={100}
                            step={1}
                            value={item.weight}
                            onChange={event => updateWeight(item.categoryKey, event.target.value)}
                            style={{ maxWidth: 120 }}
                          />
                        </td>
                      </tr>
                    ))}
                    <tr>
                      <td colSpan={2}><strong>Toplam</strong></td>
                      <td>
                        <span className={`${styles.status} ${valid ? styles.statusActive : styles.statusPassive}`}>{total} / 100</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              {errors.length > 0 && (
                <div className={styles.form}>
                  <div className={styles.errors}>{errors.map(error => <div key={error}>{error}</div>)}</div>
                </div>
              )}
              {message && (
                <div className={styles.form}>
                  <div className={styles.formHint}>{message}</div>
                </div>
              )}
            </section>

            <aside className={styles.card}>
              <div className={styles.toolbar}>
                <div>
                  <h2 className={styles.toolbarTitle}>Metodoloji Versiyonları</h2>
                  <div className={styles.toolbarHint}>Aktif tek versiyon dashboard skorunu belirler.</div>
                </div>
              </div>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Versiyon</th>
                      <th>Tarih</th>
                      <th>Durum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {versions.map(version => (
                      <tr key={version.id}>
                        <td>
                          <div>{version.name}</div>
                          <div className={`${styles.muted} ${styles.small}`}>{version.description}</div>
                        </td>
                        <td>{version.effectiveDate}</td>
                        <td>
                          <span className={`${styles.status} ${version.isActive ? styles.statusActive : styles.statusPassive}`}>
                            {version.isActive ? 'Aktif' : 'Pasif'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <form className={styles.form} onSubmit={event => { event.preventDefault(); createVersion() }}>
                <div>
                  <h2 className={styles.formTitle}>Yeni Versiyon</h2>
                  <div className={styles.formHint}>Yeni versiyon mevcut ağırlık dağılımını kaydeder.</div>
                </div>

                <div className={styles.field}>
                  <label>Versiyon adı</label>
                  <input className={styles.input} value={versionForm.name} onChange={event => setVersionForm(current => ({ ...current, name: event.target.value }))} placeholder="ör. v2 — 2026 Revizyonu" />
                </div>

                <div className={styles.field}>
                  <label>Açıklama</label>
                  <textarea className={styles.textarea} value={versionForm.description} onChange={event => setVersionForm(current => ({ ...current, description: event.target.value }))} placeholder="Versiyon açıklaması" />
                </div>

                <div className={styles.twoCols}>
                  <div className={styles.field}>
                    <label>Geçerlilik tarihi</label>
                    <input className={styles.input} type="date" value={versionForm.effectiveDate} onChange={event => setVersionForm(current => ({ ...current, effectiveDate: event.target.value }))} />
                  </div>
                  <label className={styles.checkboxRow}>
                    <input type="checkbox" checked={versionForm.isActive} onChange={event => setVersionForm(current => ({ ...current, isActive: event.target.checked }))} />
                    Aktif yap
                  </label>
                </div>

                <div className={styles.actions}>
                  <button type="submit" className={styles.button} disabled={saving}>{saving ? 'Kaydediliyor…' : 'Yeni metodoloji versiyonu oluştur'}</button>
                </div>
              </form>
            </aside>
          </div>
        </div>
      </div>
    </div>
  )
}
