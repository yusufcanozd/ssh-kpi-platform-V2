import React from 'react'
import { CATEGORY_OPTIONS } from '@/lib/kpi'
import { applyCategoryColorOverrides, type CategoryColorOverrides } from '@/lib/kpi/category-colors'

export function buildReportCategories(overrides: CategoryColorOverrides = {}) {
  return applyCategoryColorOverrides(CATEGORY_OPTIONS, overrides).map(cat => ({
    key: cat.key,
    label: cat.label,
    color: cat.color,
  }))
}

export const KATS = buildReportCategories()

export const thS: React.CSSProperties = { padding:'7px 10px', textAlign:'left', fontSize:9, fontWeight:700, color:'var(--tx3)', borderBottom:'1px solid var(--bd)', whiteSpace:'nowrap' }
export const tdS: React.CSSProperties = { padding:'6px 10px', borderBottom:'1px solid var(--bd)' }

export function YorumBlok({ text, color }: { text: string; color?: string }) {
  if (!text) return null
  return (
    <div style={{ background:'var(--surf2)', borderRadius:8, padding:'12px 16px', marginTop:10,
      fontSize:12, lineHeight:1.9, color:'var(--tx2)', borderLeft:'3px solid ' + (color || '#3b82f6') }}>
      {text}
    </div>
  )
}
