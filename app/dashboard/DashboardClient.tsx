'use client'

import { useState, createContext, useContext, useEffect, useMemo } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import { BOLGELER, SEGMENTLER, YAS_GRUPLARI, DONEMLER, YAS_COLORS, YAS_STATS, getActiveKpiDataSource, getStaticRuntimeData } from '@/lib/kpi'
import type { KpiRuntimeData } from '@/lib/kpi'
import { useAuth } from '@/context/AuthContext'
import { createDefaultPermissionDraft } from '@/types/permissions'
import type { UserPermissionDraft } from '@/types/permissions'
import {
  fetchAllowedBrandNamesByIds,
  fetchUserDataPermission,
  filterAllowedValues,
  shouldApplyUserRestrictions,
} from '@/lib/auth/permissions'
import styles from './layout.module.css'

export interface DashboardCtx {
  selSeg: string; selBolge: string; selYas: string
  selDonem: string; selCmpDonem: string
  setSeg:(s:string)=>void; setBolge:(b:string)=>void
  setYas:(y:string)=>void; setDonem:(d:string)=>void; setCmpDonem:(d:string)=>void
  collapsed: boolean
  permissionLoading: boolean
  permissionError: string
  hasDataRestriction: boolean
  allowedSegments: string[]
  allowedRegions: string[]
  allowedBrandNames: string[]
  canDownloadReports: boolean
  canImportData: boolean
  runtimeData: KpiRuntimeData
  runtimeLoading: boolean
  runtimeError: string
  dataSourceLabel: string
  isDynamicDataSource: boolean
}

export const DashboardContext = createContext<DashboardCtx>({
  selSeg:'',selBolge:'',selYas:'Tümü',selDonem:'',selCmpDonem:'',
  setSeg:()=>{},setBolge:()=>{},setYas:()=>{},setDonem:()=>{},setCmpDonem:()=>{},
  collapsed: false,
  permissionLoading: false,
  permissionError: '',
  hasDataRestriction: false,
  allowedSegments: [],
  allowedRegions: [],
  allowedBrandNames: [],
  canDownloadReports: true,
  canImportData: false,
  runtimeData: getStaticRuntimeData(),
  runtimeLoading: false,
  runtimeError: '',
  dataSourceLabel: 'Statik JSON fallback',
  isDynamicDataSource: false,
})
export const useDashboardCtx = () => useContext(DashboardContext)

export default function DashboardClient({ children }: { children: React.ReactNode }) {
  const { profile, loading: authLoading } = useAuth()
  const [selSeg,      setSeg]      = useState('')
  const [selBolge,    setBolge]    = useState('')
  const [selYas,      setYas]      = useState('Tümü')
  const [selDonem,    setDonem]    = useState('')
  const [selCmpDonem, setCmpDonem] = useState('')
  const [collapsed,   setCollapsed] = useState(false)
  const [permission, setPermission] = useState<UserPermissionDraft>(() => createDefaultPermissionDraft())
  const [permissionLoading, setPermissionLoading] = useState(false)
  const [permissionError, setPermissionError] = useState('')
  const [allowedBrandNames, setAllowedBrandNames] = useState<string[]>([])
  const [runtimeData, setRuntimeData] = useState<KpiRuntimeData>(() => getStaticRuntimeData())
  const [runtimeLoading, setRuntimeLoading] = useState(false)
  const [runtimeError, setRuntimeError] = useState('')



  useEffect(() => {
    let mounted = true

    async function loadRuntimeData() {
      setRuntimeLoading(true)
      setRuntimeError('')

      try {
        const runtime = await getActiveKpiDataSource({ preferDynamic: true, allowFallback: true })
        if (!mounted) return
        setRuntimeData(runtime)
        setRuntimeError(runtime.source.warning ?? '')
      } catch (error) {
        if (!mounted) return
        setRuntimeData(getStaticRuntimeData())
        setRuntimeError(error instanceof Error ? error.message : 'Dinamik KPI veri kaynağı okunamadı.')
      } finally {
        if (mounted) setRuntimeLoading(false)
      }
    }

    loadRuntimeData()

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    let mounted = true

    async function loadPermission() {
      if (authLoading) return

      if (!profile?.id || profile.role === 'superadmin') {
        if (!mounted) return
        setPermission(createDefaultPermissionDraft())
        setAllowedBrandNames([])
        setPermissionError('')
        setPermissionLoading(false)
        return
      }

      setPermissionLoading(true)
      setPermissionError('')

      const result = await fetchUserDataPermission(profile.id)
      if (!mounted) return

      setPermission(result.permission)
      setPermissionError(result.error ?? '')

      if (result.permission.allowed_brand_ids.length > 0) {
        const brandNames = await fetchAllowedBrandNamesByIds(result.permission.allowed_brand_ids)
        if (!mounted) return
        setAllowedBrandNames(brandNames)
      } else {
        setAllowedBrandNames([])
      }

      setPermissionLoading(false)
    }

    loadPermission()

    return () => {
      mounted = false
    }
  }, [authLoading, profile?.id, profile?.role])

  const applyRestriction = shouldApplyUserRestrictions(profile?.role, permission)
  const segmentRestricted = applyRestriction && permission.allowed_segments.length > 0
  const regionRestricted = applyRestriction && permission.allowed_regions.length > 0
  const brandRestricted = applyRestriction && permission.allowed_brand_ids.length > 0

  const runtimeSegments = runtimeData.dimensions.segments.length > 0 ? runtimeData.dimensions.segments : SEGMENTLER
  const runtimeRegions = runtimeData.dimensions.regions.length > 0 ? runtimeData.dimensions.regions : BOLGELER
  const runtimePeriods = runtimeData.dimensions.periods.length > 0 ? runtimeData.dimensions.periods : DONEMLER

  const allowedSegments = useMemo(
    () => filterAllowedValues(runtimeSegments, permission.allowed_segments, segmentRestricted),
    [runtimeSegments, permission.allowed_segments, segmentRestricted]
  )

  const allowedRegions = useMemo(
    () => filterAllowedValues(runtimeRegions, permission.allowed_regions, regionRestricted),
    [runtimeRegions, permission.allowed_regions, regionRestricted]
  )

  const allowedSegmentKey = allowedSegments.join('|')
  const allowedRegionKey = allowedRegions.join('|')

  useEffect(() => {
    if (!segmentRestricted) return
    if (allowedSegments.length === 0) return
    if (!allowedSegments.includes(selSeg)) setSeg(allowedSegments[0])
  }, [segmentRestricted, allowedSegmentKey, selSeg, allowedSegments])

  useEffect(() => {
    if (!regionRestricted) return
    if (allowedRegions.length === 0) return
    if (!allowedRegions.includes(selBolge)) setBolge(allowedRegions[0])
  }, [regionRestricted, allowedRegionKey, selBolge, allowedRegions])

  const permissionNotice = applyRestriction ? (
    <div style={{
      marginTop: 8,
      padding: '7px 8px',
      borderRadius: 8,
      border: '1px solid rgba(59,130,246,.28)',
      background: 'rgba(59,130,246,.08)',
      color: 'var(--tx2)',
      fontSize: 9,
      lineHeight: 1.45,
    }}>
      Kısıtlı görünüm aktif. Kullanıcı sadece izin verilen segment, bölge ve marka kırılımlarını görür.
    </div>
  ) : null



  const dataSourceNotice = runtimeData.source.isDynamic ? (
    <div style={{
      marginTop: 8,
      padding: '7px 8px',
      borderRadius: 8,
      border: '1px solid rgba(16,185,129,.28)',
      background: 'rgba(16,185,129,.08)',
      color: 'var(--tx2)',
      fontSize: 9,
      lineHeight: 1.45,
    }}>
      Dinamik veri aktif: {runtimeData.source.batch?.filename ?? 'aktif import batch'}.
    </div>
  ) : runtimeError ? (
    <div style={{
      marginTop: 8,
      padding: '7px 8px',
      borderRadius: 8,
      border: '1px solid rgba(245,158,11,.3)',
      background: 'rgba(245,158,11,.08)',
      color: 'var(--tx2)',
      fontSize: 9,
      lineHeight: 1.45,
    }}>
      Dinamik veri okunamadı; statik JSON fallback kullanılıyor.
    </div>
  ) : null

  const permissionErrorNotice = permissionError ? (
    <div style={{
      marginTop: 8,
      padding: '7px 8px',
      borderRadius: 8,
      border: '1px solid rgba(245,158,11,.3)',
      background: 'rgba(245,158,11,.08)',
      color: 'var(--tx2)',
      fontSize: 9,
      lineHeight: 1.45,
    }}>
      İzinler okunamadı; dashboard güvenli fallback ile eski davranışını koruyor.
    </div>
  ) : null

  // Topbar'da gösterilecek kompakt filtreler (collapsed modda)
  const topbarFilters = collapsed ? (
    <div style={{display:'flex',gap:6,alignItems:'center',flexWrap:'nowrap',overflow:'hidden'}}>
      <select value={selBolge} onChange={e=>setBolge(e.target.value)} style={compactSelect} disabled={permissionLoading || allowedRegions.length === 0}>
        {!regionRestricted && <option value="">Tüm TR</option>}
        {allowedRegions.map(b=><option key={b} value={b}>{b}</option>)}
      </select>
      <select value={selSeg} onChange={e=>setSeg(e.target.value)} style={compactSelect} disabled={permissionLoading || allowedSegments.length === 0}>
        {!segmentRestricted && <option value="">Tüm Seg.</option>}
        {allowedSegments.map(s=><option key={s} value={s}>{s}</option>)}
      </select>
      <select value={selYas} onChange={e=>setYas(e.target.value)} style={compactSelect}>
        {YAS_GRUPLARI.map(y=><option key={y} value={y}>{y==='Tümü'?'Tüm Yaş':y+'y'}</option>)}
      </select>
      <select value={selDonem} onChange={e=>setDonem(e.target.value)} style={compactSelect}>
        <option value="">Tüm Dönem</option>
        {runtimePeriods.map(d=><option key={d} value={d}>{d}</option>)}
      </select>
      <select value={selCmpDonem} onChange={e=>setCmpDonem(e.target.value)} style={compactSelect}>
        <option value="">Karş. Dönem</option>
        {runtimePeriods.map(d=><option key={d} value={d}>{d}</option>)}
      </select>
    </div>
  ) : null

  const sidebarFilters = !collapsed ? (
    <div className={styles.filters}>
      <div className={styles.filterTitle}>Filtreler</div>
      <div className={styles.filterRow}>
        <label>Bölge</label>
        <select value={selBolge} onChange={e=>setBolge(e.target.value)} disabled={permissionLoading || allowedRegions.length === 0}>
          {!regionRestricted && <option value="">Tüm Türkiye</option>}
          {allowedRegions.map(b=><option key={b} value={b}>{b}</option>)}
        </select>
      </div>
      <div className={styles.filterRow}>
        <label>Segment</label>
        <select value={selSeg} onChange={e=>setSeg(e.target.value)} disabled={permissionLoading || allowedSegments.length === 0}>
          {!segmentRestricted && <option value="">Tüm Segmentler</option>}
          {allowedSegments.map(s=><option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className={styles.filterRow}>
        <label>Araç Yaşı</label>
        <select value={selYas} onChange={e=>setYas(e.target.value)}>
          {YAS_GRUPLARI.map(y=><option key={y} value={y}>{y==='Tümü'?'Tüm Yaşlar':y+' Yıl'}</option>)}
        </select>
      </div>
      <div className={styles.filterRow}>
        <label>Baz Dönem</label>
        <select value={selDonem} onChange={e=>setDonem(e.target.value)}>
          <option value="">Tüm Dönem</option>
          {runtimePeriods.map(d=><option key={d} value={d}>{d}</option>)}
        </select>
      </div>
      <div className={styles.filterRow}>
        <label>Karşılaştırma Dönemi</label>
        <select value={selCmpDonem} onChange={e=>setCmpDonem(e.target.value)}>
          <option value="">Seçiniz</option>
          {runtimePeriods.map(d=><option key={d} value={d}>{d}</option>)}
        </select>
      </div>
      {permissionNotice}
      {permissionErrorNotice}
      {dataSourceNotice}
      {brandRestricted && allowedBrandNames.length > 0 && (
        <div style={{ marginTop: 8, color: 'var(--tx3)', fontSize: 9, lineHeight: 1.45 }}>
          Marka kısıtı: {allowedBrandNames.length} marka.
        </div>
      )}
      <div className={styles.filterSep}>📊 Yaş Dağılımı</div>
      {(['0-3','3-7','7+'] as const).map(yg=>(
        <div key={yg} onClick={()=>setYas(yg===selYas?'Tümü':yg)}
          style={{display:'flex',justifyContent:'space-between',alignItems:'center',
            fontSize:10,padding:'5px 8px',borderRadius:6,marginBottom:3,cursor:'pointer',
            background:selYas===yg?`${YAS_COLORS[yg]}22`:'transparent',
            border:`1px solid ${selYas===yg?YAS_COLORS[yg]:'transparent'}`}}>
          <span style={{color:YAS_COLORS[yg],fontWeight:600}}>{yg} Yıl</span>
          <span style={{color:'var(--tx3)',fontSize:9}}>
            {YAS_STATS[yg as keyof typeof YAS_STATS]?.toLocaleString('tr-TR')} İE
          </span>
        </div>
      ))}
    </div>
  ) : null

  return (
    <DashboardContext.Provider value={{
      selSeg,selBolge,selYas,selDonem,selCmpDonem,setSeg,setBolge,setYas,setDonem,setCmpDonem,collapsed,
      permissionLoading,
      permissionError,
      hasDataRestriction: applyRestriction,
      allowedSegments,
      allowedRegions,
      allowedBrandNames,
      canDownloadReports: permission.can_download_reports,
      canImportData: permission.can_import_data,
      runtimeData,
      runtimeLoading,
      runtimeError,
      dataSourceLabel: runtimeData.source.label,
      isDynamicDataSource: runtimeData.source.isDynamic,
    }}>
      <div className={styles.shell}>
        <Sidebar variant="dashboard" filters={sidebarFilters} collapsed={collapsed} onToggle={()=>setCollapsed(v=>!v)}/>
        <main className={styles.main}>
          {/* Collapsed modda filtreler topbar'a taşınır — children içindeki Topbar'a prop geçilemez,
              bu yüzden topbar üstüne ince bir filtre bandı koyuyoruz */}
          {collapsed && (
            <div style={{
              display:'flex',alignItems:'center',gap:8,
              padding:'6px 16px',
              background:'var(--surf)',
              borderBottom:'1px solid var(--bd2)',
              flexShrink:0
            }}>
              <span style={{fontSize:9,fontWeight:700,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'.08em',whiteSpace:'nowrap'}}>
                Filtreler
              </span>
              {topbarFilters}
              {applyRestriction && (
                <span style={{fontSize:9,fontWeight:700,color:'var(--blue)',whiteSpace:'nowrap'}}>Kısıtlı görünüm</span>
              )}
              <span style={{fontSize:9,fontWeight:700,color:runtimeData.source.isDynamic?'#10b981':'var(--tx3)',whiteSpace:'nowrap'}}>
                {runtimeLoading ? 'Veri yükleniyor' : runtimeData.source.isDynamic ? 'Dinamik data' : 'Fallback data'}
              </span>
            </div>
          )}
          {children}
        </main>
      </div>
    </DashboardContext.Provider>
  )
}

const compactSelect: React.CSSProperties = {
  background:'var(--surf2)',
  border:'1px solid var(--bd2)',
  color:'var(--tx)',
  borderRadius:6,
  padding:'3px 6px',
  fontSize:10,
  fontFamily:'var(--font-dm-sans),sans-serif',
  cursor:'pointer',
  outline:'none',
  height:26,
}
