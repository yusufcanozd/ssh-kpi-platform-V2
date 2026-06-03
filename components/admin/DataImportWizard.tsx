'use client'

import { useEffect, useMemo, useState } from 'react'
import { activateImportBatch, exportImportBatch, fetchImportBatches, persistImportBatch } from '@/lib/admin/data-import'
import {
  buildFactRowsForImport,
  buildInitialMapping,
  parseImportFile,
  roleLabel,
  validateFileBeforeRead,
  validateImportRows,
} from '@/lib/admin/import-validation'
import type {
  DataImportBatchListItem,
  ImportColumnMapping,
  ImportColumnRole,
  ImportPreviewResult,
  ImportValidationContext,
  ImportValidationSummary,
} from '@/types/import'

type DataImportWizardProps = {
  context: ImportValidationContext
}

const cardStyle = {
  background: 'var(--surf)',
  border: '1px solid var(--bd)',
  borderRadius: 16,
  boxShadow: '0 10px 30px rgba(0,0,0,.10)',
} as const

const buttonStyle = {
  border: '1px solid rgba(96,165,250,.35)',
  background: 'rgba(96,165,250,.12)',
  color: '#93c5fd',
  borderRadius: 999,
  padding: '9px 13px',
  fontWeight: 800,
  fontSize: 12,
  cursor: 'pointer',
} as const

const dangerButtonStyle = {
  ...buttonStyle,
  border: '1px solid rgba(248,113,113,.35)',
  background: 'rgba(248,113,113,.10)',
  color: '#fecaca',
} as const

const disabledButtonStyle = {
  ...buttonStyle,
  opacity: 0.55,
  cursor: 'not-allowed',
} as const

export default function DataImportWizard({ context }: DataImportWizardProps) {
  const [preview, setPreview] = useState<ImportPreviewResult | null>(null)
  const [mappings, setMappings] = useState<ImportColumnMapping[]>([])
  const [summary, setSummary] = useState<ImportValidationSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isReading, setIsReading] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [activateAfterImport, setActivateAfterImport] = useState(true)
  const [batches, setBatches] = useState<DataImportBatchListItem[]>([])
  const [isLoadingBatches, setIsLoadingBatches] = useState(false)
  const [exportingBatchId, setExportingBatchId] = useState<string | null>(null)

  const roleOptions = useMemo(() => buildRoleOptions(context.kpiNumbers), [context.kpiNumbers])
  const factRows = useMemo(() => (
    preview && summary && summary.errorCount === 0 ? buildFactRowsForImport(preview.rows, mappings) : []
  ), [mappings, preview, summary])
  const canImport = Boolean(preview && summary && summary.errorCount === 0 && factRows.length > 0 && !isImporting)

  useEffect(() => {
    void loadBatches()
  }, [])

  const handleFile = async (file: File | null) => {
    setError(null)
    setSuccess(null)
    setSummary(null)
    setPreview(null)
    setMappings([])

    if (!file) return

    const fileError = validateFileBeforeRead(file)
    if (fileError) {
      setError(fileError)
      return
    }

    setIsReading(true)
    try {
      const parsed = await parseImportFile(file)
      const initialMapping = buildInitialMapping(parsed.columns)
      setPreview(parsed)
      setMappings(initialMapping)
      setSummary(validateImportRows(parsed.rows, initialMapping, context))
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Dosya okunurken beklenmeyen bir hata oluştu.')
    } finally {
      setIsReading(false)
    }
  }

  const updateMapping = (sourceColumn: string, role: ImportColumnRole) => {
    if (!preview) return
    const nextMappings = mappings.map(mapping => (
      mapping.sourceColumn === sourceColumn ? { ...mapping, role } : mapping
    ))
    setMappings(nextMappings)
    setSummary(validateImportRows(preview.rows, nextMappings, context))
    setSuccess(null)
  }

  const reset = () => {
    setPreview(null)
    setMappings([])
    setSummary(null)
    setError(null)
    setSuccess(null)
  }

  const loadBatches = async () => {
    setIsLoadingBatches(true)
    try {
      setBatches(await fetchImportBatches())
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Import batch geçmişi okunamadı.')
    } finally {
      setIsLoadingBatches(false)
    }
  }

  const handleImport = async () => {
    if (!preview || !summary || !canImport) return
    setError(null)
    setSuccess(null)
    setIsImporting(true)

    try {
      const result = await persistImportBatch({
        fileName: preview.fileName,
        fileType: preview.fileType === 'json' ? 'json' : preview.fileType === 'xlsx' ? 'xlsx' : 'csv',
        summary,
        mappings,
        factRows,
        activateBatch: activateAfterImport,
      })
      setSuccess(`${result.batch.filename} import edildi. ${result.insertedFactRows} KPI fact satırı yazıldı.`)
      await loadBatches()
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Import kaydı oluşturulamadı.')
    } finally {
      setIsImporting(false)
    }
  }

  const handleActivateBatch = async (batchId: string) => {
    setError(null)
    setSuccess(null)
    try {
      await activateImportBatch(batchId)
      setSuccess('Aktif import batch güncellendi.')
      await loadBatches()
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Batch aktif edilemedi.')
    }
  }

  const handleExportBatch = async (batchId: string, format: 'csv' | 'json') => {
    setError(null)
    setSuccess(null)
    setExportingBatchId(`${batchId}:${format}`)

    try {
      const exported = await exportImportBatch(batchId, format)
      downloadTextFile(exported.fileName, exported.mimeType, exported.content)
      setSuccess(`${exported.fileName} indirilmeye hazırlandı.`)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Export dosyası hazırlanamadı.')
    } finally {
      setExportingBatchId(null)
    }
  }

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <section style={{ ...cardStyle, padding: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 900, color: '#60a5fa', letterSpacing: '.08em', textTransform: 'uppercase' }}>
              Prompt 6-B · Super Admin export
            </div>
            <h2 style={{ margin: '7px 0 6px', color: 'var(--tx)', fontSize: 20 }}>
              Dosya seç, valide et, Supabase import batch kaydı oluştur
            </h2>
            <p style={{ margin: 0, color: 'var(--tx3)', fontSize: 13, lineHeight: 1.6, maxWidth: 820 }}>
              Bu adım CSV/JSON/XLSX dosyasını data_import_batches ve kpi_fact_rows tablolarına yazar; import edilmiş batchler CSV/JSON olarak export edilebilir. Dashboard henüz bu batch verisini kullanmaz;
              dinamik KPI motoru bir sonraki promptta bağlanacak.
            </p>
          </div>

          <label style={buttonStyle}>
            {isReading ? 'Dosya okunuyor...' : 'CSV / JSON / XLSX seç'}
            <input
              type="file"
              accept=".csv,.json,.xlsx,.xls"
              onChange={event => void handleFile(event.target.files?.[0] ?? null)}
              style={{ display: 'none' }}
              disabled={isReading || isImporting}
            />
          </label>
        </div>

        {error && <Alert tone="error" text={error} />}
        {success && <Alert tone="success" text={success} />}

        <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10 }}>
          <Metric label="Desteklenen format" value="CSV / JSON / XLSX" hint="İlk çalışma sayfası okunur" />
          <Metric label="Preview limiti" value="20 satır" hint="Tüm satırlar validation ve import kapsamına girer" />
          <Metric label="KPI fact satırı" value={factRows.length} hint="Her KPI kolonu ayrı fact row olur" />
          <Metric label="Aktif batch" value={batches.find(batch => batch.is_active)?.filename ?? 'Yok'} hint="Dashboard bağlantısı Prompt 7/8’de yapılacak" />
        </div>
      </section>

      <BatchHistoryCard
        batches={batches}
        isLoading={isLoadingBatches}
        onRefresh={() => void loadBatches()}
        onActivate={batchId => void handleActivateBatch(batchId)}
        onExport={(batchId, format) => void handleExportBatch(batchId, format)}
        exportingBatchId={exportingBatchId}
      />

      {preview && (
        <>
          <section style={{ ...cardStyle, padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <div>
                <h2 style={{ margin: 0, color: 'var(--tx)', fontSize: 18 }}>Kolon eşleştirme</h2>
                <p style={{ margin: '6px 0 0', color: 'var(--tx3)', fontSize: 12, lineHeight: 1.55 }}>
                  Dosya: <strong>{preview.fileName}</strong> · {preview.rows.length} satır · {preview.columns.length} kolon
                </p>
              </div>
              <button type="button" onClick={reset} style={buttonStyle}>Yeni dosya seç</button>
            </div>

            <div style={{ marginTop: 14, overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Kaynak kolon</th>
                    <th style={thStyle}>Rol</th>
                    <th style={thStyle}>Örnek değer</th>
                  </tr>
                </thead>
                <tbody>
                  {mappings.map(mapping => (
                    <tr key={mapping.sourceColumn}>
                      <td style={tdStyle}>{mapping.sourceColumn}</td>
                      <td style={tdStyle}>
                        <select
                          value={mapping.role}
                          onChange={event => updateMapping(mapping.sourceColumn, event.target.value as ImportColumnRole)}
                          style={selectStyle}
                        >
                          {roleOptions.map(option => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      </td>
                      <td style={tdStyle}>{firstExampleValue(preview, mapping.sourceColumn) || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {summary && <ValidationSummaryCard summary={summary} />}

          <section style={{ ...cardStyle, padding: 18 }}>
            <h2 style={{ margin: 0, color: 'var(--tx)', fontSize: 18 }}>İlk 20 satır önizleme</h2>
            <p style={{ margin: '6px 0 14px', color: 'var(--tx3)', fontSize: 12 }}>
              Import onaylandığında tüm satırlar validation sonucuna göre Supabase’e yazılır.
            </p>

            <div style={{ overflowX: 'auto', border: '1px solid var(--bd)', borderRadius: 12 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Satır</th>
                    {preview.columns.map(column => <th key={column} style={thStyle}>{column}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {preview.previewRows.map(row => (
                    <tr key={row.rowNumber}>
                      <td style={tdStyle}>{row.rowNumber}</td>
                      {preview.columns.map(column => <td key={column} style={tdStyle}>{row.values[column] || '—'}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section style={{ ...cardStyle, padding: 18, display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <div>
              <h2 style={{ margin: 0, color: 'var(--tx)', fontSize: 18 }}>Import onayı</h2>
              <p style={{ margin: '6px 0 0', color: 'var(--tx3)', fontSize: 12, lineHeight: 1.55 }}>
                Validation hatası yoksa batch ve KPI fact satırları Supabase’e yazılır. Aktif batch seçeneği açıksa mevcut aktif batch pasif olur.
              </p>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--tx2)', fontSize: 13, marginTop: 10 }}>
                <input
                  type="checkbox"
                  checked={activateAfterImport}
                  onChange={event => setActivateAfterImport(event.target.checked)}
                />
                Import sonrası bu batch aktif veri kaynağı olsun
              </label>
            </div>
            <button type="button" style={canImport ? dangerButtonStyle : disabledButtonStyle} disabled={!canImport} onClick={() => void handleImport()}>
              {isImporting ? 'Import ediliyor...' : 'Importu Onayla'}
            </button>
          </section>
        </>
      )}
    </div>
  )
}

function BatchHistoryCard({
  batches,
  isLoading,
  onRefresh,
  onActivate,
  onExport,
  exportingBatchId,
}: {
  batches: DataImportBatchListItem[]
  isLoading: boolean
  onRefresh: () => void
  onActivate: (batchId: string) => void
  onExport: (batchId: string, format: 'csv' | 'json') => void
  exportingBatchId: string | null
}) {
  return (
    <section style={{ ...cardStyle, padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, color: 'var(--tx)', fontSize: 18 }}>Import batch geçmişi</h2>
          <p style={{ margin: '6px 0 0', color: 'var(--tx3)', fontSize: 12 }}>
            Son importlar ve aktif batch durumu. Dashboard bağlantısı sonraki promptta yapılacak.
          </p>
        </div>
        <button type="button" style={buttonStyle} onClick={onRefresh} disabled={isLoading}>{isLoading ? 'Yükleniyor...' : 'Yenile'}</button>
      </div>

      <div style={{ marginTop: 14, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 820 }}>
          <thead>
            <tr>
              <th style={thStyle}>Durum</th>
              <th style={thStyle}>Dosya</th>
              <th style={thStyle}>Satır</th>
              <th style={thStyle}>Uyarı</th>
              <th style={thStyle}>Tarih</th>
              <th style={thStyle}>İşlem</th>
              <th style={thStyle}>Export</th>
            </tr>
          </thead>
          <tbody>
            {batches.length === 0 && (
              <tr><td colSpan={7} style={{ ...tdStyle, textAlign: 'center', color: 'var(--tx3)', padding: 22 }}>Henüz import batch yok.</td></tr>
            )}
            {batches.map(batch => (
              <tr key={batch.id}>
                <td style={tdStyle}>{batch.is_active ? <Badge tone="success">Aktif</Badge> : <Badge tone="neutral">Pasif</Badge>}</td>
                <td style={tdStyle}>{batch.filename}<div style={{ color: 'var(--tx3)', fontSize: 11 }}>{batch.status} · {batch.file_type}</div></td>
                <td style={tdStyle}>{batch.valid_rows}/{batch.total_rows}</td>
                <td style={tdStyle}>{batch.warning_count}</td>
                <td style={tdStyle}>{formatDate(batch.imported_at ?? batch.created_at)}</td>
                <td style={tdStyle}>
                  <button
                    type="button"
                    style={batch.is_active ? disabledButtonStyle : buttonStyle}
                    disabled={batch.is_active}
                    onClick={() => onActivate(batch.id)}
                  >
                    Aktif yap
                  </button>
                </td>
                <td style={tdStyle}>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      style={exportingBatchId === `${batch.id}:csv` ? disabledButtonStyle : buttonStyle}
                      disabled={Boolean(exportingBatchId)}
                      onClick={() => onExport(batch.id, 'csv')}
                    >
                      {exportingBatchId === `${batch.id}:csv` ? 'CSV...' : 'CSV'}
                    </button>
                    <button
                      type="button"
                      style={exportingBatchId === `${batch.id}:json` ? disabledButtonStyle : buttonStyle}
                      disabled={Boolean(exportingBatchId)}
                      onClick={() => onExport(batch.id, 'json')}
                    >
                      {exportingBatchId === `${batch.id}:json` ? 'JSON...' : 'JSON'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function Metric({ label, value, hint }: { label: string; value: string | number; hint: string }) {
  return (
    <div style={{ border: '1px solid var(--bd)', borderRadius: 14, padding: 14, background: 'rgba(148,163,184,.06)' }}>
      <div style={{ color: 'var(--tx3)', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em' }}>{label}</div>
      <div style={{ color: 'var(--tx)', fontWeight: 900, fontSize: 20, marginTop: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div>
      <div style={{ color: 'var(--tx3)', fontSize: 12, marginTop: 6, lineHeight: 1.45 }}>{hint}</div>
    </div>
  )
}

function ValidationSummaryCard({ summary }: { summary: ImportValidationSummary }) {
  const canContinue = summary.errorCount === 0

  return (
    <section style={{ ...cardStyle, padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, color: 'var(--tx)', fontSize: 18 }}>Validation özeti</h2>
          <p style={{ margin: '6px 0 0', color: 'var(--tx3)', fontSize: 12 }}>
            {canContinue ? 'Import onaylanabilir.' : 'Hatalar düzeltilmeden import yapılamaz.'}
          </p>
        </div>
        <Badge tone={canContinue ? 'success' : 'error'}>{canContinue ? 'Geçti' : 'Hata var'}</Badge>
      </div>

      <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10 }}>
        <Metric label="Toplam satır" value={summary.totalRows} hint="Dosyada okunan satır" />
        <Metric label="Geçerli satır" value={summary.validRows} hint="Satır bazlı kritik hata yok" />
        <Metric label="Hatalı satır" value={summary.errorRows} hint="Importu engeller" />
        <Metric label="Uyarı" value={summary.warningCount} hint="Importu engellemez" />
      </div>

      {summary.issues.length > 0 && (
        <div style={{ marginTop: 14, maxHeight: 260, overflow: 'auto', border: '1px solid var(--bd)', borderRadius: 12 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
            <thead>
              <tr>
                <th style={thStyle}>Tip</th>
                <th style={thStyle}>Satır</th>
                <th style={thStyle}>Kolon</th>
                <th style={thStyle}>Mesaj</th>
              </tr>
            </thead>
            <tbody>
              {summary.issues.slice(0, 80).map((issue, index) => (
                <tr key={`${issue.rowNumber ?? 'global'}-${issue.column ?? 'none'}-${index}`}>
                  <td style={tdStyle}>{issue.severity === 'error' ? <Badge tone="error">Hata</Badge> : <Badge tone="warning">Uyarı</Badge>}</td>
                  <td style={tdStyle}>{issue.rowNumber ?? '—'}</td>
                  <td style={tdStyle}>{issue.column ?? '—'}</td>
                  <td style={tdStyle}>{issue.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function Alert({ tone, text }: { tone: 'error' | 'success'; text: string }) {
  const style = tone === 'error'
    ? { border: '1px solid rgba(248,113,113,.35)', background: 'rgba(248,113,113,.10)', color: '#fecaca' }
    : { border: '1px solid rgba(52,211,153,.35)', background: 'rgba(52,211,153,.10)', color: '#a7f3d0' }

  return <div style={{ ...style, marginTop: 14, padding: 12, borderRadius: 12, fontSize: 13, lineHeight: 1.5 }}>{text}</div>
}

function Badge({ tone, children }: { tone: 'success' | 'error' | 'warning' | 'neutral'; children: React.ReactNode }) {
  const colors = {
    success: { color: '#a7f3d0', background: 'rgba(16,185,129,.14)', border: 'rgba(16,185,129,.35)' },
    error: { color: '#fecaca', background: 'rgba(239,68,68,.14)', border: 'rgba(239,68,68,.35)' },
    warning: { color: '#fde68a', background: 'rgba(245,158,11,.14)', border: 'rgba(245,158,11,.35)' },
    neutral: { color: 'var(--tx2)', background: 'rgba(148,163,184,.10)', border: 'var(--bd)' },
  }[tone]

  return (
    <span style={{ display: 'inline-flex', border: `1px solid ${colors.border}`, background: colors.background, color: colors.color, borderRadius: 999, padding: '5px 9px', fontSize: 11, fontWeight: 900 }}>
      {children}
    </span>
  )
}

function downloadTextFile(fileName: string, mimeType: string, content: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

function buildRoleOptions(kpiNumbers: number[]) {
  const baseRoles: ImportColumnRole[] = ['ignore', 'segment', 'region', 'age_group', 'period', 'brand', 'work_order_count', 'service_count']
  const kpiRoles = kpiNumbers.map(number => `kpi_${number}` as ImportColumnRole)
  return [...baseRoles, ...kpiRoles].map(value => ({ value, label: roleLabel(value) }))
}

function firstExampleValue(preview: ImportPreviewResult, column: string) {
  const found = preview.previewRows.find(row => row.values[column]?.trim())
  return found?.values[column] ?? ''
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
  } catch {
    return value
  }
}

const thStyle = {
  textAlign: 'left',
  color: 'var(--tx3)',
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: '.06em',
  padding: '10px 12px',
  borderBottom: '1px solid var(--bd)',
  whiteSpace: 'nowrap',
} as const

const tdStyle = {
  color: 'var(--tx)',
  fontSize: 13,
  padding: '10px 12px',
  borderBottom: '1px solid var(--bd)',
  verticalAlign: 'middle',
} as const

const selectStyle = {
  width: '100%',
  minWidth: 180,
  borderRadius: 10,
  border: '1px solid var(--bd)',
  background: 'var(--bg)',
  color: 'var(--tx)',
  padding: '8px 10px',
} as const
