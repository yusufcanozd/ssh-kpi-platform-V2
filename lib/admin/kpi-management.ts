import type { SupabaseClient } from '@supabase/supabase-js'
import {
  CAT_COLORS,
  CATEGORY_SHORT_NAMES,
  KAT_YAPILAR,
  KPI_META,
  type CategoryKey,
} from '@/lib/kpi/config'

export type KpiDirection = 'higher_is_better' | 'lower_is_better'
export type KpiDataType = 'index' | 'ratio' | 'currency' | 'duration' | 'count' | 'percentage'
export type CoverageRule = 'included' | 'excluded_zero_variance' | 'optional' | 'required'
export type AuditEntityType = 'kpi_definition' | 'kpi_category'
export type AuditAction = 'create' | 'update' | 'deactivate' | 'reactivate'

export interface AdminCategoryDefinition {
  id: string
  key: string
  name: string
  shortName: string
  description: string
  color: string
  sortOrder: number
  isActive: boolean
  source: 'supabase' | 'fallback'
}

export interface AdminKpiDefinition {
  id: string
  kpiNo: number
  name: string
  shortName: string
  description: string
  categoryKey: string
  isActive: boolean
  direction: KpiDirection
  dataType: KpiDataType
  coverageRule: CoverageRule
  source: 'supabase' | 'fallback'
}

export interface AdminKpiConfig {
  kpis: AdminKpiDefinition[]
  categories: AdminCategoryDefinition[]
  source: 'supabase' | 'fallback'
  warning?: string
}

export interface AuditDraft<TPayload extends Record<string, unknown> = Record<string, unknown>> {
  entityType: AuditEntityType
  entityId: string
  action: AuditAction
  payload: TPayload
  createdAt: string
  note: string
}

type MaybeRecord = Record<string, unknown>

function asRecord(value: unknown): MaybeRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as MaybeRecord : null
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function asBoolean(value: unknown, fallback = true): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function normalizeDirection(value: unknown, lowerBetterFallback = false): KpiDirection {
  if (value === 'lower_is_better' || value === 'lower') return 'lower_is_better'
  if (value === 'higher_is_better' || value === 'higher') return 'higher_is_better'
  return lowerBetterFallback ? 'lower_is_better' : 'higher_is_better'
}

function normalizeCoverageRule(value: unknown): CoverageRule {
  if (value === 'excluded_zero_variance') return 'excluded_zero_variance'
  if (value === 'optional') return 'optional'
  if (value === 'required') return 'required'
  return 'included'
}

function normalizeDataType(value: unknown, fmt?: string): KpiDataType {
  if (value === 'ratio' || value === 'currency' || value === 'duration' || value === 'count' || value === 'percentage' || value === 'index') {
    return value
  }
  if (fmt?.includes('%')) return 'percentage'
  if (fmt?.includes('₺') || fmt?.toLowerCase().includes('tl')) return 'currency'
  return 'index'
}

export function getFallbackCategories(): AdminCategoryDefinition[] {
  return KAT_YAPILAR.map((category, index) => ({
    id: `fallback-category-${category.key}`,
    key: category.key,
    name: category.ad,
    shortName: CATEGORY_SHORT_NAMES[category.key as CategoryKey] ?? category.ad,
    description: `${category.ad} kategorisi, mevcut config.ts fallback metodolojisinden okunur.`,
    color: CAT_COLORS[category.ad] ?? '#64748b',
    sortOrder: index + 1,
    isActive: true,
    source: 'fallback',
  }))
}

export function getFallbackKpis(): AdminKpiDefinition[] {
  const categoryByKpiIndex = new Map<number, string>()
  KAT_YAPILAR.forEach(category => {
    category.kpis.forEach(kpiIndex => categoryByKpiIndex.set(kpiIndex, category.key))
  })

  return KPI_META.map((kpi, index) => ({
    id: `fallback-kpi-${kpi.no}`,
    kpiNo: kpi.no,
    name: kpi.ad,
    shortName: `KPI ${kpi.no}`,
    description: `${kpi.ad} KPI tanımı mevcut config.ts/kpi_data.json fallback kaynağından okunur.`,
    categoryKey: categoryByKpiIndex.get(index) ?? '',
    isActive: true,
    direction: kpi.is_lower_better ? 'lower_is_better' : 'higher_is_better',
    dataType: normalizeDataType(undefined, kpi.fmt),
    coverageRule: 'included',
    source: 'fallback',
  }))
}

function parseSupabaseCategories(rows: unknown): AdminCategoryDefinition[] {
  if (!Array.isArray(rows)) return []
  const parsed: Array<AdminCategoryDefinition | null> = rows.map((row, index) => {
    const record = asRecord(row)
    if (!record) return null
    const key = asString(record.key ?? record.slug ?? record.category_key, `category-${index + 1}`)
    const name = asString(record.name ?? record.ad ?? record.title, key)
    return {
      id: asString(record.id, `supabase-category-${key}`),
      key,
      name,
      shortName: asString(record.short_name ?? record.shortName ?? record.kisa_ad, name),
      description: asString(record.description ?? record.aciklama, ''),
      color: asString(record.color ?? record.renk, '#64748b'),
      sortOrder: asNumber(record.sort_order ?? record.sortOrder ?? record.siralama, index + 1),
      isActive: asBoolean(record.is_active ?? record.isActive ?? record.aktif, true),
      source: 'supabase' as const,
    }
  })
  return parsed.filter((item): item is AdminCategoryDefinition => Boolean(item))
}

function parseSupabaseKpis(rows: unknown): AdminKpiDefinition[] {
  if (!Array.isArray(rows)) return []
  const parsed: Array<AdminKpiDefinition | null> = rows.map((row, index) => {
    const record = asRecord(row)
    if (!record) return null
    const kpiNo = asNumber(record.kpi_no ?? record.kpiNo ?? record.no, index + 1)
    const name = asString(record.name ?? record.ad ?? record.title, `KPI ${kpiNo}`)
    return {
      id: asString(record.id, `supabase-kpi-${kpiNo}`),
      kpiNo,
      name,
      shortName: asString(record.short_name ?? record.shortName ?? record.kisa_ad, `KPI ${kpiNo}`),
      description: asString(record.description ?? record.aciklama, ''),
      categoryKey: asString(record.category_key ?? record.categoryKey ?? record.kategori_key ?? record.category_id, ''),
      isActive: asBoolean(record.is_active ?? record.isActive ?? record.aktif, true),
      direction: normalizeDirection(record.direction ?? record.yon, asBoolean(record.is_lower_better, false)),
      dataType: normalizeDataType(record.data_type ?? record.dataType ?? record.veri_tipi),
      coverageRule: normalizeCoverageRule(record.coverage_rule ?? record.coverageRule ?? record.coverage_kurali),
      source: 'supabase' as const,
    }
  })
  return parsed.filter((item): item is AdminKpiDefinition => Boolean(item))
}

export async function loadAdminKpiConfig(supabase: SupabaseClient): Promise<AdminKpiConfig> {
  const fallback: AdminKpiConfig = {
    kpis: getFallbackKpis(),
    categories: getFallbackCategories(),
    source: 'fallback',
  }

  try {
    const [categoryResult, kpiResult] = await Promise.all([
      supabase.from('kpi_categories').select('*').order('sort_order', { ascending: true }),
      supabase.from('kpi_definitions').select('*').order('kpi_no', { ascending: true }),
    ])

    if (categoryResult.error || kpiResult.error) {
      return {
        ...fallback,
        warning: 'Supabase yönetim tabloları okunamadı; config.ts fallback verisi gösteriliyor.',
      }
    }

    const categories = parseSupabaseCategories(categoryResult.data)
    const kpis = parseSupabaseKpis(kpiResult.data)

    if (!categories.length || !kpis.length) {
      return {
        ...fallback,
        warning: 'Supabase yönetim tabloları boş; config.ts fallback verisi gösteriliyor.',
      }
    }

    return { categories, kpis, source: 'supabase' }
  } catch {
    return {
      ...fallback,
      warning: 'Supabase bağlantısı kurulamadı; config.ts fallback verisi gösteriliyor.',
    }
  }
}

export function buildAuditDraft<TPayload extends Record<string, unknown>>(
  entityType: AuditEntityType,
  entityId: string,
  action: AuditAction,
  payload: TPayload,
): AuditDraft<TPayload> {
  return {
    entityType,
    entityId,
    action,
    payload,
    createdAt: new Date().toISOString(),
    note: 'TODO: audit_logs tablosu aktif olduğunda bu taslak kayıt Supabase’e yazılacak.',
  }
}

export function validateKpiDraft(kpi: AdminKpiDefinition, existing: AdminKpiDefinition[], editingId?: string): string[] {
  const errors: string[] = []
  if (!Number.isInteger(kpi.kpiNo) || kpi.kpiNo <= 0) errors.push('KPI no pozitif tam sayı olmalı.')
  if (!kpi.name.trim()) errors.push('KPI adı zorunludur.')
  if (!kpi.shortName.trim()) errors.push('Kısa ad zorunludur.')
  if (!kpi.categoryKey) errors.push('Kategori seçimi zorunludur.')
  const duplicate = existing.some(item => item.kpiNo === kpi.kpiNo && item.id !== editingId)
  if (duplicate) errors.push(`KPI no ${kpi.kpiNo} zaten kullanılıyor.`)
  return errors
}

export function validateCategoryDraft(category: AdminCategoryDefinition, existing: AdminCategoryDefinition[], editingId?: string): string[] {
  const errors: string[] = []
  if (!category.name.trim()) errors.push('Kategori adı zorunludur.')
  if (!category.shortName.trim()) errors.push('Kısa ad zorunludur.')
  if (!category.key.trim()) errors.push('Kategori anahtarı zorunludur.')
  if (!Number.isInteger(category.sortOrder) || category.sortOrder <= 0) errors.push('Sıralama pozitif tam sayı olmalı.')
  const duplicateKey = existing.some(item => item.key === category.key && item.id !== editingId)
  if (duplicateKey) errors.push(`Kategori anahtarı ${category.key} zaten kullanılıyor.`)
  return errors
}
