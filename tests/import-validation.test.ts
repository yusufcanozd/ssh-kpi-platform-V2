import { describe, expect, it } from 'vitest'
import {
  buildFactRowsForImport,
  buildInitialMapping,
  detectImportFileType,
  inferColumnRole,
  parseCsvText,
  parseJsonText,
  validateImportRows,
} from '../lib/admin/import-validation'
import type { ImportColumnMapping, ImportValidationContext } from '../types/import'

const context: ImportValidationContext = {
  knownSegments: ['Premium', 'Mass'],
  knownRegions: ['Marmara', 'Ege'],
  knownPeriods: ['2024-Q4'],
  kpiNumbers: Array.from({ length: 12 }, (_, i) => i + 1),
}

const fullMapping: ImportColumnMapping[] = [
  { sourceColumn: 'Segment', role: 'segment' },
  { sourceColumn: 'Bölge', role: 'region' },
  { sourceColumn: 'Dönem', role: 'period' },
  { sourceColumn: 'KPI 1', role: 'kpi_1' },
]

describe('detectImportFileType (Prompt 8)', () => {
  it('uzantıya göre tip belirler', () => {
    expect(detectImportFileType('veri.csv')).toBe('csv')
    expect(detectImportFileType('veri.json')).toBe('json')
    expect(detectImportFileType('veri.xlsx')).toBe('xlsx')
    expect(detectImportFileType('veri.txt')).toBe('unknown')
  })
})

describe('inferColumnRole / buildInitialMapping', () => {
  it('kolon adından rol çıkarır', () => {
    expect(inferColumnRole('Segment')).toBe('segment')
    expect(inferColumnRole('Bölge')).toBe('region')
    expect(inferColumnRole('Dönem')).toBe('period')
    expect(inferColumnRole('kpi_1')).toBe('kpi_1')
    expect(inferColumnRole('KPI 1')).toBe('kpi_1') // büyük harfli başlık da tanınır
    expect(inferColumnRole('AlakasizKolon')).toBe('ignore')
  })

  it('buildInitialMapping her kolon için eşleme üretir', () => {
    const mapping = buildInitialMapping(['Segment', 'KPI 1'])
    expect(mapping).toHaveLength(2)
    expect(mapping[0]).toEqual({ sourceColumn: 'Segment', role: 'segment' })
  })
})

describe('parseCsvText / parseJsonText', () => {
  it('CSV başlık + satırları ayrıştırır', () => {
    const csv = 'Segment,Bölge,Dönem,KPI 1\nPremium,Marmara,2024-Q4,105\nMass,Ege,2024-Q4,92'
    const result = parseCsvText('veri.csv', csv)
    const lastCol = result.columns[result.columns.length - 1]
    expect(result.fileType).toBe('csv')
    expect(result.columns).toContain('Segment')
    expect(result.rows).toHaveLength(2)
    expect(result.rows[0].values[lastCol]).toBe('105')
  })

  it('JSON nesne dizisini ayrıştırır', () => {
    const json = JSON.stringify([{ Segment: 'Premium', 'KPI 1': 105 }])
    const result = parseJsonText('veri.json', json)
    expect(result.rows).toHaveLength(1)
    expect(result.columns).toContain('Segment')
  })

  it('satır içermeyen JSON için hata fırlatır', () => {
    expect(() => parseJsonText('x.json', '{}')).toThrow()
  })
})

describe('validateImportRows', () => {
  it('geçerli satırda hata üretmez', () => {
    const { rows } = parseCsvText('v.csv', 'Segment,Bölge,Dönem,KPI 1\nPremium,Marmara,2024-Q4,105')
    const summary = validateImportRows(rows, fullMapping, context)
    expect(summary.errorRows).toBe(0)
    expect(summary.issues.some(i => i.severity === 'error')).toBe(false)
  })

  it('numeric olmayan KPI değeri hata verir', () => {
    const { rows } = parseCsvText('v.csv', 'Segment,Bölge,Dönem,KPI 1\nPremium,Marmara,2024-Q4,abc')
    const summary = validateImportRows(rows, fullMapping, context)
    expect(summary.issues.some(i => i.severity === 'error')).toBe(true)
  })

  it('zorunlu period eşleştirilmezse hata verir', () => {
    const { rows } = parseCsvText('v.csv', 'Segment,Bölge,KPI 1\nPremium,Marmara,105')
    const noPeriod = fullMapping.filter(m => m.role !== 'period')
    const summary = validateImportRows(rows, noPeriod, context)
    expect(summary.issues.some(i => i.severity === 'error')).toBe(true)
  })
})

describe('buildFactRowsForImport', () => {
  it('KPI sütunu başına bir fact satırı üretir', () => {
    const { rows } = parseCsvText('v.csv', 'Segment,Bölge,Dönem,KPI 1,KPI 2\nPremium,Marmara,2024-Q4,105,90')
    const mappings: ImportColumnMapping[] = [
      ...fullMapping,
      { sourceColumn: 'KPI 2', role: 'kpi_2' },
    ]
    const facts = buildFactRowsForImport(rows, mappings)
    expect(facts).toHaveLength(2)
    expect(facts[0]).toMatchObject({
      segment: 'Premium',
      region: 'Marmara',
      period: '2024-Q4',
      kpi_no: 1,
      kpi_value: 105,
    })
  })

  it('numeric olmayan KPI değeri fact üretmez', () => {
    const { rows } = parseCsvText('v.csv', 'Segment,Bölge,Dönem,KPI 1\nPremium,Marmara,2024-Q4,abc')
    expect(buildFactRowsForImport(rows, fullMapping)).toHaveLength(0)
  })
})
