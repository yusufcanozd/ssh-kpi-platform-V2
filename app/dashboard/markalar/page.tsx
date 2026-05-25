'use client'

import { useMemo, useEffect } from 'react'
import { useDashboardCtx } from '@/app/dashboard/DashboardClient'
import Topbar from '@/components/layout/Topbar'
import {
  KPI_META,
  getMarkaRanking,
  getKpiScores,
  kpiScoreColor,
  kpiScoreBg
} from '@/lib/kpi'

export default function MarkalarsPage() {
  const { selSeg, selBolge, selYas, selDonem } = useDashboardCtx()

  // Filtrelere göre markaların normalize edilmiş skor matrisini hesapla
  const markaMatrisi = useMemo(() => {
    // 1. Marka listesini al
    const markalar = getMarkaRanking(selSeg, selBolge, selYas, selDonem)
    
    return markalar.map(m => {
      // 2. Artık normalize edilmiş (100 bazlı) skorları alıyoruz
      const scores = getKpiScores(m.segment, selBolge, selYas, selDonem)
      
      // 3. Ortalama performansı hesapla
      const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      
      return { 
        name: m.marka, 
        scores, 
        avgScore 
      }
    }).sort((a, b) => b.avgScore - a.avgScore)
  }, [selSeg, selBolge, selYas, selDonem])

  // Debug: Filtre değişimlerini izle
  useEffect(() => {
    console.log('[markalar] filtre değişti →', { selSeg, selBolge, selYas, selDonem })
  }, [selSeg, selBolge, selYas, selDonem])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Topbar title="Marka Performans Sıralaması" />
      
      <div style={{ padding: '20px', flex: 1, overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', background: 'var(--surf1)', borderRadius: 8 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--bd)' }}>
              <th style={{ padding: '12px', textAlign: 'left', color: 'var(--tx3)', fontSize: 12 }}>Marka</th>
              {KPI_META.map(kpi => (
                <th key={kpi.no} style={{ padding: '12px', textAlign: 'center', color: 'var(--tx3)', fontSize: 12 }}>{kpi.ad}</th>
              ))}
              <th style={{ padding: '12px', textAlign: 'center', color: 'var(--tx3)', fontSize: 12 }}>Genel Skor</th>
            </tr>
          </thead>
          <tbody>
            {markaMatrisi.map((marka) => (
              <tr key={marka.name} style={{ borderBottom: '1px solid var(--bd)' }}>
                <td style={{ padding: '12px', fontWeight: 600 }}>{marka.name}</td>
                {marka.scores.map((score, i) => (
                  <td key={i} style={{ padding: '8px', textAlign: 'center' }}>
                    <span style={{ 
                      padding: '4px 8px', 
                      borderRadius: '4px',
                      fontSize: 12,
                      fontWeight: 700,
                      color: kpiScoreColor(score),
                      background: kpiScoreBg(score)
                    }}>
                      {score}
                    </span>
                  </td>
                ))}
                <td style={{ padding: '12px', textAlign: 'center', fontWeight: 800 }}>
                  {marka.avgScore}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
