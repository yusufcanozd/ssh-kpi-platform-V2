import {
  CAT_COLORS,
  CATEGORY_SHORT_NAMES,
  KAT_YAPILAR,
  KPI_META,
  RAW_CATEGORY_TO_KEY,
  type CategoryKey,
} from '@/lib/kpi'

export type KpiDirection = 'higher_is_better' | 'lower_is_better'
export type KpiDataType = 'index' | 'ratio' | 'currency' | 'duration' | 'count'

export interface ManagedKpiDefinition {
  id: string
  no: number
  name: string
  shortName: string
  description: string
  categoryKey: CategoryKey
  isActive: boolean
  direction: KpiDirection
  dataType: KpiDataType
  coverageRule: string
  source: 'supabase' | 'fallback'
}

export interface ManagedCategoryDefinition {
  id: string
  key: CategoryKey
  name: string
  shortName: string
  description: string
  color: string
  sortOrder: number
  isActive: boolean
  source: 'supabase' | 'fallback'
}

export interface AdminAuditDraft {
  action: 'create' | 'update' | 'deactivate'
  entity: 'kpi_definition' | 'kpi_category'
  entityId: string
  summary: string
}

export const KPI_DATA_TYPE_OPTIONS: Array<{ value: KpiDataType; label: string }> = [
  { value: 'index', label: 'Endeks' },
  { value: 'ratio', label: 'Oran / yüzde' },
  { value: 'currency', label: 'Tutar' },
  { value: 'duration', label: 'Süre' },
  { value: 'count', label: 'Adet' },
]

function toRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? value as Record<string, unknown> : null
}

function stringValue(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function numberValue(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function booleanValue(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function categoryKeyFrom(value: unknown, fallback: CategoryKey): CategoryKey {
  const raw = stringValue(value)
  return RAW_CATEGORY_TO_KEY[raw] ?? (KAT_YAPILAR.some(cat => cat.key === raw) ? raw as CategoryKey : fallback)
}

function dataTypeFrom(value: unknown): KpiDataType {
  const raw = stringValue(value, 'index')
  return KPI_DATA_TYPE_OPTIONS.some(option => option.value === raw) ? raw as KpiDataType : 'index'
}

export function buildFallbackCategories(): ManagedCategoryDefinition[] {
  return KAT_YAPILAR.map((category, index) => ({
    id: `fallback-category-${category.key}`,
    key: category.key,
    name: category.ad,
    shortName: CATEGORY_SHORT_NAMES[category.key],
    description: `${category.ad} altında ${category.kpis.length} KPI bulunur. Varsayılan ağırlık %${Math.round(category.agirlik * 100)}.` ,
    color: CAT_COLORS[category.ad] ?? '#64748b',
    sortOrder: index + 1,
    isActive: true,
    source: 'fallback',
  }))
}

export function buildFallbackKpis(): ManagedKpiDefinition[] {
  return KPI_META.map((kpi, index) => {
    const category = KAT_YAPILAR.find(item => item.kpis.some(kpiIndex => kpiIndex === index)) ?? KAT_YAPILAR[0]
    return {
      id: `fallback-kpi-${kpi.no}`,
      no: kpi.no,
      name: kpi.ad,
      shortName: `KPI ${kpi.no}`,
      description: `${kpi.ad} için mevcut demo/fallback KPI tanımı. Format: ${kpi.fmt}.`,
      categoryKey: category.key,
      isActive: true,
      direction: kpi.is_lower_better ? 'lower_is_better' : 'higher_is_better',
      dataType: kpi.fmt.includes('%') ? 'ratio' : 'index',
      coverageRule: kpi.no === 2
        ? 'Zero-variance özel coverage mantığı korunur.'
        : 'Varsayılan coverage: geçerli referans ve ham değer varsa skora dahil edilir.',
      source: 'fallback',
    }
  })
}

export function parseSupabaseCategories(rows: unknown): ManagedCategoryDefinition[] {
  if (!Array.isArray(rows)) return []

  return rows.map((row, index): ManagedCategoryDefinition | null => {
    const record = toRecord(row)
    if (!record) return null
    const key = categoryKeyFrom(record.key ?? record.category_key ?? record.name, KAT_YAPILAR[index]?.key ?? 'musteri')
    const name = stringValue(record.name ?? record.ad ?? record.display_name, KAT_YAPILAR.find(cat => cat.key === key)?.ad ?? key)

    return {
      id: stringValue(record.id, `supabase-category-${key}`),
      key,
      name,
      shortName: stringValue(record.short_name ?? record.kisa_ad, CATEGORY_SHORT_NAMES[key]),
      description: stringValue(record.description ?? record.aciklama, `${name} kategori tanımı.`),
      color: stringValue(record.color ?? record.renk, CAT_COLORS[name] ?? '#64748b'),
      sortOrder: numberValue(record.sort_order ?? record.siralama, index + 1),
      isActive: booleanValue(record.is_active ?? record.aktif, true),
      source: 'supabase' as const,
    }
  }).filter((item): item is ManagedCategoryDefinition => item !== null)
}

export function parseSupabaseKpis(rows: unknown): ManagedKpiDefinition[] {
  if (!Array.isArray(rows)) return []

  return rows.map((row, index): ManagedKpiDefinition | null => {
    const record = toRecord(row)
    if (!record) return null
    const fallback = KPI_META[index]
    const no = numberValue(record.no ?? record.kpi_no, fallback?.no ?? index + 1)
    const fallbackCategory = KAT_YAPILAR.find(cat => cat.kpis.some(kpiIndex => kpiIndex === no - 1))?.key ?? 'musteri'
    const lowerBetter = booleanValue(record.is_lower_better ?? record.lower_is_better, Boolean(fallback?.is_lower_better))

    return {
      id: stringValue(record.id, `supabase-kpi-${no}`),
      no,
      name: stringValue(record.name ?? record.ad ?? record.display_name, fallback?.ad ?? `KPI ${no}`),
      shortName: stringValue(record.short_name ?? record.kisa_ad, `KPI ${no}`),
      description: stringValue(record.description ?? record.aciklama, fallback ? `${fallback.ad} KPI tanımı.` : ''),
      categoryKey: categoryKeyFrom(record.category_key ?? record.category ?? record.kat, fallbackCategory),
      isActive: booleanValue(record.is_active ?? record.aktif, true),
      direction: lowerBetter ? 'lower_is_better' : 'higher_is_better',
      dataType: dataTypeFrom(record.data_type ?? record.veri_tipi),
      coverageRule: stringValue(record.coverage_rule ?? record.coverage_kurali, 'Varsayılan coverage kuralı.'),
      source: 'supabase' as const,
    }
  }).filter((item): item is ManagedKpiDefinition => item !== null)
}

export function buildAuditDraft(event: AdminAuditDraft): AdminAuditDraft {
  // TODO Prompt 2 migration aktif olduğunda bu olay audit_logs tablosuna yazılacak.
  return event
}
