# SSH KPI Platform

SSH KPI Platform, otomotiv satış sonrası hizmetler için segment, bölge, yaş grubu ve dönem kırılımlarında KPI analizi yapan Next.js tabanlı bir dashboard uygulamasıdır.

Bu doküman kurulum, geliştirme, test ve güvenlik notlarını içerir. KPI hesaplama metodolojisi için ayrıca [METHODOLOGY.md](./METHODOLOGY.md) dosyasına bakın.

## Teknoloji yığını

- Next.js 14
- React
- TypeScript
- Supabase Auth / PostgreSQL
- Chart.js / react-chartjs-2
- Vitest
- CSS Modules

## Proje yapısı

Önemli dosya ve klasörler:

```text
app/
  dashboard/
  api/
components/
  dashboard/
  layout/
  ui/
lib/
  kpi.ts
  kpi/
    config.ts
    data.ts
    formula.ts
    format.ts
  lib/kpi_data.json
  marka_scores.json
tests/
  kpi.test.ts
types/
  index.ts
supabase/
  migrations/
SUPABASE.md
METHODOLOGY.md
```

## Kurulum

Bağımlılıkları yükleyin:

```bash
npm install
```

Geliştirme sunucusunu çalıştırın:

```bash
npm run dev
```

Uygulama varsayılan olarak şu adreste çalışır:

```text
http://localhost:3000
```

## Environment variables

Kök dizinde `.env.local` dosyası oluşturun.

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
ANTHROPIC_API_KEY=your-anthropic-api-key
```

Gerçek Supabase URL, anon key veya servis anahtarlarını repoya yazmayın.

Notlar:

- `NEXT_PUBLIC_SUPABASE_URL` ve `NEXT_PUBLIC_SUPABASE_ANON_KEY` client tarafında kullanılabilir public değerlerdir; yine de örnek dosyalarda gerçek proje bilgisi paylaşılmamalıdır.
- `ANTHROPIC_API_KEY` yalnızca server-side API route içinde kullanılmalıdır.
- Service role key kullanılacaksa client tarafına kesinlikle açılmamalıdır.

## Geliştirme komutları

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## Test komutları

```bash
npm run test
npm run test:watch
```

Testler KPI formül mantığını küçük ve deterministik mock verilerle kontrol eder. Büyük `lib/kpi_data.json` içindeki segment/bölge değerlerine bağımlı skor beklentisi kurulmaz.

## KPI metodolojisi

KPI hesaplama detayları için:

```text
METHODOLOGY.md
```

Özet:

- Platform 12 KPI kullanır.
- KPI 4 ve KPI 7 düşük daha iyi KPI'lardır.
- Diğer KPI'larda yüksek değer daha iyidir.
- Tekil KPI skoru referansa göre normalize edilir.
- Kategori skorları ilgili KPI skorlarının ortalamasıdır.
- Genel skor 5 kategori üzerinden ağırlıklı hesaplanır.
- `score_cube` legacy veri alanıdır; runtime skor hesaplamasında kullanılmaz.

## Supabase dokümantasyonu

Supabase tablo, RLS ve migration notları için:

```text
SUPABASE.md
```

Örnek migration dosyası:

```text
supabase/migrations/0001_profiles_rls_example.sql
```

Bu migration production ortamına kör şekilde uygulanmamalıdır. Önce mevcut Supabase şemasıyla karşılaştırılmalıdır.

## Güvenlik notları

- Auth olmayan kullanıcılar korumalı sayfalara erişmemelidir.
- Admin API endpoint'lerinde rol ve aktiflik kontrolü yapılmalıdır.
- `app/api/commentary` gibi dış API maliyeti oluşturan endpoint'lerde auth, input validation ve rate limit bulunmalıdır.
- API key, service role key ve hassas environment variable değerleri repoya yazılmamalıdır.
- Supabase RLS policy'leri production'a alınmadan önce staging ortamında test edilmelidir.

## Veri kaynakları

Ana KPI verisi:

```text
lib/kpi_data.json
```

Marka skor verisi:

```text
lib/marka_scores.json
```

KPI hesaplama runtime'da `lib/kpi/` altındaki modüller üzerinden yapılır.

## Build kontrolü

Deploy öncesi önerilen kontroller:

```bash
npm run test
npm run lint
npm run build
```

## Manuel kontrol önerisi

Deploy sonrası en az şu sayfalar kontrol edilmelidir:

```text
/dashboard
/dashboard/kpiler
/dashboard/ozet-rapor
/dashboard/trend
/dashboard/marka-siralamasi
/dashboard/bolge-analizi
```

Ayrıca login, logout, admin kullanıcı yönetimi, AI yorum üretimi ve marka gizleme kuralı manuel test edilmelidir.


## Kalan İyileştirme Notları

- Canonical KPI veri kaynağı `lib/kpi_data.json` dosyasıdır. Kök dizinde ayrı bir `kpi_data.json` tutulmaz.
- Bölge karşılaştırmaları `getRegionalScorePrecise` üzerinden Türkiye geneli referansına göre hesaplanır.
- Skor ölçeği 0–200'dür; 100 referans seviyesi, 200 tavan değerdir.
- Veri setinde varyans üretmeyen KPI'lar coverage dışında bırakılır. Mevcut veri setinde KPI 2 bu kapsamdadır.
- Kullanıcı rolleri: `superadmin`, `admin`, `analyst`, `viewer`.
- Marka skorları hazır genel skor kaynağından gelir; marka bazlı kategori/KPI kırılımı bulunmamaktadır.
