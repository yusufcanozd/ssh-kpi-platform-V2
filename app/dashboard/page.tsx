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
                  y:{min:0,max:105,grid:{color:'rgba(255,255,255,.05)'},ticks:{color:'#8496b0',font:{size:9}}},
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
          <div className={styles.card} style={{display:'flex',flexDirection:'column'}}>
            <div className={styles.cardHd}>
              <h3>Marka Sıralaması</h3>
              <span className={styles.hint}>{selBolge||'Tüm TR'} · {selDonem||'Tüm Dönem'}{selCmpDonem?' vs '+selCmpDonem:''}</span>
            </div>
            {/* Scrollable — sol kartla eşit yükseklik */}
            <div style={{overflowY:'auto',flex:1,minHeight:0,paddingRight:4}}>
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
          background:bazG>=100?'rgba(16,185,129,.5)':bazG>=90?'rgba(245,158,11,.5)':'rgba(239,68,68,.45)',
          transition:'width .4s'}}/>
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
            <div style={{background:'var(--surf3)',borderRadius:4,height:5,overflow:'hidden'}}>
              <div style={{width:`${Math.min(val,100)}%`,height:5,borderRadius:4,
                background:val>=100?'rgba(16,185,129,.55)':val>=90?'rgba(245,158,11,.55)':'rgba(239,68,68,.55)',
                transition:'width .3s'}}/>
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
              <div style={{background:'rgba(0,0,0,.10)',borderRadius:4,height:3,overflow:'hidden'}}>
                <div style={{width:`${Math.min(bazG,100)}%`,height:3,borderRadius:4,
                  background:relColor+'99',transition:'width .4s'}}/>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Kategori Skor Karşılaştırması ────────────────────────────
// Her kategori (Müşteri, Ticari, Operasyonel, Bayi Ağı, Kapsam) için
// segment + TR skorları — baz ve cmp dönem ortalama çizgileriyle
function KategoriSkorChart({ visibleSegs, trBaz, trCmp, selDonem, selCmpDonem, selBolge, selYas }:{
  visibleSegs: {seg:string; baz:SegmentScore|null; cmp:SegmentScore|null}[]
  trBaz: SegmentScore|null; trCmp: SegmentScore|null
  selDonem: string; selCmpDonem: string
  selBolge: string; selYas: string
}) {
  const KATS = [
    {key:'musteri',    label:'Müşteri'},
    {key:'ticari',     label:'Ticari'},
    {key:'operasyonel',label:'Operasyonel'},
    {key:'bayi',       label:'Bayi Ağı'},
    {key:'kapsam',     label:'Kapsam'},
  ]

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
      {/* Başlık + legend */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10,flexWrap:'wrap',gap:8}}>
        <div style={{fontSize:10,fontWeight:600,color:'var(--tx3)'}}>
          Kategori Skor Karşılaştırması
        </div>
        <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
          {/* Ortalama çizgi legend */}
          <div style={{display:'flex',alignItems:'center',gap:5,fontSize:9,color:'var(--tx3)'}}>
            <svg width="22" height="8"><line x1="0" y1="4" x2="22" y2="4" stroke="#fff" strokeWidth="2.5" strokeDasharray="6,4"/></svg>
            {`Ort. ${selDonem||'Baz'}`}
          </div>
          {selCmpDonem && (
            <div style={{display:'flex',alignItems:'center',gap:5,fontSize:9,color:'var(--tx3)'}}>
              <svg width="22" height="8"><line x1="0" y1="4" x2="22" y2="4" stroke="#ffffff99" strokeWidth="2" strokeDasharray="3,3"/></svg>
              {`Ort. ${selCmpDonem}`}
            </div>
          )}
        </div>
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
                      <div style={{width:`${Math.min(bazV,100)}%`,height:6,borderRadius:3,
                        background:color+'55',borderRight:`2px solid ${color}`}}/>
                    </div>
                    <span style={{fontSize:10,fontFamily:'var(--font-dm-mono)',fontWeight:700,
                      color,minWidth:26,textAlign:'right'}}>{bazV}</span>
                  </div>
                  {/* Cmp bar */}
                  {cmpV!==null && (
                    <div style={{display:'flex',alignItems:'center',gap:5}}>
                      <div style={{flex:1,background:'rgba(255,255,255,.05)',borderRadius:3,height:5,overflow:'hidden'}}>
                        <div style={{width:`${Math.min(cmpV,100)}%`,height:5,borderRadius:3,
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
