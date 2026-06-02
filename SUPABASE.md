# Supabase Kurulumu ve RLS Notları

Bu doküman, SSH KPI Platform projesinde kullanılan Supabase güvenlik varsayımlarını ve örnek migration yapısını açıklar.

## Kullanılan tablo

Uygulama tarafında kullanıcı yetkilendirme ve aktiflik kontrolü için `profiles` tablosu beklenir.

Beklenen alanlar:

| Alan | Tip | Açıklama |
|---|---|---|
| `id` | `uuid` | `auth.users.id` ile ilişkili kullanıcı ID'si |
| `email` | `text` | Kullanıcı e-posta adresi |
| `full_name` | `text` | Kullanıcı adı / görünen ad |
| `role` | `text` | `viewer`, `analyst`, `admin`, `superadmin` |
| `is_active` | `boolean` | Pasif kullanıcıların uygulama işlemleri engellenir |
| `created_at` | `timestamptz` | Oluşturulma zamanı |
| `updated_at` | `timestamptz` | Son güncelleme zamanı |

## Rol modeli

Önerilen roller:

- `viewer`: Dashboard'u görüntüleyebilir.
- `analyst`: Dashboard ve analiz ekranlarını kullanabilir; yönetim işlemi yapamaz.
- `admin`: Admin panelini görüntüleyebilir; kritik kullanıcı yönetimi sadece `superadmin` tarafından yapılır.
- `superadmin`: Kullanıcı rolü ve aktiflik durumu gibi kritik alanları yönetebilir.

## RLS politikaları

Örnek migration şu dosyadadır:

```text
supabase/migrations/0001_profiles_rls_example.sql
```

Bu dosya şunları içerir:

1. `profiles` tablosu örneği.
2. `role` constraint'i.
3. `updated_at` trigger örneği.
4. Yardımcı RLS fonksiyonları.
5. RLS policy örnekleri.

Politika varsayımları:

- Kullanıcı kendi profilini okuyabilir.
- Aktif `admin` ve `superadmin` kullanıcılar tüm profilleri okuyabilir.
- Sadece aktif `superadmin` kullanıcılar kullanıcı rolü ve aktiflik gibi kritik alanları yönetmelidir.
- Pasif kullanıcılar protected API işlemlerinden engellenmelidir.

## Production kullanımı için uyarı

Migration dosyası doğrudan production'a kör şekilde uygulanmamalıdır. Önce mevcut Supabase şeması kontrol edilmelidir.

Özellikle şunları kontrol edin:

- `profiles` tablosu zaten var mı?
- Mevcut `role` değerleri bu constraint ile uyumlu mu?
- Uygulama profilleri otomatik trigger ile mi, yoksa admin paneli/API ile mi oluşturuyor?
- Kullanıcı kendi profilini güncellerken `role` veya `is_active` alanlarını değiştirmemesi garanti ediliyor mu?

Daha sıkı production güvenliği için öneriler:

- Rol/aktiflik güncellemelerini client yerine sadece server-side API üzerinden yapın.
- `profiles` tablosunda column-level privilege veya RPC kullanmayı değerlendirin.
- Superadmin işlemleri için audit log ekleyin.
- En az bir aktif `superadmin` kalmasını uygulama API katmanında koruyun.

## API tarafı ile ilişki

`app/api/commentary/route.ts` gibi protected endpoint'lerde beklenen davranış:

- Oturum yoksa `401`.
- Kullanıcı pasifse `403`.
- Gerekirse `profiles.role` üzerinden rol bazlı yetki kontrolü.

Admin kullanıcı yönetimi endpoint'leri için beklenen davranış:

- Kullanıcı giriş yapmış olmalı.
- Kullanıcı aktif olmalı.
- Kritik değişiklikler yalnızca `superadmin` tarafından yapılmalı.
- Son aktif `superadmin` pasifleştirilmemeli.

## Dashboard verileri

Mevcut projede KPI dashboard verileri ağırlıklı olarak statik JSON dosyalarından okunur:

```text
lib/kpi_data.json
lib/marka_scores.json
```

Bu nedenle KPI ham veri tabloları için RLS migration bu adımda eklenmemiştir. Eğer ileride KPI verileri Supabase tablolarına taşınırsa, ayrıca tablo bazlı RLS politikaları eklenmelidir.

## Dinamik yönetim şeması (Prompt 2 — migration 0002)

`supabase/migrations/0002_dynamic_admin_schema.sql` additive olarak şu tabloları ekler:

| Tablo | Amaç |
|---|---|
| `kpi_categories` | Kategori tanımları (ad, renk, sıralama, aktif/pasif) |
| `kpi_definitions` | KPI tanımları (no, ad, kategori, yön, veri tipi, coverage) |
| `kpi_methodology_versions` | Skor metodolojisi versiyonları (aktif tek versiyon) |
| `kpi_category_weights` | Versiyon başına kategori ağırlıkları (yüzde) |
| `brands` | Marka kayıtları (+ `is_hidden`, `data_source` kolonları additive eklenir) |
| `user_data_permissions` | Kullanıcı bazlı segment/marka/bölge görünürlük kısıtları |
| `data_import_batches` | Import işlem kayıtları; `is_active` batch dashboard'u besler |
| `kpi_fact_rows` | Import edilen satır bazlı KPI verisi (dinamik motorun kaynağı) |
| `audit_logs` | Super Admin işlemlerinin denetim kaydı |

RLS özeti:

- Aktif tüm kullanıcılar referans tablolarını (`kpi_categories`, `kpi_definitions`, `brands`, ağırlık/versiyon, fact rows) **okuyabilir** — dashboard'un isimleri ve skorları gösterebilmesi için.
- Yönetim yazma işlemleri (`for all`) yalnızca **aktif superadmin**'e açıktır.
- `user_data_permissions`: kullanıcı kendi kaydını okur, superadmin tümünü yönetir.
- `audit_logs`: superadmin okur; aktif admin/superadmin insert edebilir.

Önkoşullar / uyarılar:

- `gen_random_uuid()` kullanılır (Supabase'de `pgcrypto` varsayılan açıktır; yoksa `create extension if not exists pgcrypto;`).
- 0001'deki yardımcı fonksiyonlara (`current_user_is_superadmin` vb.) bağımlıdır; önce 0001 uygulanmış olmalıdır.
- Migration sonunda **idempotent seed** vardır: kategoriler, 12 KPI ve "v1 — Baseline" versiyonu + ağırlıkları (25/25/25/15/10) eklenir. Böylece yönetim ekranları "Config fallback" yerine "Supabase kaynaklı" çalışır.
- `brands` tablosu zaten varsa kırılmaz; sadece eksik kolonlar `add column if not exists` ile eklenir.
