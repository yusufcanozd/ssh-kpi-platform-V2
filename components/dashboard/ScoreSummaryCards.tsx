'use client'

import { GeneralScoreMethodology } from '@/components/dashboard/MethodologyTooltip'
import { scoreColor, scoreBarWidth, fmtSkor0, type SegmentScore } from '@/lib/kpi'

export type SegmentScoreCardItem = {
  key: string
  label: string
  baz: SegmentScore | null
  cmp: SegmentScore | null
  color: string
  bg: string
}

function ScoreCard({ item, bazDonem, cmpDonem }: { item: SegmentScoreCardItem; bazDonem: string; cmpDonem: string }) {
  const bazG = item.baz?.genel ?? 0
  const cmpG = item.cmp?.genel ?? 0
  const chg = item.cmp && cmpG ? ((bazG - cmpG) / cmpG) * 100 : null

  const chgColor = chg === null ? 'var(--tx3)' : chg >= 0 ? '#10b981' : chg >= -10 ? '#f59e0b' : '#f87171'

  return (
    <div style={{ background: item.bg, border: `1px solid ${item.color}44`, borderRadius: 10, padding: '14px 16px', minHeight: 110 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: item.color }}>{item.label}</span>
        <GeneralScoreMethodology align="right" />
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 9, color: 'var(--tx3)', marginBottom: 3, fontWeight: 500 }}>{bazDonem}</div>
          <div style={{ fontSize: 32, fontWeight: 800, fontFamily: 'var(--font-dm-mono)', color: scoreColor(bazG), lineHeight: 1 }}>
            {item.baz ? fmtSkor0(bazG) : '—'}
          </div>
          <div style={{ fontSize: 9, color: 'var(--tx3)', marginTop: 2 }}>puan</div>
        </div>

        {item.cmp && (
          <div style={{ paddingBottom: 4 }}>
            <div style={{ fontSize: 9, color: 'var(--tx3)', marginBottom: 3, fontWeight: 500 }}>{cmpDonem}</div>
            <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-dm-mono)', color: 'var(--tx2)', lineHeight: 1 }}>
              {fmtSkor0(cmpG)}
            </div>
          </div>
        )}

        {chg !== null && (
          <div style={{ paddingBottom: 6, marginLeft: 'auto' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: chgColor }}>
              {chg >= 0 ? '▲ +' : '▼ '}{Math.abs(chg).toFixed(1)}%
            </div>
          </div>
        )}
      </div>

      <div style={{ background: 'rgba(0,0,0,.12)', borderRadius: 6, height: 4, overflow: 'hidden' }}>
        <div
          style={{
            width: `${scoreBarWidth(bazG)}%`,
            height: 4,
            borderRadius: 6,
            background: scoreColor(bazG) + '88',
            transition: 'width .4s',
          }}
        />
      </div>
    </div>
  )
}

export default function ScoreSummaryCards({ items, bazDonem, cmpDonem }: { items: SegmentScoreCardItem[]; bazDonem: string; cmpDonem: string }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 10 }}>
      {items.map((item) => (
        <ScoreCard key={item.key} item={item} bazDonem={bazDonem} cmpDonem={cmpDonem} />
      ))}
    </div>
  )
}
