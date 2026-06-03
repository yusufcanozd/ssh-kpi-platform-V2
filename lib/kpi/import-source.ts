import { createClient } from '@/lib/supabase/client'
import { KAT_YAPILAR, KPI_META } from './config'
import type { CubeRow } from './data'
import type { DataSourceMarkaRow, KpiRuntimeData, KpiRuntimeDimensions } from './data-source-types'

type ImportBatchRow = {
  id: string
  filename: string
  file_type: 'csv' | 'json' | 'xlsx'
  status: 'pending' | 'validated' | 'imported' | 'failed'
  total_rows: number
  valid_rows: number
  error_rows: number
  warning_count: number
  is_active: boolean
  created_at: string
  imported_at: string | null
}

type KpiFactRuntimeRow = {
  id: string
  batch_id: string
  segment: string | null
  region: string | null
  age_group: string | null
  period: string | null
  brand_id: string | null
  kpi_no: number | null
  kpi_value: number | null
  work_order_count: number | null
  service_count: number | null
  created_at: string
}

type BrandInfo = { name: string; segment: string }

const FACT_READ_PAGE_SIZE = 1000

export async function fetchImportedRuntimeData(): Promise<KpiRuntimeData | null> {
  const activeBatch = await fetchActiveImportBatch()
  if (!activeBatch) return null

  const factRows = await fetchFactRows(activeBatch.id)
  if (factRows.length === 0) {
    return {
      source: {
        kind: 'supabase-import',
        label: `Aktif import: ${activeBatch.filename}`,
        isDynamic: true,
        hasActiveBatch: true,
        rowCount: 0,
        factRowCount: 0,
        warning: 'Aktif import batch bulundu ancak kpi_fact_rows satırı yok. Fallback kullanılmalı.',
        batch: toBatchInfo(activeBatch),
      },
      cubeRows: [],
      markaRows: [],
      dimensions: emptyDimensions(),
    }
  }

  const cubeRows = factRowsToCubeRows(factRows)
  const brandMap = await fetchBrandMap()
  const markaRows = buildMarkaRows(factRows, cubeRows, brandMap)

  return {
    source: {
      kind: 'supabase-import',
      label: `Aktif import: ${activeBatch.filename}`,
      isDynamic: true,
      hasActiveBatch: true,
      rowCount: cubeRows.length,
      factRowCount: factRows.length,
      batch: toBatchInfo(activeBatch),
    },
    cubeRows,
    markaRows,
    dimensions: buildDimensions(cubeRows),
  }
}

async function fetchActiveImportBatch(): Promise<ImportBatchRow | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('data_import_batches')
    .select('id, filename, file_type, status, total_rows, valid_rows, error_rows, warning_count, is_active, created_at, imported_at')
    .eq('is_active', true)
    .eq('status', 'imported')
    .order('imported_at', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return (data ?? null) as ImportBatchRow | null
}

async function fetchFactRows(batchId: string): Promise<KpiFactRuntimeRow[]> {
  const supabase = createClient()
  const allRows: KpiFactRuntimeRow[] = []

  for (let from = 0; ; from += FACT_READ_PAGE_SIZE) {
    const to = from + FACT_READ_PAGE_SIZE - 1
    const { data, error } = await supabase
      .from('kpi_fact_rows')
      .select('id, batch_id, segment, region, age_group, period, brand_id, kpi_no, kpi_value, work_order_count, service_count, created_at')
      .eq('batch_id', batchId)
      .order('created_at', { ascending: true })
      .range(from, to)

    if (error) throw new Error(error.message)

    const pageRows = (data ?? []) as unknown as KpiFactRuntimeRow[]
    allRows.push(...pageRows)
    if (pageRows.length < FACT_READ_PAGE_SIZE) break
  }

  return allRows
}

async function fetchBrandMap(): Promise<Map<string, BrandInfo>> {
  const map = new Map<string, BrandInfo>()
  try {
    const supabase = createClient()
    const { data } = await supabase.from('brands').select('id, name, segment')
    if (Array.isArray(data)) {
      data.forEach(row => {
        const r = row as { id?: string; name?: string; segment?: string | null }
        if (r.id && r.name) map.set(r.id, { name: r.name, segment: (r.segment ?? '').trim() })
      })
    }
  } catch {
    // marka tablosu okunamazsa marka skoru üretilmez (statik fallback devreye girer)
  }
  return map
}

// ─────────────────────────────────────────────────────────────
// Cube üretimi — agrega ("" segment / "" bölge / "Tümü" yaş) satırları DAHİL.
// Referans hücreleri (national / same-filter) bu sayede boş kalmaz.
// ─────────────────────────────────────────────────────────────
type CubeAcc = { sums: number[]; counts: number[]; n: number; servis: number; seenRows: Set<string> }

function ensureCubeAcc(map: Map<string, CubeAcc>, key: string): CubeAcc {
  let acc = map.get(key)
  if (!acc) {
    acc = { sums: KPI_META.map(() => 0), counts: KPI_META.map(() => 0), n: 0, servis: 0, seenRows: new Set() }
    map.set(key, acc)
  }
  return acc
}

function factRowsToCubeRows(rows: KpiFactRuntimeRow[]): CubeRow[] {
  const cells = new Map<string, CubeAcc>()

  // Aynı kaynak fact satırının farklı kpi_no kayıtlarını n/servis için tekilleştir.
  const rowGroupId = (r: KpiFactRuntimeRow) =>
    `${r.segment ?? ''}|${r.region ?? ''}|${r.age_group ?? ''}|${r.period ?? ''}|${r.brand_id ?? ''}`

  for (const row of rows) {
    const segment = normalizeDimension(row.segment)
    const region = normalizeDimension(row.region)
    const ageGroup = normalizeDimension(row.age_group) || 'Tümü'
    const period = normalizeDimension(row.period)
    if (!period) continue
    if (!row.kpi_no || row.kpi_no < 1 || row.kpi_no > KPI_META.length) continue
    const idx = row.kpi_no - 1
    const val = toFiniteNumberOrNull(row.kpi_value)

    const segParts = segment ? [segment, ''] : ['']
    const bolgeParts = region ? [region, ''] : ['']
    const yasParts = ageGroup !== 'Tümü' ? [ageGroup, 'Tümü'] : ['Tümü']
    const grpId = rowGroupId(row)

    for (const sp of segParts) {
      for (const bp of bolgeParts) {
        for (const yp of yasParts) {
          const key = `${sp}|${bp}|${yp}|${period}`
          const acc = ensureCubeAcc(cells, key)
          if (val != null) {
            acc.sums[idx] += val
            acc.counts[idx] += 1
          }
          const seenKey = `${grpId}#${key}`
          if (!acc.seenRows.has(seenKey)) {
            acc.seenRows.add(seenKey)
            acc.n += firstNumber(row.work_order_count)
            acc.servis += firstNumber(row.service_count)
          }
        }
      }
    }
  }

  return Array.from(cells.entries())
    .map(([key, acc]) => {
      const [segment, region, ageGroup, period] = key.split('|')
      const kpis = acc.sums.map((sum, i) => (acc.counts[i] > 0 ? sum / acc.counts[i] : null))
      return [segment, region, ageGroup, period, kpis, acc.n, acc.servis] as CubeRow
    })
    .sort((a, b) => {
      const p = a[3].localeCompare(b[3], 'tr'); if (p !== 0) return p
      const s = a[0].localeCompare(b[0], 'tr'); if (s !== 0) return s
      return a[1].localeCompare(b[1], 'tr')
    })
}

// ─────────────────────────────────────────────────────────────
// Marka skoru — segment-içi referans (option 2).
// Markanın ham KPI'ları, kendi segmentinin aynı (bölge, yaş, dönem) ortalamasına oranlanır.
// Statik metodoloji (KAT_YAPILAR ağırlık + KPI_META yön) ile genel skor üretir.
// ─────────────────────────────────────────────────────────────
function buildMarkaRows(rows: KpiFactRuntimeRow[], cubeRows: CubeRow[], brandMap: Map<string, BrandInfo>): DataSourceMarkaRow[] {
  if (brandMap.size === 0) return []

  const refCube = new Map(cubeRows.map(r => [`${r[0]}|${r[1]}|${r[2]}|${r[3]}`, r[4]]))

  // Marka hücreleri: (brand|bolge|yas|donem) — bölge/yaş agregalı; segment markanın kendi segmenti.
  type BAcc = { sums: number[]; counts: number[] }
  const cells = new Map<string, BAcc>()
  const cellMeta = new Map<string, { brand: string; segment: string; bolge: string; yas: string; donem: string }>()

  for (const row of rows) {
    if (!row.brand_id) continue
    const info = brandMap.get(row.brand_id)
    if (!info) continue
    const period = normalizeDimension(row.period)
    if (!period) continue
    if (!row.kpi_no || row.kpi_no < 1 || row.kpi_no > KPI_META.length) continue
    const idx = row.kpi_no - 1
    const val = toFiniteNumberOrNull(row.kpi_value)
    if (val == null) continue

    const segment = info.segment || normalizeDimension(row.segment)
    const region = normalizeDimension(row.region)
    const ageGroup = normalizeDimension(row.age_group) || 'Tümü'

    const bolgeParts = region ? [region, ''] : ['']
    const yasParts = ageGroup !== 'Tümü' ? [ageGroup, 'Tümü'] : ['Tümü']

    for (const bp of bolgeParts) {
      for (const yp of yasParts) {
        const key = `${row.brand_id}|${bp}|${yp}|${period}`
        let acc = cells.get(key)
        if (!acc) { acc = { sums: KPI_META.map(() => 0), counts: KPI_META.map(() => 0) }; cells.set(key, acc); cellMeta.set(key, { brand: info.name, segment, bolge: bp, yas: yp, donem: period }) }
        acc.sums[idx] += val
        acc.counts[idx] += 1
      }
    }
  }

  const result: DataSourceMarkaRow[] = []
  for (const [key, acc] of Array.from(cells.entries())) {
    const meta = cellMeta.get(key)!
    const brandKpis = acc.sums.map((sum, i) => (acc.counts[i] > 0 ? sum / acc.counts[i] : null))
    const refKpis = refCube.get(`${meta.segment}|${meta.bolge}|${meta.yas}|${meta.donem}`) ?? null
    const genel = computeGenel(brandKpis, refKpis)
    result.push([meta.brand, meta.segment, meta.bolge, meta.yas, meta.donem, genel])
  }
  return result
}

function computeGenel(kpis: (number | null)[], refKpis: (number | null)[] | null): number {
  let genel = 0
  for (const category of KAT_YAPILAR) {
    let total = 0
    let valid = 0
    for (const kpiIdx of category.kpis) {
      const score = normalizeOne(kpis[kpiIdx], refKpis ? refKpis[kpiIdx] : null, kpiIdx)
      if (Number.isFinite(score)) { total += score; valid++ }
    }
    const catScore = valid > 0 ? total / valid : 100
    genel += catScore * category.agirlik
  }
  return Math.round(genel)
}

function normalizeOne(val: number | null | undefined, ref: number | null | undefined, kpiIdx: number): number {
  if (val == null || ref == null) return NaN
  const lower = KPI_META[kpiIdx]?.is_lower_better ?? false
  if (val === 0 && ref === 0) return 100
  if (ref === 0) return lower ? (val === 0 ? 100 : 0) : 0
  if (val === 0) return lower ? 100 : 0
  const ratio = lower ? ref / val : val / ref
  return Math.round(Math.min(200, Math.max(0, ratio * 100)))
}

function buildDimensions(cubeRows: CubeRow[]): KpiRuntimeDimensions {
  return {
    segments: uniqueSorted(cubeRows.map(row => row[0])),
    regions: uniqueSorted(cubeRows.map(row => row[1])),
    ageGroups: uniqueSorted(cubeRows.map(row => row[2])),
    periods: uniqueSorted(cubeRows.map(row => row[3])),
  }
}

function emptyDimensions(): KpiRuntimeDimensions {
  return { segments: [], regions: [], ageGroups: [], periods: [] }
}

function toBatchInfo(batch: ImportBatchRow) {
  return {
    id: batch.id,
    filename: batch.filename,
    fileType: batch.file_type,
    totalRows: batch.total_rows,
    validRows: batch.valid_rows,
    errorRows: batch.error_rows,
    warningCount: batch.warning_count,
    importedAt: batch.imported_at,
    createdAt: batch.created_at,
  }
}

function normalizeDimension(value: string | null): string {
  return String(value ?? '').trim()
}

function toFiniteNumberOrNull(value: number | null): number | null {
  if (value == null) return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function firstNumber(next: number | null): number {
  const n = Number(next ?? 0)
  return Number.isFinite(n) && n > 0 ? n : 0
}

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b, 'tr'))
}
