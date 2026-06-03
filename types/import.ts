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
