'use client'

import { useMemo } from 'react'
import { useDashboardCtx } from './DashboardClient'
import Topbar from '@/components/layout/Topbar'
import StatCard from '@/components/ui/StatCard'
import {
  KPI_META, BOLGELER, SEGMENTLER, YAS_STATS, TOTAL_IO, TOTAL_SERVIS,
  SEGMENT_COLORS, SEGMENT_BG, YAS_COLORS,
  fmtKpi, getKpisFromCube, getN, getServisCount, overallScoreFromKpis, getMarkaList, heatColor, isLowerBetter, getSegAvg
} from '@/lib/kpi'
import { Bar } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js'
import styles from './page.module.css'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

export default function DashboardPage() {
  const { selSeg, selBolge, selYas, selDonem } = useDashboardCtx()

  // Seçili filtre KPI'ları
  const kpis = useMemo(() =>
    getKpisFromCube(selSeg, selBolge, selYas, selDonem),
    [selSeg, selBolge, selYas, selDonem])

  const n        = useMemo(() => getN(selSeg, selBolge, selYas, selDonem), [selSeg, selBolge, selYas, selDonem])
  const servisN  = useMemo(() => getServisCount(selSeg, selBolge, selYas, selDonem), [selSeg, selBolge, selYas, selDonem])

  // Segment karşılaştırma — seçili bölge/yaş/dönem'e göre
  const segKpis = useMemo(() =>
    SEGMENTLER.map(s => ({
      seg: s,
      kpis: getKpisFromCube(s, selBolge, selYas, selDonem)
    })),
    [selBolge, selYas, selDonem])

  // Bölge dağılımı — seçili seg/yas/donem'e göre
  const bolgeData = useMemo(() =>
    BOLGELER.map(b => ({
      bolge: b,
      n: getN(selSeg, b, selYas, selDonem)
    })),
    [selSeg, selYas, selDonem])

  // Marka sıralaması
  const markalar = useMemo(() => {
    const list = getMarkaList(selBolge, selYas)
    return list
      .filter(m => !selSeg || m.segment===selSeg)
      .map(m => ({ ...m, ov: overallScoreFromKpis(m.kpis, m.segment, selBolge, selYas) }))
      .sort((a,b) => b.ov - a.ov)
  }, [selSeg, selBolge, selYas])

  const maxBolgeN = Math.max(...bolgeData.map(b=>b.n), 1)

  const filterLabel = [
    selBolge||'Tüm Türkiye', selSeg||'Tüm Seg.', selYas==='Tümü'?'Tüm Yaş':selYas+' yıl', selDonem||'Tüm Dönem'
  ].join(' · ')

  return (
    <div className={styles.wrap}>
      <Topbar title="SSH KPI Rekabet Skorkartı" subtitle={filterLabel}
        pills={[{label:'● Canlı',variant:'green'},{label:`${n.toLocaleString('tr-TR')} İE`,variant:'amber'}]}/>
      <div className={styles.content}>

        {/* Yaş özet kartları */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginBottom:8}}>
          {(['0-3','3-7','7+'] as const).map(yg=>(
            <div key={yg} style={{background:selYas===yg?`${YAS_COLORS[yg]}18`:'var(--surf2)',
              border:`1px solid ${selYas===yg?YAS_COLORS[yg]:'var(--bd)'}`,borderRadius:8,padding:'10px 14px',textAlign:'center'}}>
              <div style={{fontSize:9,fontWeight:700,color:YAS_COLORS[yg],marginBottom:3}}>{yg} YIL</div>
              <div style={{fontSize:16,fontWeight:700,fontFamily:'var(--font-dm-mono)',color:'var(--tx)'}}>
                {YAS_STATS[yg].toLocaleString('tr-TR')}
              </div>
              <div style={{fontSize:9,color:'var(--tx3)'}}>%{((YAS_STATS[yg]/TOTAL_IO)*100).toFixed(1)}</div>
            </div>
          ))}
          <StatCard label="Seçili İş Emri" value={n.toLocaleString('tr-TR')} sub={filterLabel} accent="blue"/>
        </div>

        {/* Özet kartlar */}
        <div className={styles.statGrid}>
          <StatCard label="Toplam İş Emri"      value={TOTAL_IO.toLocaleString('tr-TR')} sub="Tüm dönem"         accent="blue"/>
          <StatCard label="Yetkili Servis"       value={TOTAL_SERVIS.toLocaleString('tr-TR')} sub="Türkiye geneli" accent="green"/>
          <StatCard label="İşçilik Saati/İE"     value={fmtKpi(kpis[3],'saat1')} sub="KPI 4 · seçili filtre"     accent="amber"/>
          <StatCard label="Servis Süresi"        value={fmtKpi(kpis[6],'gun1')}  sub="KPI 7 · seçili filtre"     accent="purple"/>
        </div>

        <div className={styles.twoCol}>
          {/* Segment karşılaştırma */}
          <div className={styles.card}>
            <div className={styles.cardHd}>
              <h3>Segment Karşılaştırması</h3>
              <span className={styles.hint}>İE başına tutar · {selYas==='Tümü'?'Tüm yaşlar':selYas+' yıl'}</span>
            </div>
            <div className={styles.chartWrap}>
              <Bar data={{
                labels: segKpis.map(s=>s.seg),
                datasets:[
                  {label:'İşçilik (₺)',data:segKpis.map(s=>s.kpis[4]),
                    backgroundColor:segKpis.map(s=>SEGMENT_BG[s.seg]),
                    borderColor:segKpis.map(s=>SEGMENT_COLORS[s.seg]),borderWidth:1.5,borderRadius:7},
                  {label:'Parça (₺)',data:segKpis.map(s=>s.kpis[5]),
                    backgroundColor:segKpis.map(s=>SEGMENT_BG[s.seg].replace('.35',',.12)')),
                    borderColor:segKpis.map(s=>SEGMENT_COLORS[s.seg]),borderWidth:1,borderRadius:7}
                ]
              }} options={{responsive:true,maintainAspectRatio:false,
                plugins:{legend:{display:true,position:'top',labels:{color:'#8496b0',font:{size:10},boxWidth:10}},
                  tooltip:{callbacks:{label:(ctx)=>`₺${Math.round(ctx.parsed.y as number).toLocaleString('tr-TR')}`}}},
                scales:{y:{grid:{color:'rgba(255,255,255,.05)'},ticks:{color:'#8496b0',font:{size:9},callback:(v)=>`₺${Number(v).toLocaleString('tr-TR')}`}},
                  x:{grid:{display:false},ticks:{color:'#8496b0',font:{size:11}}}}}}/>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6,marginTop:10,paddingTop:10,borderTop:'1px solid var(--bd)'}}>
              {segKpis.map(s=>(
                <div key={s.seg} style={{textAlign:'center'}}>
                  <div style={{fontSize:9,color:SEGMENT_COLORS[s.seg],fontWeight:700,marginBottom:3}}>{s.seg}</div>
                  <div style={{fontSize:10,color:'var(--tx2)'}}>İşçilik: <b style={{color:'var(--tx)'}}>{fmtKpi(s.kpis[4],'tl0')}</b></div>
                  <div style={{fontSize:10,color:'var(--tx2)'}}>Parça: <b style={{color:'var(--tx)'}}>{fmtKpi(s.kpis[5],'tl0')}</b></div>
                  <div style={{fontSize:10,color:'var(--tx2)'}}>Süre: <b style={{color:'var(--tx)'}}>{fmtKpi(s.kpis[6],'gun1')}</b></div>
                </div>
              ))}
            </div>
          </div>

          {/* Marka sıralaması */}
          <div className={styles.card}>
            <div className={styles.cardHd}>
              <h3>Marka Sıralaması</h3>
              <span className={styles.hint}>{selBolge||'Tüm Türkiye'} · {selYas==='Tümü'?'Tüm yaşlar':selYas+' yıl'}</span>
            </div>
            <div className={styles.hbarChart}>
              {markalar.slice(0,12).map((m,i)=>{
                const color = m.ov>=70?'#10b981':m.ov>=55?'#3b82f6':m.ov>=40?'#f59e0b':'#ef4444'
                return (
                  <div key={m.marka} className={styles.hbarRow}>
                    <div style={{display:'flex',alignItems:'center',gap:4,minWidth:110}}>
                      <span style={{color:'var(--tx3)',fontSize:9,fontFamily:'var(--font-dm-mono)',width:14}}>{i+1}</span>
                      <span style={{color:SEGMENT_COLORS[m.segment],fontSize:11,fontWeight:600}}>{m.marka}</span>
                    </div>
                    <div className={styles.hbarTrack}>
                      <div className={styles.hbarFill} style={{width:`${m.ov}%`,background:`${color}44`,borderRight:`3px solid ${color}`}}/>
                    </div>
                    <div className={styles.hbarScore} style={{color}}>{m.ov}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Bölge dağılımı — tüm filtreler uygulanmış */}
        <div className={styles.card}>
          <div className={styles.cardHd}>
            <h3>Bölge İş Emri Dağılımı</h3>
            <span className={styles.hint}>{selSeg||'Tüm Seg.'} · {selYas==='Tümü'?'Tüm yaşlar':selYas+' yıl'} · {selDonem||'Tüm Dönem'}</span>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:8}}>
            {bolgeData.map(b=>{
              const pct = (b.n/maxBolgeN*100).toFixed(0)
              return (
                <div key={b.bolge} style={{textAlign:'center',padding:'10px 6px',
                  background:selBolge===b.bolge?'rgba(59,130,246,.08)':'var(--surf2)',
                  borderRadius:8,border:`1px solid ${selBolge===b.bolge?'var(--blue)':'var(--bd)'}`}}>
                  <div style={{fontSize:8,fontWeight:700,color:'var(--tx3)',marginBottom:4,textTransform:'uppercase',letterSpacing:'.04em',lineHeight:1.3}}>{b.bolge}</div>
                  <div style={{height:36,display:'flex',alignItems:'flex-end',justifyContent:'center',marginBottom:3}}>
                    <div style={{width:18,borderRadius:'2px 2px 0 0',background:'rgba(59,130,246,.5)',borderTop:'2px solid #3b82f6',height:`${pct}%`,minHeight:4}}/>
                  </div>
                  <div style={{fontSize:10,fontWeight:700,color:'var(--tx)',fontFamily:'var(--font-dm-mono)'}}>
                    {b.n.toLocaleString('tr-TR')}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

      </div>
    </div>
  )
}
