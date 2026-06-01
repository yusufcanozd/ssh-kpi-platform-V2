# TypeScript Strict Mode Hazırlık Notları

Bu doküman `strict: true` geçişi için teknik borç listesidir. Bu adımda `tsconfig.json` değiştirilmedi; amaç önce KPI ve API tarafındaki riskli gevşek tipleri azaltmaktır.

## Bu adımda azaltılan riskli tipler

### KPI hesaplama / veri erişimi

- `lib/kpi/config.ts` içinde `RAW as any` kaldırıldı.
- `kpi_data.json` için daraltılmış `KpiRawData` tipi eklendi.
- KPI metadata, dönem, segment, yaş grubu ve toplam alanları `unknown -> typed raw data` yaklaşımıyla okunur hale getirildi.
- `KAT_YAPILAR` için `CategoryKey` ve `satisfies` kullanıldı.
- `lib/kpi/data.ts` içinde `RAW as any` ve `MARKA_RAW as any` kaldırıldı.
- `RawKpiData` ve `RawMarkaScoresData` tipleri eklendi.
- `score_cube` runtime skor hesaplamasında hâlâ kullanılmaz.

### API route

- `app/api/commentary/route.ts` içinde request body `unknown` olarak parse ediliyor.
- Prompt alanı string doğrulamasından geçmeden kullanılmıyor.
- Anthropic response için dar bir `AnthropicResponse` tipi kullanılıyor.
- Supabase profile sonucu `ProfileAuthRow` tipiyle sınırlandırılıyor.

## Bilerek yapılmayanlar

- `tsconfig.json` içinde `strict` true yapılmadı.
- Dashboard sayfalarındaki tüm `any` / `as any` kullanımları bu adımda temizlenmedi.
- Supabase client için tam generated database tipi eklenmedi.
- Chart.js / React component prop tipleri proje genelinde yeniden yazılmadı.

## Kalan teknik borç

1. Dashboard sayfalarında kalan `any` ve `as any` kullanımlarını dosya dosya azalt.
2. Supabase için generated `Database` tipi üret:
   ```bash
   npx supabase gen types typescript --project-id <project-id> > types/supabase.ts
   ```
3. `createClient()` helper fonksiyonlarını `Database` tipiyle generic kullanacak hale getir.
4. Component props tiplerini `Record<string, unknown>` yerine net interface'lere taşı.
5. JSON veri dosyaları için opsiyonel runtime validation ekle. Öneri: `zod` veya küçük custom validator.
6. `noImplicitAny`, `strictNullChecks`, `noUncheckedIndexedAccess` kontrollerini aşamalı aç.

## Önerilen strict geçiş sırası

1. KPI modülleri ve testler
2. API route'ları
3. Supabase helper ve response tipleri
4. Dashboard component props
5. Büyük dashboard sayfaları
6. `tsconfig.json` içinde `strict: true`

## Kontrol komutları

```bash
npm run test
npm run build
```
