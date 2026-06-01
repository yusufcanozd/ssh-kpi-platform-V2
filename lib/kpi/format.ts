// lib/kpi/format.ts
// Görsel formatlama, renk fonksiyonları ve 0-200 skor ölçeğine uygun eşikler.

import { SEGMENT_HEX, SEGMENT_BG } from './config'

export function fmtKpi(v: unknown, f: string): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '—'
  const n = Number(v)
  if (!Number.isFinite(n)) return String(v)
  switch (f) {
    case '%':
    case 'pct':
    case 'pct2':
      return `${(n * (Math.abs(n) <= 1 ? 100 : 1)).toFixed(1)}%`
    case 'pct4':
      return `${(n * (Math.abs(n) <= 1 ? 100 : 1)).toFixed(2)}%`
    case 'tl0':
      return n.toLocaleString('tr-TR', { maximumFractionDigits: 0 }) + ' ₺'
    case 'int':
      return n.toLocaleString('tr-TR', { maximumFractionDigits: 0 })
    case 'ratio1':
    case 'gun1':
    case 'saat1':
      return n.toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
    case 'ratio2':
      return n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    default:
      return n.toLocaleString('tr-TR')
  }
}

export function fmtSkor1(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '—'
  return Number(v).toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
}

export function fmtSkor0(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '—'
  return String(Math.round(v))
}

export function kpiUnit(fmt: string): string {
  if (fmt.startsWith('pct') || fmt === '%') return '%'
  if (fmt.startsWith('tl')) return '₺'
  if (fmt.startsWith('gun')) return 'gün'
  if (fmt.startsWith('saat')) return 'saat'
  return ''
}

// 0-200 normalize skor ölçeği: 100 referans seviyesi.
// 110+ güçlü, 95-110 referansa yakın, 85-95 dikkat, <85 kritik.
export function scoreBand(s: number): 'strong' | 'normal' | 'watch' | 'critical' {
  if (s >= 110) return 'strong'
  if (s >= 95) return 'normal'
  if (s >= 85) return 'watch'
  return 'critical'
}

export const scoreColor = (s: number): string => {
  const band = scoreBand(s)
  if (band === 'strong') return '#10b981'
  if (band === 'normal') return '#3b82f6'
  if (band === 'watch') return '#f59e0b'
  return '#ef4444'
}

export const scoreBg = (s: number): string => {
  const band = scoreBand(s)
  if (band === 'strong') return 'rgba(16,185,129,.15)'
  if (band === 'normal') return 'rgba(59,130,246,.14)'
  if (band === 'watch') return 'rgba(245,158,11,.14)'
  return 'rgba(239,68,68,.14)'
}

export const kpiScoreColor = scoreColor
export const kpiScoreBg = scoreBg

export function scoreBarWidth(score: number | null | undefined): number {
  if (score == null || !Number.isFinite(score)) return 0
  // Görsel bar 0-200 skor ölçeğini 0-100 genişliğe map eder.
  return Math.max(0, Math.min(100, (score / 200) * 100))
}

export function scoreBandLabel(score: number): string {
  const band = scoreBand(score)
  if (band === 'strong') return 'Güçlü / referans üstü'
  if (band === 'normal') return 'Referansa yakın'
  if (band === 'watch') return 'Dikkat'
  return 'Kritik / referans altı'
}

export const chgColor = (v: number): string =>
  v > 0 ? '#10b981' : v < 0 ? '#ef4444' : '#64748b'

export const chgBg = (v: number): string =>
  v > 0 ? 'rgba(16,185,129,.15)' : v < 0 ? 'rgba(239,68,68,.15)' : 'rgba(100,116,139,.15)'

export const changePct = (
  baz: number | null | undefined,
  cmp: number | null | undefined
): number | null => {
  if (baz == null || cmp == null || cmp === 0) return null
  return Math.round(((baz - cmp) / Math.abs(cmp)) * 1000) / 10
}

export function heatColor(
  val: number | null | undefined,
  ref: number | null | undefined,
  higherBetter = true
): { bg: string; color: string } {
  if (val == null || ref == null || ref === 0) {
    return { bg: 'rgba(100,116,139,.10)', color: '#64748b' }
  }
  const ratio = higherBetter ? val / ref : ref / val
  if (ratio >= 1.05) return { bg: 'rgba(16,185,129,.16)', color: '#10b981' }
  if (ratio >= 0.95) return { bg: 'rgba(59,130,246,.14)', color: '#3b82f6' }
  if (ratio >= 0.85) return { bg: 'rgba(245,158,11,.16)', color: '#f59e0b' }
  return { bg: 'rgba(239,68,68,.14)', color: '#ef4444' }
}

export function getSegmentColor(seg = ''): string {
  return SEGMENT_HEX[seg] ?? '#64748b'
}

export function getSegmentBg(seg = ''): string {
  return SEGMENT_BG[seg] ?? 'rgba(100,116,139,.15)'
}
