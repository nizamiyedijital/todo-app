# Disiplan Admin Panel — Kapsamlı Araştırma & Mimari Önerileri

> **Tarih:** 2026-05-05
> **Durum:** Araştırma — uygulama kararı bekleniyor
> **Amaç:** Yüzlerce-binlerce kullanıcılı SaaS olarak büyürken, tüm operasyonu tek noktadan yöneten kapsamlı admin paneli için sektör standartlarını, en iyi uygulamaları ve Disiplan'a özel tercihleri belgeler.

---

## 1. Bütüncül Resim — Modern SaaS Admin Panellerinin Anatomisi

Ticari bir SaaS uygulamasının admin paneli **6 temel sütun** üzerine oturur:

| Sütun | İçerik | Örnek Araçlar (Sektör) |
|-------|--------|------------------------|
| **Kullanıcılar** | Hesap yönetimi, segmentler, aktivite | Stripe Customers, Linear Users |
| **Para** | MRR/ARR, faturalama, refund, churn | Stripe Dashboard, Chargebee |
| **Ürün** | Kullanım metrikleri, feature flags, A/B | Posthog, Mixpanel, LaunchDarkly |
| **İçerik** | Makale, bildirim, email kampanyaları | Webflow CMS, Customer.io |
| **Operasyon** | Destek, sistem sağlığı, hata izleme | Intercom, Sentry, Datadog |
| **Yönetim** | Admin RBAC, denetim kayıtları, ayarlar | Stripe Team, Linear Workspace |

UX referans modeller:
- **Stripe Dashboard** — finans yönetiminde altın standart
- **Linear** — temiz, hızlı navigation
- **Vercel** — minimal modern
- **PostHog** — açık kaynak, herşey-bir-arada
- **Slack Admin** — kullanıcı yönetimi

---

## 2. Ana Dashboard — Tek Bakışta Sağlık Tablosu

### KPI Kartları (en üstte 6-8 adet)
- AKTİF KULLANICI (DAU)
- MRR (aylık tekrarlayan gelir)
- YENİ KAYIT (bugün/hafta/ay)
- CHURN (iptal oranı)
- DAU/MAU oranı (engagement)
- GÜNLÜK ÖDEME (cash flow)
- FREE→PRO CONVERSION
- SUNUCU SAĞLIĞI (uptime)

### Grafikler
- **Gelir grafiği** — son 30/90 gün, area chart
- **Kullanıcı büyümesi** — kayıt + iptal, stack chart
- **DAU çizgisi** — 30 günlük trend
- **Funnel** — Ziyaretçi → Kayıt → Aktif → Pro

### Sağ panel — Aktivite Akışı (real-time)
- Son ödemeler, yeni kayıtlar, iptal olaylar

---

## 3. Kullanıcı Yönetimi

### Liste Görünümü
- Filtreler: Plan / Durum / Kayıt tarihi / Ülke / Cihaz
- Sütunlar: Avatar, Ad, E-posta, Plan, MRR katkısı, Son giriş, Toplam görev
- Toplu işlemler: E-posta, Plan değiştir, Yasakla, Veri ihraç et
- Arama: E-posta/ad/ID/Stripe customer ID

### Kullanıcı Detay Sayfası
- **Özet**: Toplam ödenen, LTV tahmini, DAU score
- **Aktivite**: Görev / pomodoro / makale okuma sayıları
- **Abonelik**: Plan, sonraki ödeme, payment method
- **İşlemler**: E-posta gönder, Plan değiştir, Refund, Pasifleştir

### "Impersonate" Özelliği (destek için kritik)
- Admin "kullanıcının yerine giriş" → bug'u kullanıcı gibi görür
- Audit log tutulur, süre sınırlı (10 dk)

---

## 4. Para — Finans & Faturalandırma

### 4.1 Ödeme Altyapısı Karşılaştırması (Türkiye)

| Sağlayıcı | Komisyon | Türkiye Avantaj | Dezavantaj |
|-----------|----------|-----------------|------------|
| **Iyzico** | %2.5-3.5 + ₺0.25 | BKM Express, taksit, KOBI dostu | Subscription mantığı ek iş |
| **PayTR** | %1.99-2.99 + ₺0.49 | Düşük komisyon, hızlı entegrasyon | Sınırlı uluslararası |
| **Stripe** | %2.9 + ₺0.30 | Subscription billing built-in, dünya çapı | Türkiye'de tam yerleşim 2024+ |
| **Paddle** | %5 + ₺0.50 | **Merchant of Record** — vergi/KDV onlar halleder | Yüksek komisyon ama vergi yok |
| **LemonSqueezy** | %5 + ₺0.50 | MoR, modern UX, hızlı setup | Türkiye fiyatlandırma sınırlı |

**Önerim:** Başlangıç → **Iyzico veya PayTR**, büyüdükçe **Paddle** (uluslararası + vergi yükünden kurtulma).

### 4.2 Ücretlendirme Planı Önerisi

**Ücretsiz (Forever)**
- 50 görev/ay, 1 liste, temel takvim, istatistik yok

**Pro — ₺99/ay veya ₺990/yıl (-%17)**
- Sınırsız görev/liste, pomodoro stat, tema, bildirimler, priority destek

**Lifetime — ₺2.999 / tek seferlik**
- Pro her şey, ömür boyu, erken kayıt bonus özellikleri

### 4.3 Faturalama & Vergi (Türkiye)

**Yasal yükümlülükler:**
- e-Arşiv Fatura (B2C)
- e-Fatura (B2B)
- KDV %20 (dijital hizmet)
- KVKK uyumluluğu

**Çözümler:**
- Parasut, Logo İşbaşı, Bizim Hesap (e-fatura entegrasyonları)
- Stripe Tax (otomatik vergi)
- Paddle (MoR — vergi tamamen onlarda)

### 4.4 Finans Dashboard
- MRR breakdown (Pro/Team/Lifetime)
- Cohort analizi (kayıt ayına göre değer)
- Churn & Retention
- Failed payments + dunning
- Refunds (sebepleriyle)
- LTV / CAC oranı
- Discount kuponları yönetimi

---

## 5. Ürün Analitiği

### Disiplan'a özel metrikler

| Metrik | Hedef Aralık |
|--------|--------------|
| DAU/MAU | 50%+ (verimlilik aracı için) |
| Avg session | 8-15 dk |
| Tasks/user/day | 5-15 |
| Pomodoro completion | 65%+ |
| Streak length | 7+ gün |
| Aha-moment time | <5 dk |

### Cohort + Funnel
```
Landing visit (10.000)
  → Sign up (1.200) — %12
    → 1. görev oluşturdu (980) — %82
      → 7. gün hala aktif (640) — %65
        → Pro yükseltti (52) — %8
```

### Önerilen Araçlar
- **PostHog** — open source, self-host edilebilir
- **Mixpanel** — event tracking standardı
- **Plausible** (web) + **PostHog** (app) kombinasyonu

---

## 6. Web Sitesi & Pazarlama Analitiği

### Landing & SEO Metrikleri
- Trafik (kaynak, coğrafya, cihaz)
- Conversion (visitor → signup)
- A/B test sonuçları
- Search Console (impressions, clicks, top queries)
- Backlink profili

### Pazarlama Modülü Bileşenleri
- Email kampanyaları (onboarding, winback, newsletter)
- Push notification (segment bazlı)
- Affiliate / referral program
- A/B test (pricing, onboarding)

### KVKK Uyumlu Araçlar
- **Plausible Analytics** — privacy-first
- **Cloudflare Web Analytics** — ücretsiz, server-side
- **GA4** — kapsamlı (consent banner gerek)

---

## 7. İçerik Yönetimi (CMS) — Disiplan'a Özel

### "Haftalık Disiplan" Makale Yönetimi
- Yeni makale ekle (rich editor, ISBN ile kapak otomatik)
- Yayın takvimi (önümüzdeki 12 hafta)
- Hedef kitle (Free/Pro/30+ gün üye)
- Performans (açılma, okuma süresi, "Aç" tıklama)
- Versiyonlama (taslak → yayın → arşiv)
- Yerelleştirme (TR/EN)

### Bildirim Yönetimi
- Anlık push gönder (segment/belirli kullanıcı)
- Schedule
- Şablon kütüphanesi
- A/B test (başlık varyasyonları)

### Onboarding & Help Center
- In-app tour (Shepherd.js / Intro.js)
- Welcome email sequence (5 günlük drip)
- FAQ + bilgi tabanı
- Search analytics

---

## 8. Operasyon & Sistem Sağlığı

### Sunucu/Altyapı Monitoring
- Uptime %99.9+ hedef
- API response time (p50/p95/p99)
- Error rate (4xx/5xx)
- Database slow queries
- Storage usage

### Hata İzleme
- Sentry (veya GlitchTip self-hosted)
- Slack/Discord webhook entegrasyonu

### Maliyet Tahmini (1.000 kullanıcı için)

| Kalem | Aylık |
|-------|-------|
| Supabase Pro | $25-100 |
| Domain + email (Resend) | $20-50 |
| CDN (Cloudflare) | $0-20 |
| Sentry / monitoring | $0-50 |
| Push (Firebase / Web Push) | $0-20 |
| Backup storage | $5-15 |
| **Toplam altyapı** | **$50-300/ay** |

Kullanıcı başına maliyet: **~$0.05-0.30/kullanıcı/ay**.
Pro plan ₺99 ($3) → marj çok yüksek (~%90).

---

## 9. Ekip Yönetimi & Güvenlik

### Admin Roller (RBAC)
- **Owner**: Her şey
- **Admin**: Para hariç her şey
- **Support**: Kullanıcı görür/destek verir
- **Analyst**: Sadece okuma
- **Content Editor**: Sadece makale/bildirim

### Audit Log
Her admin işlemi: tarih + admin + işlem + hedef.

### Güvenlik
- 2FA zorunlu (admin için)
- IP whitelist
- Login attempt monitoring
- Password policy
- Session yönetimi

### KVKK Compliance
- Veri ihraç (kullanıcı tüm verisini indirebilsin)
- Hesap silme (right to be forgotten)
- Cookie consent banner
- VERBİS kayıt

---

## 10. Teknoloji Yığını Önerileri

### Senaryo A — Hızlı Başlangıç (1-2 ay)
- **Retool / Forest Admin** ile Supabase üstüne instant admin
- Aylık ~$50-100 araç maliyeti
- **Best for**: <5.000 kullanıcı, hızlı validation

### Senaryo B — Custom Build (3-4 ay)
- **Next.js 14 + TypeScript + Tailwind + shadcn/ui + Tremor**
- TanStack Query/Table, Recharts
- 200-400 saat geliştirme
- **Best for**: 10.000+ kullanıcı, marka odaklı

### Senaryo C — Hibrit (önerilen)
- Faz 1: Supabase Studio + Retool
- Faz 2: Critical akışlar için custom Next.js
- Faz 3: Tam custom

---

## 11. Türkiye Pazarına Özel Notlar

- **Kart taksiti**: 3-12 ay, Iyzico/PayTR sunar
- **BKM Express**: Tek tıkla ödeme yaygın
- **EFT/Havale**: B2B için sık talep
- **WhatsApp destek**: TR'de e-posta yerine tercih edilir
- **KVKK**: VERBİS kayıt + açık rıza + veri işleme kayıtları
- **e-Arşiv/e-Fatura**: GİB entegrasyonu
- **6502 sayılı Tüketici Yasası**: 14 gün cayma hakkı

### Türk SaaS örnekleri (model)
- Iyzico, Insider, Hubilo, Robly
- Trendyol/Hepsiburada Marketplace admin

---

## 12. Öncelik Yol Haritası — Aşamalı Uygulama

### Faz 0 — Şimdi (Pre-launch hazırlık)
- [ ] Subscription tablosu + tier (Supabase)
- [ ] Stripe veya Iyzico entegrasyonu (sandbox)
- [ ] KVKK aydınlatma metni + cookie banner
- [ ] e-Arşiv fatura entegrasyonu (Parasut)
- [ ] Sentry + Plausible kurulumu

### Faz 1 — MVP Admin (1-2 ay)
- [ ] Dashboard (8 KPI kartı + 3 grafik)
- [ ] Kullanıcı listesi + arama + detay
- [ ] Manuel abonelik yönetimi
- [ ] Bildirim/makale gönderme arayüzü
- [ ] Audit log + Admin RBAC

### Faz 2 — Büyüme (2-4 ay)
- [ ] Cohort analizi
- [ ] Funnel & retention curves
- [ ] Email kampanya yöneticisi
- [ ] Coupon yönetimi
- [ ] A/B test altyapısı
- [ ] Help center CMS
- [ ] Customer support tickets

### Faz 3 — Optimizasyon (4-6 ay)
- [ ] Predictive churn modeli
- [ ] LTV/CAC otomatik
- [ ] Affiliate / referral
- [ ] Lokalizasyon
- [ ] Mobile admin app

---

## 13. Kararlaştırılması Gereken Stratejik Sorular

1. **Ödeme altyapısı**: Iyzico mu, PayTR mi, Paddle (MoR) mı?
2. **Plan yapısı**: 2 plan vs 3 plan vs Lifetime var mı?
3. **MoR kullanılsın mı?** (vergi yükü ↔ %5 komisyon)
4. **Admin tech stack**: Retool (hızlı) mu, Next.js (custom) mu?
5. **Hedef pazar**: Sadece Türkiye mi, global mi?
6. **Free tier limiti**: Ne kadar cömert? (50 vs 200 görev)
7. **Pazarlama bütçesi**: Var mı? CAC tahmini?
8. **Ekip büyüklüğü**: Tek başına mı? RBAC önemi değişir.
9. **Veri saklama süresi**: KVKK'ya göre kaç ay?
10. **Mobil app öncelik**: PWA mı, native mi?

---

## 14. Referans Linkler

**SaaS metrikleri:**
- ChartMogul Blog — https://chartmogul.com/blog
- ProfitWell / Paddle Studies
- "Lean Analytics" (Alistair Croll)

**Admin UI ilham:**
- Tremor.so — dashboard component library
- Tailwind UI Application templates
- Linear, Vercel, Stripe dashboard'ları

**Türkiye SaaS hukuku:**
- KVKK rehberi: kvkk.gov.tr
- GİB e-Fatura/e-Arşiv dokümanları

**Ödeme entegrasyonu:**
- Iyzico API: sandbox.iyzipay.com
- PayTR developer docs
- Stripe Billing docs

---

## 15. Sonraki Adım Önerim

Bu doküman bir **kavramsal harita**. Devam ederken:

**Plan A (Önerilen):** 13. bölümdeki 10 stratejik karara birer birer cevap verelim. Her bir kararı detaylı tartışıp belgeleyelim. Sonra **Teknik Özellik Spesifikasyonu** (TŞŞ) yazalım.

**Plan B:** Önce **MVP Admin (Faz 1)** için detaylı user story'ler.

**Plan C:** Önce **ödeme altyapısı seçimi** karşılaştırma demosu.
