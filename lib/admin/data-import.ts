import { createClient } from '@/lib/supabase/client'
import type {
  DataImportBatchListItem,
  PersistImportBatchInput,
  PersistImportBatchResult,
  PreparedKpiFactRow,
} from '@/types/import'

type BrandLookupRow = {
  id: string
  code: string | null
  name: string | null
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

const FACT_INSERT_CHUNK_SIZE = 500

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
  await setActiveImportBatch(batchId)
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

function normalizeLookupKey(value: string) {
  return value.trim().toLocaleLowerCase('tr-TR')
}
