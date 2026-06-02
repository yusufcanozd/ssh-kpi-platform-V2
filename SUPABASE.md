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

## Prompt 1–4 Super Admin yönetim şeması

Role set tek kaynak olarak şu şekilde kabul edilir:

- `viewer`
- `analyst`
- `admin`
- `superadmin`

Erişim ayrımı:

- `/admin/users`: `admin` ve `superadmin` erişebilir.
- Diğer Super Admin yönetim modülleri: sadece `superadmin` erişebilir.
- `viewer` ve `analyst`: admin paneline giremez, dashboard görünümüne yönlendirilir.

Prompt 2/4 için additive migration dosyası:

- `supabase/migrations/0002_super_admin_management_schema.sql`

Bu migration mevcut production tablolarını bozmaz; KPI/kategori/marka/import/kullanıcı veri kısıtı ve audit log altyapısını yeni tablolarla hazırlar.

Yeni yönetim tabloları:

- `kpi_categories`
- `kpi_definitions`
- `kpi_methodology_versions`
- `kpi_category_weights`
- `brands`
- `user_data_permissions`
- `data_import_batches`
- `kpi_fact_rows`
- `audit_logs`

Prompt 4 ekranları önce Supabase tablolarını okumayı dener. Tablolar yoksa veya boşsa mevcut `config.ts` / `kpi_data.json` fallback verisi gösterilir. Dashboard skor motoru bu aşamada yeni tablolardan okumaya zorlanmaz.

RLS yaklaşımı:

- Superadmin yönetim tablolarında tam yetkili olmalıdır.
- Admin kullanıcı yönetimiyle sınırlı tutulmalıdır.
- Analyst/viewer, ileride `user_data_permissions` üzerinden izin verilen segment/marka/bölge verilerini okuyacaktır.
- App-level permission helper ve Supabase RLS politikaları Prompt 7’de birlikte netleştirilmelidir.
