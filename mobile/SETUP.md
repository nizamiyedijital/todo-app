# Disiplan Mobile — Geliştirme & Dağıtım

React Native + Expo SDK 54. Tek codebase'den iOS + Android.

## İlk kurulum (yeni cihazda)

```sh
cd mobile
npm install

# Çevre değişkenlerini hazırla
cp .env.example .env
# .env içindeki SUPABASE/POSTHOG değerlerini doldur (admin/.env.local ile aynı proje)

# Geliştirme — Expo Go ile (hızlı iterasyon)
npm start
# → telefonda Expo Go aç, QR kod tarat
```

## Geliştirme akışı

| Komut | Ne yapar |
|---|---|
| `npm start` | Metro bundler — Expo Go ile bağlantı, hot reload |
| `npm run ios` | iOS simülatör (macOS, Xcode kurulu olmalı) |
| `npm run android` | Android emülatör (Android Studio gerekir) |
| `npm run web` | Tarayıcıda preview |
| `npx tsc --noEmit` | Type check |

## EAS Build (standalone .ipa / .apk üretimi)

Expo Go ile sınırlı kalmak yerine **EAS Build** ile gerçek native binary
üretip TestFlight/Play Store'a yüklenebilir.

### Bir kerelik kurulum

```sh
npm install -g eas-cli
eas login                    # Expo hesabıyla
eas init                     # mobile/ içinde — projectId üretir
                             # app.json'a otomatik yazılır
```

### Build profilleri (eas.json)

3 profil tanımlı:

| Profil | Kullanım | Çıktı |
|---|---|---|
| `development` | Native module test (Expo Go yetmiyorsa) | iOS simulator + Android APK, dev client |
| `preview` | Internal test (kendi telefonuna) | iOS .ipa (sideload) + Android APK |
| `production` | App Store / Play Store | iOS App Store build + Android .aab |

### Komutlar

```sh
# Preview build (kendi telefonuna kurman için, ücretsiz)
eas build --profile preview --platform android   # APK çıkar
eas build --profile preview --platform ios       # iOS .ipa (Apple Dev hesabı gerekir)

# Production build (mağazaya gidecek)
eas build --profile production --platform all

# Mağazaya yükle
eas submit --profile production --platform ios
eas submit --profile production --platform android
```

## Dağıtım önkoşulları

### iOS — App Store
- Apple Developer Program ($99/yıl) — Türkiye'den TC ile başvuru
- App Store Connect'te uygulama kaydı (bundle ID: `com.gun3.mobile`)
- `eas.json` → `submit.production.ios.ascAppId` doldurulmalı

### Android — Play Store
- Google Play Developer hesabı ($25, tek seferlik)
- Service account JSON (Play Console → Setup → API access)
- `eas.json` → `submit.production.android.serviceAccountKeyPath`

### OTA (Over-the-Air) güncellemeler
JS değişiklikleri için her seferinde mağaza review beklemek yerine:

```sh
eas update --branch production --message "Bug fix: yıldızlama event'i"
```

Native değişiklik (yeni dependency, app.json değişimi) yoksa anında push.

## Gizli anahtarlar

- `.env` lokal — gitignored, EAS Build'e otomatik aktarılmaz
- EAS Build için: `eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "..."`
- Tüm `EXPO_PUBLIC_*` değişkenler EAS secret olarak set edilmeli

## Sorun giderme

**"Network request failed"** → `.env` doldurulmamış veya yanlış URL.

**Expo Go'da çalışıyor, EAS Build'de çakılıyor** → genelde environment
variable EAS secret'a eklenmemiş.

**iOS simulator açılmıyor** → `xcode-select --install` + Xcode aç bir kere.

**Native module hatası** → `expo prebuild --clean` ile native projeyi
yeniden üret.
