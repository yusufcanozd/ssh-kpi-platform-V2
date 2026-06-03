'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Topbar from '@/components/layout/Topbar'
import { useAuth } from '@/context/AuthContext'
import { createClient } from '@/lib/supabase/client'
import {
  type AdminSegment,
  deleteSegment,
  getFallbackSegments,
  isPersistedId,
  loadSegments,
  saveSegment,
  setSegmentActive,
  slugifySegmentCode,
  validateSegment,
} from '@/lib/admin/segments-management'
import styles from '@/components/admin/KpiManagement.module.css'

const emptySegment: AdminSegment = {
  id: 'draft',
  code: '',
  name: '',
  color: '#64748b',
  sortOrder: 1,
  isActive: true,
  source: 'fallback',
}

function nextSort(segments: AdminSegment[]) {
  return Math.max(0, ...segments.map(s => s.sortOrder)) + 1
}

export default function SegmentsAdminPage() {
  const router = useRouter()
  const { isSuperAdmin, loading } = useAuth()
  const supabase = useMemo(() => createClient(), [])

  const [segments, setSegments] = useState<AdminSegment[]>(() => getFallbackSegments())
  const [source, setSource] = useState<'supabase' | 'fallback'>('fallback')
  const [warning, setWarning] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draft, setDraft] = useState<AdminSegment>(emptySegment)
  const [auditNote, setAuditNote] = useState('')
  const [dbError, setDbError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!loading && !isSuperAdmin) router.replace('/dashboard')
  }, [isSuperAdmin, loading, router])

  useEffect(() => {
    let cancelled = false
    loadSegments(supabase).then(result => {
      if (cancelled) return
      setSegments(result.segments)
      setSource(result.source)
      setWarning(result.warning ?? '')
      setDraft(prev => ({ ...prev, sortOrder: nextSort(result.segments) }))
    })
    return () => { cancelled = true }
  }, [supabase])

  const validationErrors = useMemo(() => validateSegment(draft, segments, selectedId ?? undefined), [draft, segments, selectedId])
  const activeCount = segments.filter(s => s.isActive).length

  function resetForm() {
    setSelectedId(null)
    setDraft({ ...emptySegment, sortOrder: nextSort(segments) })
    setAuditNote('')
    setDbError('')
  }

  function editSegment(segment: AdminSegment) {
    setSelectedId(segment.id)
    setDraft({ ...segment })
    setAuditNote('')
    setDbError('')
  }

  function updateName(name: string) {
    setDraft(current => ({ ...current, name, code: selectedId ? current.code : (slugifySegmentCode(name) || name) }))
  }

  function upsertLocal(saved: AdminSegment) {
    setSegments(current => {
      const exists = current.some(item => item.id === saved.id)
      const next = exists ? current.map(item => item.id === saved.id ? saved : item) : [...current, saved]
      return next.sort((a, b) => a.sortOrder - b.sortOrder)
    })
  }

  async function saveDraft() {
    if (validationErrors.length) return
    setDbError('')
    if (source === 'supabase') {
      setSaving(true)
      const editing = Boolean(selectedId) && isPersistedId(selectedId as string)
      const { data, error } = await saveSegment(supabase, draft, editing)
      setSaving(false)
      if (error || !data) { setDbError(error ?? 'Segment kaydedilemedi.'); return }
      upsertLocal(data)
      setSelectedId(data.id)
      setDraft({ ...data })
      setAuditNote(`${data.name} ${editing ? 'guncellendi' : 'eklendi'} - Supabase'e yazildi.`)
      return
    }
    setDbError('Segment tablosu fallback modunda. Once 0004 migration calistirilmali.')
  }

  async function toggleActive(segment: AdminSegment) {
    const nextActive = !segment.isActive
    setDbError('')
    if (source === 'supabase' && isPersistedId(segment.id)) {
      setSaving(true)
      const { data, error } = await setSegmentActive(supabase, segment.id, nextActive)
      setSaving(false)
      if (error || !data) { setDbError(error ?? 'Durum guncellenemedi.'); return }
      upsertLocal(data)
      setDraft(current => current.id === data.id ? data : current)
      setAuditNote(`${data.name} ${nextActive ? 'aktiflestirildi' : 'pasiflestirildi'}.`)
      return
    }
    setDbError('Fallback modunda durum degistirilemez.')
  }

  async function removeSegment(segment: AdminSegment) {
    if (typeof window !== 'undefined' && !window.confirm(`"${segment.name}" segmenti kalici olarak silinecek. Devam edilsin mi?`)) return
    setDbError('')
    if (source === 'supabase' && isPersistedId(segment.id)) {
      setSaving(true)
      const { error } = await deleteSegment(supabase, segment.id)
      setSaving(false)
      if (error) { setDbError(error); return }
    }
    setSegments(current => current.filter(item => item.id !== segment.id))
    if (selectedId === segment.id) resetForm()
    setAuditNote(`"${segment.name}" silindi.`)
  }

  if (loading) return <div className={styles.content}>Yetki kontrol ediliyor...</div>
  if (!isSuperAdmin) return <div className={styles.content}>Bu ekrana sadece Super Admin erisebilir.</div>

  return (
    <div className={styles.shell}>
      <Topbar
        title="Segment Yonetimi"
        subtitle="Segment ekleme, duzenleme, renk ve aktif/pasif yonetimi"
        pills={[{ label: source === 'supabase' ? 'Supabase' : 'Fallback config', variant: source === 'supabase' ? 'green' : 'amber' }]}
      />
      <div className={styles.content}>
        <div className={styles.inner}>
          <section className={styles.notice}>
            <div className={styles.noticeTitle}>Segment yonetimi</div>
            <div className={styles.noticeText}>
              Buradaki aktif segmentler marka formundaki segment seceneklerini belirler. Yeni segment ekleyince marka ekraninda otomatik secilebilir olur.
            </div>
            {warning && <div className={styles.noticeText}>{warning}</div>}
          </section>

          <div className={styles.grid}>
            <section className={styles.card}>
              <div className={styles.toolbar}>
                <div>
                  <h2 className={styles.toolbarTitle}>Segment Listesi</h2>
                  <div className={styles.toolbarHint}>{segments.length} segment - {activeCount} aktif</div>
                </div>
                <div className={styles.actions}>
                  <button type="button" className={styles.secondaryButton} onClick={resetForm}>Yeni segment</button>
                </div>
              </div>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Sira</th>
                      <th>Segment</th>
                      <th>Kod</th>
                      <th>Renk</th>
                      <th>Durum</th>
                      <th>Islem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {segments.map(segment => (
                      <tr key={segment.id}>
                        <td><strong>{segment.sortOrder}</strong></td>
                        <td>
                          <div>{segment.name}</div>
                          <div className={`${styles.muted} ${styles.small}`}><span className={styles.sourceBadge}>{segment.source}</span></div>
                        </td>
                        <td>{segment.code}</td>
                        <td><span className={styles.colorDot} style={{ background: segment.color }} />{segment.color}</td>
                        <td>
                          <span className={`${styles.status} ${segment.isActive ? styles.statusActive : styles.statusPassive}`}>
                            {segment.isActive ? 'Aktif' : 'Pasif'}
                          </span>
                        </td>
                        <td>
                          <div className={styles.actions}>
                            <button type="button" className={styles.secondaryButton} onClick={() => editSegment(segment)}>Duzenle</button>
                            <button type="button" className={styles.dangerButton} onClick={() => toggleActive(segment)} disabled={saving}>{segment.isActive ? 'Pasiflestir' : 'Aktiflestir'}</button>
                            <button type="button" className={styles.dangerButton} onClick={() => removeSegment(segment)} disabled={saving} title="Kalici sil">Sil</button>
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
                  <h2 className={styles.formTitle}>{selectedId ? 'Segment Duzenle' : 'Yeni Segment Ekle'}</h2>
                  <div className={styles.formHint}>Kaydet islemi Supabase segments tablosuna yazilir.</div>
                </div>

                {validationErrors.length > 0 && (
                  <div className={styles.errors}>{validationErrors.map(error => <div key={error}>{error}</div>)}</div>
                )}
                {dbError && <div className={styles.errors}>{dbError}</div>}

                <div className={styles.field}>
                  <label>Ad</label>
                  <input className={styles.input} value={draft.name} onChange={event => updateName(event.target.value)} placeholder="Segment adi" />
                </div>

                <div className={styles.twoCols}>
                  <div className={styles.field}>
                    <label>Kod</label>
                    <input className={styles.input} value={draft.code} onChange={event => setDraft({ ...draft, code: event.target.value })} placeholder="segment-kodu" />
                  </div>
                  <div className={styles.field}>
                    <label>Sira</label>
                    <input className={styles.input} type="number" min={1} value={draft.sortOrder} onChange={event => setDraft({ ...draft, sortOrder: Number(event.target.value) })} />
                  </div>
                </div>

                <div className={styles.field}>
                  <label>Renk</label>
                  <input className={styles.input} type="color" value={draft.color} onChange={event => setDraft({ ...draft, color: event.target.value })} />
                </div>

                <label className={styles.checkboxRow}>
                  <input type="checkbox" checked={draft.isActive} onChange={event => setDraft({ ...draft, isActive: event.target.checked })} />
                  Aktif segment
                </label>

                <div className={styles.actions}>
                  <button type="submit" className={styles.button} disabled={validationErrors.length > 0 || saving}>{saving ? 'Kaydediliyor...' : (selectedId ? 'Guncelle' : 'Ekle')}</button>
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
