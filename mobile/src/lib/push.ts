/**
 * Faz 5.B.3 — Expo Push token kayıt/silme.
 *
 * App boot'ta veya login'de `registerPushToken()` çağrılır:
 *   1. Bildirim izni iste (var ise atla)
 *   2. Expo Push token al (projectId gerekli)
 *   3. push_tokens tablosuna upsert (token unique)
 *
 * Logout'ta `unregisterPushToken()` mevcut tokeni siler.
 *
 * NOT: Expo Go'da getExpoPushTokenAsync çalışır ancak bu token EAS
 * projectId ile bağlı olduğundan production push'lar yalnızca preview/
 * standalone build'de gerçek cihaza ulaşır. Expo Go test için yeterli.
 */
import * as Notifications from 'expo-notifications';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';

let _cachedToken: string | null = null;

function getProjectId(): string | null {
  const fromExpoConfig =
    (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas
      ?.projectId;
  const fromEasConfig = (Constants.easConfig as { projectId?: string } | undefined)?.projectId;
  return fromExpoConfig ?? fromEasConfig ?? null;
}

async function ensureNotifPermission(): Promise<boolean> {
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') return true;
    const { status: req } = await Notifications.requestPermissionsAsync();
    return req === 'granted';
  } catch {
    return false;
  }
}

/**
 * Login sonrası veya app boot'ta çağrılır. Token alınır + DB'ye upsert.
 * - Expo Go'da çalışır (test için OK)
 * - Native build'de tam push notification altyapısı
 * - userId yoksa (anon) atlanır
 */
export async function registerPushToken(userId: string | null | undefined): Promise<void> {
  if (!userId) return;
  if (Platform.OS === 'web') return; // web push başka akış (5.B.3+)

  try {
    const granted = await ensureNotifPermission();
    if (!granted) return;

    const projectId = getProjectId();
    const opts: Parameters<typeof Notifications.getExpoPushTokenAsync>[0] = projectId
      ? { projectId }
      : ({} as Parameters<typeof Notifications.getExpoPushTokenAsync>[0]);

    const tokenObj = await Notifications.getExpoPushTokenAsync(opts);
    const token = tokenObj?.data;
    if (!token) return;

    if (_cachedToken === token) return; // bu cihazda zaten kaydedilmiş

    const platform: 'ios' | 'android' =
      Platform.OS === 'ios' ? 'ios' : 'android';

    // Upsert by token (unique). Aynı cihaz başka bir kullanıcıda kullanıldıysa
    // user_id güncellenir, last_seen_at taze tutulur.
    const { error } = await supabase
      .from('push_tokens')
      .upsert(
        {
          user_id: userId,
          token,
          platform,
          last_seen_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'token' },
      );
    if (error) {
      console.warn('[push] register upsert:', error.message);
      return;
    }
    _cachedToken = token;
    const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
    if (isExpoGo) {
      console.log('[push] Expo Go ortamında token kaydedildi (test için)');
    }
  } catch (e) {
    console.warn('[push] register error:', (e as Error).message);
  }
}

/**
 * Logout'ta çağrılır. Bu cihazın token'ını DB'den siler.
 */
export async function unregisterPushToken(): Promise<void> {
  if (!_cachedToken) return;
  try {
    const { error } = await supabase
      .from('push_tokens')
      .delete()
      .eq('token', _cachedToken);
    if (error) console.warn('[push] unregister:', error.message);
  } catch (e) {
    console.warn('[push] unregister error:', (e as Error).message);
  } finally {
    _cachedToken = null;
  }
}
