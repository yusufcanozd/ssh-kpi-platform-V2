'use client'

import { BOLGELER, fmtSkor1, getRegionalScorePrecise, scoreBarWidth, scoreColor } from '@/lib/kpi'
import styles from '@/app/dashboard/page.module.css'

export default function RegionScoreGrid({ selSeg, selBolge, selYas, selDonem, selCmpDonem }: {
  selSeg: string
  selBolge: string
  selYas: string
  selDonem: string
  selCmpDonem: string
}) {
  const bolgeList = selBolge ? [selBolge] : BOLGELER

  return (
    <div className={styles.card}>
      <div className={styles.cardHd}>
        <div>
          <h3>Bölge Skor Dağılımı</h3>
          <div style={{ fontSize: 10, color: 'var(--tx3)', marginTop: 4 }}>
            Bölge skorları, seçili filtrelerde ilgili bölgenin {selSeg ? 'aynı segmentin Türkiye geneli' : 'Türkiye geneli'} referansına göre hesaplanır. 100 referans seviyesidir; skorlar 1 ondalık basamakla gösterilir.
          </div>
        </div>
        <span className={styles.hint}>
          {selSeg || 'Tüm Seg.'} · {selYas === 'Tümü' ? 'Tüm Yaş' : selYas + 'y'} · {selDonem || 'Tüm Dönem'}{selCmpDonem ? ` vs ${selCmpDonem}` : ''}
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 8 }}>
        {bolgeList.map((b) => {
          const baz = getRegionalScorePrecise(selSeg, b, selYas, selDonem)
          const cmp = selCmpDonem ? getRegionalScorePrecise(selSeg, b, selYas, selCmpDonem) : null
          const bazG = baz?.genel ?? 0
          const cmpG = cmp?.genel ?? 0
          const chg = cmp && cmpG ? ((bazG - cmpG) / Math.abs(cmpG)) * 100 : null
          const chgColor = chg === null ? 'var(--tx3)' : chg >= 0 ? '#10b981' : chg >= -10 ? '#f59e0b' : '#f87171'
          const relColor = scoreColor(bazG)

          return (
            <div key={b} style={{ padding: '10px 10px 8px', background: 'var(--surf2)', borderRadius: 8, border: `1px solid ${relColor}55` }}>
              <div style={{ fontSize: 8, fontWeight: 700, color: relColor, marginBottom: 6, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b}</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, marginBottom: 5, flexWrap: 'nowrap' }}>
                <div style={{ flexShrink: 0 }}>
                  <div style={{ fontSize: 7, color: 'var(--tx3)', marginBottom: 1, fontWeight: 500, lineHeight: 1, whiteSpace: 'nowrap' }}>{selDonem ? selDonem.replace('20', '').replace('-FY', 'FY') : 'Tüm'}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-dm-mono)', color: scoreColor(bazG), lineHeight: 1 }}>{baz ? fmtSkor1(bazG) : '—'}</div>
                  <div style={{ fontSize: 7, color: 'var(--tx3)', marginTop: 1 }}>puan</div>
                </div>
                {cmp && (
                  <div style={{ paddingBottom: 2, flexShrink: 0 }}>
                    <div style={{ fontSize: 7, color: 'var(--tx3)', marginBottom: 1, fontWeight: 500, lineHeight: 1, whiteSpace: 'nowrap' }}>{selCmpDonem ? selCmpDonem.replace('20', '').replace('-FY', 'FY') : ''}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-dm-mono)', color: 'var(--tx2)', lineHeight: 1 }}>{fmtSkor1(cmpG)}</div>
                  </div>
                )}
                {chg !== null && (
                  <div style={{ marginLeft: 'auto', paddingBottom: 2, fontSize: 10, fontWeight: 700, color: chgColor, flexShrink: 0, whiteSpace: 'nowrap' }}>
                    {chg >= 0 ? '▲ +' : '▼ '}{Math.abs(chg).toFixed(1)}%
                  </div>
                )}
              </div>
              <div style={{ background: 'rgba(0,0,0,.10)', borderRadius: 4, height: 3, overflow: 'hidden', position: 'relative' }}>
                <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: 'rgba(255,255,255,.35)' }} />
                <div style={{ width: scoreBarWidth(bazG), height: 3, borderRadius: 4, background: relColor + '99', transition: 'width .4s' }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
