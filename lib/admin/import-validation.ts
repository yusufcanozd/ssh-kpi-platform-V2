import type {
  ImportColumnMapping,
  ImportColumnRole,
  ImportFileType,
  ImportPreviewResult,
  ImportRawRow,
  ImportValidationContext,
  ImportValidationIssue,
  ImportValidationSummary,
  PreparedKpiFactRow,
} from '@/types/import'

const MAX_PREVIEW_ROWS = 20
const MAX_CLIENT_FILE_SIZE_BYTES = 8 * 1024 * 1024

const ROLE_ALIASES: Record<string, ImportColumnRole> = {
  segment: 'segment',
  segmentler: 'segment',
  kategori: 'segment',
  bolge: 'region',
  bölge: 'region',
  region: 'region',
  il: 'region',
  yas: 'age_group',
  yaş: 'age_group',
  yasgrubu: 'age_group',
  'yaşgrubu': 'age_group',
  age: 'age_group',
  donem: 'period',
  dönem: 'period',
  period: 'period',
  tarih: 'period',
  marka: 'brand',
  brand: 'brand',
  isemri: 'work_order_count',
  'işemri': 'work_order_count',
  workorder: 'work_order_count',
  servis: 'service_count',
  service: 'service_count',
}

export function detectImportFileType(fileName: string): ImportFileType {
  const lower = fileName.toLowerCase()
  if (lower.endsWith('.csv')) return 'csv'
  if (lower.endsWith('.json')) return 'json'
  if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) return 'xlsx'
  return 'unknown'
}

export function validateFileBeforeRead(file: File): string | null {
  const type = detectImportFileType(file.name)

  if (type === 'unknown') {
    return 'Desteklenmeyen dosya tipi. CSV, JSON ve XLSX import desteklenir.'
  }


  if (file.size > MAX_CLIENT_FILE_SIZE_BYTES) {
    return 'Dosya boyutu çok büyük. Bu güvenli import adımı için maksimum 8 MB dosya yükleyin.'
  }

  return null
}

export function inferColumnRole(columnName: string): ImportColumnRole {
  const normalized = normalizeKey(columnName)
  const explicitKpiMatch = normalized.match(/^kpi(\d{1,2})$/)
  if (explicitKpiMatch) return `kpi_${Number(explicitKpiMatch[1])}`

  const looseKpiMatch = normalized.match(/(?:kpi|performans|endeks)(\d{1,2})/)
  if (looseKpiMatch) return `kpi_${Number(looseKpiMatch[1])}`

  return ROLE_ALIASES[normalized] ?? 'ignore'
}

export function buildInitialMapping(columns: string[]): ImportColumnMapping[] {
  return columns.map(column => ({
    sourceColumn: column,
    role: inferColumnRole(column),
  }))
}

export async function parseImportFile(file: File): Promise<ImportPreviewResult> {
  const fileType = detectImportFileType(file.name)
  if (fileType === 'xlsx') return parseXlsxFile(file.name, await file.arrayBuffer())

  const text = await file.text()
  if (fileType === 'csv') return parseCsvText(file.name, text)
  if (fileType === 'json') return parseJsonText(file.name, text)

  throw new Error('Bu dosya tipi parse edilemiyor.')
}

export function parseCsvText(fileName: string, text: string): ImportPreviewResult {
  const parsedRows = parseCsvRows(text)
  const header = parsedRows[0] ?? []
  const columns = header.map((cell, index) => cleanColumnName(cell, index)).filter(Boolean)

  const rows: ImportRawRow[] = parsedRows.slice(1).map((cells, rowIndex) => {
    const values: Record<string, string> = {}
    columns.forEach((column, columnIndex) => {
      values[column] = (cells[columnIndex] ?? '').trim()
    })
    return { rowNumber: rowIndex + 2, values }
  }).filter(row => Object.values(row.values).some(value => value.length > 0))

  return {
    fileName,
    fileType: 'csv',
    columns,
    rows,
    previewRows: rows.slice(0, MAX_PREVIEW_ROWS),
  }
}

export function parseJsonText(fileName: string, text: string): ImportPreviewResult {
  const parsed = JSON.parse(text) as unknown
  const rawRows = Array.isArray(parsed)
    ? parsed
    : isRecord(parsed) && Array.isArray(parsed.rows)
      ? parsed.rows
      : []

  if (!Array.isArray(rawRows) || rawRows.length === 0) {
    throw new Error('JSON dosyası satır listesi içermiyor. Beklenen format: [{...}] veya { "rows": [{...}] }.')
  }

  const objectRows = rawRows.filter(isRecord)
  const columns = Array.from(new Set(objectRows.flatMap(row => Object.keys(row))))

  const rows: ImportRawRow[] = objectRows.map((row, index) => {
    const values: Record<string, string> = {}
    columns.forEach(column => {
      const rawValue = row[column]
      values[column] = rawValue === null || rawValue === undefined ? '' : String(rawValue)
    })
    return { rowNumber: index + 1, values }
  })

  return {
    fileName,
    fileType: 'json',
    columns,
    rows,
    previewRows: rows.slice(0, MAX_PREVIEW_ROWS),
  }
}


export async function parseXlsxFile(fileName: string, arrayBuffer: ArrayBuffer): Promise<ImportPreviewResult> {
  const XLSX = await import('xlsx')
  const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true })
  const firstSheetName = workbook.SheetNames[0]

  if (!firstSheetName) {
    throw new Error('XLSX dosyasında okunabilir çalışma sayfası bulunamadı.')
  }

  const worksheet = workbook.Sheets[firstSheetName]
  if (!worksheet) {
    throw new Error('XLSX çalışma sayfası okunamadı.')
  }

  const matrix = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    defval: '',
    blankrows: false,
    raw: false,
  })

  const rowsAsStrings = matrix
    .map(row => row.map(cell => normalizeXlsxCell(cell)))
    .filter(row => row.some(cell => cell.trim().length > 0))

  const header = rowsAsStrings[0] ?? []
  const columns = header.map((cell, index) => cleanColumnName(cell, index)).filter(Boolean)

  if (columns.length === 0) {
    throw new Error('XLSX dosyasının ilk satırında kolon başlıkları bulunamadı.')
  }

  const rows: ImportRawRow[] = rowsAsStrings.slice(1).map((cells, rowIndex) => {
    const values: Record<string, string> = {}
    columns.forEach((column, columnIndex) => {
      values[column] = (cells[columnIndex] ?? '').trim()
    })
    return { rowNumber: rowIndex + 2, values }
  }).filter(row => Object.values(row.values).some(value => value.length > 0))

  return {
    fileName,
    fileType: 'xlsx',
    columns,
    rows,
    previewRows: rows.slice(0, MAX_PREVIEW_ROWS),
  }
}

export function validateImportRows(
  rows: ImportRawRow[],
  mappings: ImportColumnMapping[],
  context: ImportValidationContext,
): ImportValidationSummary {
  const issues: ImportValidationIssue[] = []
  const roleToColumn = buildRoleColumnMap(mappings, issues)
  const mappedKpis = new Set<number>()

  mappings.forEach(mapping => {
    const kpiNo = getKpiNumberFromRole(mapping.role)
    if (kpiNo !== null) mappedKpis.add(kpiNo)
  })

  ;(['segment', 'region', 'period'] as const).forEach(requiredRole => {
    if (!roleToColumn.has(requiredRole)) {
      issues.push({
        severity: 'error',
        message: `${roleLabel(requiredRole)} zorunlu ama hiçbir kolona eşleştirilmedi.`,
      })
    }
  })

  if (mappedKpis.size === 0) {
    issues.push({
      severity: 'error',
      message: 'En az bir KPI kolonu eşleştirilmelidir. Örnek: KPI 1, KPI 2 veya kpi_1.',
    })
  }

  const rowErrorNumbers = new Set<number>()
  const segmentColumn = roleToColumn.get('segment')
  const regionColumn = roleToColumn.get('region')
  const periodColumn = roleToColumn.get('period')
  const workOrderColumn = roleToColumn.get('work_order_count')
  const serviceColumn = roleToColumn.get('service_count')

  rows.forEach(row => {
    if (segmentColumn) validateKnownValue(row, segmentColumn, context.knownSegments, 'Segment', issues, rowErrorNumbers)
    if (regionColumn) validateKnownValue(row, regionColumn, context.knownRegions, 'Bölge', issues, rowErrorNumbers)

    if (periodColumn) {
      const period = readCell(row, periodColumn)
      if (!period) {
        addRowError(row, periodColumn, 'Dönem boş bırakılamaz.', issues, rowErrorNumbers)
      } else if (!isKnownOrValidPeriod(period, context.knownPeriods)) {
        issues.push({
          severity: 'warning',
          rowNumber: row.rowNumber,
          column: periodColumn,
          message: `Dönem formatı beklenenden farklı olabilir: ${period}`,
        })
      }
    }

    mappings.forEach(mapping => {
      const kpiNo = getKpiNumberFromRole(mapping.role)
      if (kpiNo === null) return

      const value = readCell(row, mapping.sourceColumn)
      if (!value) {
        issues.push({
          severity: 'warning',
          rowNumber: row.rowNumber,
          column: mapping.sourceColumn,
          message: `KPI ${kpiNo} değeri boş. Bu satır import edilebilir ama KPI coverage düşebilir.`,
        })
        return
      }

      if (!isNumeric(value)) {
        addRowError(row, mapping.sourceColumn, `KPI ${kpiNo} numeric olmalı. Gelen değer: ${value}`, issues, rowErrorNumbers)
      }
    })

    if (workOrderColumn) validateOptionalNumeric(row, workOrderColumn, 'İş emri sayısı', issues, rowErrorNumbers)
    if (serviceColumn) validateOptionalNumeric(row, serviceColumn, 'Servis sayısı', issues, rowErrorNumbers)
  })

  const errorCount = issues.filter(issue => issue.severity === 'error').length
  const warningCount = issues.filter(issue => issue.severity === 'warning').length

  return {
    totalRows: rows.length,
    validRows: Math.max(0, rows.length - rowErrorNumbers.size),
    errorRows: rowErrorNumbers.size,
    warningCount,
    errorCount,
    issues,
  }
}

export function buildFactRowsForImport(
  rows: ImportRawRow[],
  mappings: ImportColumnMapping[],
): PreparedKpiFactRow[] {
  const roleToColumn = buildRoleColumnMap(mappings, [])
  const segmentColumn = roleToColumn.get('segment')
  const regionColumn = roleToColumn.get('region')
  const ageGroupColumn = roleToColumn.get('age_group')
  const periodColumn = roleToColumn.get('period')
  const brandColumn = roleToColumn.get('brand')
  const workOrderColumn = roleToColumn.get('work_order_count')
  const serviceColumn = roleToColumn.get('service_count')
  const kpiMappings = mappings
    .map(mapping => ({ ...mapping, kpiNo: getKpiNumberFromRole(mapping.role) }))
    .filter((mapping): mapping is ImportColumnMapping & { kpiNo: number } => mapping.kpiNo !== null)

  const factRows: PreparedKpiFactRow[] = []

  rows.forEach(row => {
    kpiMappings.forEach(mapping => {
      const value = readCell(row, mapping.sourceColumn)
      if (!value || !isNumeric(value)) return

      factRows.push({
        source_row_number: row.rowNumber,
        segment: readOptionalCell(row, segmentColumn),
        region: readOptionalCell(row, regionColumn),
        age_group: readOptionalCell(row, ageGroupColumn),
        period: readOptionalCell(row, periodColumn),
        brand_name: readOptionalCell(row, brandColumn),
        kpi_no: mapping.kpiNo,
        kpi_value: toNumber(value),
        work_order_count: toNullableNumber(readOptionalCell(row, workOrderColumn)),
        service_count: toNullableNumber(readOptionalCell(row, serviceColumn)),
      })
    })
  })

  return factRows
}

export function roleLabel(role: ImportColumnRole) {
  if (role.startsWith('kpi_')) return `KPI ${role.replace('kpi_', '')}`

  const labels: Record<Exclude<ImportColumnRole, `kpi_${number}`>, string> = {
    ignore: 'Yok say',
    segment: 'Segment',
    region: 'Bölge',
    age_group: 'Yaş grubu',
    period: 'Dönem',
    work_order_count: 'İş emri sayısı',
    service_count: 'Servis sayısı',
    brand: 'Marka',
  }

  return labels[role as Exclude<ImportColumnRole, `kpi_${number}`>]
}

function buildRoleColumnMap(mappings: ImportColumnMapping[], issues: ImportValidationIssue[]) {
  const roleToColumn = new Map<ImportColumnRole, string>()

  mappings.forEach(mapping => {
    if (mapping.role === 'ignore') return
    if (roleToColumn.has(mapping.role)) {
      issues.push({
        severity: 'error',
        column: mapping.sourceColumn,
        message: `${roleLabel(mapping.role)} alanı birden fazla kolona eşleştirildi.`,
      })
    }
    roleToColumn.set(mapping.role, mapping.sourceColumn)
  })

  return roleToColumn
}

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = []
  let currentCell = ''
  let currentRow: string[] = []
  let insideQuotes = false

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    const nextChar = text[index + 1]

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentCell += '"'
        index += 1
      } else {
        insideQuotes = !insideQuotes
      }
      continue
    }

    if (char === ',' && !insideQuotes) {
      currentRow.push(currentCell)
      currentCell = ''
      continue
    }

    if ((char === '\n' || char === '\r') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') index += 1
      currentRow.push(currentCell)
      rows.push(currentRow)
      currentRow = []
      currentCell = ''
      continue
    }

    currentCell += char
  }

  currentRow.push(currentCell)
  rows.push(currentRow)

  return rows.filter(row => row.some(cell => cell.trim().length > 0))
}


function normalizeXlsxCell(value: unknown) {
  if (value === null || value === undefined) return ''
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  return String(value).trim()
}

function cleanColumnName(value: string, index: number) {
  const trimmed = value.trim()
  return trimmed || `Kolon ${index + 1}`
}

function normalizeKey(value: string) {
  return value
    .trim()
    .toLocaleLowerCase('tr-TR')
    .replace(/[\s_\-./]+/g, '')
    .replace(/[()[\]{}]/g, '')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readCell(row: ImportRawRow, column: string) {
  return (row.values[column] ?? '').trim()
}

function readOptionalCell(row: ImportRawRow, column?: string) {
  if (!column) return null
  const value = readCell(row, column)
  return value || null
}

function getKpiNumberFromRole(role: ImportColumnRole) {
  if (!role.startsWith('kpi_')) return null
  const value = Number(role.replace('kpi_', ''))
  return Number.isFinite(value) ? value : null
}

function isNumeric(value: string) {
  const normalized = value.replace(',', '.')
  return normalized.trim() !== '' && Number.isFinite(Number(normalized))
}

function toNumber(value: string) {
  return Number(value.replace(',', '.'))
}

function toNullableNumber(value: string | null) {
  if (!value) return null
  return isNumeric(value) ? toNumber(value) : null
}

function isKnownOrValidPeriod(period: string, knownPeriods: string[]) {
  if (knownPeriods.includes(period)) return true
  return /^\d{4}[-/.]?(0?[1-9]|1[0-2])$/.test(period) || /^\d{4}\s?Q[1-4]$/i.test(period)
}

function validateKnownValue(
  row: ImportRawRow,
  column: string,
  knownValues: string[],
  label: string,
  issues: ImportValidationIssue[],
  rowErrorNumbers: Set<number>,
) {
  const value = readCell(row, column)
  if (!value) {
    addRowError(row, column, `${label} boş bırakılamaz.`, issues, rowErrorNumbers)
    return
  }

  if (knownValues.length > 0 && !knownValues.includes(value)) {
    issues.push({
      severity: 'warning',
      rowNumber: row.rowNumber,
      column,
      message: `${label} bilinen listede yok: ${value}`,
    })
  }
}

function validateOptionalNumeric(
  row: ImportRawRow,
  column: string,
  label: string,
  issues: ImportValidationIssue[],
  rowErrorNumbers: Set<number>,
) {
  const value = readCell(row, column)
  if (value && !isNumeric(value)) {
    addRowError(row, column, `${label} numeric olmalı. Gelen değer: ${value}`, issues, rowErrorNumbers)
  }
}

function addRowError(
  row: ImportRawRow,
  column: string,
  message: string,
  issues: ImportValidationIssue[],
  rowErrorNumbers: Set<number>,
) {
  rowErrorNumbers.add(row.rowNumber)
  issues.push({ severity: 'error', rowNumber: row.rowNumber, column, message })
}
