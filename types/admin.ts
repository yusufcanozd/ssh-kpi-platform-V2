// types/admin.ts
// Prompt 2 ile eklenen dinamik yönetim tablolarının satır tipleri.
// Supabase select sonuçlarını daraltmak için kullanılır; app tarafı bunları
// lib/admin/* helper'larında "Managed*" view-model tiplerine map eder.

import type { KpiCategoryKey, KpiDirection } from './index'

export type KpiDataType = 'index' | 'ratio' | 'currency' | 'duration' | 'count'
export type ImportStatus = 'pending' | 'validated' | 'imported' | 'failed'
export type ImportFileType = 'csv' | 'xlsx' | 'json'

export interface KpiCategoryRow {
  id: string
  key: KpiCategoryKey
  name: string
  short_name: string | null
  description: string | null
  color: string
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface KpiDefinitionRow {
  id: string
  no: number
  name: string
  short_name: string | null
  description: string | null
  category_key: KpiCategoryKey
  is_active: boolean
  direction: KpiDirection
  data_type: KpiDataType
  coverage_rule: string | null
  created_at: string
  updated_at: string
}

export interface KpiMethodologyVersionRow {
  id: string
  name: string
  description: string | null
  effective_date: string
  is_active: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface KpiCategoryWeightRow {
  id: string
  methodology_version_id: string
  category_key: KpiCategoryKey
  weight: number
  created_at: string
  updated_at: string
}

export interface BrandRow {
  id: string
  code: string
  name: string
  segment: string | null
  is_active: boolean
  is_hidden: boolean
  data_source: 'fallback' | 'import'
  created_at: string
  updated_at: string
}

export interface UserDataPermissionRow {
  id: string
  user_id: string
  allowed_segments: string[]
  allowed_brand_ids: string[]
  allowed_regions: string[]
  can_download_reports: boolean
  can_import_data: boolean
  can_access_admin: boolean
  created_at: string
  updated_at: string
}

export interface DataImportBatchRow {
  id: string
  filename: string
  file_type: ImportFileType
  status: ImportStatus
  total_rows: number
  valid_rows: number
  error_rows: number
  warning_count: number
  is_active: boolean
  imported_by: string | null
  created_at: string
  imported_at: string | null
}

export interface KpiFactRow {
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

export interface AuditLogRow {
  id: string
  actor_id: string | null
  action: string
  entity: string
  entity_id: string | null
  summary: string | null
  metadata: Record<string, unknown>
  created_at: string
}
