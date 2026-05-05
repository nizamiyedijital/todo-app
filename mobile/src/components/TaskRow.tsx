import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { format, isToday, isTomorrow, isPast } from 'date-fns';
import * as Haptics from 'expo-haptics';
import type { Todo } from '../types/db';
import { PRIORITIES } from '../theme/priority';
import { useTheme } from '../theme/ThemeProvider';
import { toggleTaskDone } from '../lib/data';
import { useStore } from '../state/store';

type Props = { task: Todo; subtaskCount?: number };

export default function TaskRow({ task, subtaskCount = 0 }: Props) {
  const { colors } = useTheme();
  const openEditor = useStore(s => s.openEditor);
  const prio = task.priority ? PRIORITIES[task.priority] : null;

  const dueText = task.due_at ? fmtDue(task.due_at) : null;
  const dueOverdue = task.due_at ? isPast(new Date(task.due_at)) && !task.done : false;

  return (
    <TouchableOpacity
      onPress={() => openEditor(task.id)}
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
        {(dueText || subtaskCount > 0 || task.notes) && (
          <View style={styles.metaRow}>
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

      {task.starred && <MaterialIcons name="star" size={18} color="#f59e0b" />}
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
