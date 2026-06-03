import { createClient } from '@/lib/supabase/client'
import { KPI_META } from './config'
import type { CubeRow } from './data'
import type { KpiRuntimeData, KpiRuntimeDimensions } from './data-source-types'

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
    // Marka skorları import datasından ayrı KPI motoru ile hesaplanacak.
    // Prompt 8/9'a kadar marka_scores.json fallback korunacak.
    markaRows: [],
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

function factRowsToCubeRows(rows: KpiFactRuntimeRow[]): CubeRow[] {
  type MutableCube = {
    segment: string
    region: string
    ageGroup: string
    period: string
    kpis: (number | null)[]
    workOrderCount: number
    serviceCount: number
  }

  const map = new Map<string, MutableCube>()

  for (const row of rows) {
    const segment = normalizeDimension(row.segment)
    const region = normalizeDimension(row.region)
    const ageGroup = normalizeDimension(row.age_group) || 'Tümü'
    const period = normalizeDimension(row.period)

    if (!segment || !region || !period) continue
    if (!row.kpi_no || row.kpi_no < 1 || row.kpi_no > KPI_META.length) continue

    const key = `${segment}|${region}|${ageGroup}|${period}`
    const current = map.get(key) ?? {
      segment,
      region,
      ageGroup,
      period,
      kpis: KPI_META.map(() => null),
      workOrderCount: 0,
      serviceCount: 0,
    }

    current.kpis[row.kpi_no - 1] = toFiniteNumberOrNull(row.kpi_value)
    current.workOrderCount = firstPositiveNumber(current.workOrderCount, row.work_order_count)
    current.serviceCount = firstPositiveNumber(current.serviceCount, row.service_count)
    map.set(key, current)
  }

  return Array.from(map.values())
    .map(item => [
      item.segment,
      item.region,
      item.ageGroup,
      item.period,
      item.kpis,
      item.workOrderCount,
      item.serviceCount,
    ] as CubeRow)
    .sort((a, b) => {
      const periodCompare = a[3].localeCompare(b[3], 'tr')
      if (periodCompare !== 0) return periodCompare
      const segmentCompare = a[0].localeCompare(b[0], 'tr')
      if (segmentCompare !== 0) return segmentCompare
      return a[1].localeCompare(b[1], 'tr')
    })
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

function firstPositiveNumber(current: number, next: number | null): number {
  if (current > 0) return current
  const n = Number(next ?? 0)
  return Number.isFinite(n) && n > 0 ? n : current
}

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b, 'tr'))
}
