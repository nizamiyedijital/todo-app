# Event Taxonomy — Disiplan

PostHog Cloud'a gönderilecek event isimleri ve property standartları. **Bu liste sabittir** — yeni event eklemek için bu dokümana önce yazılır, sonra kod yazılır.

## İsimlendirme Kuralları

- `snake_case`, fiil + nesne sırası: `task_created`, NOT `createTask` veya `TaskCreated`
- Geçmiş zaman: olay olduktan sonra → `task_completed` (NOT `task_complete`)
- Domain prefix yok (mobile vs web fark etmez): `task_created` her iki platformda aynı isim
- Property'ler de `snake_case`: `task_id`, `from_screen`, `is_subtask`

## Common Properties (her event'te gönderilen)

| Property | Örnek | Açıklama |
|---|---|---|
| `distinct_id` | uuid | Supabase user.id (PostHog'un identify ile bağlı) |
| `$current_url` | otomatik | PostHog SDK ekler |
| `platform` | `web` / `mobile_ios` / `mobile_android` | Manuel set |
| `app_version` | `1.4.2` | Manuel set |
| `session_id` | uuid | Manuel set, oturum başında üretilir |

## Event Listesi (Faz 0 — kanonik liste)

### Auth & Onboarding
| Event | Property | Ne zaman |
|---|---|---|
| `user_signed_up` | `method` (email/google), `referral_source` | Yeni kayıt başarılı |
| `user_logged_in` | `method` | Her login |
| `user_logged_out` | — | Logout |
| `onboarding_started` | — | Onboarding ilk ekran |
| `onboarding_completed` | `steps_completed` | Onboarding bitti |
| `first_task_created` | `task_id` | Kullanıcının ilk görevi (sadece bir kez tetikler) |

### Görev (Task)
| Event | Property | Ne zaman |
|---|---|---|
| `task_created` | `task_id`, `list_id`, `has_due_date`, `has_duration`, `is_subtask` | Görev oluşturuldu |
| `task_completed` | `task_id`, `time_to_complete_min`, `was_starred` | Tamamlandı işaretlendi |
| `task_uncompleted` | `task_id` | Tamamlandı geri alındı |
| `task_postponed` | `task_id`, `postpone_count` | Tarih ileriye atıldı |
| `task_deleted` | `task_id`, `was_completed` | Silindi |
| `task_starred` | `task_id` | Yıldızlandı (Günün Odağı) |
| `task_unstarred` | `task_id` | Yıldızı kaldırıldı |
| `subtask_added` | `parent_task_id` | Alt görev eklendi |
| `task_dragged_to_calendar` | `task_id`, `target_day`, `target_hour` | Drag-drop ile haftalık plana atıldı |

### Liste (List)
| Event | Property | Ne zaman |
|---|---|---|
| `list_created` | `list_id`, `icon`, `color` | Yeni liste |
| `list_renamed` | `list_id` | İsim değişti |
| `list_deleted` | `list_id`, `task_count` | Liste silindi |

### Denge & Pomodoro
| Event | Property | Ne zaman |
|---|---|---|
| `pomo_started` | `task_id`, `duration_min` | Pomodoro başladı |
| `pomo_completed` | `task_id`, `actual_duration_min` | Pomodoro tamamlandı |
| `pomo_cancelled` | `task_id`, `elapsed_min` | İptal edildi |
| `daily_focus_selected` | `task_id` | Günün Odağı seçildi |
| `balance_state_viewed` | `state` (zihin/beden/ruh/dengesiz/tam) | Denge ekranı açıldı |

### İçerik (Articles & Notifications)
| Event | Property | Ne zaman |
|---|---|---|
| `article_opened` | `article_id`, `from_screen` | Makale açıldı |
| `article_completed` | `article_id`, `read_time_sec` | Sona kadar scroll edildi |
| `notification_sent` | `notification_id`, `campaign_id`, `delivery_method` (push/email/in-app) | Sunucu tarafı |
| `notification_opened` | `notification_id`, `campaign_id` | Bildirime tıklandı |
| `notification_dismissed` | `notification_id` | Kapatıldı, açılmadı |

### Subscription & Payment
| Event | Property | Ne zaman |
|---|---|---|
| `pricing_page_viewed` | `from_screen` | Fiyatlandırma sayfası |
| `checkout_started` | `plan_id`, `interval` (monthly/yearly) | Ödemeye başladı |
| `subscription_started` | `plan_id`, `amount`, `currency`, `interval` | İlk başarılı ödeme |
| `subscription_renewed` | `plan_id`, `renewal_count` | Yenileme başarılı |
| `subscription_cancelled` | `plan_id`, `reason`, `lifetime_value` | İptal etti |
| `payment_failed` | `plan_id`, `failure_reason`, `attempt_count` | Ödeme başarısız |
| `subscription_upgraded` | `from_plan`, `to_plan` | Plan yükseltme |
| `subscription_downgraded` | `from_plan`, `to_plan` | Plan düşürme |

### Destek
| Event | Property | Ne zaman |
|---|---|---|
| `support_ticket_created` | `category`, `from_screen` | Destek talebi açıldı |
| `support_chat_opened` | — | Crisp/destek chat açıldı |

### Feature Usage (Faz 2'de doldurulacak — placeholder)
| Event | Property | Ne zaman |
|---|---|---|
| `feature_used` | `feature_name` | Genel özellik kullanımı (DTP, drag-drop, vb.) |

## Yasaklananlar

- ❌ Kişisel veri property olarak (email, full name) → `distinct_id` zaten user.id
- ❌ Görev başlığı / not içeriği → privacy
- ❌ Free-form string property → enum kullan, "buton1" / "btn-1" / "BUTTON_ONE" kaosu olur
- ❌ Çok yüksek kardinaliteli property (timestamp her event farklı) → PostHog'un dashboard'unu çöker

## Identify / Alias

- Kullanıcı login olduğunda `posthog.identify(user.id, { plan, signup_date, total_tasks })` çağrılır
- Anonymous → identified geçişte `posthog.alias(anonymousId, user.id)` ile session bağlanır
- Logout sonrası `posthog.reset()` ile distinct_id sıfırlanır

## Implementation Sırası (Faz 0 sonu)

1. PostHog Cloud projesi aç → write key al
2. Web (`index.html`) `<script>` snippet → `task_created`, `task_completed`, `user_logged_in` üçü ile başla
3. Mobile (`mobile/`) `posthog-react-native` SDK → aynı 3 event
4. 1 hafta veri topla, dashboard'da görüldüğünü doğrula
5. Geri kalan event'ler Faz 2 başlangıcında eklenecek

## Versiyonlama

Bu doküman değişirse:
- Yeni event eklemek: liste sonuna ekle, ilgili koda eklenir
- Var olan event ismini değiştirmek: ❌ YAPMA, yenisini ekle, eskisini deprecated işaretle
- Property eklemek: tabloya yaz, geriye uyumlu (eski event'ler property olmadan da geçerli)

Versiyon: 0.1 (Faz 0)
