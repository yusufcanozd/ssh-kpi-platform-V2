'use client'

import { useMemo } from 'react'
import { useDashboardCtx } from '@/app/dashboard/DashboardClient'
import Topbar from '@/components/layout/Topbar'
import { 
  KPI_META, 
  getMarkaKpiScores, 
  kpiScoreColor, 
  kpiScoreBg,
  getMarkaList // Elindeki tüm benzersiz markaları dönen fonksiyon
} from '@/lib/kpi'

export default function MarkaKpiGezgini() {
  const { selBolge, selYas, selDonem } = useDashboardCtx()

  // Filtrelere göre tüm markaların normalize skor matrisini hesapla
  const markaMatrisi = useMemo(() => {
    const markalar = getMarkaList() // ['Alfa Romeo', 'Volvo', 'BMW', ...]
    
    return markalar.map(marka => {
      const scores = getMarkaKpiScores(marka, selBolge, selYas, selDonem)
      // Rule of 3: Markanın genel ortalama normalize skorunu da hesaplayalım
      const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      
      return {
        name: marka,
        scores,
        avgScore
      }
    }).sort((a, b) => b.avgScore - a.avgScore) // Genel başarıya göre sıralı
  }, [selBolge, selYas, selDonem])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <Topbar title="Marka & KPI Analiz Matrisi" subtitle="TR Referansına göre dinamik normalize edilmiş skorlar (0-100)" />
      
      <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
        <div style={{ background: 'var(--surf)', border: '1px solid var(--bd)', borderRadius: 10, overflow: 'hidden' }}>
          
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--surf2)', borderBottom: '1px solid var(--bd)' }}>
                <th style={{ padding: '12px 16px', fontWeight: 700, minWidth: '140px' }}>Marka</th>
                <th style={{ padding: '12px 8px', fontWeight: 700, textAlign: 'center', background: 'rgba(255,255,255,0.02)' }}>Genel Sk.</th>
                {KPI_META.map(meta => (
                  <th key={meta.no} title={meta.ad} style={{ padding: '12px 8px', fontWeight: 600, maxWidth: '100px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    K{meta.no} - {meta.ad.substring(0, 15)}...
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {markaMatrisi.map(marka => (
                <tr key={marka.name} style={{ borderBottom: '1px solid var(--bd)', transition: 'background .15s' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.01)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '10px 16px', fontWeight: 600, fontSize: '12px' }}>{marka.name}</td>
                  
                  {/* Genel Ortalama Skoru (Rule of 3 Renklendirmesiyle) */}
                  <td style={{ 
                    padding: '10px 8px', 
                    textAlign: 'center',
                    fontWeight: 700,
                    color: kpiScoreColor(marka.avgScore),
                    background: kpiScoreBg(marka.avgScore)
                  }}>
                    {marka.avgScore}
                  </td>

                  {/* Dinamik Normalize KPI Hücreleri */}
                  {marka.scores.map((score, idx) => (
                    <td key={idx} style={{ padding: '10px 8px', textAlign: 'center' }}>
                      <span style={{ 
                        display: 'inline-block',
                        padding: '3px 8px', 
                        borderRadius: '4px',
                        fontWeight: 600,
                        fontFamily: 'var(--font-dm-mono), monospace',
                        color: kpiScoreColor(score),
                        background: kpiScoreBg(score),
                        minWidth: '28px'
                      }}>
                        {score}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

        </div>

        {/* Rule of 3 Legend / Bilgi Kartı */}
        <div style={{ display: 'flex', gap: '16px', marginTop: '16px', fontSize: '11px', color: 'var(--tx3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#10b981' }} />
            <span>≥ 80 Skoru: TR Ortalamasının Üzerinde (Başarılı)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#f59e0b' }} />
            <span>65 - 79 Skoru: TR Ortalamasına Yakın (Sınırda / İzlenmeli)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#ef4444' }} />
            <span>{"< 65 Skoru: TR Ortalamasının Altında (Kritik)"}</span>
          </div>
        </div>

      </div>
    </div>
  )
}
