# RBAC Matrisi — Disiplan Admin Panel

## Roller

| Rol | Tanım | Tipik kullanıcı |
|---|---|---|
| **owner** | Her şey, audit'i bile silebilir (ama silmez) | Sen |
| **admin** | Owner hariç her şey, ayar değiştirebilir, kullanıcı silebilir | Kurucu ortak / CTO |
| **support** | Kullanıcı görüntüler, ticket yönetir, plan değiştiremez | Destek personeli |
| **content_editor** | Sadece makale ve bildirim CRUD | İçerik editörü |
| **analyst** | Sadece okuma — analitik, kullanıcı listesi (PII kısıtlı), abonelik özet | Pazarlama / analiz |

## Permission Matrisi

Her hücre: **R**ead, **W**rite (create/update), **D**elete, **—** (yok).

| Resource | owner | admin | support | content_editor | analyst |
|---|:---:|:---:|:---:|:---:|:---:|
| `users` (kullanıcı listesi) | RWD | RWD | RW | — | R (PII maskeli) |
| `users.notes` (admin notları) | RWD | RWD | RW | — | R |
| `users.impersonate` | — | — | — | — | — |
| `articles` | RWD | RWD | R | RW | R |
| `notification_campaigns` | RWD | RWD | R | RW | R |
| `notification_campaigns.send` | W | W | — | W | — |
| `subscriptions` | RWD | RW | R | — | R |
| `subscriptions.refund` | W | W | — | — | — |
| `payments` | R | R | R | — | R |
| `support_tickets` | RWD | RWD | RW | — | R |
| `audit_log` | R | R | R | — | R (own actions only) |
| `admin_users` (rol yönetimi) | RWD | R | — | — | — |
| `app_settings` | RW | RW | — | — | R |
| `feature_flags` | RW | RW | — | — | R |
| `data_export_requests` | RW | RW | RW | — | — |
| `data_deletion_requests` | RW | RW | — | — | — |
| `analytics` (PostHog) | R | R | R | R | R |

## Özel Kurallar

1. **Impersonation kapalı** (KVKK + audit yükü). Faz 2+ tartışılır, şimdilik kimse kullanıcı yerine giriş yapamaz.
2. **`audit_log.delete` hiçbir rolde yok.** Owner UI'da silebileceği bir yer görmez. Acil durumda direkt SQL.
3. **`analyst` rolü PII maskeli görür:** email → `y***@gmail.com`, isim → ilk harfler. Bu uygulama katmanında yapılır (DB değil).
4. **`refund` ayrı izin:** Subscriptions'ı görmek başka, iade yapmak başka. Owner+admin only.
5. **`content_editor` makale yayınlayabilir** ama kullanıcıya hiçbir bildirim gönderemez (notification_campaigns.send ayrı).
6. **Owner rolü tek kişiye verilir.** İkinci owner gerekirse owner kendi UI'dan başkasını owner yapar (ama kendini owner'dan çıkaramaz — son owner kuralı).

## Implementation Notu

- DB tarafında: `admin_users.role` enum + RLS politikası "rol owner/admin ise yaz, diğerleri okuma" gibi geniş kural
- Detaylı (resource × action) kontrol uygulama katmanında (`hasPermission(user, 'subscriptions.refund')`) helper'ı
- RLS = ilk savunma, app layer = ikinci savunma
- Her permission denied → `audit_log`'a `permission_denied` kaydı

## Karar Defteri (Onaylandı 2026-05-05)

- ✅ **`analyst` rolü Faz 1'de tanımlı** — kullanıcı eklenmeyecek başta, enum'da hazır
- ✅ **`content_editor` Faz 1'de tanımlı** — kullanıcı eklenmeyecek başta
- ✅ **Çoklu rol destekleniyor** — bir admin'in birden fazla rolü olabilir, effective permission = tüm rollerin union'ı

## Çoklu Rol Şema Etkisi

`admin_users` tablosunda tek `role` kolonu yerine ayrı join table:

```
admin_users (id, user_id, status, created_at, last_login_at)
admin_user_roles (admin_user_id, role, granted_at, granted_by)
  PRIMARY KEY (admin_user_id, role)
```

**Effective permission hesabı:**
```ts
function hasPermission(adminUserId, resource, action) {
  const roles = getRoles(adminUserId)  // ['support', 'content_editor']
  return roles.some(r => RBAC[r][resource]?.includes(action))
}
```

**Özel kurallar (çoklu rol ile):**
- `owner` rolü hala tek kişiye verilir (son owner kuralı)
- `owner` zaten god-mode olduğu için ek rol vermenin anlamı yok ama yasak değil
- Audit log'da rol bazlı değil, **kullanıcı bazlı** kayıt: "yakup@... şu işlemi yaptı" — hangi rol yetkisiyle olduğu da loglanır
