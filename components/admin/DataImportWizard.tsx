'use client'

import { useMemo, useState } from 'react'
import {
  buildInitialMapping,
  parseImportFile,
  roleLabel,
  validateFileBeforeRead,
  validateImportRows,
} from '@/lib/admin/import-validation'
import type {
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
  const [isReading, setIsReading] = useState(false)

  const roleOptions = useMemo(() => buildRoleOptions(context.kpiNumbers), [context.kpiNumbers])

  const handleFile = async (file: File | null) => {
    setError(null)
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
  }

  const reset = () => {
    setPreview(null)
    setMappings([])
    setSummary(null)
    setError(null)
  }

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <section style={{ ...cardStyle, padding: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 900, color: '#60a5fa', letterSpacing: '.08em', textTransform: 'uppercase' }}>
              Prompt 5 · Güvenli önizleme
            </div>
            <h2 style={{ margin: '7px 0 6px', color: 'var(--tx)', fontSize: 20 }}>
              Dosya seç, kolonları eşleştir, validasyonu gör
            </h2>
            <p style={{ margin: 0, color: 'var(--tx3)', fontSize: 13, lineHeight: 1.6, maxWidth: 780 }}>
              Bu adım dashboard verisini değiştirmez ve Supabase kaydı oluşturmaz. Amaç import öncesi dosyanın okunabilir,
              eşleştirilebilir ve kalite açısından güvenli olup olmadığını göstermektir.
            </p>
          </div>

          <label style={buttonStyle}>
            {isReading ? 'Dosya okunuyor...' : 'CSV / JSON seç'}
            <input
              type="file"
              accept=".csv,.json,.xlsx,.xls"
              onChange={event => void handleFile(event.target.files?.[0] ?? null)}
              style={{ display: 'none' }}
              disabled={isReading}
            />
          </label>
        </div>

        {error && (
          <div style={{ marginTop: 14, border: '1px solid rgba(248,113,113,.35)', background: 'rgba(248,113,113,.10)', color: '#fecaca', padding: 12, borderRadius: 12, fontSize: 13, lineHeight: 1.5 }}>
            {error}
          </div>
        )}

        <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10 }}>
          <Metric label="Desteklenen format" value="CSV / JSON" hint="XLSX sonraki adımda persistence ile ele alınacak" />
          <Metric label="Preview limiti" value="20 satır" hint="Tüm satırlar validation özetine dahil edilir" />
          <Metric label="KPI kolonu" value={context.kpiNumbers.length} hint="Dinamik KPI eşleştirme seçenekleri" />
          <Metric label="Veri yazma" value="Kapalı" hint="Bu prompt sadece kontrol akışı kurar" />
        </div>
      </section>

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
              Bu tablo sadece kontrol amaçlıdır; bu promptta import kaydı oluşturulmaz.
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
                Kayıt işlemi Prompt 6’da Supabase batch persistence ile eklenecek. Bu buton şimdilik bilinçli olarak pasif bırakıldı.
              </p>
            </div>
            <button type="button" style={disabledButtonStyle} disabled>
              Prompt 6’da aktif olacak
            </button>
          </section>
        </>
      )}
    </div>
  )
}

function Metric({ label, value, hint }: { label: string; value: string | number; hint: string }) {
  return (
    <div style={{ border: '1px solid var(--bd)', borderRadius: 14, padding: 14, background: 'rgba(148,163,184,.06)' }}>
      <div style={{ color: 'var(--tx3)', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em' }}>{label}</div>
      <div style={{ color: 'var(--tx)', fontWeight: 900, fontSize: 24, marginTop: 8 }}>{value}</div>
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
            {canContinue ? 'Kritik hata görünmüyor. Uyarıları kontrol ederek sonraki promptta import edilebilir.' : 'Kritik hatalar var. Import öncesi düzeltilmeli.'}
          </p>
        </div>
        <span style={{ border: `1px solid ${canContinue ? 'rgba(52,211,153,.35)' : 'rgba(248,113,113,.35)'}`, color: canContinue ? '#34d399' : '#fca5a5', background: canContinue ? 'rgba(52,211,153,.10)' : 'rgba(248,113,113,.10)', borderRadius: 999, padding: '8px 12px', fontSize: 12, fontWeight: 900 }}>
          {canContinue ? 'Ön kontrol uygun' : 'Düzeltme gerekli'}
        </span>
      </div>

      <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
        <Metric label="Toplam satır" value={summary.totalRows} hint="Dosyada okunan satır" />
        <Metric label="Geçerli satır" value={summary.validRows} hint="Kritik satır hatası olmayan" />
        <Metric label="Hatalı satır" value={summary.errorRows} hint="Import öncesi düzeltilmeli" />
        <Metric label="Uyarı" value={summary.warningCount} hint="Coverage veya mapping etkileyebilir" />
      </div>

      {summary.issues.length > 0 && (
        <div style={{ marginTop: 14, display: 'grid', gap: 8, maxHeight: 280, overflow: 'auto', paddingRight: 4 }}>
          {summary.issues.slice(0, 60).map((issue, index) => (
            <div key={`${issue.rowNumber ?? 'global'}-${issue.column ?? 'general'}-${index}`} style={{ border: `1px solid ${issue.severity === 'error' ? 'rgba(248,113,113,.30)' : 'rgba(245,158,11,.30)'}`, background: issue.severity === 'error' ? 'rgba(248,113,113,.08)' : 'rgba(245,158,11,.08)', color: 'var(--tx2)', borderRadius: 12, padding: 10, fontSize: 12, lineHeight: 1.5 }}>
              <strong style={{ color: issue.severity === 'error' ? '#fca5a5' : '#fbbf24', textTransform: 'uppercase' }}>
                {issue.severity === 'error' ? 'Hata' : 'Uyarı'}
              </strong>
              {issue.rowNumber ? ` · Satır ${issue.rowNumber}` : ''}
              {issue.column ? ` · ${issue.column}` : ''}: {issue.message}
            </div>
          ))}
          {summary.issues.length > 60 && (
            <div style={{ color: 'var(--tx3)', fontSize: 12 }}>İlk 60 sorun gösteriliyor. Toplam sorun: {summary.issues.length}</div>
          )}
        </div>
      )}
    </section>
  )
}

function buildRoleOptions(kpiNumbers: number[]) {
  const baseRoles: ImportColumnRole[] = [
    'ignore',
    'segment',
    'region',
    'age_group',
    'period',
    'brand',
    'work_order_count',
    'service_count',
  ]

  return [
    ...baseRoles.map(role => ({ value: role, label: roleLabel(role) })),
    ...kpiNumbers.map(kpiNo => ({ value: `kpi_${kpiNo}` as ImportColumnRole, label: `KPI ${kpiNo}` })),
  ]
}

function firstExampleValue(preview: ImportPreviewResult, column: string) {
  return preview.previewRows.find(row => row.values[column]?.trim())?.values[column] ?? ''
}

const thStyle = {
  textAlign: 'left',
  color: 'var(--tx3)',
  fontSize: 11,
  fontWeight: 900,
  textTransform: 'uppercase',
  letterSpacing: '.06em',
  borderBottom: '1px solid var(--bd)',
  padding: '10px 12px',
  whiteSpace: 'nowrap',
} as const

const tdStyle = {
  color: 'var(--tx2)',
  fontSize: 12,
  borderBottom: '1px solid var(--bd)',
  padding: '10px 12px',
  whiteSpace: 'nowrap',
} as const

const selectStyle = {
  width: '100%',
  minWidth: 180,
  background: 'var(--surf2)',
  color: 'var(--tx)',
  border: '1px solid var(--bd)',
  borderRadius: 10,
  padding: '8px 10px',
  fontSize: 12,
} as const
