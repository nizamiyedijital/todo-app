/**
 * Haftalık Plan ekranı — due_at ile haftaya yayılmış görevleri 7-gün
 * sekmeli görünümde gösterir. Web'in 7×24 takvim parity'si değil
 * (mobil ekran sığmaz, drag-drop UX'i parmakla kötü), "anlam parity":
 * tarih ataması TaskEditor'dan yapılır, bu ekran salt-okunur tahtadır.
 *
 * Kapsam dışı: drag-drop, tema/odak başlık satırları, 24-saat grid.
 * Görev oluştur/sil/tarih değiştir → TaskEditor (görev tap'la açılır).
 */
import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import {
  format, isToday, isSameDay, startOfWeek, addDays, addWeeks, subWeeks, isPast,
} from 'date-fns';
import { tr } from 'date-fns/locale';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme/ThemeProvider';
import { useStore } from '../state/store';
import { toggleTaskDone } from '../lib/data';
import { isVisibleRootTask } from '../state/selectors';
import type { Todo } from '../types/db';

const TR_DAY_SHORT = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

export default function WeeklyScreen() {
  const nav = useNavigation();
  const { colors } = useTheme();
  const tasks = useStore(s => s.tasks);
  const openEditor = useStore(s => s.openEditor);

  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedDay, setSelectedDay] = useState<Date>(() => new Date());

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  // Bu haftaya denk düşen kök görevler (alt-görev hariç) — gün eşleştirmesi için
  const rootsWithDue = useMemo(
    () => tasks.filter(t => isVisibleRootTask(t) && t.due_at),
    [tasks],
  );

  const tasksForDay = useMemo(
    () =>
      rootsWithDue
        .filter(t => isSameDay(new Date(t.due_at!), selectedDay))
        .sort((a, b) => new Date(a.due_at!).getTime() - new Date(b.due_at!).getTime()),
    [rootsWithDue, selectedDay],
  );

  const goToday = () => {
    Haptics.selectionAsync();
    const today = new Date();
    setWeekStart(startOfWeek(today, { weekStartsOn: 1 }));
    setSelectedDay(today);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border2 }]}>
        <TouchableOpacity
          onPress={() => nav.dispatch(DrawerActions.openDrawer())}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialIcons name="menu" size={24} color={colors.text2} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Haftalık Plan</Text>
        <TouchableOpacity onPress={goToday} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={[styles.todayBtn, { color: colors.accent }]}>Bugün</Text>
        </TouchableOpacity>
      </View>

      {/* Hafta navigasyonu */}
      <View style={[styles.weekNav, { borderBottomColor: colors.border2 }]}>
        <TouchableOpacity
          onPress={() => setWeekStart(w => subWeeks(w, 1))}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialIcons name="chevron-left" size={22} color={colors.text2} />
        </TouchableOpacity>
        <Text style={[styles.weekLabel, { color: colors.text2 }]}>
          {format(weekStart, 'd MMM', { locale: tr })} — {format(addDays(weekStart, 6), 'd MMM yyyy', { locale: tr })}
        </Text>
        <TouchableOpacity
          onPress={() => setWeekStart(w => addWeeks(w, 1))}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialIcons name="chevron-right" size={22} color={colors.text2} />
        </TouchableOpacity>
      </View>

      {/* 7-gün sekme satırı */}
      <View style={styles.dayTabs}>
        {days.map((d, i) => {
          const sel = isSameDay(d, selectedDay);
          const today = isToday(d);
          const cnt = rootsWithDue.filter(t => isSameDay(new Date(t.due_at!), d)).length;
          return (
            <TouchableOpacity
              key={d.toISOString()}
              onPress={() => setSelectedDay(d)}
              style={[
                styles.dayTab,
                sel && { backgroundColor: colors.accentBg, borderColor: colors.accent },
                !sel && today && { borderColor: colors.accent },
                !sel && !today && { borderColor: colors.border },
              ]}
            >
              <Text style={[styles.dayName, { color: sel ? colors.accent : colors.text3 }]}>
                {TR_DAY_SHORT[i]}
              </Text>
              <Text
                style={[
                  styles.dayDate,
                  {
                    color: sel ? colors.accent : (today ? colors.accent : colors.text2),
                    fontWeight: today || sel ? '700' : '500',
                  },
                ]}
              >
                {format(d, 'd')}
              </Text>
              {cnt > 0 ? (
                <View style={[styles.dot, { backgroundColor: sel ? colors.accent : colors.text3 }]} />
              ) : (
                <View style={styles.dotPlaceholder} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Seçili gün başlığı */}
      <View style={styles.dayHeader}>
        <Text style={[styles.dayHeaderTitle, { color: colors.text }]}>
          {format(selectedDay, "d MMMM EEEE", { locale: tr })}
        </Text>
        <Text style={[styles.dayHeaderCount, { color: colors.text3 }]}>
          {tasksForDay.length} görev
        </Text>
      </View>

      {/* Görev listesi (gün için) */}
      {tasksForDay.length === 0 ? (
        <ScrollView contentContainerStyle={styles.emptyWrap}>
          <MaterialIcons name="event-available" size={48} color={colors.text4} />
          <Text style={[styles.emptyText, { color: colors.text3 }]}>
            Bu güne plan yok
          </Text>
          <Text style={[styles.emptyHint, { color: colors.text4 }]}>
            Bir göreve tarih atayınca burada görünür
          </Text>
        </ScrollView>
      ) : (
        <FlatList
          data={tasksForDay}
          keyExtractor={t => t.id}
          contentContainerStyle={{ paddingTop: 4, paddingBottom: 24 }}
          renderItem={({ item }) => <PlanRow task={item} onOpen={openEditor} colors={colors} />}
          ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: colors.border2, marginLeft: 76 }} />}
        />
      )}
    </SafeAreaView>
  );
}

function PlanRow({
  task, onOpen, colors,
}: {
  task: Todo;
  onOpen: (id: string) => void;
  colors: any;
}) {
  const due = new Date(task.due_at!);
  const overdue = isPast(due) && !task.done;
  return (
    <TouchableOpacity
      onPress={() => onOpen(task.id)}
      style={[styles.planRow, { backgroundColor: colors.surface }]}
    >
      <View style={styles.timeCol}>
        <Text style={[styles.timeText, { color: overdue ? colors.danger : colors.text2, fontWeight: '700' }]}>
          {format(due, 'HH:mm')}
        </Text>
        {task.estimated_minutes && task.estimated_minutes > 0 ? (
          <Text style={[styles.durText, { color: colors.text4 }]}>
            {task.estimated_minutes}dk
          </Text>
        ) : null}
      </View>

      <TouchableOpacity
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        onPress={(e) => {
          e.stopPropagation?.();
          Haptics.impactAsync(task.done ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium);
          toggleTaskDone(task);
        }}
        style={[
          styles.check,
          { borderColor: task.done ? colors.accent : colors.border },
          task.done && { backgroundColor: colors.accent },
        ]}
      >
        {task.done && <MaterialIcons name="check" size={13} color="#fff" />}
      </TouchableOpacity>

      <View style={{ flex: 1 }}>
        <Text
          numberOfLines={2}
          style={[
            styles.taskText,
            { color: colors.text },
            task.done && { textDecorationLine: 'line-through', color: colors.text4 },
          ]}
        >
          {task.text}
        </Text>
      </View>

      {task.starred ? <MaterialIcons name="star" size={16} color="#f59e0b" /> : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1,
  },
  title: { fontSize: 17, fontWeight: '600' },
  todayBtn: { fontSize: 14, fontWeight: '600' },

  weekNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1,
  },
  weekLabel: { fontSize: 13, fontWeight: '600' },

  dayTabs: { flexDirection: 'row', paddingHorizontal: 8, paddingVertical: 10, gap: 4 },
  dayTab: {
    flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 10, borderWidth: 1, gap: 2,
  },
  dayName: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  dayDate: { fontSize: 16 },
  dot: { width: 4, height: 4, borderRadius: 2, marginTop: 2 },
  dotPlaceholder: { width: 4, height: 4, marginTop: 2 },

  dayHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  dayHeaderTitle: { fontSize: 16, fontWeight: '700' },
  dayHeaderCount: { fontSize: 12 },

  emptyWrap: { alignItems: 'center', justifyContent: 'center', padding: 40, gap: 8 },
  emptyText: { fontSize: 14, fontWeight: '600', marginTop: 8 },
  emptyHint: { fontSize: 12 },

  planRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
  },
  timeCol: { width: 48, alignItems: 'flex-start' },
  timeText: { fontSize: 13 },
  durText: { fontSize: 10, marginTop: 2 },
  check: { width: 20, height: 20, borderWidth: 1.5, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  taskText: { fontSize: 14, fontWeight: '500' },
});
