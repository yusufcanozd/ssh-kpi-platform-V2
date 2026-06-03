// lib/admin/weights-management.ts
// Prompt 5 — Kategori ağırlıkları ve metodoloji versiyonlama yardımcıları.
// Supabase (kpi_category_weights + kpi_methodology_versions) yoksa config.ts
// (KAT_YAPILAR.agirlik) fallback olarak kullanılır.

import {
  CAT_COLORS,
  CATEGORY_SHORT_NAMES,
  KAT_YAPILAR,
  type CategoryKey,
} from '@/lib/kpi'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface ManagedCategoryWeight {
  categoryKey: CategoryKey
  name: string
  shortName: string
  color: string
  /** Yüzde (0-100) */
  weight: number
}

export interface ManagedMethodologyVersion {
  id: string
  name: string
  description: string
  effectiveDate: string
  isActive: boolean
  source: 'supabase' | 'fallback'
}

export interface WeightAuditDraft {
  action: 'update_weights' | 'create_version' | 'activate_version'
  versionId: string
  summary: string
}

function toRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? value as Record<string, unknown> : null
}

function stringValue(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function numberValue(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value)
  return fallback
}

function booleanValue(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function categoryKeyFrom(value: unknown): CategoryKey | null {
  const raw = stringValue(value)
  return KAT_YAPILAR.some(cat => cat.key === raw) ? (raw as CategoryKey) : null
}

/** config.ts ağırlıklarından (kesir → yüzde) fallback ağırlık listesi üretir. */
export function buildFallbackWeights(): ManagedCategoryWeight[] {
  return KAT_YAPILAR.map(category => ({
    categoryKey: category.key,
    name: category.ad,
    shortName: CATEGORY_SHORT_NAMES[category.key],
    color: CAT_COLORS[category.ad] ?? '#64748b',
    weight: Math.round(category.agirlik * 100),
  }))
}

export function buildFallbackVersion(): ManagedMethodologyVersion {
  return {
    id: 'fallback-version-baseline',
    name: 'v1 — Baseline (config)',
    description: 'config.ts üzerindeki varsayılan ağırlıklar. Henüz DB versiyonu yok.',
    effectiveDate: new Date().toISOString().slice(0, 10),
    isActive: true,
    source: 'fallback',
  }
}

/** Supabase kpi_category_weights satırlarını ağırlık listesine map eder. */
export function parseSupabaseWeights(rows: unknown): ManagedCategoryWeight[] {
  if (!Array.isArray(rows)) return []
  const fallback = buildFallbackWeights()

  const parsed = rows.map((row): ManagedCategoryWeight | null => {
    const record = toRecord(row)
    if (!record) return null
    const key = categoryKeyFrom(record.category_key ?? record.key)
    if (!key) return null
    const base = fallback.find(item => item.categoryKey === key)
    return {
      categoryKey: key,
      name: base?.name ?? key,
      shortName: base?.shortName ?? key,
      color: base?.color ?? '#64748b',
      weight: numberValue(record.weight ?? record.agirlik, base?.weight ?? 0),
    }
  }).filter((item): item is ManagedCategoryWeight => item !== null)

  // Eksik kategori kalmasın diye fallback ile tamamla, sırayı koru.
  return fallback.map(base => parsed.find(item => item.categoryKey === base.categoryKey) ?? base)
}

export function parseSupabaseVersions(rows: unknown): ManagedMethodologyVersion[] {
  if (!Array.isArray(rows)) return []
  return rows.map((row): ManagedMethodologyVersion | null => {
    const record = toRecord(row)
    if (!record) return null
    return {
      id: stringValue(record.id),
      name: stringValue(record.name, 'Adsız versiyon'),
      description: stringValue(record.description),
      effectiveDate: stringValue(record.effective_date, new Date().toISOString().slice(0, 10)),
      isActive: booleanValue(record.is_active, false),
      source: 'supabase' as const,
    }
  }).filter((item): item is ManagedMethodologyVersion => item !== null && Boolean(item.id))
}

/** Yüzde ağırlık toplamı (yuvarlama toleranslı). */
export function totalWeight(weights: ManagedCategoryWeight[]): number {
  return Math.round(weights.reduce((sum, item) => sum + (Number.isFinite(item.weight) ? item.weight : 0), 0) * 100) / 100
}

/** Toplam 100 mü? (±0.01 tolerans) */
export function isWeightTotalValid(weights: ManagedCategoryWeight[]): boolean {
  return Math.abs(totalWeight(weights) - 100) < 0.01
}

export function buildWeightAuditDraft(event: WeightAuditDraft): WeightAuditDraft {
  // TODO (Batch 2): aktif kullanıcı superadmin ise bu olay audit_logs tablosuna yazılacak.
  return event
}

// ─────────────────────────────────────────────────────────────────────────
// DB persistence (Prompt 5 — Batch 3). RLS: yalnızca aktif superadmin.
// ─────────────────────────────────────────────────────────────────────────


export interface PersistResult<T> {
  data?: T
  error?: string
}

export interface NewVersionInput {
  name: string
  description: string
  effectiveDate: string
  isActive: boolean
}

/** id bir Supabase uuid'i mi? (fallback-/local- id'lerini ayırır) */
export function isPersistedVersionId(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
}

async function writeWeightAudit(
  supabase: SupabaseClient,
  action: string,
  entityId: string,
  summary: string,
  payload: Record<string, unknown>,
): Promise<void> {
  try {
    const { data } = await supabase.auth.getUser()
    await supabase.from('audit_logs').insert({
      actor_id: data.user?.id ?? null,
      action,
      entity: 'kpi_methodology',
      entity_id: entityId,
      summary,
      metadata: payload,
    })
  } catch {
    // audit kritik değil
  }
}

/** Aktif versiyonun kategori ağırlıklarını upsert eder. */
export async function saveWeights(
  supabase: SupabaseClient,
  versionId: string,
  weights: ManagedCategoryWeight[],
): Promise<PersistResult<true>> {
  if (!isPersistedVersionId(versionId)) {
    return { error: 'Aktif metodoloji versiyonu DB’de değil. Önce bir versiyon oluşturun.' }
  }
  const rows = weights.map(weight => ({
    methodology_version_id: versionId,
    category_key: weight.categoryKey,
    weight: weight.weight,
  }))
  const { error } = await supabase
    .from('kpi_category_weights')
    .upsert(rows, { onConflict: 'methodology_version_id,category_key' })
  if (error) return { error: error.message }
  await writeWeightAudit(supabase, 'update', versionId, 'Kategori ağırlıkları güncellendi', { weights: rows })
  return { data: true }
}

/** Yeni metodoloji versiyonu oluşturur ve mevcut ağırlıkları ona kopyalar. */
export async function createMethodologyVersion(
  supabase: SupabaseClient,
  input: NewVersionInput,
  weights: ManagedCategoryWeight[],
): Promise<PersistResult<ManagedMethodologyVersion>> {
  if (input.isActive) {
    await supabase.from('kpi_methodology_versions').update({ is_active: false }).eq('is_active', true)
  }
  const { data, error } = await supabase
    .from('kpi_methodology_versions')
    .insert({
      name: input.name,
      description: input.description,
      effective_date: input.effectiveDate,
      is_active: input.isActive,
    })
    .select()
    .single()
  if (error || !data) return { error: error?.message ?? 'Versiyon oluşturulamadı.' }

  const version = parseSupabaseVersions([data])[0]
  const rows = weights.map(weight => ({
    methodology_version_id: version.id,
    category_key: weight.categoryKey,
    weight: weight.weight,
  }))
  const { error: weightError } = await supabase.from('kpi_category_weights').insert(rows)
  if (weightError) return { error: weightError.message }

  await writeWeightAudit(supabase, 'create', version.id, `Yeni metodoloji versiyonu: ${version.name}`, { weights: rows })
  return { data: version }
}
