/**
 * Crisp Chat SDK wrapper — mobil için (Faz 4.B mobile parity).
 *
 * Web'deki dpCrispIdentify / dpCrispReset pattern'iyle aynı kontrat.
 *
 * NOT: Crisp SDK Expo Go'da çalışmaz — development/preview build gerekir.
 * Statik `import` statement'ı Expo Go'da modül load anında crash ettirir
 * ("Cannot find native module 'ExpoCrispSdk'"), bu yüzden modül LAZY
 * require ile yüklenir ve hata sessizce yutulur. Native build'de SDK
 * normal şekilde çalışır.
 */
import type { SubscriptionState } from '../state/store';

const WEBSITE_ID = '207f8235-63fa-424e-a7c4-37677d901e5f';

let _crisp: any = null;
let _loadAttempted = false;
let _configured = false;

function loadCrisp(): any {
  if (_loadAttempted) return _crisp;
  _loadAttempted = true;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    _crisp = require('crisp-sdk-react-native');
  } catch (e) {
    console.warn('[crisp] modül yüklenemedi (Expo Go olabilir):', (e as Error).message);
    _crisp = null;
  }
  return _crisp;
}

export function configureCrisp() {
  if (_configured) return;
  const m = loadCrisp();
  if (!m) return;
  try {
    m.configure(WEBSITE_ID);
    _configured = true;
  } catch (e) {
    console.warn('[crisp] configure failed (Expo Go olabilir):', (e as Error).message);
  }
}

export function crispIdentify(
  user: { id: string; email?: string | null; name?: string | null } | null,
  subscription?: SubscriptionState,
) {
  if (!_configured || !user) return;
  const m = loadCrisp();
  if (!m) return;
  try {
    if (user.email) m.setUserEmail(user.email);
    if (user.name) m.setUserNickname(user.name);
    if (subscription) {
      m.setSessionString('plan_code', subscription.plan_code);
      m.setSessionString('subscription_status', subscription.status);
    }
    m.setTokenId(user.id);
  } catch (e) {
    console.warn('[crisp] identify error:', (e as Error).message);
  }
}

export function crispReset() {
  if (!_configured) return;
  const m = loadCrisp();
  if (!m) return;
  try {
    m.setTokenId(null);
    m.resetSession();
  } catch (e) {
    console.warn('[crisp] reset error:', (e as Error).message);
  }
}

export function crispOpen() {
  if (!_configured) {
    console.warn('[crisp] not configured — Expo Go\'da SDK yüklenmedi');
    return;
  }
  const m = loadCrisp();
  if (!m) return;
  try {
    m.show();
  } catch (e) {
    console.warn('[crisp] open error:', (e as Error).message);
  }
}
