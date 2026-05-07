import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { format, isToday, isTomorrow, isPast } from 'date-fns';
import * as Haptics from 'expo-haptics';
import type { Todo } from '../types/db';
import { PRIORITIES } from '../theme/priority';
import { BALANCE_CATEGORIES } from '../theme/balance';
import { useTheme } from '../theme/ThemeProvider';
import { toggleTaskDone, toggleTaskStar, patchTask } from '../lib/data';
import { useStore } from '../state/store';

type Props = { task: Todo; subtaskCount?: number };

export default function TaskRow({ task, subtaskCount = 0 }: Props) {
  const { colors } = useTheme();
  const openEditor = useStore(s => s.openEditor);
  const prio = task.priority ? PRIORITIES[task.priority] : null;

  const dueText = task.due_at ? fmtDue(task.due_at) : null;
  const dueOverdue = task.due_at ? isPast(new Date(task.due_at)) && !task.done : false;

  const setDuePreset = (preset: 'today' | 'tomorrow' | 'weekend' | 'clear') => {
    if (preset === 'clear') {
      patchTask(task.id, { due_at: null }).catch((e) => Alert.alert('Hata', e?.message ?? 'Güncellenemedi'));
      return;
    }
    const d = new Date();
    if (preset === 'today') {
      d.setHours(9, 0, 0, 0);
    } else if (preset === 'tomorrow') {
      d.setDate(d.getDate() + 1);
      d.setHours(9, 0, 0, 0);
    } else if (preset === 'weekend') {
      const dow = d.getDay(); // 0=Pazar, 6=Cumartesi
      let add = 6 - dow;
      if (add <= 0) add += 7;
      d.setDate(d.getDate() + add);
      d.setHours(10, 0, 0, 0);
    }
    patchTask(task.id, { due_at: d.toISOString() }).catch((e) => Alert.alert('Hata', e?.message ?? 'Güncellenemedi'));
  };

  const showDateMenu = () => {
    Haptics.selectionAsync();
    const opts: { text: string; style?: 'destructive' | 'cancel'; onPress?: () => void }[] = [
      { text: 'Bugün 09:00', onPress: () => setDuePreset('today') },
      { text: 'Yarın 09:00', onPress: () => setDuePreset('tomorrow') },
      { text: 'Cumartesi 10:00', onPress: () => setDuePreset('weekend') },
      { text: 'Düzenle (özel)…', onPress: () => openEditor(task.id) },
    ];
    if (task.due_at) opts.push({ text: 'Tarihi temizle', style: 'destructive', onPress: () => setDuePreset('clear') });
    opts.push({ text: 'İptal', style: 'cancel' });
    Alert.alert('Tarihe ata', undefined, opts);
  };

  return (
    <TouchableOpacity
      onPress={() => openEditor(task.id)}
      onLongPress={showDateMenu}
      delayLongPress={400}
      style={[
        styles.row,
        { backgroundColor: colors.surface, borderBottomColor: colors.border2 },
        prio && { borderLeftColor: prio.color, borderLeftWidth: 3 },
      ]}
    >
      <TouchableOpacity
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        onPress={(e) => {
          e.stopPropagation?.();
          Haptics.impactAsync(task.done ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium);
          toggleTaskDone(task);
        }}
        style={[styles.check, { borderColor: task.done ? colors.accent : colors.border }, task.done && { backgroundColor: colors.accent }]}
      >
        {task.done && <MaterialIcons name="check" size={14} color="#fff" />}
      </TouchableOpacity>

      <View style={{ flex: 1 }}>
        <Text
          numberOfLines={2}
          style={[
            styles.title,
            { color: colors.text },
            task.done && { textDecorationLine: 'line-through', color: colors.text4 },
          ]}
        >
          {task.text}
        </Text>
        {(dueText || subtaskCount > 0 || task.notes || task.balance_category) && (
          <View style={styles.metaRow}>
            {task.balance_category && BALANCE_CATEGORIES[task.balance_category] && (
              <View style={styles.chip}>
                <MaterialIcons
                  name={BALANCE_CATEGORIES[task.balance_category].icon as any}
                  size={12}
                  color={BALANCE_CATEGORIES[task.balance_category].color}
                />
                <Text style={[styles.chipText, { color: BALANCE_CATEGORIES[task.balance_category].color }]}>
                  {BALANCE_CATEGORIES[task.balance_category].label}
                </Text>
              </View>
            )}
            {dueText && (
              <View style={styles.chip}>
                <MaterialIcons name="schedule" size={12} color={dueOverdue ? colors.danger : colors.text3} />
                <Text style={[styles.chipText, { color: dueOverdue ? colors.danger : colors.text3 }]}>{dueText}</Text>
              </View>
            )}
            {subtaskCount > 0 && (
              <View style={styles.chip}>
                <MaterialIcons name="check-box" size={12} color={colors.text3} />
                <Text style={[styles.chipText, { color: colors.text3 }]}>{subtaskCount}</Text>
              </View>
            )}
            {!!task.notes && (
              <View style={styles.chip}>
                <MaterialIcons name="notes" size={12} color={colors.text3} />
                <Text numberOfLines={1} style={[styles.chipText, { color: colors.text3, maxWidth: 160 }]}>{task.notes}</Text>
              </View>
            )}
          </View>
        )}
      </View>

      <TouchableOpacity
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        onPress={(e) => {
          e.stopPropagation?.();
          Haptics.selectionAsync();
          toggleTaskStar(task);
        }}
      >
        <MaterialIcons
          name={task.starred ? 'star' : 'star-border'}
          size={20}
          color={task.starred ? '#f59e0b' : colors.text4}
        />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

function fmtDue(iso: string): string {
  const d = new Date(iso);
  if (isToday(d))    return 'Bugün ' + format(d, 'HH:mm');
  if (isTomorrow(d)) return 'Yarın ' + format(d, 'HH:mm');
  return format(d, 'd MMM HH:mm');
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  check: { width: 22, height: 22, borderWidth: 1.5, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 15, fontWeight: '500' },
  metaRow: { flexDirection: 'row', gap: 10, marginTop: 4, flexWrap: 'wrap' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  chipText: { fontSize: 11, fontWeight: '500' },
});
