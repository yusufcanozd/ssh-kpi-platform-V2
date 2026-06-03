'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Topbar from '@/components/layout/Topbar'
import { useAuth } from '@/context/AuthContext'
import { createClient } from '@/lib/supabase/client'
import {
  type ColumnMapping,
  type ImportOutcome,
  type ParsedFile,
  type ValidationResult,
  FIELD_DEFS,
  autoMap,
  parseFile,
  runImport,
  validate,
} from '@/lib/admin/data-import'
import styles from '@/components/admin/KpiManagement.module.css'

export default function DataImportAdminPage() {
  const router = useRouter()
  const { isSuperAdmin, loading } = useAuth()
  const supabase = useMemo(() => createClient(), [])

  const [fileName, setFileName] = useState('')
  const [parsed, setParsed] = useState<ParsedFile | null>(null)
  const [mapping, setMapping] = useState<ColumnMapping>({})
  const [validation, setValidation] = useState<ValidationResult | null>(null)
  const [makeActive, setMakeActive] = useState(true)
  const [importing, setImporting] = useState(false)
  const [outcome, setOutcome] = useState<ImportOutcome | null>(null)
  const [error, setError] = useState('')

  if (!loading && !isSuperAdmin) { router.replace('/dashboard'); }

  async function onFile(file: File | null) {
    setError(''); setValidation(null); setOutcome(null)
    if (!file) return
    const lower = file.name.toLowerCase()
    if (!lower.endsWith('.csv') && !lower.endsWith('.json') && !lower.endsWith('.tsv')) {
      setError('Sadece .csv, .tsv veya .json desteklenir (xlsx desteği sonraki adımda).')
      return
    }
    try {
      const content = await file.text()
      const result = parseFile(file.name, content)
      if (!result.headers.length) { setError('Dosya boş veya başlık satırı bulunamadı.'); return }
      setFileName(file.name)
      setParsed(result)
      setMapping(autoMap(result.headers))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Dosya okunamadı.')
    }
  }

  function setField(key: string, header: string) {
    setMapping(current => {
      const next = { ...current }
      if (header) (next as Record<string, string>)[key] = header
      else delete (next as Record<string, string>)[key]
      return next
    })
    setValidation(null); setOutcome(null)
  }

  function doValidate() {
    if (!parsed) return
    setValidation(validate(parsed, mapping))
    setOutcome(null)
  }

  async function doImport() {
    if (!parsed || !validation) return
    setError(''); setImporting(true)
    const { data, error: importError } = await runImport(supabase, fileName, parsed, mapping, validation, makeActive)
    setImporting(false)
    if (importError || !data) { setError(importError ?? 'İçe aktarma başarısız.'); return }
    setOutcome(data)
  }

  const previewRows = parsed ? parsed.rows.slice(0, 20) : []
  const canImport = Boolean(parsed && validation && validation.messages.every(m => !m.startsWith('Zorunlu') && !m.includes('eşleştirilmeli')))

  if (loading) return <div className={styles.content}>Yetki kontrol ediliyor...</div>
  if (!isSuperAdmin) return <div className={styles.content}>Bu ekrana sadece Super Admin erişebilir.</div>

  return (
    <div className={styles.shell}>
      <Topbar title="Data Import" subtitle="CSV/JSON yükleme, kolon eşleştirme, doğrulama ve içe aktarma" pills={[{ label: 'Supabase', variant: 'green' }]} />
      <div className={styles.content}>
        <div className={styles.inner}>
          <section className={styles.notice}>
            <div className={styles.noticeTitle}>İçe aktarma akışı</div>
            <div className={styles.noticeText}>
              Dosya seç → kolonları eşleştir → doğrula → içe aktar. Datadaki markalar brands tablosunda yoksa otomatik açılır. Aktif batch dashboard verisini besler (Prompt 9 ile dashboard bu veriyi kullanacak). Sadece .csv/.tsv/.json (xlsx sonraki adımda).
            </div>
          </section>

          <section className={styles.card}>
            <div className={styles.toolbar}>
              <div>
                <h2 className={styles.toolbarTitle}>1) Dosya</h2>
                <div className={styles.toolbarHint}>{fileName ? `${fileName} · ${parsed?.rows.length ?? 0} satır` : 'Dosya seçilmedi'}</div>
              </div>
              <div className={styles.actions}>
                <input type="file" accept=".csv,.tsv,.json" onChange={e => onFile(e.target.files?.[0] ?? null)} style={{ color: 'var(--tx3)', fontSize: 12 }} />
              </div>
            </div>
            {error && <div className={styles.form}><div className={styles.errors}>{error}</div></div>}
          </section>

          {parsed && (
            <div className={styles.grid}>
              <section className={styles.card}>
                <div className={styles.toolbar}>
                  <div>
                    <h2 className={styles.toolbarTitle}>2) Kolon Eşleştirme</h2>
                    <div className={styles.toolbarHint}>Otomatik eşleşenler doldu; gerekirse düzelt. En az Dönem + 1 KPI.</div>
                  </div>
                </div>
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead><tr><th>Alan</th><th>Dosya kolonu</th></tr></thead>
                    <tbody>
                      {FIELD_DEFS.map(def => (
                        <tr key={def.key}>
                          <td>{def.label}{def.kind === 'dim' && def.key === 'period' ? ' *' : ''}</td>
                          <td>
                            <select className={styles.select} value={(mapping as Record<string, string>)[def.key] ?? ''} onChange={e => setField(def.key, e.target.value)}>
                              <option value="">— eşleştirme —</option>
                              {parsed.headers.map(h => <option key={h} value={h}>{h}</option>)}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className={styles.form}>
                  <div className={styles.actions}>
                    <button type="button" className={styles.button} onClick={doValidate}>Doğrula</button>
                  </div>
                </div>
              </section>

              <aside className={styles.card}>
                <div className={styles.toolbar}>
                  <div>
                    <h2 className={styles.toolbarTitle}>3) Doğrulama & İçe Aktar</h2>
                    <div className={styles.toolbarHint}>Önce doğrula, sonra içe aktar.</div>
                  </div>
                </div>
                <div className={styles.form}>
                  {!validation && <div className={styles.formHint}>Henüz doğrulanmadı.</div>}
                  {validation && (
                    <>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        <span className={`${styles.status} ${styles.statusActive}`}>Toplam {validation.totalRows}</span>
                        <span className={`${styles.status} ${styles.statusActive}`}>Geçerli {validation.validRows}</span>
                        <span className={`${styles.status} ${validation.errorRows ? styles.statusPassive : styles.statusActive}`}>Hatalı {validation.errorRows}</span>
                        <span className={`${styles.status} ${styles.statusPassive}`}>Uyarı {validation.warningCount}</span>
                      </div>
                      {validation.messages.length > 0 && (
                        <div className={styles.errors} style={{ maxHeight: 200, overflow: 'auto' }}>
                          {validation.messages.map((m, i) => <div key={i}>{m}</div>)}
                        </div>
                      )}
                      <label className={styles.checkboxRow}>
                        <input type="checkbox" checked={makeActive} onChange={e => setMakeActive(e.target.checked)} />
                        İçe aktarınca bu batch'i aktif yap (dashboard bunu kullanır)
                      </label>
                      <div className={styles.actions}>
                        <button type="button" className={styles.button} onClick={doImport} disabled={!canImport || importing}>{importing ? 'İçe aktarılıyor…' : 'İçe aktar'}</button>
                      </div>
                      {!canImport && <div className={styles.formHint}>Zorunlu eşleştirmeler tamamlanınca içe aktarma açılır.</div>}
                    </>
                  )}
                  {error && <div className={styles.errors}>{error}</div>}
                  {outcome && (
                    <div className={styles.formHint}>
                      ✓ İçe aktarıldı. Batch: {outcome.batchId.slice(0, 8)}… · {outcome.factCount} satır · {outcome.provisionedBrands} marka eşlendi/açıldı.
                    </div>
                  )}
                </div>
              </aside>
            </div>
          )}

          {parsed && (
            <section className={styles.card}>
              <div className={styles.toolbar}>
                <div>
                  <h2 className={styles.toolbarTitle}>Önizleme (ilk 20 satır)</h2>
                  <div className={styles.toolbarHint}>{parsed.headers.length} kolon</div>
                </div>
              </div>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead><tr>{parsed.headers.map(h => <th key={h}>{h}</th>)}</tr></thead>
                  <tbody>
                    {previewRows.map((row, i) => (
                      <tr key={i}>{parsed.headers.map(h => <td key={h}>{row[h]}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
