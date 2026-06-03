// lib/admin/brands-management.ts
// Prompt 6 — Marka yönetimi. `brands` tablosu üzerinden CRUD.
// Tablo boşsa mevcut marka_scores fallback'i gösterilir; "İçe aktar" ile DB'ye taşınır.

import type { SupabaseClient } from '@supabase/supabase-js'
import { DONEMLER, SEGMENTLER, getRawMarkaRanking } from '@/lib/kpi'

export interface AdminBrand {
  id: string
  code: string
  name: string
  segment: string
  isActive: boolean
  isHidden: boolean
  dataSource: 'fallback' | 'import'
  source: 'supabase' | 'fallback'
}

export interface BrandLoadResult {
  brands: AdminBrand[]
  source: 'supabase' | 'fallback'
  warning?: string
}

export interface PersistResult<T> {
  data?: T
  error?: string
}

export const SEGMENT_OPTIONS: string[] = (SEGMENTLER && SEGMENTLER.length ? SEGMENTLER : ['Premium', 'Mass', 'EV'])

function toRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

export function slugifyBrandCode(value: string): string {
  return value
    .toLocaleUpperCase('tr-TR')
    .replace(/Ğ/g, 'G').replace(/Ü/g, 'U').replace(/Ş/g, 'S')
    .replace(/İ/g, 'I').replace(/I/g, 'I').replace(/Ö/g, 'O').replace(/Ç/g, 'C')
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export function isPersistedId(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
}

/** marka_scores fallback'inden marka listesi üretir (son dönem). */
export function getFallbackBrands(): AdminBrand[] {
  const latest = DONEMLER[DONEMLER.length - 1] ?? ''
  const ranking = getRawMarkaRanking('', '', 'Tümü', latest)
  const seen = new Set<string>()
  const brands: AdminBrand[] = []
  ranking.forEach(row => {
    const name = (row.marka ?? '').trim()
    if (!name || seen.has(name.toLocaleLowerCase('tr-TR'))) return
    seen.add(name.toLocaleLowerCase('tr-TR'))
    brands.push({
      id: `fallback-brand-${slugifyBrandCode(name) || brands.length + 1}`,
      code: slugifyBrandCode(name) || `MARKA-${brands.length + 1}`,
      name,
      segment: (row.segment ?? '').trim(),
      isActive: true,
      isHidden: false,
      dataSource: 'fallback',
      source: 'fallback',
    })
  })
  return brands.sort((a, b) => a.name.localeCompare(b.name, 'tr-TR'))
}

function parseSupabaseBrands(rows: unknown): AdminBrand[] {
  if (!Array.isArray(rows)) return []
  return rows.map((row, index): AdminBrand | null => {
    const record = toRecord(row)
    if (!record) return null
    const code = asString(record.code, `MARKA-${index + 1}`)
    const dataSource = asString(record.data_source, 'fallback') === 'import' ? 'import' : 'fallback'
    return {
      id: asString(record.id, `supabase-brand-${code}`),
      code,
      name: asString(record.name ?? record.ad, code),
      segment: asString(record.segment, ''),
      isActive: asBoolean(record.is_active ?? record.isActive, true),
      isHidden: asBoolean(record.is_hidden ?? record.isHidden, false),
      dataSource,
      source: 'supabase' as const,
    }
  }).filter((item): item is AdminBrand => Boolean(item))
}

export async function loadBrands(supabase: SupabaseClient): Promise<BrandLoadResult> {
  try {
    const { data, error } = await supabase.from('brands').select('*').order('name', { ascending: true })
    if (error) {
      return { brands: getFallbackBrands(), source: 'fallback', warning: 'brands tablosu okunamadı; marka_scores fallback gösteriliyor.' }
    }
    const parsed = parseSupabaseBrands(data)
    if (!parsed.length) {
      return { brands: getFallbackBrands(), source: 'fallback', warning: 'brands tablosu boş; marka_scores fallback gösteriliyor. "Mevcut markaları içe aktar" ile DB’ye taşıyabilirsiniz.' }
    }
    return { brands: parsed, source: 'supabase' }
  } catch {
    return { brands: getFallbackBrands(), source: 'fallback', warning: 'Supabase bağlantısı kurulamadı; fallback gösteriliyor.' }
  }
}

function brandToRow(brand: AdminBrand) {
  return {
    code: brand.code,
    name: brand.name,
    segment: brand.segment || null,
    is_active: brand.isActive,
    is_hidden: brand.isHidden,
    data_source: brand.dataSource,
  }
}

async function writeBrandAudit(supabase: SupabaseClient, action: string, entityId: string, summary: string, payload: Record<string, unknown>) {
  try {
    const { data } = await supabase.auth.getUser()
    await supabase.from('audit_logs').insert({
      actor_id: data.user?.id ?? null,
      action, entity: 'brand', entity_id: entityId, summary, metadata: payload,
    })
  } catch { /* audit kritik değil */ }
}

export function validateBrand(brand: AdminBrand, existing: AdminBrand[], editingId?: string): string[] {
  const errors: string[] = []
  if (!brand.name.trim()) errors.push('Marka adı zorunludur.')
  if (!brand.code.trim()) errors.push('Marka kodu zorunludur.')
  if (!brand.segment.trim()) errors.push('Segment seçimi zorunludur.')
  const dup = existing.some(item => item.code.trim().toLocaleUpperCase('tr-TR') === brand.code.trim().toLocaleUpperCase('tr-TR') && item.id !== editingId)
  if (dup) errors.push(`Marka kodu ${brand.code} zaten kullanılıyor.`)
  return errors
}

export async function saveBrand(supabase: SupabaseClient, brand: AdminBrand, editing: boolean): Promise<PersistResult<AdminBrand>> {
  const row = brandToRow(brand)
  const builder = editing && isPersistedId(brand.id)
    ? supabase.from('brands').update(row).eq('id', brand.id).select().single()
    : supabase.from('brands').insert(row).select().single()
  const { data, error } = await builder
  if (error) return { error: error.message }
  const saved = parseSupabaseBrands([data])[0]
  await writeBrandAudit(supabase, editing ? 'update' : 'create', saved.id, `${saved.name} ${editing ? 'güncellendi' : 'eklendi'}`, { code: saved.code, segment: saved.segment })
  return { data: saved }
}

export async function setBrandActive(supabase: SupabaseClient, id: string, isActive: boolean): Promise<PersistResult<AdminBrand>> {
  if (!isPersistedId(id)) return { error: 'Bu marka henüz DB’de değil.' }
  const { data, error } = await supabase.from('brands').update({ is_active: isActive }).eq('id', id).select().single()
  if (error) return { error: error.message }
  const saved = parseSupabaseBrands([data])[0]
  await writeBrandAudit(supabase, isActive ? 'reactivate' : 'deactivate', saved.id, `${saved.name} ${isActive ? 'aktifleştirildi' : 'pasifleştirildi'}`, {})
  return { data: saved }
}

export async function setBrandHidden(supabase: SupabaseClient, id: string, isHidden: boolean): Promise<PersistResult<AdminBrand>> {
  if (!isPersistedId(id)) return { error: 'Bu marka henüz DB’de değil.' }
  const { data, error } = await supabase.from('brands').update({ is_hidden: isHidden }).eq('id', id).select().single()
  if (error) return { error: error.message }
  return { data: parseSupabaseBrands([data])[0] }
}

export async function deleteBrand(supabase: SupabaseClient, id: string): Promise<PersistResult<true>> {
  if (!isPersistedId(id)) return { data: true }
  const { error } = await supabase.from('brands').delete().eq('id', id)
  if (error) return { error: error.message }
  await writeBrandAudit(supabase, 'delete', id, 'Marka kalıcı silindi', {})
  return { data: true }
}

/** Fallback marka listesini DB'ye toplu ekler (kod çakışmazsa). */
export async function importFallbackBrands(supabase: SupabaseClient): Promise<PersistResult<number>> {
  const rows = getFallbackBrands().map(brand => ({
    code: brand.code,
    name: brand.name,
    segment: brand.segment || null,
    is_active: true,
    is_hidden: false,
    data_source: 'fallback',
  }))
  if (!rows.length) return { data: 0 }
  const { data, error } = await supabase.from('brands').upsert(rows, { onConflict: 'code' }).select()
  if (error) return { error: error.message }
  await writeBrandAudit(supabase, 'import', 'bulk', `${rows.length} marka içe aktarıldı`, { count: rows.length })
  return { data: Array.isArray(data) ? data.length : rows.length }
}
