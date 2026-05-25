'use client'

import { useMemo } from 'react'
import { useDashboardCtx } from '@/app/dashboard/DashboardClient'
import Topbar from '@/components/layout/Topbar'
import {
  KPI_META,
  kpiScoreColor,
  kpiScoreBg,
  getMarkaRanking,
  getKpiScores,
  SEGMENTLER,
} from '@/lib/kpi'

export default function MarkaKpiGezgini() {
  const { selBolge, selYas, selDonem } = useDashboardCtx()

  // Her markanın KPI skorlarını hesapla
  // getMarkaRanking → marka listesi (string[])
  // getKpiScores(seg, bolge, yas, donem) → o segmentin normalize KPI skorları
  const markaMatrisi = useMemo(() => {
    const satirlar: { name: string; segment: string; scores: number[]; avgScore: number }[] = []

    for (const seg of SEGMENTLER) {
      const markalar = getMarkaRanking(seg, selBolge, selYas, selDonem)

      for (const m of markalar) {
        // Markanın ait olduğu segmentin KPI skorlarını al
        // (marka bazlı ham KPI mevcut değil; segment ortalaması kullanılır)
        const scores = getKpiScores(m.segment, selBolge, selYas, selDonem)
        const avgScore = scores.length > 0
          ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
          : 0

        satirlar.push({
          name: m.marka,
          segment: m.segment,
          scores,
          avgScore,
        })
      }
    }

    // Genel skora göre sırala, tekrar eden markaları kaldır
    const seen = new Set<string>()
    return satirlar
      .filter(r => { if (seen.has(r.name)) return false; seen.add(r.name); return true })
      .sort((a, b) => b.avgScore - a.avgScore)
  }, [selBolge, selYas, selDonem])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <Topbar
        title="Marka & KPI Analiz Matrisi"
        subtitle="TR Referansına göre dinamik normalize edilmiş skorlar (0-100)"
      />

      <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
        <div style={{ background: 'var(--surf)', border: '1px solid var(--bd)', borderRadius: 10, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--surf2)', borderBottom: '1px solid var(--bd)' }}>
                <th style={{ padding: '12px 16px', fontWeight: 700, minWidth: '140px' }}>Marka</th>
                <th style={{ padding: '12px 8px', fontWeight: 700, minWidth: '80px' }}>Segment</th>
                <th style={{ padding: '12px 8px', fontWeight: 700, textAlign: 'center' }}>Genel Sk.</th>
                {KPI_META.map(meta => (
                  <th
                    key={meta.no}
                    title={meta.ad}
                    style={{ padding: '12px 8px', fontWeight: 600, maxWidth: '100px',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                  >
                    K{meta.no}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {markaMatrisi.map(marka => (
                <tr
                  key={marka.name}
                  style={{ borderBottom: '1px solid var(--bd)', transition: 'background .15s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '10px 16px', fontWeight: 600, fontSize: '12px' }}>
                    {marka.name}
                  </td>
                  <td style={{ padding: '10px 8px', fontSize: '11px', color: 'var(--tx3)' }}>
                    {marka.segment}
                  </td>

                  {/* Genel Ortalama Skor */}
                  <td style={{
                    padding: '10px 8px', textAlign: 'center', fontWeight: 700,
                    color: kpiScoreColor(marka.avgScore),
                    background: kpiScoreBg(marka.avgScore),
                  }}>
                    {marka.avgScore}
                  </td>

                  {/* KPI Hücreleri */}
                  {marka.scores.map((score, idx) => (
                    <td key={idx} style={{ padding: '10px 8px', textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-block', padding: '3px 8px', borderRadius: '4px',
                        fontWeight: 600, fontFamily: 'var(--font-dm-mono), monospace',
                        color: kpiScoreColor(score), background: kpiScoreBg(score),
                        minWidth: '28px',
                      }}>
                        {score}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}

              {markaMatrisi.length === 0 && (
                <tr>
                  <td colSpan={KPI_META.length + 3}
                    style={{ padding: '40px', textAlign: 'center', color: 'var(--tx3)' }}>
                    Seçili filtreler için veri bulunamadı
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Renk Efsanesi */}
        <div style={{ display: 'flex', gap: '16px', marginTop: '16px', fontSize: '11px', color: 'var(--tx3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: '#10b981', display: 'inline-block' }} />
            <span>≥ 77: TR Ortalamasının Üzerinde</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: '#3b82f6', display: 'inline-block' }} />
            <span>66–76: TR Ortalamasına Yakın</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: '#ef4444', display: 'inline-block' }} />
            <span>{'< 66: TR Ortalamasının Altında'}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
