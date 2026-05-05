# PostHog Dashboard'ları

PostHog Cloud (EU) hesabında Disiplan projesine ait dashboard'lar.

## Erişim

- **URL:** https://eu.posthog.com
- **Project:** `Disiplan`
- **Project key:** `phc_qPC4MNPJD9b49YGCfjJAKd23RRRQjkWaeXVySYXsCsnR` (public — repo'da hardcode)

## Hazır Dashboard'lar

### 1. Web Analytics (PostHog otomatik)
- URL: PostHog → Browse → Web analytics
- İçerik: Visitors, Page views, Sessions, Bounce rate, Channels, Device type, World map
- Kim için: Trafik genel bakışı, hızlı sağlık göstergesi

### 2. Disiplan — Genel Bakış (özel — Faz 2.A'da kuruldu)
- URL: PostHog → Dashboards → "Disiplan — Genel Bakış"
- 7 insight içerir:

| # | İnsight | Type | Kaynak |
|---|---|---|---|
| 1 | Yeni Kayıtlar | Trend (line) | `user_signed_up` last 7 days |
| 2 | Giriş Aktivitesi (Platform) | Trend (pie) | `user_logged_in` breakdown by `surface`, last 30 days |
| 3 | Haftalık Giriş Trendi | Trend (line) | `user_logged_in` last 7 days |
| 4 | Günlük Aktif Kullanıcı (DAU) | Trend (line) | PostHog hazır şablon (unique users by pageview, daily) |
| 5 | Haftalık Aktif Kullanıcı (WAU) | Trend (line) | PostHog hazır şablon |
| 6 | Büyüme Muhasebesi | Bar chart | PostHog hazır (new/returning/dormant) |
| 7 | Haftalık Kullanıcı Tutma | Cohort table | PostHog hazır retention |

> İsimler PostHog UI'da değişmiş olabilir; gerçek dashboard'ı kaynak kabul et.

## Faz 2.B'de Eklenecek (Disiplan-Spesifik Insight'lar)

**Önkoşul:** Aşağıdaki event'ler taxonomy'ye uygun şekilde implementasyona dahil edilmeli (Faz 2.B):
- Admin login → `user_logged_in` (admin app'te şu an sadece identify yapıyor, event yok)
- Mobile login (test edilmedi)
- Pricing/checkout flow event'leri (Faz 3 için)
- Task lifecycle event'leri (postpone, star, delete)

**Eklenecek insight'lar:**

| Soru | Insight türü | Konfigürasyon |
|---|---|---|
| Pro kullanıcılar ne kadar aktif? | DAU (filtered) | Property filter: `subscription_status = active` |
| Yeni kullanıcı 7g sonra retain mi? | Retention | Event: `task_created`, cohort: `user_signed_up` |
| Free → Pro dönüşüm funnel | Funnel | `pricing_page_viewed → checkout_started → subscription_started` |
| Mobile vs Web kullanım | DAU | Breakdown by `surface` (admin_panel hariç) |
| Kullanıcı başı görev sayısı | Trend | Event: `task_created`, math: `Average per user` |
| İlk gün onboarding | Funnel | `user_signed_up → first_task_created → balance_state_viewed` |
| En çok kullanılan özellikler | Trend | Event: `feature_used`, breakdown by `feature_name` |

## Standart Property'ler (Tüm Custom Event'lerde)

Web (`window.dpEvent`) ve mobile (`dpEvent`) helper'ları otomatik şu property'leri ekler:

| Property | Olası Değerler | Açıklama |
|---|---|---|
| `platform` | `web`, `mobile_ios`, `mobile_android` | Hangi cihaz |
| `surface` | `main_app`, `mobile_app`, `admin_panel` | Hangi UI yüzeyi |
| `app_version` | `1.0.0` | Versiyonlama |

Filter ve breakdown'larda bu property'ler kullanılabilir.

## Dashboard Bakım Notları

- **Insight isimleri** PostHog editöründe `Save` öncesi başlık alanına yazılmazsa default isim alır (`event_name count`). Sonradan `…` → `Rename` ile düzeltilir.
- **Hazır insight'ları dashboard'a eklemek:** sol menüden tıkla → sağ üstte `…` → `Add to dashboard` → ilgili dashboard seç.
- **Faz 2.B sonrası** bu doküman güncellenmeli — yeni insight'lar listeye eklenecek.

## Reverse Proxy (İleride — Faz 5/6)

PostHog UI'sinde "Ad blockers can drop 10-25% of events" uyarısı var. Çözüm: kendi domain'imizden reverse proxy.
- `analytics.disiplan.app` → `eu.i.posthog.com`'a forward
- Ad blocker'lar `posthog.com`'u engelliyor ama kendi subdomain'imizi engellemez
- Yapım: Cloudflare Worker veya Vercel rewrite
- Faz 6 (kurumsal kullanıcı sayısı arttığında) düşünülecek
