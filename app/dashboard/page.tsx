'use client'

import { useMemo } from 'react'
import { useDashboardCtx } from './DashboardClient'
import Topbar from '@/components/layout/Topbar'
import {
  KPI_META, BOLGELER, SEGMENTLER, YAS_STATS, TOTAL_IO, TOTAL_SERVIS,
  SEGMENT_COLORS, SEGMENT_BG, SEGMENT_HEX, SEGMENT_HEX_BG, CAT_COLORS,
  fmtKpi, getKpisFromCube, getN, getMarkaList, getMarkaRanking,
  overallScoreFromKpis, heatColor, isLowerBetter,
  getScore, scoreColor, scoreBg, changePct, SegmentScore
} from '@/lib/kpi'
import { Bar, Line } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend, Filler } from 'chart.js'
import styles from './page.module.css'

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend, Filler)

const KAT_LIST = ['musteri','ticari','operasyonel','bayi','kapsam'] as const
const KAT_LABELS: Record<string,string> = {
  musteri:'Müşteri',ticari:'Ticari',operasyonel:'Operasyonel',bayi:'Bayi Ağı',kapsam:'Kapsam'
}

export default function DashboardPage() {
  const { selSeg, selBolge, selYas, selDonem, selCmpDonem } = useDashboardCtx()

  // Baz dönem skorları — her segment için
  const segScores = useMemo(() =>
    SEGMENTLER.map(s => ({
      seg: s,
      baz: getScore(s, selBolge, selYas, selDonem),
      cmp: selCmpDonem ? getScore(s, selBolge, selYas, selCmpDonem) : null,
    })),
    [selBolge, selYas, selDonem, selCmpDonem])

  // Tüm Türkiye skoru
  const trBaz = useMemo(() => getScore('', selBolge, selYas, selDonem), [selBolge, selYas, selDonem])
  const trCmp = useMemo(() => selCmpDonem ? getScore('', selBolge, selYas, selCmpDonem) : null, [selBolge, selYas, selCmpDonem])

  // Seçili segmente göre filtre
  const visibleSegs = selSeg ? segScores.filter(s=>s.seg===selSeg) : segScores

  // Marka sıralaması — gerçek marka×dönem×yaş verisi
  const markalar = useMemo(() =>
    getMarkaRanking(selSeg, selBolge, selYas, selDonem),
    [selSeg, selYas, selDonem])

  // Karşılaştırma dönem sıralaması
  const marklarCmp = useMemo(() =>
    selCmpDonem ? getMarkaRanking(selSeg, selBolge, selYas, selCmpDonem) : [],
    [selSeg, selYas, selCmpDonem])

  // Bölge dağılımı
  const bolgeData = useMemo(() =>
    BOLGELER.map(b => ({ bolge:b, n:getN(selSeg, b, selYas, selDonem) })),
    [selSeg, selYas, selDonem])
  const maxBolgeN = Math.max(...bolgeData.map(b=>b.n), 1)

  // Segment bar grafik (skor bazlı)
  const segBarData = visibleSegs.map(s=>s.baz?.genel??0)
  const segCmpData = visibleSegs.map(s=>s.cmp?.genel??0)

  const filterLabel = [
    selBolge||'Tüm TR', selSeg||'Tüm Seg.',
    selYas==='Tümü'?'Tüm Yaş':selYas+'y',
    selDonem||'Tüm Dönem'
  ].join(' · ')

  return (
    <div className={styles.wrap}>
      <Topbar title="SSH KPI Rekabet Skorkartı" subtitle={filterLabel}
        pills={[{label:'● Canlı',variant:'green'},{label:selDonem||'Tüm Dönem',variant:'amber'}]}/>
      <div className={styles.content}>

        {/* ── Üst 4 kutu: Segment Skor Kartları ── */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:10}}>
          {/* Tüm Türkiye */}
          <SkorKutu
            label="🇹🇷 Tüm Türkiye"
            baz={trBaz} cmp={trCmp}
            color="var(--seg-tr-color)" bg="var(--seg-tr-bg)"
            bazDonem={selDonem||'Tüm Dönem'}
            cmpDonem={selCmpDonem}
          />
          {visibleSegs.slice(0,3).map(s=>(
            <SkorKutu key={s.seg}
              label={s.seg}
              baz={s.baz} cmp={s.cmp}
              color={SEGMENT_COLORS[s.seg]}
              bg={SEGMENT_BG[s.seg]}
              bazDonem={selDonem||'Tüm Dönem'}
              cmpDonem={selCmpDonem}
            />
          ))}
        </div>

        {/* ── 2. Satır: Kategori kırılım detayları ── */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:14}}>
          <KatDetayKutu label="🇹🇷 Tüm Türkiye" score={trBaz} color="var(--seg-tr-color)" bg="var(--seg-tr-bg)"/>
          {visibleSegs.slice(0,3).map(s=>(
            <KatDetayKutu key={s.seg} label={s.seg} score={s.baz} color={SEGMENT_COLORS[s.seg]} bg={SEGMENT_BG[s.seg]}/>
          ))}
        </div>

        <div className={styles.twoCol}>
          {/* Segment skor bar grafik */}
          <div className={styles.card}>
            <div className={styles.cardHd}>
              <h3>Segment Skor Karşılaştırması</h3>
              <span className={styles.hint}>
                {selDonem||'Tüm Dönem'}{selCmpDonem?` vs ${selCmpDonem}`:''}
              </span>
            </div>
            <div className={styles.chartWrap}>
              <Bar data={{
                labels: ['Tüm TR', ...visibleSegs.map(s=>s.seg)],
                datasets:[
                  {
                    label: selDonem||'Baz Dönem',
                    data: [trBaz?.genel??0, ...segBarData],
                    backgroundColor: ['rgba(251,191,36,.15)',...visibleSegs.map(s=>SEGMENT_HEX_BG[s.seg].replace('.25','.30)'))], 
                    borderColor: ['#fbbf24',...visibleSegs.map(s=>SEGMENT_HEX[s.seg])],
                    borderWidth:2,borderRadius:8
                  },
                  ...(selCmpDonem ? [{
                    label: selCmpDonem,
                    data: [trCmp?.genel??0, ...segCmpData],
                    backgroundColor: ['rgba(251,191,36,.65)',...visibleSegs.map(s=>SEGMENT_HEX_BG[s.seg].replace('.25','.65)'))],
                    borderColor: ['#fbbf24',...visibleSegs.map(s=>SEGMENT_HEX[s.seg])],
                    borderSkipped: false,
                    borderWidth:1.5,borderRadius:8,
                  }] : [])
                ]
              }} options={{
                responsive:true,maintainAspectRatio:false,
                plugins:{legend:{display:!!selCmpDonem,position:'top',labels:{color:'#8496b0',font:{size:10},boxWidth:10}},
                  tooltip:{callbacks:{label:(ctx)=>`${ctx.dataset.label}: ${ctx.parsed.y} puan`}}},
                scales:{
                  y:{min:0,max:105,grid:{color:'rgba(255,255,255,.05)'},ticks:{color:'#8496b0',font:{size:9}}},
                  x:{grid:{display:false},ticks:{color:'#8496b0',font:{size:11}}}}}}/>
            </div>
          </div>

          {/* Marka sıralaması — tüm filtreler dahil */}
          <div className={styles.card}>
            <div className={styles.cardHd}>
              <h3>Marka Sıralaması</h3>
              <span className={styles.hint}>{selBolge||'Tüm TR'} · {selDonem||'Tüm Dönem'}{selCmpDonem?' vs '+selCmpDonem:''}</span>
            </div>
            {/* Scrollable — tüm 42 marka */}
            <div style={{overflowY:'auto',maxHeight:420,paddingRight:4}}>
              {markalar.map((m,i)=>{
                const cmpM    = marklarCmp.find(x=>x.marka===m.marka)
                const cmpRank = selCmpDonem ? marklarCmp.findIndex(x=>x.marka===m.marka)+1 : null
                const rankDiff= cmpRank ? cmpRank-(i+1) : null
                const tooltipLabel = selCmpDonem && cmpM
                  ? `${selDonem||'Baz'}: ${m.score} · ${selCmpDonem}: ${cmpM.score}`
                  : `${m.marka}: ${m.score} puan`

                return (
                  <div key={m.marka} className={styles.hbarRow}
                    title={tooltipLabel}>
                    {/* Sıra + isim */}
                    <div style={{display:'flex',alignItems:'center',gap:4,minWidth:110}}>
                      <span style={{color:'var(--tx3)',fontSize:9,fontFamily:'var(--font-dm-mono)',width:14}}>{i+1}</span>
                      <span style={{color:SEGMENT_HEX[m.segment],fontSize:11,fontWeight:600,
                        whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',maxWidth:90}}>
                        {m.marka}
                      </span>
                    </div>
                    {/* Çift bar */}
                    <div className={styles.hbarTrack} style={{position:'relative'}}>
                      {/* Baz dönem — içi boş */}
                      <div style={{position:'absolute',top:0,left:0,height:'100%',
                        width:`${m.score}%`,border:`2px solid ${SEGMENT_HEX[m.segment]}`,
                        borderRadius:4,boxSizing:'border-box'}}/>
                      {/* Karşılaştırma — içi dolu */}
                      {selCmpDonem && cmpM && (
                        <div style={{position:'absolute',top:'25%',left:0,height:'50%',
                          width:`${cmpM.score}%`,background:`${SEGMENT_HEX[m.segment]}55`,
                          borderRadius:3}}/>
                      )}
                    </div>
                    {/* Skor + rank diff */}
                    <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:1,minWidth:52}}>
                      <div style={{display:'flex',alignItems:'baseline',gap:4}}>
                        <span style={{fontFamily:'var(--font-dm-mono)',fontSize:13,fontWeight:800,
                          color:SEGMENT_HEX[m.segment]}}>{m.score}</span>
                        {selCmpDonem && cmpM && (
                          <span style={{fontFamily:'var(--font-dm-mono)',fontSize:10,
                            color:'var(--tx3)',fontWeight:500}}>/ {cmpM.score}</span>
                        )}
                      </div>
                      {selCmpDonem && rankDiff !== null && (
                        <span style={{fontSize:9,fontWeight:600,
                          color:rankDiff>0?'#10b981':rankDiff<0?'#f87171':'var(--tx3)'}}>
                          {rankDiff>0?`▲${rankDiff}`:rankDiff<0?`▼${Math.abs(rankDiff)}`:'—'}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Son 4 Çeyrek Trend */}
        <SegmentTrendChart selSeg={selSeg} selBolge={selBolge} selYas={selYas} selDonem={selDonem}/>

        {/* Bölge Skor Dağılımı */}
        <BolgeSkorGrid selSeg={selSeg} selBolge={selBolge} selYas={selYas} selDonem={selDonem} selCmpDonem={selCmpDonem}/>

      </div>
    </div>
  )
}

// ── Skor Kutusu ──────────────────────────────────────────────
function SkorKutu({ label, baz, cmp, color, bg, bazDonem, cmpDonem }:{
  label:string; baz:SegmentScore|null; cmp:SegmentScore|null
  color:string; bg:string; bazDonem:string; cmpDonem:string
}) {
  const bazG = baz?.genel ?? 0
  const cmpG = cmp?.genel ?? 0
  const chg  = (cmp && cmpG) ? ((bazG - cmpG) / cmpG * 100) : null

  const chgColor = chg===null ? 'var(--tx3)'
    : chg >= 0  ? '#10b981'
    : chg >= -10 ? '#f59e0b'
    : '#f87171'

  return (
    <div style={{background:bg, border:`1px solid ${color}44`, borderRadius:10, padding:'14px 16px', minHeight:110}}>
      {/* Başlık */}
      <div style={{fontSize:11, fontWeight:700, color, marginBottom:10}}>{label}</div>

      {/* Dönem etiketleri + skorlar */}
      <div style={{display:'flex', alignItems:'flex-end', gap:12, marginBottom:10}}>
        {/* Baz dönem */}
        <div>
          <div style={{fontSize:9, color:'var(--tx3)', marginBottom:3, fontWeight:500}}>{bazDonem}</div>
          <div style={{fontSize:32, fontWeight:800, fontFamily:'var(--font-dm-mono)',
            color:scoreColor(bazG), lineHeight:1}}>
            {bazG || '—'}
          </div>
          <div style={{fontSize:9, color:'var(--tx3)', marginTop:2}}>puan</div>
        </div>

        {/* Karşılaştırma dönem */}
        {cmp && (
          <div style={{paddingBottom:4}}>
            <div style={{fontSize:9, color:'var(--tx3)', marginBottom:3, fontWeight:500}}>{cmpDonem}</div>
            <div style={{fontSize:22, fontWeight:700, fontFamily:'var(--font-dm-mono)',
              color:'var(--tx2)', lineHeight:1}}>
              {cmpG}
            </div>
          </div>
        )}

        {/* Değişim */}
        {chg !== null && (
          <div style={{paddingBottom:6, marginLeft:'auto'}}>
            <div style={{fontSize:13, fontWeight:700, color:chgColor}}>
              {chg >= 0 ? '▲ +' : '▼ '}{Math.abs(chg).toFixed(1)}%
            </div>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div style={{background:'rgba(0,0,0,.12)', borderRadius:6, height:4, overflow:'hidden'}}>
        <div style={{width:`${Math.min(bazG, 100)}%`, height:4, borderRadius:6,
          background:scoreColor(bazG), transition:'width .4s'}}/>
      </div>
    </div>
  )
}

// ── Kategori Detay Kutusu ─────────────────────────────────────
function KatDetayKutu({ label, score, color, bg }:{
  label:string; score:SegmentScore|null; color:string; bg?:string
}) {
  if (!score) return (
    <div style={{background:bg||'var(--surf2)',border:`1px solid ${color}22`,borderRadius:10,padding:'12px 14px'}}>
      <div style={{fontSize:11,fontWeight:700,color,marginBottom:8}}>{label}</div>
      <div style={{fontSize:10,color:'var(--tx3)'}}>Veri yok</div>
    </div>
  )

  const cats = [
    {key:'musteri',   label:'Müşteri'},
    {key:'ticari',    label:'Ticari'},
    {key:'operasyonel',label:'Operasyonel'},
    {key:'bayi',      label:'Bayi Ağı'},
    {key:'kapsam',    label:'Kapsam'},
  ]

  return (
    <div style={{background:bg||'var(--surf2)',border:`1px solid ${color}33`,borderRadius:10,padding:'12px 14px'}}>
      <div style={{fontSize:10,fontWeight:700,color,marginBottom:10}}>{label} — Kategori Kırılımı</div>
      {cats.map(c=>{
        const val = score[c.key as keyof SegmentScore] as number
        return (
          <div key={c.key} style={{marginBottom:7}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:2}}>
              <span style={{fontSize:9,color:'var(--tx3)'}}>{c.label}</span>
              <span style={{fontSize:10,fontWeight:700,fontFamily:'var(--font-dm-mono)',
                color:scoreColor(val)}}>{val}</span>
            </div>
            <div style={{background:'var(--surf3)',borderRadius:4,height:4,overflow:'hidden'}}>
              <div style={{width:`${Math.min(val,100)}%`,height:4,borderRadius:4,
                background:scoreColor(val),transition:'width .3s'}}/>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Bölge Skor Grid ──────────────────────────────────────────
function BolgeSkorGrid({ selSeg, selBolge, selYas, selDonem, selCmpDonem }:{
  selSeg:string; selBolge:string; selYas:string; selDonem:string; selCmpDonem:string
}) {
  const bolgeList = selBolge ? [selBolge] : BOLGELER

  return (
    <div className={styles.card}>
      <div className={styles.cardHd}>
        <h3>Bölge Skor Dağılımı</h3>
        <span className={styles.hint}>
          {selSeg||'Tüm Seg.'} · {selYas==='Tümü'?'Tüm Yaş':selYas+'y'} ·{' '}
          {selDonem||'Tüm Dönem'}{selCmpDonem?` vs ${selCmpDonem}`:''}
        </span>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:8}}>
        {bolgeList.map(b=>{
          const baz    = getScore(selSeg, b, selYas, selDonem)
          const cmp    = selCmpDonem ? getScore(selSeg, b, selYas, selCmpDonem) : null
          const trRef  = getScore(selSeg, '', selYas, selDonem)
          const bazG   = baz?.genel ?? 0
          const cmpG   = cmp?.genel ?? 0
          const trG    = trRef?.genel ?? bazG
          const chg    = (cmp && cmpG) ? ((bazG - cmpG) / cmpG * 100) : null
          const chgColor = chg===null?'var(--tx3)':chg>=0?'#10b981':chg>=-10?'#f59e0b':'#f87171'
          // Renk: TR ortalamasına göre — %2 üstü yeşil, ±%2 sarı, altı kırmızı
          const ratio    = trG > 0 ? bazG / trG : 1
          const relColor = ratio >= 1.02 ? '#10b981' : ratio >= 0.98 ? '#f59e0b' : '#ef4444'
          const relBg    = ratio >= 1.02 ? 'rgba(16,185,129,.1)' : ratio >= 0.98 ? 'rgba(245,158,11,.08)' : 'rgba(239,68,68,.08)'

          return (
            <div key={b} style={{
              padding:'10px 10px 8px',
              background: 'var(--surf2)',
              borderRadius:8,
              border:`1px solid ${relColor}55`,
            }}>
              {/* Bölge adı */}
              <div style={{fontSize:9,fontWeight:700,color:relColor,
                marginBottom:8,lineHeight:1.3}}>
                {b}
              </div>

              {/* Skorlar — SkorKutu ile aynı layout */}
              <div style={{display:'flex',alignItems:'flex-end',gap:6,marginBottom:6}}>
                {/* Baz */}
                <div>
                  <div style={{fontSize:8,color:'var(--tx3)',marginBottom:2,fontWeight:500}}>
                    {selDonem||'Tüm'}
                  </div>
                  <div style={{fontSize:22,fontWeight:800,fontFamily:'var(--font-dm-mono)',
                    color:scoreColor(bazG),lineHeight:1}}>
                    {bazG||'—'}
                  </div>
                  <div style={{fontSize:8,color:'var(--tx3)',marginTop:1}}>puan</div>
                </div>
                {/* Karşılaştırma */}
                {cmp && (
                  <div style={{paddingBottom:3}}>
                    <div style={{fontSize:8,color:'var(--tx3)',marginBottom:2,fontWeight:500}}>
                      {selCmpDonem}
                    </div>
                    <div style={{fontSize:15,fontWeight:700,fontFamily:'var(--font-dm-mono)',
                      color:'var(--tx2)',lineHeight:1}}>
                      {cmpG}
                    </div>
                  </div>
                )}
                {/* Değişim */}
                {chg !== null && (
                  <div style={{marginLeft:'auto',paddingBottom:3,fontSize:11,fontWeight:700,color:chgColor}}>
                    {chg>=0?'▲ +':'▼ '}{Math.abs(chg).toFixed(1)}%
                  </div>
                )}
              </div>

              {/* Progress bar */}
              <div style={{background:'rgba(0,0,0,.12)',borderRadius:4,height:3,overflow:'hidden'}}>
                <div style={{width:`${Math.min(bazG,100)}%`,height:3,borderRadius:4,
                  background:relColor,transition:'width .4s'}}/>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Segment Trend Çizgi Grafik ────────────────────────────────
// Son 4 çeyrek + önceki yıl aynı dönemler
function SegmentTrendChart({ selSeg, selBolge, selYas, selDonem }:{
  selSeg:string; selBolge:string; selYas:string; selDonem:string
}) {
  // Seçili dönemden son 4 çeyreği hesapla
  const getLastFourQ = (donem: string): string[] => {
    // Eğer FY veya boş ise son 4 Q'yu al
    const allQ = ['2024-Q1','2024-Q2','2024-Q3','2024-Q4','2025-Q1','2025-Q2','2025-Q3','2025-Q4']
    if (!donem || donem.includes('FY')) {
      return allQ.slice(-4)
    }
    const idx = allQ.indexOf(donem)
    if (idx < 0) return allQ.slice(-4)
    return allQ.slice(Math.max(0, idx-3), idx+1)
  }

  // Önceki yıl aynı dönemleri
  const getPrevYearQ = (quarters: string[]): string[] =>
    quarters.map(q => {
      const [y, qn] = q.split('-Q')
      return `${parseInt(y)-1}-Q${qn}`
    })

  const last4Q   = getLastFourQ(selDonem)
  const prev4Q   = getPrevYearQ(last4Q)

  const visibleSegs = SEGMENTLER.filter(s => !selSeg || s===selSeg)

  // Her segment için son 4Q + önceki yıl skorları
  const datasets = [
    ...visibleSegs.map(seg => ({
      label: `${seg} (${last4Q[0].split('-Q')[0]})`,
      data: last4Q.map(q => getScore(seg, selBolge, selYas, q)?.genel ?? null),
      borderColor: SEGMENT_HEX[seg],
      backgroundColor: 'transparent',
      borderWidth: 2,
      pointRadius: 4,
      pointBackgroundColor: SEGMENT_HEX[seg],
      tension: 0.35,
      fill: false,
    })),
    ...visibleSegs.map(seg => ({
      label: `${seg} (${prev4Q[0].split('-Q')[0]})`,
      data: prev4Q.map(q => getScore(seg, selBolge, selYas, q)?.genel ?? null),
      borderColor: SEGMENT_HEX[seg],
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderDash: [5,4],
      pointRadius: 3,
      pointBackgroundColor: SEGMENT_HEX[seg]+'88',
      tension: 0.35,
      fill: false,
    })),
    // Tüm TR
    {
      label: `Tüm TR (${last4Q[0].split('-Q')[0]})`,
      data: last4Q.map(q => getScore('', selBolge, selYas, q)?.genel ?? null),
      borderColor: '#fbbf24',
      backgroundColor: 'transparent',
      borderWidth: 2,
      pointRadius: 4,
      pointBackgroundColor: '#fbbf24',
      tension: 0.35,
      fill: false,
    },
    {
      label: `Tüm TR (${prev4Q[0].split('-Q')[0]})`,
      data: prev4Q.map(q => getScore('', selBolge, selYas, q)?.genel ?? null),
      borderColor: '#fbbf2488',
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderDash: [5,4],
      pointRadius: 3,
      tension: 0.35,
      fill: false,
    },
  ]

  // X ekseni etiketleri — Q1, Q2 gibi kısa
  const labels = last4Q.map(q => q.replace('20','').replace('-','·'))

  return (
    <div className={styles.card}>
      <div className={styles.cardHd}>
        <h3>Dönemsel Skor Trendi</h3>
        <span className={styles.hint}>
          Son 4 çeyrek · Kesik = önceki yıl · {selBolge||'Tüm TR'} · {selYas==='Tümü'?'Tüm Yaş':selYas+'y'}
        </span>
      </div>
      <div className={styles.chartWrap} style={{height:220}}>
        <Line
          data={{ labels, datasets: datasets as any }}
          options={{
            responsive: true, maintainAspectRatio: false,
            spanGaps: true,
            plugins:{
              legend:{
                display: true, position:'top',
                labels:{color:'#8496b0',font:{size:9},boxWidth:20,
                  filter:(item)=>!item.text.includes('önceki')}
              },
              tooltip:{
                callbacks:{
                  label:(ctx)=>`${ctx.dataset.label}: ${ctx.parsed.y} puan`
                }
              }
            },
            scales:{
              y:{min:40,max:105,grid:{color:'rgba(255,255,255,.05)'},
                ticks:{color:'#8496b0',font:{size:9},callback:(v)=>`${v}`}},
              x:{grid:{display:false},ticks:{color:'#8496b0',font:{size:10}}}
            }
          }}/>
      </div>
    </div>
  )
}
