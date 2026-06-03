import { createClient } from '@/lib/supabase/client'
import type {
  DataImportBatchListItem,
  DataImportExportFile,
  DataImportExportFormat,
  DataImportExportRow,
  PersistImportBatchInput,
  PersistImportBatchResult,
  PreparedKpiFactRow,
} from '@/types/import'

type BrandLookupRow = {
  id: string
  code: string | null
  name: string | null
}

type ProfileRoleRow = {
  role: string | null
  is_active: boolean | null
}

type KpiFactInsertRow = {
  batch_id: string
  segment: string | null
  region: string | null
  age_group: string | null
  period: string | null
  brand_id: string | null
  kpi_no: number
  kpi_value: number
  work_order_count: number | null
  service_count: number | null
}

type KpiFactExportDatabaseRow = {
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
  brands?: {
    name: string | null
    code: string | null
  } | null
}

const FACT_INSERT_CHUNK_SIZE = 500
const FACT_EXPORT_PAGE_SIZE = 1000

export async function fetchImportBatches(limit = 20): Promise<DataImportBatchListItem[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('data_import_batches')
    .select('id, filename, file_type, status, total_rows, valid_rows, error_rows, warning_count, is_active, imported_by, created_at, imported_at')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as DataImportBatchListItem[]
}

export async function persistImportBatch(input: PersistImportBatchInput): Promise<PersistImportBatchResult> {
  await assertCurrentUserIsSuperadmin()

  if (input.summary.errorCount > 0) {
    throw new Error('Validation hataları varken import kaydı oluşturulamaz.')
  }

  if (input.factRows.length === 0) {
    throw new Error('Import edilecek geçerli KPI satırı bulunamadı.')
  }

  const supabase = createClient()
  const { data: userResponse, error: userError } = await supabase.auth.getUser()
  if (userError) throw new Error(userError.message)

  const actorId = userResponse.user?.id ?? null
  const { data: batchData, error: batchError } = await supabase
    .from('data_import_batches')
    .insert({
      filename: input.fileName,
      file_type: input.fileType,
      status: 'imported',
      total_rows: input.summary.totalRows,
      valid_rows: input.summary.validRows,
      error_rows: input.summary.errorRows,
      warning_count: input.summary.warningCount,
      is_active: false,
      imported_by: actorId,
      imported_at: new Date().toISOString(),
    })
    .select('id, filename, file_type, status, total_rows, valid_rows, error_rows, warning_count, is_active, imported_by, created_at, imported_at')
    .single()

  if (batchError) throw new Error(batchError.message)
  const batch = batchData as unknown as DataImportBatchListItem

  const brandLookup = await fetchBrandLookup()
  const factRows = toDatabaseFactRows(batch.id, input.factRows, brandLookup)

  for (let index = 0; index < factRows.length; index += FACT_INSERT_CHUNK_SIZE) {
    const chunk = factRows.slice(index, index + FACT_INSERT_CHUNK_SIZE)
    const { error } = await supabase.from('kpi_fact_rows').insert(chunk)
    if (error) throw new Error(error.message)
  }

  if (input.activateBatch) {
    await setActiveImportBatch(batch.id)
    batch.is_active = true
  }

  await writeImportAuditLog({
    actorId,
    batchId: batch.id,
    filename: input.fileName,
    insertedFactRows: factRows.length,
    activateBatch: input.activateBatch,
    mappedColumns: input.mappings.filter(mapping => mapping.role !== 'ignore').length,
  })

  return {
    batch,
    insertedFactRows: factRows.length,
  }
}

export async function activateImportBatch(batchId: string): Promise<void> {
  await assertCurrentUserIsSuperadmin()
  await setActiveImportBatch(batchId)
}

export async function exportImportBatch(
  batchId: string,
  format: DataImportExportFormat,
): Promise<DataImportExportFile> {
  await assertCurrentUserIsSuperadmin()

  const supabase = createClient()
  const { data: batchData, error: batchError } = await supabase
    .from('data_import_batches')
    .select('id, filename, file_type, status, total_rows, valid_rows, error_rows, warning_count, is_active, imported_by, created_at, imported_at')
    .eq('id', batchId)
    .single()

  if (batchError) throw new Error(batchError.message)

  const batch = batchData as unknown as DataImportBatchListItem
  const rows = await fetchFactRowsForBatch(batchId)
  const safeBaseName = sanitizeFileName(batch.filename.replace(/\.(csv|json|xlsx|xls)$/i, ''))
  const exportedAt = new Date().toISOString()

  if (format === 'json') {
    return {
      fileName: `${safeBaseName || 'import-batch'}-${batch.id.slice(0, 8)}.json`,
      mimeType: 'application/json;charset=utf-8',
      content: JSON.stringify({ exported_at: exportedAt, batch, rows }, null, 2),
      rowCount: rows.length,
    }
  }

  return {
    fileName: `${safeBaseName || 'import-batch'}-${batch.id.slice(0, 8)}.csv`,
    mimeType: 'text/csv;charset=utf-8',
    content: toCsv(rows),
    rowCount: rows.length,
  }
}

async function fetchFactRowsForBatch(batchId: string): Promise<DataImportExportRow[]> {
  const supabase = createClient()
  const allRows: KpiFactExportDatabaseRow[] = []

  for (let from = 0; ; from += FACT_EXPORT_PAGE_SIZE) {
    const to = from + FACT_EXPORT_PAGE_SIZE - 1
    const { data, error } = await supabase
      .from('kpi_fact_rows')
      .select('id, batch_id, segment, region, age_group, period, brand_id, kpi_no, kpi_value, work_order_count, service_count, created_at, brands:brand_id(name, code)')
      .eq('batch_id', batchId)
      .order('created_at', { ascending: true })
      .range(from, to)

    if (error) throw new Error(error.message)

    const pageRows = (data ?? []) as unknown as KpiFactExportDatabaseRow[]
    allRows.push(...pageRows)
    if (pageRows.length < FACT_EXPORT_PAGE_SIZE) break
  }

  return allRows.map(row => ({
    id: row.id,
    batch_id: row.batch_id,
    segment: row.segment,
    region: row.region,
    age_group: row.age_group,
    period: row.period,
    brand_id: row.brand_id,
    brand_name: row.brands?.name ?? null,
    brand_code: row.brands?.code ?? null,
    kpi_no: row.kpi_no,
    kpi_value: row.kpi_value,
    work_order_count: row.work_order_count,
    service_count: row.service_count,
    created_at: row.created_at,
  }))
}

async function setActiveImportBatch(batchId: string) {
  const supabase = createClient()

  const { error: deactivateError } = await supabase
    .from('data_import_batches')
    .update({ is_active: false })
    .eq('is_active', true)

  if (deactivateError) throw new Error(deactivateError.message)

  const { error: activateError } = await supabase
    .from('data_import_batches')
    .update({ is_active: true })
    .eq('id', batchId)

  if (activateError) throw new Error(activateError.message)
}

async function assertCurrentUserIsSuperadmin() {
  const supabase = createClient()
  const { data: userResponse, error: userError } = await supabase.auth.getUser()
  if (userError) throw new Error(userError.message)

  const userId = userResponse.user?.id
  if (!userId) throw new Error('Bu işlem için giriş yapılmış kullanıcı bulunamadı.')

  const { data, error } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', userId)
    .single()

  if (error) throw new Error(error.message)

  const profile = data as unknown as ProfileRoleRow
  if (profile.role !== 'superadmin' || profile.is_active === false) {
    throw new Error('Bu işlem sadece aktif superadmin kullanıcılar tarafından yapılabilir.')
  }
}

async function fetchBrandLookup() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('brands')
    .select('id, code, name')
    .eq('is_active', true)

  if (error) return new Map<string, string>()

  const lookup = new Map<string, string>()
  ;((data ?? []) as unknown as BrandLookupRow[]).forEach(brand => {
    if (brand.name) lookup.set(normalizeLookupKey(brand.name), brand.id)
    if (brand.code) lookup.set(normalizeLookupKey(brand.code), brand.id)
  })

  return lookup
}

function toDatabaseFactRows(
  batchId: string,
  rows: PreparedKpiFactRow[],
  brandLookup: Map<string, string>,
): KpiFactInsertRow[] {
  return rows.map(row => ({
    batch_id: batchId,
    segment: row.segment,
    region: row.region,
    age_group: row.age_group,
    period: row.period,
    brand_id: row.brand_name ? brandLookup.get(normalizeLookupKey(row.brand_name)) ?? null : null,
    kpi_no: row.kpi_no,
    kpi_value: row.kpi_value,
    work_order_count: row.work_order_count,
    service_count: row.service_count,
  }))
}

async function writeImportAuditLog(input: {
  actorId: string | null
  batchId: string
  filename: string
  insertedFactRows: number
  activateBatch: boolean
  mappedColumns: number
}) {
  const supabase = createClient()
  await supabase.from('audit_logs').insert({
    actor_id: input.actorId,
    action: 'import',
    entity: 'data_import_batches',
    entity_id: input.batchId,
    summary: `${input.filename} import edildi (${input.insertedFactRows} KPI fact satırı).`,
    metadata: {
      inserted_fact_rows: input.insertedFactRows,
      activate_batch: input.activateBatch,
      mapped_columns: input.mappedColumns,
    },
  })
}

function toCsv(rows: DataImportExportRow[]) {
  const columns: Array<keyof DataImportExportRow> = [
    'batch_id',
    'segment',
    'region',
    'age_group',
    'period',
    'brand_id',
    'brand_name',
    'brand_code',
    'kpi_no',
    'kpi_value',
    'work_order_count',
    'service_count',
    'created_at',
  ]

  const header = columns.join(',')
  const body = rows.map(row => columns.map(column => csvEscape(row[column])).join(',')).join('\n')
  return `\ufeff${header}${body ? `\n${body}` : ''}`
}

function csvEscape(value: string | number | null | undefined) {
  const normalized = value === null || value === undefined ? '' : String(value)
  if (/[",\n\r;]/.test(normalized)) return `"${normalized.replace(/"/g, '""')}"`
  return normalized
}

function sanitizeFileName(value: string) {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9ğüşöçıİĞÜŞÖÇ._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
}

function normalizeLookupKey(value: string) {
  return value.trim().toLocaleLowerCase('tr-TR')
}
