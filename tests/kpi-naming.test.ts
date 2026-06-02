import { describe, expect, it } from 'vitest'
import {
  CATEGORY_OPTIONS,
  getCategoryDisplayName,
  getCategoryShortName,
  getKpiDisplayName,
  KPI_META,
} from '../lib/kpi/config'

describe('KPI ve kategori isim standardı', () => {
  it('kategori adları executive display standardından gelir', () => {
    expect(CATEGORY_OPTIONS.map(cat => cat.label)).toEqual([
      'Müşteri Sadakati ve Deneyimi',
      'Finansal Verimlilik ve Rasyo Analizi',
      'Süreç ve Operasyonel Akış',
      'Bayi Ağı Kapasite Yönetimi',
      'Stratejik Kapsam Dağılımı',
    ])
  })

  it('eski/kısa kategori adlarını yeni display adına dönüştürür', () => {
    expect(getCategoryDisplayName('Müşteri')).toBe('Müşteri Sadakati ve Deneyimi')
    expect(getCategoryDisplayName('Ticari')).toBe('Finansal Verimlilik ve Rasyo Analizi')
    expect(getCategoryDisplayName('Kapsam')).toBe('Stratejik Kapsam Dağılımı')
    expect(getCategoryShortName('Stratejik Kapsam Dağılımı')).toBe('Stratejik Kapsam')
  })

  it('KPI adları tek merkezden standart formatta okunur', () => {
    expect(getKpiDisplayName(4)).toBe('İş Emri Başına İşçilik Saati')
    expect(getKpiDisplayName(11)).toBe('Garanti Kapsam Endeksi')
    expect(getKpiDisplayName(12)).toBe('Periyodik Bakım Endeksi')
    expect(KPI_META[3].ad).toBe('İş Emri Başına İşçilik Saati')
    expect(KPI_META[10].kat).toBe('Stratejik Kapsam Dağılımı')
  })
})
