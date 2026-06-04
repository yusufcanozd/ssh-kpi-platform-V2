import { createClient } from '@/lib/supabase/client'
import type { AdminCategoryDefinition, AdminKpiDefinition, CoverageRule, KpiDataType, KpiDirection } from '@/lib/admin/kpi-management'

export type KpiBulkImportStatus = 'valid' | 'invalid'

export interface KpiBulkImportIssue {
  rowNumber: number
  severity: 'error' | 'warning'
  message: string
}

export interface KpiBulkImportRow {
  rowNumber: number
  status: KpiBulkImportStatus
  errors: string[]
  warnings: string[]
  kpi: AdminKpiDefinition
}

export interface KpiBulkImportPreview {
  fileName: string
  totalRows: number
  validRows: number
  errorRows: number
  rows: KpiBulkImportRow[]
  issues: KpiBulkImportIssue[]
}

interface KpiDefinitionDatabaseRow {
  id?: string | null
  kpi_no?: number | null
  no?: number | null
  name?: string | null
  short_name?: string | null
  description?: string | null
  category_key?: string | null
  is_active?: boolean | null
  direction?: string | null
  data_type?: string | null
  coverage_rule?: string | null
}

type SpreadsheetCell = string | number | boolean | null

type RowObject = Record<string, string>

const REQUIRED_LABELS = ['kpi_no', 'name', 'short_name', 'category_key', 'direction', 'is_active'] as const

const HEADER_ALIASES: Record<string, keyof AdminKpiDefinition | 'kpiNo' | 'categoryKey' | 'shortName' | 'isActive'> = {
  kpino: 'kpiNo',
  kpi: 'kpiNo',
  no: 'kpiNo',
  numara: 'kpiNo',
  kpiadi: 'name',
  kpiad: 'name',
  ad: 'name',
  adi: 'name',
  name: 'name',
  title: 'name',
  shortname: 'shortName',
  short: 'shortName',
  kisaad: 'shortName',
  kisad: 'shortName',
  kategori: 'categoryKey',
  kategorikey: 'categoryKey',
  category: 'categoryKey',
  categorykey: 'categoryKey',
  direction: 'direction',
  yon: 'direction',
  yön: 'direction',
  hesapyonu: 'direction',
  aktif: 'isActive',
  active: 'isActive',
  isactive: 'isActive',
  durum: 'isActive',
  aciklama: 'description',
  açıklama: 'description',
  description: 'description',
  datatype: 'dataType',
  veritipi: 'dataType',
  coveragerule: 'coverageRule',
  coverage: 'coverageRule',
}

export async function parseKpiBulkImportFile(
  file: File,
  categories: AdminCategoryDefinition[],
  existingKpis: AdminKpiDefinition[],
): Promise<KpiBulkImportPreview> {
  if (!/\.xlsx?$/i.test(file.name)) {
    throw new Error('KPI toplu ekleme için yalnızca Excel (.xlsx/.xls) dosyası yükleyin.')
  }

  const XLSX = await import('xlsx')
  const workbook = XLSX.read(new Uint8Array(await file.arrayBuffer()), { type: 'array' })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) throw new Error('Excel dosyasında okunabilir sayfa bulunamadı.')

  const worksheet = workbook.Sheets[sheetName]
  const matrix = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false, defval: '' }) as SpreadsheetCell[][]
  if (matrix.length < 2) throw new Error('Excel dosyasında başlık ve en az bir veri satırı bulunmalı.')

  const headers = matrix[0].map((value, index) => normalizeHeader(String(value || `kolon_${index + 1}`)))
  const rows = matrix
    .slice(1)
    .map((cells, index) => toRowObject(headers, cells, index + 2))
    .filter(row => Object.values(row.values).some(value => value.trim().length > 0))

  const categoryKeys = new Set(categories.map(category => category.key))
  const categoryNameToKey = new Map(categories.map(category => [normalizeKey(category.name), category.key]))
  const existingByNo = new Map(existingKpis.map(kpi => [kpi.kpiNo, kpi]))
  const seenInFile = new Set<number>()

  const parsedRows = rows.map(row => parseKpiRow(row.rowNumber, row.values, categoryKeys, categoryNameToKey, existingByNo, seenInFile))
  const issues = parsedRows.flatMap(row => [
    ...row.errors.map(message => ({ rowNumber: row.rowNumber, severity: 'error' as const, message })),
    ...row.warnings.map(message => ({ rowNumber: row.rowNumber, severity: 'warning' as const, message })),
  ])

  return {
    fileName: file.name,
    totalRows: parsedRows.length,
    validRows: parsedRows.filter(row => row.status === 'valid').length,
    errorRows: parsedRows.filter(row => row.status === 'invalid').length,
    rows: parsedRows,
    issues,
  }
}

export async function upsertKpiDefinitionsFromPreview(preview: KpiBulkImportPreview): Promise<AdminKpiDefinition[]> {
  await assertCurrentUserIsSuperadmin()

  const validRows = preview.rows.filter(row => row.status === 'valid')
  if (validRows.length === 0) throw new Error('İçe aktarılacak geçerli KPI satırı bulunamadı.')

  const supabase = createClient()
  const rows = validRows.map(row => kpiToDatabaseRow(row.kpi))
  const { data, error } = await supabase
    .from('kpi_definitions')
    .upsert(rows, { onConflict: 'kpi_no' })
    .select('*')
    .order('kpi_no', { ascending: true })

  if (error) throw new Error(error.message)

  const saved = parseKpiDefinitionRows(data)
  const { data: userResponse } = await supabase.auth.getUser()
  const actorId = userResponse.user?.id ?? null

  await Promise.all(saved.map(kpi => supabase.from('audit_logs').insert({
    actor_id: actorId,
    action: 'bulk_import',
    entity: 'kpi_definition',
    entity_id: kpi.id,
    summary: `KPI ${kpi.kpiNo} Excel toplu import ile eklendi/güncellendi.`,
    metadata: {
      file_name: preview.fileName,
      kpi_no: kpi.kpiNo,
      name: kpi.name,
      category_key: kpi.categoryKey,
      direction: kpi.direction,
      is_active: kpi.isActive,
    },
  })))

  return saved
}

export async function exportKpiDefinitionsToExcel(): Promise<{ fileName: string; content: string; mimeType: string; rowCount: number }> {
  await assertCurrentUserIsSuperadmin()

  const supabase = createClient()
  const { data, error } = await supabase
    .from('kpi_definitions')
    .select('*')
    .order('kpi_no', { ascending: true })

  if (error) throw new Error(error.message)

  const rows = parseKpiDefinitionRows(data)
  const XLSX = await import('xlsx')
  const exportRows = rows.map(kpi => ({
    kpi_no: kpi.kpiNo,
    name: kpi.name,
    short_name: kpi.shortName,
    category_key: kpi.categoryKey,
    direction: kpi.direction,
    is_active: kpi.isActive,
    data_type: kpi.dataType,
    coverage_rule: kpi.coverageRule,
    description: kpi.description,
  }))
  const worksheet = XLSX.utils.json_to_sheet(exportRows, {
    header: ['kpi_no', 'name', 'short_name', 'category_key', 'direction', 'is_active', 'data_type', 'coverage_rule', 'description'],
  })
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'kpi_definitions')
  return {
    fileName: `kpi-definitions-${new Date().toISOString().slice(0, 10)}.xlsx`,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    content: XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' }) as string,
    rowCount: rows.length,
  }
}

export async function currentUserIsSuperadmin(): Promise<boolean> {
  try {
    await assertCurrentUserIsSuperadmin()
    return true
  } catch {
    return false
  }
}

function parseKpiRow(
  rowNumber: number,
  values: RowObject,
  categoryKeys: Set<string>,
  categoryNameToKey: Map<string, string>,
  existingByNo: Map<number, AdminKpiDefinition>,
  seenInFile: Set<number>,
): KpiBulkImportRow {
  const errors: string[] = []
  const warnings: string[] = []
  const kpiNo = parsePositiveInteger(readMapped(values, 'kpiNo'))
  if (!kpiNo) errors.push('kpi_no pozitif tam sayı olmalı.')

  if (kpiNo && seenInFile.has(kpiNo)) errors.push(`Dosyada KPI no ${kpiNo} birden fazla kez geçiyor.`)
  if (kpiNo) seenInFile.add(kpiNo)

  const existing = kpiNo ? existingByNo.get(kpiNo) : undefined
  const name = readMapped(values, 'name') || existing?.name || ''
  const shortName = readMapped(values, 'shortName') || existing?.shortName || (kpiNo ? `KPI ${kpiNo}` : '')
  const rawCategory = readMapped(values, 'categoryKey') || existing?.categoryKey || ''
  const categoryKey = resolveCategoryKey(rawCategory, categoryKeys, categoryNameToKey)
  const direction = normalizeDirection(readMapped(values, 'direction') || existing?.direction)
  const isActive = normalizeActive(readMapped(values, 'isActive'), existing?.isActive ?? true)
  const dataType = normalizeDataType(readMapped(values, 'dataType') || existing?.dataType || 'index')
  const coverageRule = normalizeCoverageRule(readMapped(values, 'coverageRule') || existing?.coverageRule || 'included')
  const description = readMapped(values, 'description') || existing?.description || ''

  if (!name.trim()) errors.push('name/ad zorunlu.')
  if (!shortName.trim()) errors.push('short_name/kısa ad zorunlu.')
  if (!rawCategory.trim()) errors.push('category_key/kategori zorunlu.')
  if (rawCategory.trim() && !categoryKey) errors.push(`Kategori bulunamadı: ${rawCategory}`)
  if (!direction) errors.push('direction/yön yüksek veya düşük olarak belirtilmeli.')

  REQUIRED_LABELS.forEach(required => {
    const hasHeader = Object.values(values).some(Boolean)
    if (!hasHeader) warnings.push(`${required} kolonu boş görünüyor.`)
  })

  const kpi: AdminKpiDefinition = {
    id: existing?.id ?? `bulk-kpi-${kpiNo || rowNumber}`,
    kpiNo: kpiNo || 0,
    name: name.trim(),
    shortName: shortName.trim(),
    description: description.trim(),
    categoryKey: categoryKey || rawCategory.trim(),
    isActive,
    direction: direction ?? 'higher_is_better',
    dataType,
    coverageRule,
    source: 'supabase',
  }

  return {
    rowNumber,
    status: errors.length > 0 ? 'invalid' : 'valid',
    errors,
    warnings,
    kpi,
  }
}

function toRowObject(headers: string[], cells: SpreadsheetCell[], rowNumber: number): { rowNumber: number; values: RowObject } {
  const values: RowObject = {}
  headers.forEach((header, index) => {
    values[header] = String(cells[index] ?? '').trim()
  })
  return { rowNumber, values }
}

function readMapped(values: RowObject, field: keyof AdminKpiDefinition | 'kpiNo' | 'categoryKey' | 'shortName' | 'isActive'): string {
  for (const [header, value] of Object.entries(values)) {
    if (HEADER_ALIASES[header] === field) return value.trim()
  }
  return ''
}

function normalizeHeader(value: string): string {
  return normalizeKey(value)
}

function normalizeKey(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]/g, '')
}

function parsePositiveInteger(value: string): number | null {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed <= 0) return null
  return parsed
}

function resolveCategoryKey(rawValue: string, categoryKeys: Set<string>, categoryNameToKey: Map<string, string>): string | null {
  const trimmed = rawValue.trim()
  if (!trimmed) return null
  if (categoryKeys.has(trimmed)) return trimmed
  const normalized = normalizeKey(trimmed)
  const directKey = Array.from(categoryKeys).find(key => normalizeKey(key) === normalized)
  return directKey ?? categoryNameToKey.get(normalized) ?? null
}

function normalizeDirection(value?: string): KpiDirection | null {
  const normalized = normalizeKey(value ?? '')
  if (!normalized) return null
  if (['higherisbetter', 'higher', 'high', 'yuksek', 'yuksekdahaiyi', 'artisiyi', 'pozitif'].includes(normalized)) return 'higher_is_better'
  if (['lowerisbetter', 'lower', 'low', 'dusuk', 'dusukdahaiyi', 'azalisiyi', 'negatif'].includes(normalized)) return 'lower_is_better'
  return null
}

function normalizeActive(value: string, fallback: boolean): boolean {
  const normalized = normalizeKey(value)
  if (!normalized) return fallback
  if (['true', '1', 'evet', 'aktif', 'active', 'yes', 'y'].includes(normalized)) return true
  if (['false', '0', 'hayir', 'hayır', 'pasif', 'inactive', 'no', 'n'].includes(normalized)) return false
  return fallback
}

function normalizeDataType(value: string): KpiDataType {
  const normalized = normalizeKey(value)
  if (normalized === 'ratio') return 'ratio'
  if (normalized === 'currency' || normalized === 'tutar') return 'currency'
  if (normalized === 'duration' || normalized === 'sure') return 'duration'
  if (normalized === 'count' || normalized === 'adet') return 'count'
  if (normalized === 'percentage' || normalized === 'yuzde') return 'percentage'
  return 'index'
}

function normalizeCoverageRule(value: string): CoverageRule {
  const normalized = normalizeKey(value)
  if (normalized === 'excludedzerovariance') return 'excluded_zero_variance'
  if (normalized === 'optional' || normalized === 'opsiyonel') return 'optional'
  if (normalized === 'required' || normalized === 'zorunlu') return 'required'
  return 'included'
}

function kpiToDatabaseRow(kpi: AdminKpiDefinition) {
  return {
    kpi_no: kpi.kpiNo,
    name: kpi.name,
    short_name: kpi.shortName,
    description: kpi.description,
    category_key: kpi.categoryKey,
    is_active: kpi.isActive,
    direction: kpi.direction,
    data_type: kpi.dataType,
    coverage_rule: kpi.coverageRule,
  }
}

function parseKpiDefinitionRows(rows: unknown): AdminKpiDefinition[] {
  if (!Array.isArray(rows)) return []
  return (rows as KpiDefinitionDatabaseRow[]).map((row, index) => ({
    id: String(row.id ?? `kpi-${row.kpi_no ?? row.no ?? index + 1}`),
    kpiNo: Number(row.kpi_no ?? row.no ?? index + 1),
    name: String(row.name ?? `KPI ${row.kpi_no ?? row.no ?? index + 1}`),
    shortName: String(row.short_name ?? `KPI ${row.kpi_no ?? row.no ?? index + 1}`),
    description: String(row.description ?? ''),
    categoryKey: String(row.category_key ?? ''),
    isActive: row.is_active !== false,
    direction: row.direction === 'lower_is_better' ? 'lower_is_better' : 'higher_is_better',
    dataType: normalizeDataType(String(row.data_type ?? 'index')),
    coverageRule: normalizeCoverageRule(String(row.coverage_rule ?? 'included')),
    source: 'supabase',
  }))
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

  const profile = data as { role?: string | null; is_active?: boolean | null }
  if (profile.role !== 'superadmin' || profile.is_active === false) {
    throw new Error('Bu işlem sadece aktif superadmin kullanıcılar tarafından yapılabilir.')
  }
}
