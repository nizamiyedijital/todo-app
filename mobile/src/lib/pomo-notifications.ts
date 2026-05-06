/**
 * Pomodoro lokal bildirimleri — expo-notifications ile.
 * App background'a alınsa bile alarm çalsın (RN setTimeout pause olur).
 *
 * Push notification (uzaktan gelen) ayrı — bu sadece local schedule.
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

let _ready = false;
const SCHEDULED: { id: string; phase: 'work' | 'break' } | null = null;
let _scheduled: { id: string; phase: 'work' | 'break' } | null = null;

export async function ensurePomoNotifPermission(): Promise<boolean> {
  if (_ready) return true;
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let final = existing;
    if (existing !== 'granted') {
      const { status: req } = await Notifications.requestPermissionsAsync();
      final = req;
    }
    if (final !== 'granted') return false;
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('pomo', {
        name: 'Pomodoro',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#12A3E3',
      });
    }
    _ready = true;
    return true;
  } catch {
    return false;
  }
}

export async function schedulePomoEnd(
  durationMin: number,
  phase: 'work' | 'break',
  taskTitle?: string,
): Promise<string | null> {
  await ensurePomoNotifPermission();
  await cancelScheduledPomo();
  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: phase === 'work' ? '🍅 Pomo bitti' : '☕ Mola bitti',
        body: phase === 'work'
          ? `${taskTitle ? `"${taskTitle}" — ` : ''}Mola zamanı, 5 dk dinlen.`
          : 'Sıradaki göreve dön.',
        sound: 'default',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: durationMin * 60,
        channelId: 'pomo',
      } as any,
    });
    _scheduled = { id, phase };
    return id;
  } catch (e) {
    console.warn('[pomo] schedule failed', e);
    return null;
  }
}

export async function cancelScheduledPomo(): Promise<void> {
  if (!_scheduled) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(_scheduled.id);
  } catch {}
  _scheduled = null;
}
