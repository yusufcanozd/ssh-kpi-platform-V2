'use client'

import { createContext, useContext } from 'react'
import { KpiScore, Region, Period } from '@/types'
import { Filters } from '@/hooks/useDashboard'

export interface DashboardContextType {
  scores: KpiScore[]
  regions: Region[]
  periods: Period[]
  loading: boolean
  filters: Filters
  updateFilter: (key: keyof Filters, value: string) => void
}

export const DashboardContext = createContext<DashboardContextType>({} as DashboardContextType)
export const useDashboardCtx = () => useContext(DashboardContext)
