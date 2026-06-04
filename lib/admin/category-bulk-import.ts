import { createClient } from '@/lib/supabase/client'
import type { AdminCategoryDefinition } from '@/lib/admin/kpi-management'

export type CategoryBulkImportStatus = 'valid' | 'invalid'

export interface CategoryBulkImportIssue {
  rowNumber: number
  severity: 'error' | 'warning'
  message: string
}

export interface CategoryBulkImportRow {
  rowNumber: number
  status: CategoryBulkImportStatus
  errors: string[]
  warnings: string[]
  category: AdminCategoryDefinition
}

export interface CategoryBulkImportPreview {
  fileName: string
  totalRows: number
  validRows: number
  errorRows: number
  rows: CategoryBulkImportRow[]
  issues: CategoryBulkImportIssue[]
}

interface CategoryDatabaseRow {
  id?: string | null
  key?: string | null
  name?: string | null
  short_name?: string | null
  description?: string | null
  color?: string | null
  sort_order?: number | null
  is_active?: boolean | null
}

type SpreadsheetCell = string | number | boolean | null
type RowObject = Record<string, string>
type CategoryField = 'key' | 'name' | 'shortName' | 'description' | 'color' | 'sortOrder' | 'isActive'

// kpi_categories.key CHECK kısıtı: yalnızca bu 5 anahtar yazılabilir.
const ALLOWED_KEYS = ['musteri', 'ticari', 'operasyonel', 'bayi', 'kapsam'] as const

const HEADER_ALIASES: Record<string, CategoryField> = {
  key: 'key',
  anahtar: 'key',
  kategorikey: 'key',
  categorykey: 'key',
  ad: 'name',
  adi: 'name',
  name: 'name',
  kategori: 'name',
  kategoriadi: 'name',
  title: 'name',
  shortname: 'shortName',
  short: 'shortName',
  kisaad: 'shortName',
  kisad: 'shortName',
  aciklama: 'description',
  açıklama: 'description',
  description: 'description',
  renk: 'color',
  color: 'color',
  sira: 'sortOrder',
  siralama: 'sortOrder',
  sortorder: 'sortOrder',
  sort: 'sortOrder',
  aktif: 'isActive',
  active: 'isActive',
  isactive: 'isActive',
  durum: 'isActive',
}

export async function parseCategoryBulkImportFile(
  file: File,
  existingCategories: AdminCategoryDefinition[],
): Promise<CategoryBulkImportPreview> {
  if (!/\.xlsx?$/i.test(file.name)) {
    throw new Error('Kategori toplu ekleme için yalnızca Excel (.xlsx/.xls) dosyası yükleyin.')
  }

  const XLSX = await import('xlsx')
  const workbook = XLSX.read(new Uint8Array(await file.arrayBuffer()), { type: 'array' })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) throw new Error('Excel dosyasında okunabilir sayfa bulunamadı.')

  const worksheet = workbook.Sheets[sheetName]
  const matrix = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false, defval: '' }) as SpreadsheetCell[][]
  if (matrix.length < 2) throw new Error('Excel dosyasında başlık ve en az bir veri satırı bulunmalı.')

  const headers = matrix[0].map((value, index) => normalizeKey(String(value || `kolon_${index + 1}`)))
  const rows = matrix
    .slice(1)
    .map((cells, index) => toRowObject(headers, cells, index + 2))
    .filter(row => Object.values(row.values).some(value => value.trim().length > 0))

  const existingByKey = new Map(existingCategories.map(category => [category.key, category]))
  const seenInFile = new Set<string>()
  const nextSortBase = Math.max(0, ...existingCategories.map(category => category.sortOrder))

  const parsedRows = rows.map((row, index) =>
    parseCategoryRow(row.rowNumber, row.values, existingByKey, seenInFile, nextSortBase + index + 1),
  )
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

export async function upsertCategoryDefinitionsFromPreview(preview: CategoryBulkImportPreview): Promise<AdminCategoryDefinition[]> {
  await assertCurrentUserIsSuperadmin()

  const validRows = preview.rows.filter(row => row.status === 'valid')
  if (validRows.length === 0) throw new Error('İçe aktarılacak geçerli kategori satırı bulunamadı.')

  const supabase = createClient()
  const rows = validRows.map(row => categoryToDatabaseRow(row.category))
  const { data, error } = await supabase
    .from('kpi_categories')
    .upsert(rows, { onConflict: 'key' })
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) throw new Error(error.message)

  const saved = parseCategoryRows(data)
  const { data: userResponse } = await supabase.auth.getUser()
  const actorId = userResponse.user?.id ?? null

  await Promise.all(saved.map(category => supabase.from('audit_logs').insert({
    actor_id: actorId,
    action: 'bulk_import',
    entity: 'kpi_category',
    entity_id: category.id,
    summary: `Kategori ${category.key} Excel toplu import ile eklendi/güncellendi.`,
    metadata: {
      file_name: preview.fileName,
      key: category.key,
      name: category.name,
      color: category.color,
      sort_order: category.sortOrder,
      is_active: category.isActive,
    },
  })))

  return saved
}

export async function exportCategoryDefinitionsToExcel(): Promise<{ fileName: string; content: string; mimeType: string; rowCount: number }> {
  await assertCurrentUserIsSuperadmin()

  const supabase = createClient()
  const { data, error } = await supabase
    .from('kpi_categories')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) throw new Error(error.message)

  const rows = parseCategoryRows(data)
  const XLSX = await import('xlsx')
  const exportRows = rows.map(category => ({
    key: category.key,
    name: category.name,
    short_name: category.shortName,
    description: category.description,
    color: category.color,
    sort_order: category.sortOrder,
    is_active: category.isActive,
  }))
  const worksheet = XLSX.utils.json_to_sheet(exportRows, {
    header: ['key', 'name', 'short_name', 'description', 'color', 'sort_order', 'is_active'],
  })
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'kpi_categories')
  return {
    fileName: `kpi-categories-${new Date().toISOString().slice(0, 10)}.xlsx`,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    content: XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' }) as string,
    rowCount: rows.length,
  }
}

function parseCategoryRow(
  rowNumber: number,
  values: RowObject,
  existingByKey: Map<string, AdminCategoryDefinition>,
  seenInFile: Set<string>,
  fallbackSort: number,
): CategoryBulkImportRow {
  const errors: string[] = []
  const warnings: string[] = []

  const rawKey = readMapped(values, 'key')
  const key = normalizeKey(rawKey)

  if (!rawKey.trim()) errors.push('key/anahtar zorunlu.')
  if (rawKey.trim() && !ALLOWED_KEYS.includes(key as (typeof ALLOWED_KEYS)[number])) {
    errors.push(`Kategori anahtarı yalnızca şu olabilir: ${ALLOWED_KEYS.join(', ')} (gelen: ${rawKey}).`)
  }
  if (key && seenInFile.has(key)) errors.push(`Dosyada "${key}" anahtarı birden fazla kez geçiyor.`)
  if (key) seenInFile.add(key)

  const existing = key ? existingByKey.get(key) : undefined
  const name = readMapped(values, 'name') || existing?.name || ''
  const shortName = readMapped(values, 'shortName') || existing?.shortName || name
  const description = readMapped(values, 'description') || existing?.description || ''
  const color = normalizeColor(readMapped(values, 'color') || existing?.color || '#64748b')
  const sortOrder = parsePositiveInteger(readMapped(values, 'sortOrder')) ?? existing?.sortOrder ?? fallbackSort
  const isActive = normalizeActive(readMapped(values, 'isActive'), existing?.isActive ?? true)

  if (!name.trim()) errors.push('name/ad zorunlu.')

  const category: AdminCategoryDefinition = {
    id: existing?.id ?? `bulk-category-${key || rowNumber}`,
    key: key || rawKey.trim(),
    name: name.trim(),
    shortName: shortName.trim(),
    description: description.trim(),
    color,
    sortOrder,
    isActive,
    source: 'supabase',
  }

  return {
    rowNumber,
    status: errors.length > 0 ? 'invalid' : 'valid',
    errors,
    warnings,
    category,
  }
}

function toRowObject(headers: string[], cells: SpreadsheetCell[], rowNumber: number): { rowNumber: number; values: RowObject } {
  const values: RowObject = {}
  headers.forEach((header, index) => {
    values[header] = String(cells[index] ?? '').trim()
  })
  return { rowNumber, values }
}

function readMapped(values: RowObject, field: CategoryField): string {
  for (const [header, value] of Object.entries(values)) {
    if (HEADER_ALIASES[header] === field) return value.trim()
  }
  return ''
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

function normalizeColor(value: string): string {
  const trimmed = value.trim()
  return /^#?[0-9a-fA-F]{6}$/.test(trimmed)
    ? (trimmed.startsWith('#') ? trimmed : `#${trimmed}`)
    : (trimmed || '#64748b')
}

function parsePositiveInteger(value: string): number | null {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed <= 0) return null
  return parsed
}

function normalizeActive(value: string, fallback: boolean): boolean {
  const normalized = normalizeKey(value)
  if (!normalized) return fallback
  if (['true', '1', 'evet', 'aktif', 'active', 'yes', 'y'].includes(normalized)) return true
  if (['false', '0', 'hayir', 'pasif', 'inactive', 'no', 'n'].includes(normalized)) return false
  return fallback
}

function categoryToDatabaseRow(category: AdminCategoryDefinition) {
  return {
    key: category.key,
    name: category.name,
    short_name: category.shortName,
    description: category.description,
    color: category.color,
    sort_order: category.sortOrder,
    is_active: category.isActive,
  }
}

function parseCategoryRows(rows: unknown): AdminCategoryDefinition[] {
  if (!Array.isArray(rows)) return []
  return (rows as CategoryDatabaseRow[]).map((row, index) => ({
    id: String(row.id ?? `category-${row.key ?? index + 1}`),
    key: String(row.key ?? ''),
    name: String(row.name ?? row.key ?? `Kategori ${index + 1}`),
    shortName: String(row.short_name ?? row.name ?? ''),
    description: String(row.description ?? ''),
    color: String(row.color ?? '#64748b'),
    sortOrder: Number(row.sort_order ?? index + 1),
    isActive: row.is_active !== false,
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
