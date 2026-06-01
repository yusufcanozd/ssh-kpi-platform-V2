'use client'

import { CategoryScoreMethodology } from '@/components/dashboard/MethodologyTooltip'
import { scoreColor, scoreBarWidth, fmtSkor0, type SegmentScore } from '@/lib/kpi'

export type CategoryBreakdownItem = {
  key: string
  label: string
  score: SegmentScore | null
  color: string
  bg?: string
}

const CATEGORIES = [
  { key: 'musteri', label: 'Müşteri Sadakati ve Deneyimi' },
  { key: 'ticari', label: 'Finansal Verimlilik ve Rasyo Analizi' },
  { key: 'operasyonel', label: 'Süreç ve Operasyonel Akış' },
  { key: 'bayi', label: 'Bayi Ağı Kapasite Yönetimi' },
  { key: 'kapsam', label: 'Stratejik Kapsam Dağılımı' },
] as const

function CategoryBox({ item }: { item: CategoryBreakdownItem }) {
  if (!item.score) {
    return (
      <div style={{ background: item.bg || 'var(--surf2)', border: `1px solid ${item.color}22`, borderRadius: 10, padding: '12px 14px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: item.color, marginBottom: 8 }}>{item.label}</div>
        <div style={{ fontSize: 10, color: 'var(--tx3)' }}>Veri yok</div>
      </div>
    )
  }

  return (
    <div style={{ background: item.bg || 'var(--surf2)', border: `1px solid ${item.color}33`, borderRadius: 10, padding: '12px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: item.color }}>{item.label} — Kategori Kırılımı</span>
        <CategoryScoreMethodology align="right" />
      </div>

      {CATEGORIES.map((cat) => {
        const val = item.score?.[cat.key] ?? 0
        return (
          <div key={cat.key} style={{ marginBottom: 7 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
              <span style={{ fontSize: 9, color: 'var(--tx3)' }}>{cat.label}</span>
              <span style={{ fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-dm-mono)', color: scoreColor(val) }}>{fmtSkor0(val)}</span>
            </div>
            <div style={{ background: 'var(--surf3)', borderRadius: 4, height: 5, overflow: 'hidden' }}>
              <div
                style={{
                  width: `${scoreBarWidth(val)}%`,
                  height: 5,
                  borderRadius: 4,
                  background: scoreColor(val) + '88',
                  transition: 'width .3s',
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function CategoryBreakdown({ items }: { items: CategoryBreakdownItem[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 14 }}>
      {items.map((item) => (
        <CategoryBox key={item.key} item={item} />
      ))}
    </div>
  )
}
