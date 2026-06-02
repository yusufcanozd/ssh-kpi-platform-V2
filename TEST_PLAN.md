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
