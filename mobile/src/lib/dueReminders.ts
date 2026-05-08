/**
 * Bitiş tarihi hatırlatıcısı — appSettings.dueReminder seçimine göre
 * her due_at olan görev için lokal scheduled notification.
 *
 * Web parity (index.html:14081 scheduleReminders) — web'de Notification API
 * + setTimeout ile, mobile'da expo-notifications.scheduleNotificationAsync
 * ile native scheduler. Cihaz uyku/kapalıyken bile fire eder.
 *
 * Yapı: notification identifier = `due_${taskId}` — by convention sabit.
 * Cancel/yeniden schedule için AsyncStorage'a gerek yok.
 *
 * Çağrı yerleri (data.ts):
 *  - createTask sonrası → syncDueReminder
 *  - patchTask sonrası (due_at/done değiştiyse) → syncDueReminder
 *  - deleteTask sonrası → cancelDueReminder
 *  - toggleTaskDone (done→true) → cancelDueReminder
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getAppSettings, DueReminder } from './appSettings';

const ID_PREFIX = 'due_';

const OFFSET_MS: Record<DueReminder, number> = {
  none:    0,
  '30min':       30 * 60 * 1000,
  '1hour':   1 * 60 * 60 * 1000,
  '3hour':   3 * 60 * 60 * 1000,
  '12hour': 12 * 60 * 60 * 1000,
  '1day':   24 * 60 * 60 * 1000,
};

function notificationId(taskId: string): string {
  return ID_PREFIX + taskId;
}

export async function cancelDueReminder(taskId: string): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId(taskId));
  } catch { /* yoksay — schedule edilmemiş olabilir */ }
}

/**
 * Görev oluşturma/güncelleme sonrası çağrılır. Mevcut scheduled iptal edilir,
 * koşullar uyuyorsa yenisi schedule edilir.
 *
 * Schedule etmeme koşulları:
 *  - Platform web (zaten reminderlar mobile-spesifik)
 *  - notifEnabled false (master kapalı)
 *  - dueReminder 'none'
 *  - due_at yok
 *  - done true (tamamlanmış görev hatırlatılmaz)
 *  - hesaplanan trigger zamanı geçmişte
 */
export async function syncDueReminder(
  taskId: string,
  dueAtIso: string | null | undefined,
  done: boolean,
  taskText: string | null | undefined,
): Promise<void> {
  if (Platform.OS === 'web') return;
  await cancelDueReminder(taskId);

  const settings = getAppSettings();
  if (!settings.notifEnabled) return;
  if (settings.dueReminder === 'none') return;
  if (!dueAtIso) return;
  if (done) return;

  const offset = OFFSET_MS[settings.dueReminder] ?? 0;
  if (!offset) return;

  const dueMs = new Date(dueAtIso).getTime();
  if (Number.isNaN(dueMs)) return;
  const triggerMs = dueMs - offset;
  if (triggerMs <= Date.now() + 1_000) return; // çok yakın veya geçmiş

  try {
    await Notifications.scheduleNotificationAsync({
      identifier: notificationId(taskId),
      content: {
        title: 'Bitiş tarihi yaklaşıyor',
        body:  taskText?.trim() || 'Görevin bitişine az kaldı',
        data:  { task_id: taskId, kind: 'due_reminder' },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(triggerMs) },
    });
  } catch (e) {
    console.warn('[dueReminders] schedule failed', (e as Error).message);
  }
}

/**
 * Kullanıcı dueReminder offset'ini değiştirdiğinde çağrılabilir — tüm
 * görevler için mevcut schedule'ları temizler ve store'daki due_at'lı,
 * tamamlanmamış görevler için yeniden schedule eder.
 */
export async function rescheduleAllDueReminders(
  tasks: Array<{ id: string; due_at: string | null; done: boolean; text: string | null }>,
): Promise<void> {
  if (Platform.OS === 'web') return;
  // Tüm scheduled'ları gez ve due_ prefix'lileri iptal et
  try {
    const all = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of all) {
      if (n.identifier.startsWith(ID_PREFIX)) {
        await Notifications.cancelScheduledNotificationAsync(n.identifier);
      }
    }
  } catch { /* yoksay */ }

  for (const t of tasks) {
    await syncDueReminder(t.id, t.due_at, t.done, t.text);
  }
}
