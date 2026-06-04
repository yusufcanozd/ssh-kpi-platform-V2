# P20 UI Dokümantasyon Notları

Bu dosya P2 ve P19 kapsamında dashboard arayüzünden kaldırılan açıklama/tooltip içeriklerinin P20 dokümantasyonuna taşınması için tutulur.

## P2 — Dashboard yardım ikonları / tooltip açıklamaları

Aşağıdaki açıklamalar dashboard ekranlarından kaldırılan `?` yardım ikonlarında gösteriliyordu. UI sadeleştirme kapsamında ikonlar kaldırıldı; metodoloji bilgisi P20 dokümantasyonunda kalıcı olarak anlatılmalıdır.

### Genel skor hesaplama

Genel skor; kategori skorlarının ağırlıklı ortalamasıdır. Mevcut kategori ağırlıkları üzerinden `Kategori Skoru × Kategori Ağırlığı` toplamı alınır. Kategori skorları, ilgili KPI skorlarının ortalamasıdır. Eksik KPI varsa kategori ortalamasına dahil edilmez; kategori tamamen eksikse nötr 100 kullanılır ve coverage oranı düşer.

### Kategori skoru hesaplama

Her kategori skoru, o kategoriye bağlı KPI skorlarının aritmetik ortalamasıdır. Kategori-KPI eşleşmeleri runtime KPI metodolojisine göre çözülür; statik açıklama yerine güncel metodoloji kaynağı referans alınmalıdır.

### KPI skor hesaplama

KPI detay tooltiplerinde ham değer, referans değer, skor, yön ve formül gösteriliyordu. Düşük daha iyi KPI'larda formül `referans / değer × 100`, yüksek daha iyi KPI'larda `değer / referans × 100` olarak anlatılıyordu. Skor 0-200 aralığında sınırlandırılır. Veri veya referans eksikse ekranda nötr 100 gösterilir; coverage oranı eksikliği yansıtır.

### Veri kapsama açıklaması

Coverage rozeti için hover açıklamasında `Veri kapsama: mevcut KPI / toplam KPI` bilgisi vardı. P2 sonrası bu bilgi rozet metnine görünür olarak taşındı.
