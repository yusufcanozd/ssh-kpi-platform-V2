'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Topbar from '@/components/layout/Topbar'
import StatCard from '@/components/ui/StatCard'
import { Period, KpiSubmission } from '@/types'
import styles from './page.module.css'

interface Stats {
  brands: number
  services: number
  pending: number
  users: number
}

export default function AdminPage() {
  const [stats, setStats]         = useState<Stats>({ brands:0, services:0, pending:0, users:0 })
  const [periods, setPeriods]     = useState<Period[]>([])
  const [recent, setRecent]       = useState<KpiSubmission[]>([])
  const [loading, setLoading]     = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const [
        { count: brands },
        { count: services },
        { count: pending },
        { count: users },
        { data: periodsData },
        { data: recentData },
      ] = await Promise.all([
        supabase.from('brands').select('*', { count:'exact', head:true }).eq('is_active', true),
        supabase.from('service_centers').select('*', { count:'exact', head:true }).eq('is_active', true),
        supabase.from('kpi_submissions').select('*', { count:'exact', head:true }).eq('status', 'pending'),
        supabase.from('profiles').select('*', { count:'exact', head:true }).eq('is_active', true),
        supabase.from('periods').select('*').order('year', { ascending:false }).order('quarter'),
        supabase.from('kpi_submissions')
          .select('*, brands(name), periods(year,quarter)')
          .order('submitted_at', { ascending:false })
          .limit(5),
      ])
      setStats({ brands:brands||0, services:services||0, pending:pending||0, users:users||0 })
      setPeriods(periodsData || [])
      setRecent(recentData as KpiSubmission[] || [])
      setLoading(false)
    }
    load()
  }, [])

  const statusLabel = (s: string) =>
    s==='pending'?'Bekliyor':s==='approved'?'Onaylı':'Reddedildi'
  const statusClass = (s: string) =>
    s==='pending'?styles.pending:s==='approved'?styles.approved:styles.rejected

  return (
    <div className={styles.wrap}>
      <Topbar
        title="Genel Bakış"
        subtitle="Platform istatistikleri"
        pills={[{ label: '● Sistem Aktif', variant: 'green' }]}
      />
      <div className={styles.content}>
        {loading && <div className={styles.loading}><span className="loading-spin" /> Yükleniyor...</div>}

        <div className={styles.statGrid}>
          <StatCard label="Toplam Marka"   value={stats.brands}   sub="Aktif katılımcı"  accent="blue" />
          <StatCard label="Servis Noktası" value={stats.services} sub="Kayıtlı servis"   accent="green" />
          <StatCard label="Bekleyen Onay"  value={stats.pending}  sub="KPI gönderisi"    accent="amber" />
          <StatCard label="Kullanıcı"      value={stats.users}    sub="Aktif hesap"      accent="purple" />
        </div>

        <div className={styles.twoCol}>
          {/* Son Gönderiler */}
          <div className={styles.card}>
            <div className={styles.cardHd}><h3>Son Gönderiler</h3></div>
            {recent.length === 0 && !loading && (
              <div className={styles.empty}>Henüz gönderi yok</div>
            )}
            {recent.map(s => (
              <div key={s.id} className={styles.subRow}>
                <div>
                  <div className={styles.subBrand}>{(s as any).brands?.name || '—'}</div>
                  <div className={styles.subMeta}>
                    {(s as any).periods ? `${(s as any).periods.year} ${(s as any).periods.quarter}` : '—'}
                    {' · '}{s.vehicle_age_group} yıl
                  </div>
                </div>
                <span className={`${styles.badge} ${statusClass(s.status)}`}>
                  {statusLabel(s.status)}
                </span>
              </div>
            ))}
          </div>

          {/* Dönemler */}
          <div className={styles.card}>
            <div className={styles.cardHd}><h3>Dönemler</h3></div>
            <div className={styles.periodList}>
              {periods.map(p => (
                <div key={p.id} className={styles.periodRow}>
                  <span className={styles.periodLabel}>{p.year} {p.quarter}</span>
                  <div className={styles.periodRight}>
                    <span className={styles.periodDates}>
                      {new Date(p.start_date).toLocaleDateString('tr')} – {new Date(p.end_date).toLocaleDateString('tr')}
                    </span>
                    <span className={`${styles.badge} ${p.is_locked ? styles.rejected : styles.approved}`}>
                      {p.is_locked ? '🔒 Kilitli' : 'Açık'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
