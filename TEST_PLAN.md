# Manuel Test Planı

## 1. Login / Logout
- Ön koşul: Aktif kullanıcı hesabı.
- Adımlar: Login ol, dashboard'a git, logout yap.
- Beklenen sonuç: Login başarılı, logout sonrası `/login` ekranına yönlenir.
- Risk: Yüksek.

## 2. Yetkisiz erişim
- Ön koşul: Oturum yok.
- Adımlar: `/dashboard` ve `/admin/users` adreslerini aç.
- Beklenen sonuç: `/login` sayfasına yönlenir.
- Risk: Yüksek.

## 3. Pasif kullanıcı
- Ön koşul: `is_active=false` kullanıcı.
- Adımlar: Login dene.
- Beklenen sonuç: Kullanıcı korumalı sayfalara erişemez.
- Risk: Yüksek.

## 4. Dashboard genel skor
- Ön koşul: Aktif kullanıcı.
- Adımlar: Segment, bölge, yaş, dönem filtrelerini değiştir.
- Beklenen sonuç: Genel skor, kategori skorları ve karşılaştırma değerleri tutarlı güncellenir.
- Risk: Yüksek.

## 5. Bölge skor referansı
- Ön koşul: Dashboard açık.
- Adımlar: Bölge skor dağılımını ve `/dashboard/bolgeler` sayfasını kontrol et.
- Beklenen sonuç: Bölgeler Türkiye geneli referansa göre farklı skorlar gösterebilir; 100 referans seviyesidir.
- Risk: Kritik.

## 6. KPI 2 coverage
- Ön koşul: KPI detay ekranı.
- Adımlar: KPI 2 ve coverage bilgilerini kontrol et.
- Beklenen sonuç: KPI 2 veri kalitesi nedeniyle coverage dışında kalabilir.
- Risk: Yüksek.

## 7. Grafik renkleri ve barlar
- Ön koşul: Dashboard, KPI ve Bölge sayfaları.
- Adımlar: Skor renklerini kontrol et.
- Beklenen sonuç: 110+ güçlü, 95–110 referansa yakın, 85–95 dikkat, <85 kritik olarak gösterilir.
- Risk: Orta.

## 8. Marka sıralaması ve gizlilik
- Ön koşul: Marka sıralaması ekranı.
- Adımlar: 1–3 marka döndüren filtre uygula.
- Beklenen sonuç: Marka adları Gizli Teşebbüs olarak maskelenir.
- Risk: Yüksek.

## 9. Özet rapor PDF
- Ön koşul: `/dashboard/ozet-rapor`.
- Adımlar: Rapor oluştur, PDF yazdırmayı dene.
- Beklenen sonuç: Sayfa kırılımları düzgün; kullanıcıya üstbilgi/altbilgi uyarısı görünür.
- Risk: Yüksek.

## 10. AI yorum
- Ön koşul: Aktif kullanıcı ve `ANTHROPIC_API_KEY`.
- Adımlar: Özet raporda AI yorum üret.
- Beklenen sonuç: Yetkili kullanıcı yorum alır; yetkisiz kullanıcı 401/403 alır.
- Risk: Yüksek.

## Ek kontrol maddeleri

- Bölge skor kartlarında ve Bölge Analizi sayfasında skorların tam sayı göründüğünü doğrula.
- Çıkış Yap düğmesine basıldığında kullanıcının `/login` sayfasına yönlendiğini ve geri tuşuyla dashboard'a dönmediğini doğrula.
- GitHub Actions üzerinde test, lint ve build işlerinin main/cursor-local-snapshot push sonrası çalıştığını kontrol et.
- Kök dizinde `kpi_data.json` bulunmadığını, yalnızca `lib/kpi_data.json` kullanıldığını doğrula.

## Prompt 1 - Auth ve session güvenliği manuel testleri

1. Normal giriş yapın; rolünüze göre `/admin` veya `/dashboard` sayfasına yönlendirilmelisiniz.
2. Aynı sekmede sayfayı yenileyin; oturum devam etmelidir.
3. Tarayıcı sekmesini veya pencereyi tamamen kapatıp siteyi yeniden açın; tekrar `/login` ekranına düşmeli ve kullanıcı adı/şifre istemelidir.
4. `Çıkış Yap` butonuna basın; `/login` sayfasına yönlenmeli, geri tuşu ile dashboard/admin ekranına dönülememelidir.
5. Deaktif kullanıcıyla giriş denenirse oturum temizlenmeli ve hata mesajı gösterilmelidir.
6. Admin olmayan kullanıcı `/admin/users` adresine gitmeye çalışırsa `/dashboard` sayfasına yönlendirilmelidir.

## Prompt 2 — Super Admin Menü ve Yönetim Ekranı İskeleti

Amaç: KPI motorunu ve dashboard hesaplarını değiştirmeden Super Admin yönetim merkezi sayfa iskeletlerini görünür hale getirmek.

Manuel kontrol listesi:

1. `/admin` açılmalı ve yönetim özeti kartları görünmeli.
2. Sol admin menüsünde şu bağlantılar görünmeli:
   - Yönetim Özeti
   - Kullanıcılar
   - KPI Ayarları
   - Kategoriler
   - Markalar
   - Data Import
   - Kullanıcı Kısıtları
   - Tema / Görsel
3. `/admin/users` mevcut kullanıcı yönetimi davranışını korumalı.
4. `/admin/kpi-settings` salt okunur KPI bilgilerini göstermeli; veri kaydetmemeli.
5. `/admin/categories` kategori ağırlıklarını ve bağlı KPI listesini göstermeli; veri kaydetmemeli.
6. `/admin/brands` marka/gizlilik planını göstermeli; marka silme/ekleme yapmamalı.
7. `/admin/data-import` import akışını plan olarak göstermeli; gerçek dosya yüklememeli.
8. `/admin/permissions` kullanıcı kısıtları planını göstermeli; dashboard filtrelerini değiştirmemeli.
9. `/admin/theme` executive görsel prensipleri göstermeli; dashboard grafiklerini değiştirmemeli.
10. Normal dashboard ekranları Prompt 1 sonrası davranışını aynen korumalı.

Kabul kriteri:

- Prompt 2, KPI hesaplama sonuçlarını değiştirmez.
- Prompt 2, Supabase tablolarına yazma işlemi eklemez.
- Prompt 2, sadece Super Admin menü/iskelet ekranlarını ekler.
