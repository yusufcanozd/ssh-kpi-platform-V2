// lib/admin/segments-management.ts
// Segment yönetimi. `segments` tablosu üzerinden CRUD.
// Tablo yoksa/boşsa kpi_data.json'daki SEGMENTLER fallback olarak kullanılır.

import type { SupabaseClient } from '@supabase/supabase-js'
import { SEGMENTLER, SEGMENT_HEX } from '@/lib/kpi'

export interface AdminSegment {
  id: string
  code: string
  name: string
  color: string
  sortOrder: number
  isActive: boolean
  source: 'supabase' | 'fallback'
}

export interface SegmentLoadResult {
  segments: AdminSegment[]
  source: 'supabase' | 'fallback'
  warning?: string
}

export interface PersistResult<T> {
  data?: T
  error?: string
}

function toRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
}
function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}
function asNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}
function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

export function isPersistedId(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
}

export function slugifySegmentCode(value: string): string {
  return value
    .toLocaleLowerCase('tr-TR')
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export function getFallbackSegments(): AdminSegment[] {
  const names = SEGMENTLER && SEGMENTLER.length ? SEGMENTLER : ['Premium', 'Mass', 'EV']
  return names
    .filter(Boolean)
    .map((name, index) => ({
      id: `fallback-segment-${name}`,
      code: name,
      name,
      color: SEGMENT_HEX[name] ?? '#64748b',
      sortOrder: index + 1,
      isActive: true,
      source: 'fallback' as const,
    }))
}

function parseSupabaseSegments(rows: unknown): AdminSegment[] {
  if (!Array.isArray(rows)) return []
  return rows.map((row, index): AdminSegment | null => {
    const record = toRecord(row)
    if (!record) return null
    const code = asString(record.code, `segment-${index + 1}`)
    return {
      id: asString(record.id, `supabase-segment-${code}`),
      code,
      name: asString(record.name ?? record.ad, code),
      color: asString(record.color ?? record.renk, '#64748b'),
      sortOrder: asNumber(record.sort_order ?? record.sortOrder, index + 1),
      isActive: asBoolean(record.is_active ?? record.isActive, true),
      source: 'supabase' as const,
    }
  }).filter((item): item is AdminSegment => Boolean(item))
}

export async function loadSegments(supabase: SupabaseClient): Promise<SegmentLoadResult> {
  try {
    const { data, error } = await supabase.from('segments').select('*').order('sort_order', { ascending: true })
    if (error) {
      return { segments: getFallbackSegments(), source: 'fallback', warning: 'segments tablosu okunamadı; fallback gösteriliyor.' }
    }
    const parsed = parseSupabaseSegments(data)
    if (!parsed.length) {
      return { segments: getFallbackSegments(), source: 'fallback', warning: 'segments tablosu boş; fallback gösteriliyor.' }
    }
    return { segments: parsed, source: 'supabase' }
  } catch {
    return { segments: getFallbackSegments(), source: 'fallback', warning: 'Supabase bağlantısı kurulamadı; fallback gösteriliyor.' }
  }
}

/** Marka formu vb. için aktif segment adlarının listesi. */
export async function getActiveSegmentNames(supabase: SupabaseClient): Promise<string[]> {
  const { segments } = await loadSegments(supabase)
  return segments.filter(segment => segment.isActive).map(segment => segment.name)
}

function segmentToRow(segment: AdminSegment) {
  return {
    code: segment.code,
    name: segment.name,
    color: segment.color,
    sort_order: segment.sortOrder,
    is_active: segment.isActive,
  }
}

async function writeSegmentAudit(supabase: SupabaseClient, action: string, entityId: string, summary: string) {
  try {
    const { data } = await supabase.auth.getUser()
    await supabase.from('audit_logs').insert({
      actor_id: data.user?.id ?? null, action, entity: 'segment', entity_id: entityId, summary, metadata: {},
    })
  } catch { /* audit kritik değil */ }
}

export function validateSegment(segment: AdminSegment, existing: AdminSegment[], editingId?: string): string[] {
  const errors: string[] = []
  if (!segment.name.trim()) errors.push('Segment adı zorunludur.')
  if (!segment.code.trim()) errors.push('Segment kodu zorunludur.')
  if (!/^#[0-9a-fA-F]{6}$/.test(segment.color)) errors.push('Renk #RRGGBB formatında olmalı.')
  if (!Number.isInteger(segment.sortOrder) || segment.sortOrder <= 0) errors.push('Sıralama pozitif tam sayı olmalı.')
  const dup = existing.some(item => item.code.trim().toLocaleLowerCase('tr-TR') === segment.code.trim().toLocaleLowerCase('tr-TR') && item.id !== editingId)
  if (dup) errors.push(`Segment kodu ${segment.code} zaten kullanılıyor.`)
  return errors
}

export async function saveSegment(supabase: SupabaseClient, segment: AdminSegment, editing: boolean): Promise<PersistResult<AdminSegment>> {
  const row = segmentToRow(segment)
  const builder = editing && isPersistedId(segment.id)
    ? supabase.from('segments').update(row).eq('id', segment.id).select().single()
    : supabase.from('segments').insert(row).select().single()
  const { data, error } = await builder
  if (error) return { error: error.message }
  const saved = parseSupabaseSegments([data])[0]
  await writeSegmentAudit(supabase, editing ? 'update' : 'create', saved.id, `${saved.name} segmenti ${editing ? 'guncellendi' : 'eklendi'}`)
  return { data: saved }
}

export async function setSegmentActive(supabase: SupabaseClient, id: string, isActive: boolean): Promise<PersistResult<AdminSegment>> {
  if (!isPersistedId(id)) return { error: 'Bu segment henüz DB’de değil.' }
  const { data, error } = await supabase.from('segments').update({ is_active: isActive }).eq('id', id).select().single()
  if (error) return { error: error.message }
  return { data: parseSupabaseSegments([data])[0] }
}

export async function deleteSegment(supabase: SupabaseClient, id: string): Promise<PersistResult<true>> {
  if (!isPersistedId(id)) return { data: true }
  const { error } = await supabase.from('segments').delete().eq('id', id)
  if (error) return { error: error.message }
  await writeSegmentAudit(supabase, 'delete', id, 'Segment kalici silindi')
  return { data: true }
}
