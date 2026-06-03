import type { CategoryKey, KpiMeta } from './config'
import type { CubeRow } from './data'

export type KpiDataSourceKind = 'static-json' | 'supabase-import'

export interface KpiDataSourceBatchInfo {
  id: string
  filename: string
  fileType: 'csv' | 'json' | 'xlsx'
  totalRows: number
  validRows: number
  errorRows: number
  warningCount: number
  importedAt: string | null
  createdAt: string
}

export interface KpiDataSourceStatus {
  kind: KpiDataSourceKind
  label: string
  isDynamic: boolean
  hasActiveBatch: boolean
  rowCount: number
  factRowCount: number
  warning?: string
  batch?: KpiDataSourceBatchInfo
}

export interface KpiRuntimeDimensions {
  segments: string[]
  regions: string[]
  ageGroups: string[]
  periods: string[]
}

export type DataSourceMarkaRow = [
  string, // marka
  string, // segment
  string, // bolge
  string, // yas
  string, // donem
  number  // skor
]

export interface KpiRuntimeData {
  source: KpiDataSourceStatus
  cubeRows: CubeRow[]
  markaRows: DataSourceMarkaRow[]
  dimensions: KpiRuntimeDimensions
}

export interface ActiveKpiDataSourceOptions {
  /** true ise aktif Supabase import batch'i denenir; başarısızsa fallback uygulanır. */
  preferDynamic?: boolean
  /** true ise aktif batch yoksa veya okunamazsa statik JSON kullanılır. */
  allowFallback?: boolean
}

export interface ActiveWeightRow {
  categoryKey: CategoryKey | string
  weight: number
  source: 'supabase' | 'fallback'
}

export interface KpiDefinitionRow extends KpiMeta {
  source: 'supabase' | 'fallback'
  isActive?: boolean
}

export interface CategoryDefinitionRow {
  key: CategoryKey | string
  name: string
  shortName?: string
  weight: number
  kpis: number[]
  source: 'supabase' | 'fallback'
  isActive?: boolean
}
