'use client'

import { useState, type ReactNode } from 'react'
import { CATEGORY_OPTIONS, KPI_META, fmtKpi, type KpiScoreDetailFull } from '@/lib/kpi'

type Align = 'left' | 'right'

function fmtScore(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '—'
  return String(Math.round(n))
}

function fmtRaw(kpiIdx: number, n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '—'
  return fmtKpi(n, KPI_META[kpiIdx]?.fmt ?? '')
}

export default function MethodologyTooltip({
  title,
  children,
  align = 'right',
}: {
  title: string
  children?: ReactNode
  align?: Align
}) {
  const [open, setOpen] = useState(false)

  return (
    <span
      style={{ position: 'relative', display: 'inline-flex', verticalAlign: 'middle' }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        aria-label={title}
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        style={{
          width: 18,
          height: 18,
          borderRadius: 999,
          border: '1px solid var(--bd)',
          background: 'var(--surf2)',
          color: 'var(--tx3)',
          fontSize: 11,
          fontWeight: 800,
          lineHeight: '16px',
          cursor: 'help',
          padding: 0,
        }}
      >
        ?
      </button>
      {open && (
        <span
          role="tooltip"
          style={{
            position: 'absolute',
            top: 24,
            ...(align === 'left' ? { left: 0 } : { right: 0 }),
            zIndex: 50,
            width: 300,
            maxWidth: 'min(300px, calc(100vw - 32px))',
            background: 'var(--surf3)',
            color: 'var(--tx)',
            border: '1px solid var(--bd2)',
            borderRadius: 10,
            padding: '10px 12px',
            boxShadow: '0 14px 34px rgba(0,0,0,.32)',
            textAlign: 'left',
            whiteSpace: 'normal',
            pointerEvents: 'none',
          }}
        >
          <strong style={{ display: 'block', fontSize: 11, marginBottom: 7, color: 'var(--tx)' }}>{title}</strong>
          <span style={{ display: 'block', fontSize: 10, lineHeight: 1.55, color: 'var(--tx2)' }}>
            {children}
          </span>
        </span>
      )}
    </span>
  )
}

export function GeneralScoreMethodology({ align = 'right' }: { align?: Align }) {
  return (
    <MethodologyTooltip title="Genel skor hesaplama" align={align}>
      <span>Genel skor = {CATEGORY_OPTIONS.map(cat => `${cat.shortLabel} × %${Math.round(cat.agirlik * 100)}`).join(' + ')}.</span>
      <br />
      <span>Kategori skorları, ilgili KPI skorlarının ortalamasıdır. Eksik KPI varsa kategori ortalamasına dahil edilmez; kategori tamamen eksikse nötr 100 kullanılır ve coverage düşer.</span>
    </MethodologyTooltip>
  )
}

export function CategoryScoreMethodology({ align = 'right' }: { align?: Align }) {
  return (
    <MethodologyTooltip title="Kategori skoru hesaplama" align={align}>
      <span>Her kategori skoru, o kategoriye bağlı KPI skorlarının aritmetik ortalamasıdır.</span>
      <br />
      <span>{CATEGORY_OPTIONS.map(cat => `${cat.shortLabel}: ${cat.kpis.map(idx => `KPI ${idx + 1}`).join(', ')}`).join(' · ')}.</span>
    </MethodologyTooltip>
  )
}

export function KpiMethodologyTooltip({
  detail,
  kpiName,
  align = 'right',
}: {
  detail?: KpiScoreDetailFull
  kpiName: string
  align?: Align
}) {
  const lowerBetter = detail?.isLowerBetter ?? false
  const formula = lowerBetter ? 'referans / değer × 100' : 'değer / referans × 100'

  return (
    <MethodologyTooltip title={kpiName} align={align}>
      <span><strong>Ham değer:</strong> {detail ? fmtRaw(detail.kpiIdx, detail.rawValue) : '—'}</span>
      <br />
      <span><strong>Referans değer:</strong> {detail ? fmtRaw(detail.kpiIdx, detail.referenceValue) : '—'}</span>
      <br />
      <span><strong>Skor:</strong> {detail ? fmtScore(detail.score) : '—'}</span>
      <br />
      <span><strong>Yön:</strong> {lowerBetter ? 'Düşük daha iyi' : 'Yüksek daha iyi'}</span>
      <br />
      <span><strong>Formül:</strong> {formula}</span>
      <br />
      <span>Skor 0-200 aralığında sınırlandırılır{detail?.isCapped ? '; bu KPI 200 tavanına çarpmıştır' : ''}.</span>
      <br />
      <span>Veri veya referans eksikse ekranda nötr 100 gösterilir; detaylı coverage oranı bu eksikliği yansıtır.</span>
      {detail && !detail.coverageIncluded && (
        <>
          <br />
          <span><strong>Coverage:</strong> Bu KPI hesaplamaya dahil edilmedi.</span>
        </>
      )}
    </MethodologyTooltip>
  )
}
