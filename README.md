# SSH KPI Platform — Next.js

Türkiye Otomotiv Sektörü Satış Sonrası Hizmetler Rekabet Analizi

## Teknoloji

- **Next.js 14** (App Router)
- **TypeScript** 
- **Supabase** (Auth + PostgreSQL)
- **Chart.js** (Grafikler)
- **CSS Modules** (Stil)

## Kurulum

### 1. Bağımlılıkları yükleyin
```bash
npm install
```

### 2. Environment variables
`.env.local` dosyası oluşturun:
```
NEXT_PUBLIC_SUPABASE_URL=https://dqocqewqqzbzczukqnzi.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### 3. Geliştirme sunucusu
```bash
npm run dev
```

http://localhost:3000 adresinde çalışır.

### 4. Production build
```bash
npm run build
npm start
```

## Vercel'e Deploy

1. GitHub'a push edin
2. Vercel'de "Import Project" seçin
3. Environment Variables bölümüne `.env.local` değerlerini girin
4. Deploy tıklayın

## Kullanıcı Rolleri

| Rol | Yetki |
|-----|-------|
| `superadmin` | Her şey |
| `admin` | Veri yönetimi + kullanıcı yönetimi |
| `analyst` | Kendi markası veri girişi |
| `viewer` | Sadece okuma |

## Proje Yapısı

```
src/
├── app/              # Next.js sayfaları
│   ├── login/        # Giriş
│   ├── dashboard/    # KPI dashboard (5 sayfa)
│   └── admin/        # Admin paneli (5 bölüm)
├── components/       # Yeniden kullanılabilir componentler
│   ├── layout/       # Sidebar, Topbar
│   └── ui/           # StatCard, Toast, ...
├── context/          # Auth ve Tema context
├── hooks/            # useDashboard hook
├── lib/              # Supabase client, KPI utilities
│   └── supabase/
└── types/            # TypeScript tipleri
```
