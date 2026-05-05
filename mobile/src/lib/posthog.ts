import { PostHog } from 'posthog-react-native';
import { Platform } from 'react-native';

const KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY;
const HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com';

let _client: PostHog | null = null;

function isEnabled() {
  return !!KEY;
}

/**
 * Tek PostHog client — App.tsx'te bir kere init edilir.
 * Key tanımlı değilse no-op (event gönderilmez).
 */
export function initPostHog(): PostHog | null {
  if (_client) return _client;
  if (!isEnabled()) {
    console.warn('[posthog] EXPO_PUBLIC_POSTHOG_KEY tanımlı değil — event gönderilmeyecek');
    return null;
  }
  _client = new PostHog(KEY!, {
    host: HOST,
    captureAppLifecycleEvents: true, // app open/background/close otomatik
    enableSessionReplay: false,
    flushAt: 5,
    flushInterval: 30_000,
  });
  return _client;
}

export function getPostHog(): PostHog | null {
  return _client ?? initPostHog();
}

/**
 * Disiplan event helper — her event'e platform + app_version + surface ekler.
 */
// PostHog SDK 'JsonType' istiyor; Record<string, any> ile cast'liyoruz
// (any propertyleri runtime'da JSON serialize edilir)
type PHProps = Record<string, unknown>;

export function dpEvent(name: string, properties: PHProps = {}) {
  const ph = getPostHog();
  if (!ph) return;
  ph.capture(name, {
    platform: Platform.OS === 'ios' ? 'mobile_ios' : 'mobile_android',
    app_version: '1.0.0',
    surface: 'mobile_app',
    ...properties,
  } as Parameters<typeof ph.capture>[1]);
}

export function dpIdentify(userId: string, properties: PHProps = {}) {
  const ph = getPostHog();
  if (!ph || !userId) return;
  ph.identify(userId, properties as Parameters<typeof ph.identify>[1]);
}

export function dpReset() {
  const ph = getPostHog();
  if (!ph) return;
  ph.reset();
}
