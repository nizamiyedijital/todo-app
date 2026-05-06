# Crisp Webhook (Faz 4.B.2.1)

Crisp chat → Disiplan `support_tickets` ingestion. Kullanıcı Crisp widget'ında
mesaj attığında bu Edge Function devreye girer, otomatik ticket oluşturur veya
mevcut ticket'a yeni mesaj ekler.

## Deploy

```sh
# 1) Supabase CLI kur (bir kere)
brew install supabase/tap/supabase
supabase login

# 2) Projeyi link'le
cd supabase
supabase link --project-ref uzkscrrqyxftbtwkiyra

# 3) Webhook secret'ı set et (Crisp dashboard'dan al — bkz aşağı)
supabase secrets set CRISP_WEBHOOK_SECRET=<secret>

# 4) Deploy
supabase functions deploy crisp-webhook --no-verify-jwt
# URL: https://uzkscrrqyxftbtwkiyra.supabase.co/functions/v1/crisp-webhook
```

## Crisp dashboard kurulumu

1. https://app.crisp.chat → Workspace → **Settings** → **Web hooks**
2. **Configure web hooks** → URL gir:  
   `https://uzkscrrqyxftbtwkiyra.supabase.co/functions/v1/crisp-webhook`
3. Events: **`message:send`** seç (en azından bunu, sonra genişletilebilir)
4. **Save** → secret görüntülenir → kopyala → Supabase secrets'a yaz (yukarıdaki step 3)

## Test

```sh
# Crisp dashboard → Sohbetler → kendi widget'ından mesaj at
# Saniyeler içinde /admin/support'ta yeni ticket görmeli (source=crisp)

# Manuel test (curl):
curl -X POST https://uzkscrrqyxftbtwkiyra.supabase.co/functions/v1/crisp-webhook \
  -H 'Content-Type: application/json' \
  -d '{
    "event": "message:send",
    "website_id": "207f8235-63fa-424e-a7c4-37677d901e5f",
    "data": {
      "session_id": "session_test_123",
      "from": "user",
      "type": "text",
      "content": "Test mesajı",
      "user": { "user_id": "test@example.com", "nickname": "Test User" }
    },
    "timestamp": 1700000000000
  }'
# CRISP_WEBHOOK_SECRET set edilmişse signature header gerekli
```

## Reverse direction (admin → Crisp)

Admin `/admin/support`'ta cevap yazınca, ticket `source=crisp` ise
`admin/lib/crisp.ts` üzerinden Crisp REST API'ya POST gider, kullanıcı
widget'ında cevabı görür. Bunun için ek env:

```
CRISP_WEBSITE_ID=207f8235-63fa-424e-a7c4-37677d901e5f
CRISP_API_IDENTIFIER=<plugin token identifier>
CRISP_API_KEY=<plugin token key>
```

Plugin token: https://marketplace.crisp.chat → "Create plugin" → workspace
bağla → identifier+key ver.

## Olası genişletmeler

- `session:set_email` event'i — kullanıcı widget'ta email yazınca user_id
  güncelle, mevcut Disiplan kullanıcısıyla eşle (auth.users.email lookup)
- `message:received` (operator → user) — admin Crisp dashboard'undan cevap
  yazarsa Disiplan support_messages'a yaz (admin reply'ı zaten admin
  panelinden geliyorsa duplicate olur, bu yüzden filter gerek)
- `session:request:initiated` — chat başlamadan ticket aç (proactive UX)
