'use client'

import { useState, useCallback } from 'react'
import { Region, Period } from '@/types'

export interface Filters {
  regionId: string
  segment: string
  year: string
  quarter: string
}

// Tip tanımları - RPC'den gelen veri
export interface BrandScore {
  brand_id: string
  brand_name: string
  brand_segment: string
  region_name: string | null
  year: number
  quarter: string
  score_op: number
  score_cu: number
  score_sv: number
  score_co: number
  score_overall: number
  kpi_01: number; kpi_02: number; kpi_03: number; kpi_04: number
  kpi_05: number; kpi_06: number; kpi_07: number; kpi_08: number
  kpi_09: number; kpi_10: number; kpi_11: number
}

export interface RegionScore {
  region_id: string
  region_name: string
  score_overall: number
  score_op: number; score_cu: number; score_sv: number; score_co: number
  kpi_01: number; kpi_02: number; kpi_03: number; kpi_04: number
  kpi_05: number; kpi_06: number; kpi_07: number; kpi_08: number
  kpi_09: number; kpi_10: number; kpi_11: number
  brand_count: number
}

export interface TrendScore {
  year: number
  quarter: string
  score_overall: number
  score_op: number; score_cu: number; score_sv: number; score_co: number
  seg_premium: number | null; seg_mass: number | null; seg_ev: number | null
}

// Context için tip
export interface DashboardData {
  brandScores: BrandScore[]
  regionScores: RegionScore[]
  trendScores: TrendScore[]
  regions: Region[]
  periods: Period[]
  loading: boolean
  filters: Filters
  updateFilter: (key: keyof Filters, value: string) => void
}
