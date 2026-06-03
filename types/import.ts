export type ImportFileType = 'csv' | 'json' | 'xlsx' | 'unknown'

export type ImportColumnRole =
  | 'ignore'
  | 'segment'
  | 'region'
  | 'age_group'
  | 'period'
  | 'work_order_count'
  | 'service_count'
  | 'brand'
  | `kpi_${number}`

export interface ImportRawRow {
  rowNumber: number
  values: Record<string, string>
}

export interface ImportColumnMapping {
  sourceColumn: string
  role: ImportColumnRole
}

export type ImportSeverity = 'error' | 'warning'

export interface ImportValidationIssue {
  rowNumber?: number
  column?: string
  severity: ImportSeverity
  message: string
}

export interface ImportValidationSummary {
  totalRows: number
  validRows: number
  errorRows: number
  warningCount: number
  errorCount: number
  issues: ImportValidationIssue[]
}

export interface ImportPreviewResult {
  fileName: string
  fileType: ImportFileType
  columns: string[]
  rows: ImportRawRow[]
  previewRows: ImportRawRow[]
}

export interface ImportValidationContext {
  knownSegments: string[]
  knownRegions: string[]
  knownPeriods: string[]
  kpiNumbers: number[]
}

export interface PreparedKpiFactRow {
  source_row_number: number
  segment: string | null
  region: string | null
  age_group: string | null
  period: string | null
  brand_name: string | null
  kpi_no: number
  kpi_value: number
  work_order_count: number | null
  service_count: number | null
}

export interface DataImportBatchListItem {
  id: string
  filename: string
  file_type: 'csv' | 'json' | 'xlsx'
  status: 'pending' | 'validated' | 'imported' | 'failed'
  total_rows: number
  valid_rows: number
  error_rows: number
  warning_count: number
  is_active: boolean
  imported_by: string | null
  created_at: string
  imported_at: string | null
}

export interface PersistImportBatchInput {
  fileName: string
  fileType: 'csv' | 'json' | 'xlsx'
  summary: ImportValidationSummary
  mappings: ImportColumnMapping[]
  factRows: PreparedKpiFactRow[]
  activateBatch: boolean
}

export interface PersistImportBatchResult {
  batch: DataImportBatchListItem
  insertedFactRows: number
}


export type DataImportExportFormat = 'csv' | 'json'

export interface DataImportExportRow {
  id: string
  batch_id: string
  segment: string | null
  region: string | null
  age_group: string | null
  period: string | null
  brand_id: string | null
  brand_name: string | null
  brand_code: string | null
  kpi_no: number | null
  kpi_value: number | null
  work_order_count: number | null
  service_count: number | null
  created_at: string
}

export interface DataImportExportFile {
  fileName: string
  mimeType: string
  content: string
  rowCount: number
}
