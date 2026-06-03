import {
  BOLGELER,
  CATEGORY_SHORT_NAMES,
  DONEMLER,
  KAT_YAPILAR,
  KPI_META,
  SEGMENTLER,
  YAS_GRUPLARI,
} from './config'
import { CUBE } from './data'
import type {
  ActiveWeightRow,
  CategoryDefinitionRow,
  KpiDefinitionRow,
  KpiRuntimeData,
} from './data-source-types'

export function getStaticRuntimeData(warning?: string): KpiRuntimeData {
  return {
    source: {
      kind: 'static-json',
      label: 'Statik JSON fallback',
      isDynamic: false,
      hasActiveBatch: false,
      rowCount: CUBE.length,
      factRowCount: 0,
      warning,
    },
    cubeRows: CUBE.map(row => [...row] as typeof row),
    markaRows: [],
    dimensions: {
      segments: [...SEGMENTLER],
      regions: [...BOLGELER],
      ageGroups: [...YAS_GRUPLARI],
      periods: [...DONEMLER],
    },
  }
}

export function getFallbackKpiDefinitions(): KpiDefinitionRow[] {
  return KPI_META.map(kpi => ({ ...kpi, source: 'fallback' }))
}

export function getFallbackCategoryDefinitions(): CategoryDefinitionRow[] {
  return KAT_YAPILAR.map(category => ({
    key: category.key,
    name: category.ad,
    shortName: CATEGORY_SHORT_NAMES[category.key],
    weight: category.agirlik,
    kpis: [...category.kpis],
    source: 'fallback',
  }))
}

export function getFallbackWeights(): ActiveWeightRow[] {
  return KAT_YAPILAR.map(category => ({
    categoryKey: category.key,
    weight: category.agirlik * 100,
    source: 'fallback',
  }))
}
