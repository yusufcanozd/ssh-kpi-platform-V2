import { createClient } from '@/lib/supabase/client'
import { CATEGORY_DISPLAY_NAMES, CATEGORY_SHORT_NAMES, KAT_YAPILAR, KPI_META } from './config'
import type { CubeRow } from './data'
import { fetchImportedRuntimeData } from './import-source'
import {
  getFallbackCategoryDefinitions,
  getFallbackKpiDefinitions,
  getFallbackWeights,
  getStaticRuntimeData,
} from './static-source'
import type {
  ActiveKpiDataSourceOptions,
  ActiveWeightRow,
  CategoryDefinitionRow,
  KpiDefinitionRow,
  KpiRuntimeData,
} from './data-source-types'

type SupabaseKpiDefinitionRow = {
  kpi_no: number
  name: string
  short_name: string | null
  description: string | null
  category_key: string
  is_active: boolean
  direction: string | null
  data_type: string | null
  coverage_rule: string | null
}

type SupabaseCategoryRow = {
  key: string
  name: string
  short_name: string | null
  description: string | null
  color: string | null
  sort_order: number | null
  is_active: boolean
}

type SupabaseWeightRow = {
  category_key: string
  weight: number
}

export async function getActiveKpiDataSource(
  options: ActiveKpiDataSourceOptions = {},
): Promise<KpiRuntimeData> {
  const { preferDynamic = true, allowFallback = true } = options

  let base: KpiRuntimeData

  if (preferDynamic && canUseBrowserSupabase()) {
    try {
      const imported = await fetchImportedRuntimeData()
      if (imported && imported.cubeRows.length > 0) {
        base = imported
      } else if (imported?.source.warning && allowFallback) {
        base = getStaticRuntimeData(imported.source.warning)
      } else if (!allowFallback) {
        throw new Error('Aktif import batch bulunamadı ve fallback veri kaynağı kapalı.')
      } else {
        base = getStaticRuntimeData()
      }
    } catch (error) {
      if (!allowFallback) throw error
      base = getStaticRuntimeData(toErrorMessage(error))
    }
  } else if (!allowFallback) {
    throw new Error('Aktif import batch bulunamadı ve fallback veri kaynağı kapalı.')
  } else {
    base = getStaticRuntimeData()
  }

  // Dinamik metodolojiyi (ağırlık + KPI yönü) ekle. Her ikisi de kendi içinde
  // fallback'li olduğundan hata fırlatmaz; veri kaynağından bağımsız uygulanır.
  try {
    const [weights, kpiDefinitions] = await Promise.all([
      getActiveWeights(),
      getKpiDefinitions(),
    ])
    return { ...base, weights, kpiDefinitions }
  } catch {
    return base
  }
}

export async function getKpiRows(options?: ActiveKpiDataSourceOptions): Promise<CubeRow[]> {
  const runtime = await getActiveKpiDataSource(options)
  return runtime.cubeRows
}

export async function getKpiDefinitions(): Promise<KpiDefinitionRow[]> {
  if (!canUseBrowserSupabase()) return getFallbackKpiDefinitions()

  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('kpi_definitions')
      .select('kpi_no, name, short_name, description, category_key, is_active, direction, data_type, coverage_rule')
      .eq('is_active', true)
      .order('kpi_no', { ascending: true })

    if (error) throw new Error(error.message)
    const rows = (data ?? []) as unknown as SupabaseKpiDefinitionRow[]
    if (rows.length === 0) return getFallbackKpiDefinitions()

    return rows.map(row => ({
      no: row.kpi_no,
      ad: row.name,
      kat: CATEGORY_DISPLAY_NAMES[row.category_key as keyof typeof CATEGORY_DISPLAY_NAMES] ?? row.category_key,
      fmt: KPI_META.find(kpi => kpi.no === row.kpi_no)?.fmt ?? '{:.1f}',
      is_lower_better: row.direction === 'lower_is_better',
      source: 'supabase',
      isActive: row.is_active,
    }))
  } catch {
    return getFallbackKpiDefinitions()
  }
}

export async function getCategoryDefinitions(): Promise<CategoryDefinitionRow[]> {
  if (!canUseBrowserSupabase()) return getFallbackCategoryDefinitions()

  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('kpi_categories')
      .select('key, name, short_name, description, color, sort_order, is_active')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (error) throw new Error(error.message)
    const rows = (data ?? []) as unknown as SupabaseCategoryRow[]
    if (rows.length === 0) return getFallbackCategoryDefinitions()

    const fallbackByKey = new Map(KAT_YAPILAR.map(category => [category.key, category]))
    const weights = await getActiveWeights()
    const weightByKey = new Map(weights.map(row => [String(row.categoryKey), row.weight / 100]))

    return rows.map(row => {
      const fallback = fallbackByKey.get(row.key as keyof typeof CATEGORY_SHORT_NAMES)
      return {
        key: row.key,
        name: row.name,
        shortName: row.short_name ?? CATEGORY_SHORT_NAMES[row.key as keyof typeof CATEGORY_SHORT_NAMES],
        weight: weightByKey.get(row.key) ?? fallback?.agirlik ?? 0,
        kpis: fallback ? [...fallback.kpis] : [],
        source: 'supabase',
        isActive: row.is_active,
      }
    })
  } catch {
    return getFallbackCategoryDefinitions()
  }
}

export async function getActiveWeights(): Promise<ActiveWeightRow[]> {
  if (!canUseBrowserSupabase()) return getFallbackWeights()

  try {
    const supabase = createClient()
    const { data: version, error: versionError } = await supabase
      .from('kpi_methodology_versions')
      .select('id')
      .eq('is_active', true)
      .order('effective_date', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (versionError) throw new Error(versionError.message)
    const versionId = (version as { id?: string } | null)?.id
    if (!versionId) return getFallbackWeights()

    const { data, error } = await supabase
      .from('kpi_category_weights')
      .select('category_key, weight')
      .eq('methodology_version_id', versionId)
      .order('category_key', { ascending: true })

    if (error) throw new Error(error.message)
    const rows = (data ?? []) as unknown as SupabaseWeightRow[]
    if (rows.length === 0) return getFallbackWeights()

    return rows.map(row => ({
      categoryKey: row.category_key,
      weight: Number(row.weight),
      source: 'supabase',
    }))
  } catch {
    return getFallbackWeights()
  }
}

function canUseBrowserSupabase(): boolean {
  return typeof window !== 'undefined'
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Dinamik KPI veri kaynağı okunamadı.'
}
