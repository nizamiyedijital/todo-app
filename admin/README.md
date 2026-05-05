# Disiplan Admin Panel

Next.js 16 + React 19 + Tailwind v4 + Supabase tabanlı admin panel.
Ana Disiplan uygulamasından (`/index.html` ve `/mobile/`) **bağımsız** ayrı bir proje.

## Hızlı Başlangıç

```bash
# 1) admin/ klasöründe ol
cd admin

# 2) .env.local dosyasını oluştur
cp .env.local.example .env.local
# → değerleri doldur (Supabase URL, anon key, service role key, PostHog key)

# 3) Geliştirme sunucusu (port 3001 — ana app 8765 ile çakışmasın)
npm run dev -- --port 3001
```

Tarayıcıda: http://localhost:3001

## Proje Yapısı

```
admin/
├── app/                 # Next.js App Router sayfaları
│   ├── (auth)/          # Giriş/kayıt — RBAC dışı (Faz 1A.2)
│   ├── admin/           # Admin sayfaları — RBAC korumalı (Faz 1A.3+)
│   ├── layout.tsx       # Root layout
│   └── page.tsx         # / → /admin redirect
├── components/          # Paylaşılan UI component'ler
│   └── ui/              # shadcn/ui component'leri (sonra eklenir)
├── lib/
│   ├── supabase/
│   │   ├── client.ts    # Browser-side Supabase client
│   │   ├── server.ts    # Server-side (RLS aktif)
│   │   ├── admin.ts     # Service-role (RLS bypass — DİKKAT)
│   │   └── middleware.ts# Session refresh helper
│   ├── auth.ts          # getAdminUser(), isAdmin()
│   ├── rbac.ts          # Role/Permission matrisi (lokal)
│   ├── audit.ts         # logAudit() helper
│   ├── nav.ts           # Sidebar nav config
│   ├── posthog.ts       # PostHog client init
│   └── utils.ts         # cn() helper (Tailwind class merge)
├── middleware.ts        # Auth + admin kontrol (Faz 1A.2)
├── .env.local.example   # Çevre değişkeni şablonu
└── README.md            # bu dosya
```

## Tech Stack

| Katman | Seçim | Not |
|---|---|---|
| Framework | Next.js 16.2 (App Router) | RSC + Server Actions |
| UI | Tailwind v4 + shadcn/ui | Slate base + #12A3E3 accent |
| Auth | Supabase Auth (email+pass) | Mobile/web ile aynı |
| DB | Supabase Postgres + RLS | Migration'lar `/supabase/` |
| Analytics | PostHog Cloud | EU region |
| Charts | Recharts | Server-side render uyumlu |
| Forms | Server Actions + Zod | RHF kullanmıyoruz |
| Icons | Lucide-react | shadcn default |

## Önemli Dosyalar

- **Migration'lar**: `../supabase/migrations/` — DB şeması
- **RBAC matrisi**: `../docs/admin/RBAC_MATRIX.md` — kim ne yapabilir
- **Event taxonomy**: `../docs/admin/EVENT_TAXONOMY.md` — PostHog event isimleri
- **Faz planı**: `../docs/admin/PHASE_0_PLAN.md`

## Komutlar

```bash
npm run dev           # Geliştirme sunucusu (Turbopack)
npm run build         # Production build
npm run start         # Production sunucu
npm run lint          # ESLint
```

## Güvenlik Notları

- `SUPABASE_SERVICE_ROLE_KEY` **asla** `NEXT_PUBLIC_` ile başlamaz, asla client'a sızdırılmaz.
- `lib/supabase/admin.ts` sadece server-only dosyalardan import edilir.
- RLS ilk savunma katmanıdır. App layer (`lib/rbac.ts`) ikinci kontrol.
- Her admin işlemi `logAudit()` ile audit_log'a yazılır.

## Bilinen Eksikler (Faz 1A devam ediyor)

- [ ] shadcn/ui kurulumu (Faz 1A.3)
- [ ] Login sayfası (Faz 1A.2)
- [ ] Middleware admin kontrolü (Faz 1A.2)
- [ ] Sidebar + topbar layout (Faz 1A.3)
- [ ] Dashboard iskelet (Faz 1A.4)

## Next.js 16 — Önemli Notlar

Next.js 16 **training data'mdan farklı olabilir**. Şüphede kalırsan:
`node_modules/next/dist/docs/` altındaki ilgili `.md` dosyasını oku.
