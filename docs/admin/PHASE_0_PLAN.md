# Faz 0 — Veri ve Yetki Altyapısı

## Amaç

Admin panelin "üzerine bineceği" gerçek veri katmanını ve yetki sistemini Supabase'de kurmak. Faz 1 başlamadan önce her tablo, her RLS politikası ve event taxonomy'si yerinde olmalı.

## Kapsam

| Bileşen | Tip | Dosya |
|---|---|---|
| Admin kullanıcıları + roller | Tablo + RLS | `0001_admin_foundation.sql` |
| Audit log | Tablo + trigger helper | `0001_admin_foundation.sql` |
| Articles (sistem makaleleri) | Tablo + RLS | `0002_articles_notifications.sql` |
| Notification campaigns | Tablo + RLS | `0002_articles_notifications.sql` |
| Subscriptions (Iyzico-aware) | Tablo + RLS | `0003_subscriptions.sql` |
| Support tickets | Tablo + RLS | `0004_support_kvkk.sql` |
| KVKK request tabloları | Tablo + RLS | `0004_support_kvkk.sql` |
| RBAC matrisi | Doküman | `RBAC_MATRIX.md` |
| Event taxonomy | Doküman | `EVENT_TAXONOMY.md` |
| İlk admin seed script | SQL | `seed_first_admin.sql` |

**Event tracking:** PostHog Cloud kullanılacak (kendi `app_events` tablosu DEĞİL). Faz 0'da PostHog projesi açılacak ve mobile + web app'ten ilk event atılacak. Bu kısım kod tarafı, ayrı PR.

## Sıra

1. **Planning docs** (bu dosya, RBAC_MATRIX, EVENT_TAXONOMY) ← şu an
2. **0001_admin_foundation.sql** — admin auth + audit
3. **0002_articles_notifications.sql** — content + messaging
4. **0003_subscriptions.sql** — billing
5. **0004_support_kvkk.sql** — operations + compliance
6. **README + seed script** — nasıl uygulanır
7. **Migration'ları Supabase'de çalıştırma** (kullanıcı manuel veya Supabase CLI ile)
8. **PostHog kurulumu** (web + mobile event gönderimi)

Her batch'ten sonra duraklayıp kullanıcı onayı alınacak.

## Kabul Kriterleri

- [ ] 4 migration dosyası Supabase'de hatasız çalışıyor
- [ ] RLS test edildi: normal user kendi `tasks`'ını görüyor, başkasınınkini göremiyor
- [ ] Admin user `admin_users`'a manuel insert ile eklendi (sen)
- [ ] `audit_log` boş tablo olarak hazır, INSERT izni admin'lerde
- [ ] PostHog Cloud projesi açıldı, ilk `task_created` event'i göründü
- [ ] `SYSTEM_ARTICLES` (mevcut JS sabiti) `articles` tablosuna seed edildi

## Riskler

- **Schema yanlışsa Faz 1+ refactor:** Bu yüzden Faz 0'da acele etmeyeceğiz. Her tablo için kullanım senaryosu önce yazılacak.
- **RLS bypass:** Service-role key sadece sunucu tarafında, admin Next.js app'te env var olarak. Client'ta asla görünmeyecek.
- **Iyzico API farklılığı:** Schema Iyzico kolon isimleriyle hazır ama webhook handler Faz 3'te yazılacak.

## Faz 0'da YAPILMAYACAK

- Admin Next.js app'in kendisi (Faz 1'de)
- Iyzico API entegrasyonu (Faz 3'te)
- PostHog dashboard embed (Faz 2'de)
- Otomatik audit log trigger'ları her tabloda (önce manuel servis layer ile, sonra trigger)

## Sonraki Faz Hazırlığı

Faz 1 başlarken ihtiyaç duyulacak:
- `admin_users` tablosunda en az 1 owner (sen)
- `articles` tablosunda mevcut `SYSTEM_ARTICLES` taşınmış
- RBAC matrisi onaylanmış
- Supabase service-role key güvenli yerde (env var)
- PostHog write key ve project ID hazır
