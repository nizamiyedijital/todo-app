/**
 * Crisp Chat SDK wrapper — mobil için (Faz 4.B mobile parity).
 *
 * Web'deki dpCrispIdentify / dpCrispReset pattern'iyle aynı kontrat.
 * Configure App.tsx mount'ta tek seferlik (web crisp.js gibi).
 *
 * NOT: Crisp SDK Expo Go'da çalışmaz — development build veya prebuild gerekir.
 * Bu yüzden tüm çağrılar try/catch ile sarılı; native module yoksa sessizce no-op.
 */
import {
  configure,
  setUserEmail,
  setUserNickname,
  setSessionString,
  setTokenId,
  resetSession,
  show,
} from 'crisp-sdk-react-native';
import type { SubscriptionState } from '../state/store';

const WEBSITE_ID = '207f8235-63fa-424e-a7c4-37677d901e5f';

let _configured = false;

export function configureCrisp() {
  if (_configured) return;
  try {
    configure(WEBSITE_ID);
    _configured = true;
  } catch (e) {
    // Expo Go ortamında native module yok — sessizce atla
    console.warn('[crisp] configure failed (Expo Go olabilir):', (e as Error).message);
  }
}

export function crispIdentify(
  user: { id: string; email?: string | null; name?: string | null } | null,
  subscription?: SubscriptionState,
) {
  if (!_configured || !user) return;
  try {
    if (user.email) setUserEmail(user.email);
    if (user.name) setUserNickname(user.name);
    if (subscription) {
      setSessionString('plan_code', subscription.plan_code);
      setSessionString('subscription_status', subscription.status);
    }
    setTokenId(user.id);
  } catch (e) {
    console.warn('[crisp] identify error:', (e as Error).message);
  }
}

export function crispReset() {
  if (!_configured) return;
  try {
    setTokenId(null);
    resetSession();
  } catch (e) {
    console.warn('[crisp] reset error:', (e as Error).message);
  }
}

export function crispOpen() {
  if (!_configured) {
    console.warn('[crisp] not configured — Expo Go\'da SDK yüklenmedi');
    return;
  }
  try {
    show();
  } catch (e) {
    console.warn('[crisp] open error:', (e as Error).message);
  }
}
