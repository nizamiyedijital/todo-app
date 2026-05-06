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

**Önkoşul (kod tarafı tamamlandı — Faz 2.B):**
- ✅ Admin login → `user_logged_in` (`admin/components/admin/posthog-provider.tsx`, tab başına 1× per user)
- ✅ Admin logout → `user_logged_out` (`admin/components/admin/topbar.tsx`)
- ✅ Web task lifecycle: `task_completed`/`uncompleted`, `task_postponed`, `task_starred`/`unstarred`, `task_deleted`, `task_dragged_to_calendar`, `daily_focus_selected`, `first_task_created` (`index.html`)
- ✅ Web liste lifecycle: `list_created`, `list_renamed`, `list_deleted` (`index.html`)
- ✅ Pomodoro: `pomo_started`, `pomo_completed`, `pomo_cancelled` (`index.html`)
- ✅ Denge: `balance_state_viewed` openStats() açılışında (`index.html`)
- ✅ Landing site: `assets/analytics.js` ile PostHog snippet — 11 sayfa (surface=`landing`)
- ✅ `pricing_page_viewed` (`landing/fiyatlandirma.html`)
- ✅ `support_ticket_created` iletişim formu submit (`landing/iletisim.html`)
- ✅ `feature_used` early access signup (`landing/erken-erisim.html`)
- ⏳ Mobile login (test edilmedi — mobile/ gitignore'da, ayrı fazda yapılacak)
- ⏳ Checkout flow event'leri (Faz 3 — `checkout_started`, `subscription_started` vb.)

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
| `surface` | `main_app`, `mobile_app`, `admin_panel`, `landing` | Hangi UI yüzeyi |
| `app_version` | `1.0.0` | Versiyonlama |

Filter ve breakdown'larda bu property'ler kullanılabilir.

## Faz 2.B Doğrulama Akışı

Event'lerin gerçekten gönderildiğini PostHog **Activity → Live events** stream'inden anlık doğrula. Sırayla:

### Admin (`localhost:3001/admin`)
1. Login ol → `user_logged_in` (`surface=admin_panel`, tab başına 1× per user.id)
2. Aynı sekmede menüleri gez → tekrar ateşlenmemeli
3. Sol-üstteki avatar → "Çıkış yap" → `user_logged_out`
4. Tekrar gir → `user_logged_in` yeniden gelir (logout flag'i temizliyor)

### Web ana app (`index.html`)
- **Görev oluştur** → `task_created` (+ kullanıcının ilk görevi ise `first_task_created`)
- **Görev kartındaki checkbox** → `task_completed` (`time_to_complete_min` dolu); tekrar tıkla → `task_uncompleted`
- **Yıldız butonu** → `task_starred` **+** `daily_focus_selected` (ikisi birden)
- **Görevi sağ paneldeki haftalık takvime sürükle** → `task_dragged_to_calendar`; aynı görevi ileri saate tekrar sürükle → ek olarak `task_postponed`
- **Sağ-tık menüden sil** → `task_deleted`
- **Sol sidebar'da liste oluştur/yeniden adlandır/sil** → `list_created` / `list_renamed` / `list_deleted`
- **Pomodoro paneli — 4 görev queue + Şimdi başlat** → countdown sonunda `pomo_started`; 25dk içinde iptal → `pomo_cancelled`; tamamlanırsa → `pomo_completed`
- **İstatistikler:** sol sidebar **alt** köşesindeki **profil avatar butonu** → açılan menüde **"İstatistikler"** (`analytics` ikonu) → `balance_state_viewed` (`state` property'si: `balanced` / `mental_heavy` / `physical_heavy` / `spiritual_heavy` / `empty` / `no_category`)

### Landing (`landing/*.html`)
- Herhangi bir sayfayı aç → `$pageview` (`surface=landing`)
- `fiyatlandirma.html` → ek olarak `pricing_page_viewed` (`from_screen` referrer'a göre)
- `iletisim.html` → form submit → `support_ticket_created` (`category` = seçilen başlık)
- `erken-erisim.html` → form submit → `feature_used` (`feature_name=early_access_signup`)

### Property doğrulaması
Live event detayında JSON property listesini aç. **Her event'te** olmalı: `platform`, `surface`, `app_version`, `distinct_id`. Eksik property görürsen taxonomy ile karşılaştır (`EVENT_TAXONOMY.md`).

### Yaygın sorunlar
| Belirti | Sebep | Çözüm |
|---|---|---|
| Live events boş | Ad blocker `posthog.com`'u engelliyor | Reverse proxy (aşağıda Faz 5/6) |
| Admin'de event gelmiyor | `NEXT_PUBLIC_POSTHOG_KEY` env var eksik | `admin/.env.local` kontrol et |
| Landing'de pageview gelmiyor | `analytics.js` cache | Hard refresh (Cmd+Shift+R) |
| `task_postponed` gelmiyor | Sadece **mevcut due_at** ileri taşındığında atılır | Önce due_at ata, sonra sürükle |

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
