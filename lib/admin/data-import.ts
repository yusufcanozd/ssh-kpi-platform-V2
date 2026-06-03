// lib/admin/data-import.ts
// Prompt 8 — CSV/JSON data import: parse, kolon eşleştirme, validation, DB yazımı.
// Bağımlılık yok (CSV manuel parse). XLSX için sonradan SheetJS eklenebilir.

import type { SupabaseClient } from '@supabase/supabase-js'
import { BOLGELER, SEGMENTLER, DONEMLER } from '@/lib/kpi'

export type CanonicalField =
  | 'period' | 'segment' | 'region' | 'ageGroup' | 'brand'
  | 'workOrderCount' | 'serviceCount'
  | 'kpi1' | 'kpi2' | 'kpi3' | 'kpi4' | 'kpi5' | 'kpi6'
  | 'kpi7' | 'kpi8' | 'kpi9' | 'kpi10' | 'kpi11' | 'kpi12'

export interface FieldDef { key: CanonicalField; label: string; kind: 'dim' | 'kpi' | 'count' }

export const FIELD_DEFS: FieldDef[] = [
  { key: 'period', label: 'Dönem', kind: 'dim' },
  { key: 'segment', label: 'Segment', kind: 'dim' },
  { key: 'region', label: 'Bölge', kind: 'dim' },
  { key: 'ageGroup', label: 'Yaş Grubu', kind: 'dim' },
  { key: 'brand', label: 'Marka', kind: 'dim' },
  { key: 'workOrderCount', label: 'İş Emri Sayısı', kind: 'count' },
  { key: 'serviceCount', label: 'Servis Sayısı', kind: 'count' },
  ...Array.from({ length: 12 }, (_, i) => ({ key: `kpi${i + 1}` as CanonicalField, label: `KPI ${i + 1}`, kind: 'kpi' as const })),
]

export type ColumnMapping = Partial<Record<CanonicalField, string>>

export interface ParsedFile {
  headers: string[]
  rows: Record<string, string>[]
  fileType: 'csv' | 'json'
}

export interface ValidationResult {
  totalRows: number
  validRows: number
  errorRows: number
  warningCount: number
  messages: string[]
}

export interface PersistResult<T> { data?: T; error?: string }

// ── Parse ───────────────────────────────────────────────────────
function detectDelimiter(line: string): string {
  const semi = (line.match(/;/g) || []).length
  const comma = (line.match(/,/g) || []).length
  const tab = (line.match(/\t/g) || []).length
  if (tab >= semi && tab >= comma) return '\t'
  return semi > comma ? ';' : ','
}

function parseCsvLine(line: string, delim: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQ = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQ) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++ }
      else if (ch === '"') inQ = false
      else cur += ch
    } else {
      if (ch === '"') inQ = true
      else if (ch === delim) { out.push(cur); cur = '' }
      else cur += ch
    }
  }
  out.push(cur)
  return out.map(c => c.trim())
}

export function parseFile(filename: string, content: string): ParsedFile {
  const lower = filename.toLowerCase()
  if (lower.endsWith('.json')) {
    const parsed = JSON.parse(content)
    const arr: unknown[] = Array.isArray(parsed) ? parsed : (Array.isArray((parsed as { rows?: unknown[] })?.rows) ? (parsed as { rows: unknown[] }).rows : [])
    const rows = arr.map(item => {
      const obj: Record<string, string> = {}
      if (item && typeof item === 'object') {
        Object.entries(item as Record<string, unknown>).forEach(([k, v]) => { obj[k] = v == null ? '' : String(v) })
      }
      return obj
    })
    const headers = rows.length ? Object.keys(rows[0]) : []
    return { headers, rows, fileType: 'json' }
  }
  // CSV / TSV
  const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim().length > 0)
  if (!lines.length) return { headers: [], rows: [], fileType: 'csv' }
  const delim = detectDelimiter(lines[0])
  const headers = parseCsvLine(lines[0], delim)
  const rows = lines.slice(1).map(line => {
    const cells = parseCsvLine(line, delim)
    const obj: Record<string, string> = {}
    headers.forEach((h, i) => { obj[h] = cells[i] ?? '' })
    return obj
  })
  return { headers, rows, fileType: 'csv' }
}

// ── Otomatik kolon eşleştirme (başlık adına göre) ────────────────
const HINTS: Record<CanonicalField, string[]> = {
  period: ['dönem', 'donem', 'period', 'tarih', 'ay', 'çeyrek', 'ceyrek', 'q'],
  segment: ['segment', 'seg'],
  region: ['bölge', 'bolge', 'region', 'il', 'şehir', 'sehir'],
  ageGroup: ['yaş', 'yas', 'age'],
  brand: ['marka', 'brand'],
  workOrderCount: ['iş emri', 'is emri', 'work order', 'wo', 'io'],
  serviceCount: ['servis', 'service'],
  kpi1: ['kpi1', 'kpi 1', 'aktif müşteri'], kpi2: ['kpi2', 'kpi 2', 'tutundurma'],
  kpi3: ['kpi3', 'kpi 3', 'kullanım'], kpi4: ['kpi4', 'kpi 4', 'işçilik saat'],
  kpi5: ['kpi5', 'kpi 5', 'işçilik tutar'], kpi6: ['kpi6', 'kpi 6', 'parça'],
  kpi7: ['kpi7', 'kpi 7', 'süre'], kpi8: ['kpi8', 'kpi 8', 'hacim'],
  kpi9: ['kpi9', 'kpi 9', 'servis başına iş'], kpi10: ['kpi10', 'kpi 10', 'servis başına aktif'],
  kpi11: ['kpi11', 'kpi 11', 'garanti'], kpi12: ['kpi12', 'kpi 12', 'periyodik'],
}

export function autoMap(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {}
  const used = new Set<string>()
  FIELD_DEFS.forEach(def => {
    const hints = HINTS[def.key]
    const found = headers.find(h => {
      if (used.has(h)) return false
      const hl = h.toLocaleLowerCase('tr-TR')
      return hints.some(hint => hl.includes(hint))
    })
    if (found) { mapping[def.key] = found; used.add(found) }
  })
  return mapping
}

// ── Validation ───────────────────────────────────────────────────
function isNumeric(value: string): boolean {
  if (!value.trim()) return false
  return Number.isFinite(Number(value.replace(',', '.')))
}

export function validate(parsed: ParsedFile, mapping: ColumnMapping): ValidationResult {
  const messages: string[] = []
  const mappedKpis = FIELD_DEFS.filter(d => d.kind === 'kpi' && mapping[d.key])
  if (!mapping.period) messages.push('Zorunlu kolon eksik: Dönem eşleştirilmedi.')
  if (mappedKpis.length === 0) messages.push('En az bir KPI kolonu eşleştirilmeli.')

  const knownSegments = new Set((SEGMENTLER ?? []).map(s => s.toLocaleLowerCase('tr-TR')))
  const knownRegions = new Set((BOLGELER ?? []).map(s => s.toLocaleLowerCase('tr-TR')))
  const knownPeriods = new Set((DONEMLER ?? []).map(s => s.toLocaleLowerCase('tr-TR')))

  let validRows = 0, errorRows = 0, warningCount = 0
  const sample = (msg: string) => { if (messages.length < 25) messages.push(msg) }

  parsed.rows.forEach((row, idx) => {
    let rowError = false
    const line = idx + 2 // başlık + 1

    if (mapping.period) {
      const period = row[mapping.period] ?? ''
      if (!period.trim()) { sample(`Satır ${line}: Dönem boş.`); rowError = true }
      else if (knownPeriods.size && !knownPeriods.has(period.toLocaleLowerCase('tr-TR'))) { sample(`Satır ${line}: Bilinmeyen dönem "${period}" (uyarı).`); warningCount++ }
    }
    if (mapping.segment) {
      const seg = row[mapping.segment] ?? ''
      if (seg.trim() && knownSegments.size && !knownSegments.has(seg.toLocaleLowerCase('tr-TR'))) { sample(`Satır ${line}: Bilinmeyen segment "${seg}" (uyarı).`); warningCount++ }
    }
    if (mapping.region) {
      const reg = row[mapping.region] ?? ''
      if (reg.trim() && knownRegions.size && !knownRegions.has(reg.toLocaleLowerCase('tr-TR'))) { sample(`Satır ${line}: Bilinmeyen bölge "${reg}" (uyarı).`); warningCount++ }
    }
    let hasAnyKpi = false
    mappedKpis.forEach(def => {
      const raw = row[mapping[def.key] as string] ?? ''
      if (raw.trim()) {
        if (!isNumeric(raw)) { sample(`Satır ${line}: ${def.label} sayısal değil ("${raw}").`); rowError = true }
        else hasAnyKpi = true
      }
    })
    if (!hasAnyKpi && !rowError) { warningCount++ }
    if (rowError) errorRows++; else validRows++
  })

  return { totalRows: parsed.rows.length, validRows, errorRows, warningCount, messages }
}

// ── DB yazımı ────────────────────────────────────────────────────
function slugBrand(name: string): string {
  return name.toLocaleUpperCase('tr-TR')
    .replace(/Ğ/g, 'G').replace(/Ü/g, 'U').replace(/Ş/g, 'S').replace(/İ/g, 'I').replace(/Ö/g, 'O').replace(/Ç/g, 'C')
    .replace(/[^A-Z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

/** Datadaki markaları brands tablosunda yoksa açar, isim→id haritası döner. */
export async function autoProvisionBrands(supabase: SupabaseClient, names: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  const unique = Array.from(new Set(names.map(n => n.trim()).filter(Boolean)))
  if (!unique.length) return map
  // mevcutları çek
  const { data: existing } = await supabase.from('brands').select('id, name')
  const byName = new Map<string, string>()
  if (Array.isArray(existing)) existing.forEach(b => { const r = b as { id?: string; name?: string }; if (r.id && r.name) byName.set(r.name.toLocaleLowerCase('tr-TR'), r.id) })

  const toInsert = unique.filter(n => !byName.has(n.toLocaleLowerCase('tr-TR')))
    .map(n => ({ code: slugBrand(n) || n, name: n, is_active: true, is_hidden: false, data_source: 'import' }))
  if (toInsert.length) {
    const { data: inserted } = await supabase.from('brands').upsert(toInsert, { onConflict: 'code' }).select('id, name')
    if (Array.isArray(inserted)) inserted.forEach(b => { const r = b as { id?: string; name?: string }; if (r.id && r.name) byName.set(r.name.toLocaleLowerCase('tr-TR'), r.id) })
  }
  unique.forEach(n => { const id = byName.get(n.toLocaleLowerCase('tr-TR')); if (id) map.set(n, id) })
  return map
}

export interface ImportOutcome { batchId: string; factCount: number; provisionedBrands: number }

export async function runImport(
  supabase: SupabaseClient,
  filename: string,
  parsed: ParsedFile,
  mapping: ColumnMapping,
  validation: ValidationResult,
  makeActive: boolean,
): Promise<PersistResult<ImportOutcome>> {
  try {
    // 1) batch kaydı
    const { data: authData } = await supabase.auth.getUser()
    const { data: batch, error: batchError } = await supabase.from('data_import_batches').insert({
      filename,
      file_type: parsed.fileType,
      status: 'imported',
      total_rows: validation.totalRows,
      valid_rows: validation.validRows,
      error_rows: validation.errorRows,
      warning_count: validation.warningCount,
      is_active: makeActive,
      imported_by: authData.user?.id ?? null,
      imported_at: new Date().toISOString(),
    }).select('id').single()
    if (batchError || !batch) return { error: batchError?.message ?? 'Batch oluşturulamadı.' }
    const batchId = (batch as { id: string }).id

    // 2) marka auto-provision
    let brandMap = new Map<string, string>()
    if (mapping.brand) {
      const names = parsed.rows.map(r => r[mapping.brand as string] ?? '')
      brandMap = await autoProvisionBrands(supabase, names)
    }

    // 3) fact rows (KPI kolonlarını unpivot et)
    const mappedKpis = FIELD_DEFS.filter(d => d.kind === 'kpi' && mapping[d.key])
    const facts: Record<string, unknown>[] = []
    parsed.rows.forEach(row => {
      const period = mapping.period ? (row[mapping.period] ?? '') : ''
      const segment = mapping.segment ? (row[mapping.segment] ?? '') : null
      const region = mapping.region ? (row[mapping.region] ?? '') : null
      const ageGroup = mapping.ageGroup ? (row[mapping.ageGroup] ?? '') : null
      const brandName = mapping.brand ? (row[mapping.brand] ?? '') : ''
      const brandId = brandName ? (brandMap.get(brandName.trim()) ?? null) : null
      const woc = mapping.workOrderCount ? Number((row[mapping.workOrderCount] ?? '').replace(',', '.')) : null
      const svc = mapping.serviceCount ? Number((row[mapping.serviceCount] ?? '').replace(',', '.')) : null
      mappedKpis.forEach(def => {
        const raw = (row[mapping[def.key] as string] ?? '').replace(',', '.')
        if (!raw.trim() || !Number.isFinite(Number(raw))) return
        facts.push({
          batch_id: batchId,
          segment: segment || null,
          region: region || null,
          age_group: ageGroup || null,
          period: period || null,
          brand_id: brandId,
          kpi_no: Number(def.key.replace('kpi', '')),
          kpi_value: Number(raw),
          work_order_count: woc != null && Number.isFinite(woc) ? woc : null,
          service_count: svc != null && Number.isFinite(svc) ? svc : null,
        })
      })
    })

    // 4) chunked insert
    const CHUNK = 500
    for (let i = 0; i < facts.length; i += CHUNK) {
      const { error: factError } = await supabase.from('kpi_fact_rows').insert(facts.slice(i, i + CHUNK))
      if (factError) return { error: `Satır yazımı hatası: ${factError.message}` }
    }

    // 5) aktif batch tekilliği
    if (makeActive) {
      await supabase.from('data_import_batches').update({ is_active: false }).eq('is_active', true).neq('id', batchId)
    }

    // 6) audit
    try {
      await supabase.from('audit_logs').insert({
        actor_id: authData.user?.id ?? null, action: 'import', entity: 'data_import_batch', entity_id: batchId,
        summary: `${filename} içe aktarıldı (${facts.length} fact)`, metadata: { total: validation.totalRows, facts: facts.length, brands: brandMap.size },
      })
    } catch { /* audit kritik değil */ }

    return { data: { batchId, factCount: facts.length, provisionedBrands: brandMap.size } }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Bilinmeyen import hatası.' }
  }
}
