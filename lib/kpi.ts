// lib/kpi.ts içine eklenecek / güncellenecek bölüm

/**
 * Belirli filtreler altında bir markanın tüm KPI değerlerini getirir (Ham Veri)
 */
export function getMarkaKpis(marka: string, bolge = '', yas = 'Tümü', donem = ''): (number | null)[] {
  // Elindeki ham marka küpünden (örneğin MARKA_RAW) ilgili satırı filtrele
  // Eğer filtre bulunamazsa fallback olarak boş array veya null dönebilirsiniz
  const row = MARKA_RAW.find(r => 
    r[0] === marka && 
    r[2] === bolge && 
    r[3] === yas && 
    r[4] === donem
  );
  // Örnek yapı: [marka, segment, bolge, yas, donem, [kpi_array]] olduğunu varsayarsak:
  return row ? row[5] : Array(KPI_META.length).fill(null);
}

/**
 * RULE OF 3: Tüm markalar için dinamik normalize edilmiş KPI skorlarını hesaplar (0 - 100)
 * Markanın ilgili KPI değerini, o filtredeki TR referans değerine oranlar.
 */
export function getMarkaKpiScores(marka: string, bolge = '', yas = 'Tümü', donem = ''): number[] {
  const markaKpis = getMarkaKpis(marka, bolge, yas, donem);
  const trKpis    = getKpisFromCube('', bolge, yas, donem); // TR Genel Referansı

  return markaKpis.map((v, i) => {
    const r = trKpis[i];
    if (v === null || r === null || v === 0 || r === 0) return 50; // Data yoksa nötr merkez (Orta)

    // Lower better (örb. Servis bekleme süresi) kontrolü
    const ratio = isLowerBetter(i) ? r / v : v / r;
    
    // 100 base normalization
    return Math.min(100, Math.max(0, Math.round(ratio * 100)));
  });
}

// ── RULE OF 3: YENİ RENKLENDİRME EŞİKLERİ VE FONKSİYONLARI ──
// Tasarımı sadeleştiren, gözü yormayan 3 temel segment (Kritik, Dikkat, Başarılı)

export function kpiScoreColor(v: number): string {
  if (v >= 80) return '#10b981' // Yüksek / Başarılı (Zümrüt Yeşili)
  if (v >= 65) return '#f59e0b' // Orta / Sınırda (Kehribar - Eski mavi yerine)
  return '#ef4444'             // Düşük / Kritik (Resif Kırmızısı)
}

export function kpiScoreBg(v: number): string {
  if (v >= 80) return 'rgba(16, 185, 129, 0.12)'
  if (v >= 65) return 'rgba(245, 158, 11, 0.10)'
  return 'rgba(239, 68, 68, 0.10)'
}
