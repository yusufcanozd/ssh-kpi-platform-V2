# KPI Metodolojisi

Bu doküman, SSH KPI Platformu içinde kullanılan skor hesaplama metodolojisini açıklar. Amaç, dashboard üzerinde görünen tekil KPI skorları, kategori skorları ve genel skorun aynı, denetlenebilir ve açıklanabilir hesaplama motorundan üretilmesini sağlamaktır.

## 1. KPI listesi

Platform 12 KPI üzerinden çalışır.

| No | KPI | Kategori | Yön |
|---:|---|---|---|
| 1 | Aktif Müşteri Bazı Endeksi | Müşteri | Yüksek daha iyi |
| 2 | Müşteri Tutundurma Endeksi | Müşteri | Yüksek daha iyi |
| 3 | Servis Kullanım Endeksi | Müşteri | Yüksek daha iyi |
| 4 | İE Başına İşçilik Saati | Ticari | Düşük daha iyi |
| 5 | İE Başına İşçilik Tutarı | Ticari | Yüksek daha iyi |
| 6 | İE Başına Parça Tutarı | Ticari | Yüksek daha iyi |
| 7 | İş Emri Süresi Endeksi | Operasyonel | Düşük daha iyi |
| 8 | İş Emri Hacim Endeksi | Operasyonel | Yüksek daha iyi |
| 9 | Servis Başına İş Emri | Bayi Ağı | Yüksek daha iyi |
| 10 | Servis Başına Aktif Müşteri | Bayi Ağı | Yüksek daha iyi |
| 11 | Garanti Kapsam Endeksi | Kapsam | Yüksek daha iyi |
| 12 | Periyodik Bakım Endeksi | Kapsam | Yüksek daha iyi |

## 2. Referans mantığı

Tekil KPI skoru, seçili kırılımdaki ham KPI değerinin referans KPI değerine göre normalize edilmesiyle hesaplanır.

Genel kullanımda referans, aynı filtre bağlamındaki karşılaştırma grubudur. Örneğin segment seçiliyse, seçilen segmentin KPI değeri ilgili referans kırılıma göre normalize edilir.

Bölge bazlı analizlerde, tüm bölgelerin kendi referansına göre hesaplanması bütün bölgeleri 100'e yaklaştırabilir. Bölge karşılaştırması yapılacaksa referansın Türkiye geneli veya seçili ulusal benchmark olması daha anlamlıdır.

## 3. Normalize KPI formülü

### 3.1. Yüksek daha iyi KPI

Yüksek değer daha iyi kabul edilen KPI'larda formül:

```text
skor = değer / referans × 100
```

Örnek:

```text
değer = 120
referans = 100
skor = 120 / 100 × 100 = 120
```

Bu sonuç, seçili kırılımın referansın %20 üzerinde performans gösterdiği anlamına gelir.

### 3.2. Düşük daha iyi KPI

Düşük değer daha iyi kabul edilen KPI'larda formül ters çevrilir:

```text
skor = referans / değer × 100
```

Örnek:

```text
değer = 8
referans = 10
skor = 10 / 8 × 100 = 125
```

Bu sonuç, seçili kırılımın referansa göre daha düşük süre/saat ile daha iyi performans gösterdiği anlamına gelir.

## 4. Skor sınırı

Tekil KPI skorları aşağıdaki aralıkta sınırlandırılır:

```text
minimum skor = 0
maksimum skor = 200
```

Bu sınır, uç değerlerin genel skoru aşırı etkilemesini önlemek için kullanılır. Skor 200'ün üzerine çıkarsa 200 olarak kabul edilir.

## 5. Eksik veri davranışı

Ham KPI değeri veya referans değeri eksikse ilgili KPI için nötr skor yaklaşımı kullanılır:

```text
eksik/veri yok = 100
```

Ancak bu durum veri kapsama oranına yansıtılır. Böylece kullanıcı yalnızca skor değerini değil, skorun kaç geçerli KPI üzerinden hesaplandığını da görebilir.

## 6. Veri kapsama oranı

Veri kapsama oranı, hesaplamaya dahil edilebilen KPI sayısını gösterir.

```text
coverageRatio = availableKpiCount / totalKpiCount
```

Örnek:

```text
availableKpiCount = 10
totalKpiCount = 12
coverageRatio = 10 / 12 = 0.8333
```

Bu durumda skor 12 KPI'nın tamamına değil, 10 geçerli KPI'ya dayanır.

## 7. Kategori grupları

KPI'lar 5 kategoriye ayrılır.

| Kategori anahtarı | Kategori adı | KPI'lar |
|---|---|---|
| `musteri` | Müşteri Sadakati ve Deneyimi | KPI 1, 2, 3 |
| `ticari` | Finansal Verimlilik ve Rasyo Analizi | KPI 4, 5, 6 |
| `operasyonel` | Süreç ve Operasyonel Akış | KPI 7, 8 |
| `bayi` | Bayi Ağı Kapasite Yönetimi | KPI 9, 10 |
| `kapsam` | Stratejik Kapsam Dağılımı | KPI 11, 12 |

## 8. Kategori skoru formülü

Kategori skoru, ilgili kategorideki geçerli KPI skorlarının aritmetik ortalamasıdır.

```text
kategori skoru = geçerli KPI skorları toplamı / geçerli KPI sayısı
```

Örnek:

```text
Müşteri skoru = (KPI 1 skoru + KPI 2 skoru + KPI 3 skoru) / 3
```

Bir kategoride geçerli KPI yoksa kategori skoru nötr kabul edilir:

```text
kategori skoru = 100
```

Bu durum veri kapsama oranına yansır.

## 9. Genel skor ağırlıkları

Genel skor, kategori skorlarının ağırlıklı ortalamasıdır.

```text
Genel skor =
Müşteri × 0.25 +
Ticari × 0.25 +
Operasyonel × 0.25 +
Bayi × 0.15 +
Kapsam × 0.10
```

| Kategori | Ağırlık |
|---|---:|
| Müşteri | %25 |
| Ticari | %25 |
| Operasyonel | %25 |
| Bayi | %15 |
| Kapsam | %10 |

## 10. `score_cube` durumu

`lib/kpi_data.json` içinde yer alan `score_cube`, legacy/precomputed veri alanıdır.

Runtime skor hesaplamasında kullanılmaz. Dashboard üzerinde gösterilen genel skor, kategori skorları ve tekil KPI skorları dinamik hesaplama motorundan üretilmelidir.

Bu kararın nedeni, `score_cube` değerlerinin üretim metodolojisinin uygulama içinde açıklanabilir ve test edilebilir olmamasıdır.

## 11. Marka sıralaması gizleme kuralı

Marka sıralamasında rekabet hassasiyeti nedeniyle 3 veya daha az marka bulunan kırılımlarda marka adları maskelenir.

Kural:

```text
marka sayısı 1, 2 veya 3 ise marka adları gizlenir
marka sayısı 4 veya daha fazlaysa marka adları gösterilir
```

Maskeli gösterim örneği:

```text
Gizli Teşebbüs 1
Gizli Teşebbüs 2
Gizli Teşebbüs 3
```

Marka skoru, marka skor veri kaynağındaki precomputed marka skorundan okunuyorsa, bu metodoloji ayrıca dokümante edilmelidir.

## 12. Örnek hesaplama

Örnek tekil KPI skorları:

```text
KPI 1 = 110
KPI 2 = 90
KPI 3 = 100
KPI 4 = 125
KPI 5 = 80
KPI 6 = 95
KPI 7 = 105
KPI 8 = 115
KPI 9 = 100
KPI 10 = 90
KPI 11 = 120
KPI 12 = 100
```

Kategori skorları:

```text
Müşteri = (110 + 90 + 100) / 3 = 100
Ticari = (125 + 80 + 95) / 3 = 100
Operasyonel = (105 + 115) / 2 = 110
Bayi = (100 + 90) / 2 = 95
Kapsam = (120 + 100) / 2 = 110
```

Genel skor:

```text
Genel =
100 × 0.25 +
100 × 0.25 +
110 × 0.25 +
95 × 0.15 +
110 × 0.10

Genel = 25 + 25 + 27.5 + 14.25 + 11 = 102.75
```

Yuvarlanmış genel skor:

```text
Genel skor = 103
```
