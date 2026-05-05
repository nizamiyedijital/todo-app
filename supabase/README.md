# Supabase — Disiplan Backend

Supabase migration'ları ve seed script'leri. Faz 0 altyapısı.

## Klasör Yapısı

```
supabase/
├── README.md                          ← bu dosya
├── migrations/
│   ├── 0001_admin_foundation.sql      ← admin_users, roles, audit_log, RLS
│   ├── 0002_articles_notifications.sql ← articles, notification_campaigns
│   ├── 0003_subscriptions.sql         ← plans, subscriptions, payments (Iyzico)
│   └── 0004_support_kvkk.sql          ← tickets, KVKK requests, app_settings
└── scripts/
    ├── seed_first_admin.sql           ← ilk owner ekleme (sen)
    └── seed_default_settings.sql      ← varsayılan plan limitleri ve flag'ler
```

## Migration Sırası (DİKKAT)

Migration'ları **mutlaka sırayla** uygula. Her biri öncekine bağımlı:

1. `0001_admin_foundation.sql` — admin_users + helper functions
2. `0002_articles_notifications.sql` — content (0001'in helper'larını kullanır)
3. `0003_subscriptions.sql` — billing
4. `0004_support_kvkk.sql` — operations
5. `seed_first_admin.sql` — sen owner ol (önce email'ini güncelle!)
6. `seed_default_settings.sql` — varsayılan ayarlar

## Uygulama Yöntemi

### Yöntem 1 — Supabase Dashboard SQL Editor (önerilen, hızlı)

1. https://supabase.com/dashboard → projeni aç
2. Sol menüden **SQL Editor**
3. **New query** → migration dosyasının içeriğini yapıştır → **Run**
4. "Success" mesajı bekle
5. Bir sonraki dosyayla devam et

### Yöntem 2 — Supabase CLI (gelişmiş, versiyonlama için)

```bash
# Kurulum (bir kere)
brew install supabase/tap/supabase

# Proje bağla
supabase login
supabase link --project-ref <PROJECT_REF>

# Migration'ları push et
supabase db push
```

> CLI kullanırsan `supabase/migrations/` klasöründeki sıra otomatik korunur.

## Doğrulama

Her migration sonrası kontrol:

```sql
-- Hangi migration'lar uygulandı?
select * from public._migration_log order by version;

-- Beklenen çıktı (4 satır):
-- 0001 | Admin foundation: ...
-- 0002 | Articles + notification campaigns ...
-- 0003 | Subscription plans ...
-- 0004 | Support tickets ...
```

```sql
-- Kullanıcı admin mi diye test
select public.is_admin();
-- false (henüz seed yapılmadı)

-- Seed sonrası tekrar
-- true
```

## İlk Admin (Sen) Olma

1. Mobile veya web'den `nizamiye.dijital@gmail.com` ile **bir kez** kayıt ol (sign up)
2. `supabase/scripts/seed_first_admin.sql` aç
3. `v_email := 'nizamiye.dijital@gmail.com'` satırını gerekirse güncelle
4. Supabase SQL Editor'da çalıştır
5. "OK: nizamiye.dijital@gmail.com artık owner..." mesajı görmeli
6. Test:
   ```sql
   select public.is_admin();         -- true bekle
   select public.has_admin_role('owner'); -- true bekle
   ```

## Rollback

Her migration'ın sonunda yorum satırı olarak rollback komutları var. Yanlış uyguladıysan:

1. İlgili migration'ın altındaki `-- ROLLBACK` bloğundaki tüm satırları kopyala
2. Yorum işaretlerini (`--`) kaldır
3. SQL Editor'da çalıştır
4. `_migration_log`'dan ilgili versiyon silinmiş olmalı

## RLS Test Cheatsheet

```sql
-- Belirli bir kullanıcı olarak test et
set local role authenticated;
set local request.jwt.claim.sub = '<user_uuid>';

-- Şimdi bir sorgu çalıştır → RLS aktif olarak görürsün
select * from public.subscriptions;
```

## Sonraki Adımlar (Faz 0'ı bitirmek için)

- [ ] 4 migration uygulandı
- [ ] `seed_first_admin.sql` çalıştırıldı, sen owner'sın
- [ ] `seed_default_settings.sql` çalıştırıldı
- [ ] PostHog Cloud projesi açıldı (kullanıcı manuel)
- [ ] PostHog write key `.env`'e eklendi
- [ ] Web (`index.html`) ve mobile (`mobile/`) ilk event'i gönderiyor
- [ ] Mevcut `SYSTEM_ARTICLES` (index.html'deki) `articles` tablosuna seed edildi (Faz 1B'de yapılacak)

Faz 1 başlangıç koşulları sağlandığında yeni Next.js admin app'ini `/admin/` klasörüne kuracağız.

## Dikkat Edilecekler

- **Service-role key asla client'a gitmez.** Admin Next.js app'inde sadece server-side route'larda kullanılır.
- **Migration dosyalarını değiştirme** — bir kez uygulandıktan sonra. Yeni değişiklik için yeni migration dosyası aç (`0005_*.sql`).
- **`auth.users` Supabase'in kendi tablosu** — biz kolon eklemiyoruz, sadece FK ile bağlanıyoruz.
- **`public._migration_log`** versiyon takibi için — silmeyin.
