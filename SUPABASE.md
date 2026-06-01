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
| `role` | `text` | `user`, `admin`, `superadmin` |
| `is_active` | `boolean` | Pasif kullanıcıların uygulama işlemleri engellenir |
| `created_at` | `timestamptz` | Oluşturulma zamanı |
| `updated_at` | `timestamptz` | Son güncelleme zamanı |

## Rol modeli

Önerilen roller:

- `user`: Standart kullanıcı.
- `admin`: Kullanıcıları görüntüleyebilir; kritik yönetim işlemleri yapamaz.
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
