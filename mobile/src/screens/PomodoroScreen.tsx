/**
 * Pomodoro — basit single-görev versiyonu (Sprint M3.2.A).
 *
 * Web'in 4-görev queue'su Sprint M3.2.B'ye atılır; şu an minimum:
 *   - Görev seç (yıldızlı/aktif görevlerden)
 *   - 25dk work başlat → expo-notifications ile alarm scheduled
 *   - Bitince UI 'Tamamlandı' + 'Mola başlat' sunar (5dk)
 *   - Manuel iptal pomo_cancelled event + bildirim cancel
 *
 * Background timer: setInterval AppState=background'da pause olur ama
 * scheduled notification gelir. UI dönülünce store'daki endMs ile zaman
 * yeniden hesaplanır (drift yok).
 */
import React, { useEffect, useState, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme/ThemeProvider';
import { useStore } from '../state/store';
import { dpEvent } from '../lib/posthog';
import { schedulePomoEnd, cancelScheduledPomo, ensurePomoNotifPermission } from '../lib/pomo-notifications';
import { toggleTaskDone } from '../lib/data';
import type { Todo } from '../types/db';

const WORK_MIN = 25;
const BREAK_MIN = 5;

export default function PomodoroScreen() {
  const nav = useNavigation();
  const { colors } = useTheme();
  const tasks = useStore(s => s.tasks);
  const pomo = useStore(s => s.pomo);
  const setPomo = useStore(s => s.setPomo);

  const [now, setNow] = useState(Date.now());
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 1sn tick — running'ken UI'ı güncelle
  useEffect(() => {
    if (pomo.status === 'running') {
      tickRef.current = setInterval(() => setNow(Date.now()), 1000);
      return () => { if (tickRef.current) clearInterval(tickRef.current); };
    }
  }, [pomo.status]);

  // Süre dolduğunda otomatik geçiş
  useEffect(() => {
    if (pomo.status !== 'running') return;
    if (now < pomo.endMs) return;
    // Süre doldu
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (pomo.phase === 'work') {
      dpEvent('pomo_completed', {
        task_id: pomo.taskId,
        actual_duration_min: pomo.durationMin,
      });
    }
    setPomo({ ...pomo, status: 'idle', phase: 'idle', endMs: 0 });
  }, [now, pomo, setPomo]);

  const candidates = tasks.filter(t => !t.parent_id && !t.done);
  const starredFirst = [
    ...candidates.filter(t => t.starred),
    ...candidates.filter(t => !t.starred),
  ].slice(0, 30);

  const activeTask = tasks.find(t => t.id === pomo.taskId);
  const remainSec = Math.max(0, Math.floor((pomo.endMs - now) / 1000));
  const mm = String(Math.floor(remainSec / 60)).padStart(2, '0');
  const ss = String(remainSec % 60).padStart(2, '0');
  const phaseLabel =
    pomo.phase === 'work' ? 'Çalışma' :
    pomo.phase === 'break' ? 'Mola' : 'Hazır';
  const phaseColor =
    pomo.phase === 'work' ? '#E9731C' :
    pomo.phase === 'break' ? '#22c55e' : colors.text3;

  async function startWork(task: Todo) {
    const ok = await ensurePomoNotifPermission();
    if (!ok) {
      Alert.alert(
        'Bildirim izni gerekli',
        'Pomo süresi dolduğunda alarm gelmesi için bildirim iznini açman gerekiyor (Ayarlar → Bildirimler).',
      );
    }
    const startMs = Date.now();
    const endMs = startMs + WORK_MIN * 60_000;
    setPomo({
      status: 'running', phase: 'work', taskId: task.id,
      startMs, endMs, durationMin: WORK_MIN,
    });
    void schedulePomoEnd(WORK_MIN, 'work', task.text);
    dpEvent('pomo_started', { task_id: task.id, duration_min: WORK_MIN });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }

  function startBreak() {
    const startMs = Date.now();
    const endMs = startMs + BREAK_MIN * 60_000;
    setPomo({
      status: 'running', phase: 'break', taskId: pomo.taskId,
      startMs, endMs, durationMin: BREAK_MIN,
    });
    void schedulePomoEnd(BREAK_MIN, 'break');
  }

  async function cancel(reason: 'cancel' | 'auto' = 'cancel') {
    if (pomo.status !== 'running') return;
    const elapsedMin = Math.max(0, Math.round((Date.now() - pomo.startMs) / 60_000));
    if (pomo.phase === 'work' && reason === 'cancel') {
      dpEvent('pomo_cancelled', { task_id: pomo.taskId, elapsed_min: elapsedMin });
    }
    await cancelScheduledPomo();
    setPomo({ status: 'idle', phase: 'idle', taskId: null, endMs: 0, startMs: 0, durationMin: 0 });
  }

  async function markTaskDone() {
    if (!activeTask) return;
    await toggleTaskDone(activeTask).catch(() => {});
    await cancel('auto');
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.header, { borderBottomColor: colors.border2 }]}>
        <TouchableOpacity onPress={() => nav.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text2} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Pomodoro</Text>
        <View style={{ width: 24 }} />
      </View>

      {pomo.status === 'running' ? (
        <View style={styles.runningWrap}>
          <Text style={[styles.phaseLabel, { color: phaseColor }]}>{phaseLabel}</Text>
          {activeTask && pomo.phase === 'work' && (
            <Text style={[styles.taskTitle, { color: colors.text }]} numberOfLines={2}>
              {activeTask.text}
            </Text>
          )}
          <Text style={[styles.timer, { color: colors.text }]}>{mm}:{ss}</Text>

          {pomo.phase === 'work' ? (
            <View style={{ gap: 12, width: '100%' }}>
              <TouchableOpacity
                onPress={markTaskDone}
                style={[styles.btn, { backgroundColor: colors.accent }]}
              >
                <MaterialIcons name="check" size={18} color="#fff" />
                <Text style={styles.btnText}>Görevi tamamla + bitir</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => cancel('cancel')}
                style={[styles.btnOutline, { borderColor: colors.border }]}
              >
                <MaterialIcons name="stop" size={18} color={colors.text2} />
                <Text style={[styles.btnOutlineText, { color: colors.text2 }]}>İptal et</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => cancel('auto')}
              style={[styles.btnOutline, { borderColor: colors.border }]}
            >
              <Text style={[styles.btnOutlineText, { color: colors.text2 }]}>Molayı bitir</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : pomo.phase === 'idle' && pomo.taskId === null ? (
        // Idle — görev seç
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <Text style={[styles.subtitle, { color: colors.text3 }]}>
            Üzerinde çalışacağın görevi seç. {WORK_MIN}dk derin çalışma, {BREAK_MIN}dk mola.
          </Text>
          {starredFirst.length === 0 ? (
            <View style={[styles.empty, { borderColor: colors.border }]}>
              <MaterialIcons name="psychology" size={48} color={colors.text4} />
              <Text style={[styles.emptyText, { color: colors.text3 }]}>
                Önce bir görev oluştur, sonra pomodoro başlat.
              </Text>
            </View>
          ) : (
            starredFirst.map(t => (
              <TouchableOpacity
                key={t.id}
                onPress={() => startWork(t)}
                style={[styles.taskBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                {t.starred && <MaterialIcons name="star" size={16} color="#f59e0b" />}
                <Text style={[styles.taskBtnText, { color: colors.text }]} numberOfLines={2}>
                  {t.text}
                </Text>
                <MaterialIcons name="play-arrow" size={20} color={colors.accent} />
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      ) : (
        // Work bitti, mola önerisi
        <View style={styles.runningWrap}>
          <MaterialIcons name="check-circle" size={56} color="#22c55e" />
          <Text style={[styles.phaseLabel, { color: '#22c55e' }]}>Pomodoro tamamlandı 🎉</Text>
          <Text style={[styles.subtitle, { color: colors.text3, textAlign: 'center', marginVertical: 12 }]}>
            {WORK_MIN}dk derin çalıştın. Şimdi {BREAK_MIN} dakikalık molayı hak ettin.
          </Text>
          <View style={{ gap: 12, width: '100%' }}>
            <TouchableOpacity
              onPress={startBreak}
              style={[styles.btn, { backgroundColor: '#22c55e' }]}
            >
              <MaterialIcons name="coffee" size={18} color="#fff" />
              <Text style={styles.btnText}>{BREAK_MIN} dakikalık mola</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => cancel('auto')}
              style={[styles.btnOutline, { borderColor: colors.border }]}
            >
              <Text style={[styles.btnOutlineText, { color: colors.text2 }]}>Bitir</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  title: { fontSize: 17, fontWeight: '600' },
  subtitle: { fontSize: 13, lineHeight: 19, marginBottom: 16 },
  runningWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 },
  phaseLabel: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5 },
  taskTitle: { fontSize: 18, fontWeight: '600', textAlign: 'center', maxWidth: 320 },
  timer: { fontSize: 88, fontWeight: '200', letterSpacing: -3, marginVertical: 8, fontVariant: ['tabular-nums'] },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12 },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  btnOutline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5 },
  btnOutlineText: { fontSize: 14, fontWeight: '600' },
  taskBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  taskBtnText: { flex: 1, fontSize: 14, fontWeight: '500' },
  empty: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 12, padding: 32, alignItems: 'center', gap: 8 },
  emptyText: { fontSize: 13, textAlign: 'center' },
});
