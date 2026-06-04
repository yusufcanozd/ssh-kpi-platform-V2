'use client'

import { useMemo } from 'react'
import { useDashboardCtx } from './DashboardClient'
import CategoryColorSettings from '@/components/dashboard/CategoryColorSettings'
import Topbar from '@/components/layout/Topbar'
import {
  SEGMENTLER,
  SEGMENT_COLORS, SEGMENT_BG, SEGMENT_HEX, SEGMENT_HEX_BG, CATEGORY_OPTIONS,
  getMarkaRanking,
  scoreBarWidth, SegmentScore, createRuntimeCalculator
} from '@/lib/kpi'
import { Bar, Line } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend, Filler } from 'chart.js'
import ScoreSummaryCards, { type SegmentScoreCardItem } from '@/components/dashboard/ScoreSummaryCards'
import CategoryBreakdown, { type CategoryBreakdownItem } from '@/components/dashboard/CategoryBreakdown'
import RegionScoreGrid from '@/components/dashboard/RegionScoreGrid'
import styles from './page.module.css'

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend, Filler)

export default function DashboardPage() {
  const {
    selSeg, selBolge, selYas, selDonem, selCmpDonem,
    runtimeData, runtimeLoading, dataSourceLabel, isDynamicDataSource,
    allowedSegments, allowedRegions,
  } = useDashboardCtx()

  const runtimeCalculator = useMemo(() => createRuntimeCalculator(runtimeData), [runtimeData])
  const dashboardSegments = allowedSegments.length > 0 ? allowedSegments : SEGMENTLER

  // Baz dönem skorları — her segment için
  const segScores = useMemo(() =>
    runtimeCalculator.getSegmentScores(dashboardSegments, selBolge, selYas, selDonem, selCmpDonem),
    [runtimeCalculator, dashboardSegments, selBolge, selYas, selDonem, selCmpDonem])

  // Tüm Türkiye skoru
  const trBaz = useMemo(() => runtimeCalculator.getScore('', selBolge, selYas, selDonem), [runtimeCalculator, selBolge, selYas, selDonem])
  const trCmp = useMemo(() => selCmpDonem ? runtimeCalculator.getScore('', selBolge, selYas, selCmpDonem) : null, [runtimeCalculator, selBolge, selYas, selCmpDonem])

  // Seçili segmente göre filtre
  const visibleSegs = selSeg ? segScores.filter(s=>s.seg===selSeg) : segScores

  // Marka sıralaması — gerçek marka×dönem×yaş verisi
  const markalar = useMemo(() =>
    getMarkaRanking(selSeg, selBolge, selYas, selDonem),
    [selSeg, selBolge, selYas, selDonem])

  // Karşılaştırma dönem sıralaması
  const marklarCmp = useMemo(() =>
    selCmpDonem ? getMarkaRanking(selSeg, selBolge, selYas, selCmpDonem) : [],
    [selSeg, selBolge, selYas, selCmpDonem])


  // Segment bar grafik (skor bazlı)
  const segBarData = visibleSegs.map(s=>s.baz?.genel??0)
  const segCmpData = visibleSegs.map(s=>s.cmp?.genel??0)

  const filterLabel = [
    selBolge||'Tüm TR', selSeg||'Tüm Seg.',
    selYas==='Tümü'?'Tüm Yaş':selYas+'y',
    selDonem||'Tüm Dönem'
  ].join(' · ')

  const scoreCardItems: SegmentScoreCardItem[] = [
    { key: 'tr', label: '🇹🇷 Tüm Türkiye', baz: trBaz, cmp: trCmp, color: 'var(--seg-tr-color)', bg: 'var(--seg-tr-bg)' },
    ...visibleSegs.slice(0, 3).map((s) => ({
      key: s.seg,
      label: s.seg,
      baz: s.baz,
      cmp: s.cmp,
      color: SEGMENT_COLORS[s.seg],
      bg: SEGMENT_BG[s.seg],
    })),
  ]

  const categoryBreakdownItems: CategoryBreakdownItem[] = [
    { key: 'tr', label: '🇹🇷 Tüm Türkiye', score: trBaz, color: 'var(--seg-tr-color)', bg: 'var(--seg-tr-bg)' },
    ...visibleSegs.slice(0, 3).map((s) => ({
      key: s.seg,
      label: s.seg,
      score: s.baz,
      color: SEGMENT_COLORS[s.seg],
      bg: SEGMENT_BG[s.seg],
    })),
  ]

  return (
    <div className={styles.wrap}>
      <CategoryColorSettings />
      <Topbar title="SSH KPI Rekabet Skorkartı" subtitle={filterLabel}
        pills={[
          {label: runtimeLoading ? '● Veri yükleniyor' : isDynamicDataSource ? '● Dinamik data' : '● Fallback data', variant: isDynamicDataSource ? 'green' : 'amber'},
          {label: selDonem||'Tüm Dönem',variant:'amber'},
        ]}/>
      <div className={styles.content}>
        <div style={{
          marginBottom: 10,
          padding: '8px 10px',
          borderRadius: 10,
          border: `1px solid ${isDynamicDataSource ? 'rgba(16,185,129,.25)' : 'rgba(245,158,11,.24)'}`,
          background: isDynamicDataSource ? 'rgba(16,185,129,.07)' : 'rgba(245,158,11,.06)',
          color: 'var(--tx2)',
          fontSize: 11,
          display: 'flex',
          justifyContent: 'space-between',
          gap: 12,
          alignItems: 'center',
          flexWrap: 'wrap',
        }}>
          <span>Veri kaynağı: <strong>{dataSourceLabel}</strong></span>
          <span>{runtimeData.source.rowCount.toLocaleString('tr-TR')} skor satırı · {allowedRegions.length} bölge · {dashboardSegments.length} segment</span>
        </div>

        {/* ── Üst 4 kutu: Segment Skor Kartları ── */}
        <ScoreSummaryCards
          items={scoreCardItems}
          bazDonem={selDonem || 'Tüm Dönem'}
          cmpDonem={selCmpDonem}
        />

        {/* ── 2. Satır: Kategori kırılım detayları ── */}
        <CategoryBreakdown items={categoryBreakdownItems} />

        <div className={styles.twoCol}>
          {/* Segment skor bar grafik */}
          <div className={styles.card}>
            <div className={styles.cardHd}>
              <h3 style={{display:'inline-flex',alignItems:'center',gap:6}}>Segment Skor Karşılaştırması</h3>
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
                    backgroundColor: ['rgba(251,191,36,.10)','rgba(96,165,250,.08)','rgba(192,132,252,.08)','rgba(52,211,153,.08)'],
                    borderColor: ['#fbbf24','#60a5fa','#c084fc','#34d399'],
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
                  y:{min:0,max:200,grid:{color:'rgba(255,255,255,.05)'},ticks:{color:'#8496b0',font:{size:9}}},
                  x:{grid:{display:false},ticks:{color:'#8496b0',font:{size:11}}}}}}/>
            </div>

            {/* Kategori Skor Karşılaştırması — bar kartının altında */}
            <KategoriSkorChart
              visibleSegs={visibleSegs}
              trBaz={trBaz} trCmp={trCmp}
              selDonem={selDonem} selCmpDonem={selCmpDonem}
              selBolge={selBolge} selYas={selYas}
            />
          </div>

          {/* Marka sıralaması — tüm filtreler dahil */}
          <div className={styles.card} style={{display:'flex',flexDirection:'column',overflow:'hidden'}}>
            <div className={styles.cardHd} style={{flexShrink:0}}>
              <h3>Marka Sıralaması</h3>
              <span className={styles.hint}>{selBolge||'Tüm TR'} · {selDonem||'Tüm Dönem'}{selCmpDonem?' vs '+selCmpDonem:''}</span>
            </div>
            {/* Scrollable — sol kartla eşit yükseklik, 16 marka görünür */}
            <div style={{overflowY:'auto',flex:'1 1 0',minHeight:0,paddingRight:2}}>
              {markalar.map((m,i)=>{
                const cmpM    = marklarCmp.find(x=>x.marka===m.marka)
                const cmpRank = selCmpDonem ? marklarCmp.findIndex(x=>x.marka===m.marka)+1 : null
                const rankDiff= cmpRank ? cmpRank-(i+1) : null
                const tooltipLabel = selCmpDonem && cmpM
                  ? `${selDonem||'Baz'}: ${m.score} · ${selCmpDonem}: ${cmpM.score}`
                  : `${m.marka}: ${m.score} puan`

                return (
                  <div key={m.marka} className={styles.hbarRow}
                    style={{position:'relative'}}
                    onMouseEnter={e=>{
                      const tip = e.currentTarget.querySelector('.marka-tip') as HTMLElement
                      if(tip) tip.style.display='block'
                    }}
                    onMouseLeave={e=>{
                      const tip = e.currentTarget.querySelector('.marka-tip') as HTMLElement
                      if(tip) tip.style.display='none'
                    }}>
                    {/* Tooltip */}
                    <div className="marka-tip" style={{
                      display:'none',position:'absolute',bottom:'calc(100% + 4px)',left:'50%',
                      transform:'translateX(-50%)',zIndex:100,
                      background:'var(--surf3)',border:'1px solid var(--bd2)',
                      borderRadius:6,padding:'5px 10px',whiteSpace:'nowrap',
                      fontSize:11,color:'var(--tx)',pointerEvents:'none',
                      boxShadow:'0 4px 12px rgba(0,0,0,.3)'
                    }}>
                      <div style={{fontWeight:700,color:SEGMENT_HEX[m.segment],marginBottom:3}}>{m.marka}</div>
                      <div style={{display:'flex',gap:12}}>
                        <div>
                          <div style={{fontSize:9,color:'var(--tx3)',marginBottom:1}}>{selDonem||'Tüm Dönem'}</div>
                          <div style={{fontSize:14,fontWeight:800,fontFamily:'var(--font-dm-mono)',color:SEGMENT_HEX[m.segment]}}>{m.score} puan</div>
                        </div>
                        {selCmpDonem && cmpM && (
                          <div>
                            <div style={{fontSize:9,color:'var(--tx3)',marginBottom:1}}>{selCmpDonem}</div>
                            <div style={{fontSize:14,fontWeight:800,fontFamily:'var(--font-dm-mono)',color:'var(--tx2)'}}>{cmpM.score} puan</div>
                          </div>
                        )}
                      </div>
                    </div>
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
                        width:scoreBarWidth(m.score),border:`2px solid ${SEGMENT_HEX[m.segment]}`,
                        borderRadius:4,boxSizing:'border-box'}}/>
                      {/* Karşılaştırma — içi dolu */}
                      {selCmpDonem && cmpM && (
                        <div style={{position:'absolute',top:'25%',left:0,height:'50%',
                          width:scoreBarWidth(cmpM.score),background:`${SEGMENT_HEX[m.segment]}55`,
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

        {/* Bölge Skor Dağılımı */}
        <RegionScoreGrid selSeg={selSeg} selBolge={selBolge} selYas={selYas} selDonem={selDonem} selCmpDonem={selCmpDonem} />

      </div>
    </div>
  )
}

// ── Kategori Skor Karşılaştırması ────────────────────────────
// Her kategori için merkezi CATEGORY_OPTIONS metadata'sı kullanılır
// segment + TR skorları — baz ve cmp dönem ortalama çizgileriyle
function KategoriSkorChart({ visibleSegs, trBaz, trCmp, selDonem, selCmpDonem, selBolge, selYas }:{
  visibleSegs: {seg:string; baz:SegmentScore|null; cmp:SegmentScore|null}[]
  trBaz: SegmentScore|null; trCmp: SegmentScore|null
  selDonem: string; selCmpDonem: string
  selBolge: string; selYas: string
}) {
  const KATS = CATEGORY_OPTIONS

  // Segment renkleri hex (Chart.js canvas)
  const segHexMap: Record<string,string> = {Mass:'#60a5fa',Premium:'#c084fc',EV:'#34d399'}
  const trHex = '#fbbf24'

  // Tüm aktörlerin isimleri (TR + segmentler)
  const actors = ['Tüm TR', ...visibleSegs.map(s=>s.seg)]

  // Her kategori için baz ve cmp değerleri
  const bazData  = KATS.map(k => [
    trBaz?.[k.key as keyof SegmentScore] as number ?? 0,
    ...visibleSegs.map(s => s.baz?.[k.key as keyof SegmentScore] as number ?? 0)
  ])
  const cmpData  = KATS.map(k => [
    trCmp?.[k.key as keyof SegmentScore] as number ?? 0,
    ...visibleSegs.map(s => s.cmp?.[k.key as keyof SegmentScore] as number ?? 0)
  ])

  // Baz dönem ortalama (TR + tüm segmentler ortalaması)
  const bazAvg = KATS.map((_,ki) => {
    const vals = bazData[ki].filter(v=>v>0)
    return vals.length ? Math.round(vals.reduce((a,b)=>a+b,0)/vals.length) : 0
  })
  const cmpAvg = KATS.map((_,ki) => {
    const vals = cmpData[ki].filter(v=>v>0)
    return vals.length ? Math.round(vals.reduce((a,b)=>a+b,0)/vals.length) : 0
  })

  const actorColors = [trHex, ...visibleSegs.map(s=>segHexMap[s.seg]||'#aaa')]
  const actorBgColors = [
    'rgba(251,191,36,.12)',
    ...visibleSegs.map(s=>segHexMap[s.seg]+'22')
  ]

  // Kategori avg çizgisi plugin kullan
  const avgLinesBaz = KATS.map((_,ki) => ({
    value: bazAvg[ki],
    color: '#ffffff',
    lineWidth: 2.5,
    dash: [6,4],
    label: `Ort. ${selDonem||'Baz'}: ${bazAvg[ki]}`
  }))
  const avgLinesCmp = selCmpDonem ? KATS.map((_,ki) => ({
    value: cmpAvg[ki],
    color: '#ffffff99',
    lineWidth: 2,
    dash: [3,3],
    label: `Ort. ${selCmpDonem}: ${cmpAvg[ki]}`
  })) : []

  return (
    <div style={{borderTop:'1px solid var(--bd)',marginTop:14,paddingTop:12}}>
      {/* Başlık */}
      <div style={{fontSize:10,fontWeight:600,color:'var(--tx3)',marginBottom:10}}>
        <span style={{display:'inline-flex',alignItems:'center',gap:6}}>Kategori Skor Karşılaştırması</span>
      </div>

      {/* 5 kategori için grouped bar grid */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:6}}>
        {KATS.map((k,ki)=>(
          <div key={k.key} style={{background:'rgba(0,0,0,.08)',borderRadius:6,padding:'10px 8px',textAlign:'center'}}>
            <div style={{fontSize:11,fontWeight:700,color:'var(--tx2)',marginBottom:8}}>{k.label}</div>
            {/* Aktörler */}
            {actors.map((actor,ai)=>{
              const bazV = bazData[ki][ai]
              const cmpV = selCmpDonem ? cmpData[ki][ai] : null
              const color = actorColors[ai]
              const chg = cmpV && cmpV>0 ? Math.round((bazV-cmpV)/cmpV*100*10)/10 : null
              return (
                <div key={actor} style={{marginBottom:7}}>
                  {/* Baz bar */}
                  <div style={{display:'flex',alignItems:'center',gap:5,marginBottom:cmpV?3:0}}>
                    <div style={{flex:1,background:'rgba(255,255,255,.08)',borderRadius:3,height:6,overflow:'hidden'}}>
                      <div style={{width:scoreBarWidth(bazV),height:6,borderRadius:3,
                        background:color+'55',borderRight:`2px solid ${color}`}}/>
                    </div>
                    <span style={{fontSize:10,fontFamily:'var(--font-dm-mono)',fontWeight:700,
                      color,minWidth:26,textAlign:'right'}}>{bazV}</span>
                  </div>
                  {/* Cmp bar */}
                  {cmpV!==null && (
                    <div style={{display:'flex',alignItems:'center',gap:5}}>
                      <div style={{flex:1,background:'rgba(255,255,255,.05)',borderRadius:3,height:5,overflow:'hidden'}}>
                        <div style={{width:scoreBarWidth(cmpV),height:5,borderRadius:3,
                          background:color+'88'}}/>
                      </div>
                      <span style={{fontSize:9,fontFamily:'var(--font-dm-mono)',color:'var(--tx3)',minWidth:26,textAlign:'right'}}>{cmpV}</span>
                    </div>
                  )}
                  {/* Aktör etiketi */}
                  <div style={{fontSize:9,color:'var(--tx3)',marginTop:2,
                    overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                    {actor}{chg!==null?` ${chg>=0?'▲':'▼'}${Math.abs(chg)}%`:''}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Bölge Skor Grid ──────────────────────────────────────────

// ── Segment Trend Çizgi Grafik ────────────────────────────────
// Son 4 çeyrek + önceki yıl aynı dönemler
