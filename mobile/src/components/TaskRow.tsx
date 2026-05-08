import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Linking } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useAppSettings } from '../lib/appSettings';
import { MaterialIcons } from '@expo/vector-icons';
import { format, isToday, isTomorrow, isPast } from 'date-fns';
import { tr } from 'date-fns/locale';
import { formatTime, formatDateShort } from '../lib/format';
import * as Haptics from 'expo-haptics';
import type { Todo } from '../types/db';
import { getTaskLinks, STARRED_LIST_ID } from '../types/db';
import { PRIORITIES } from '../theme/priority';
import { BALANCE_CATEGORIES } from '../theme/balance';
import { useTheme } from '../theme/ThemeProvider';
import { toggleTaskDone, toggleTaskStar, patchTask } from '../lib/data';
import { useStore } from '../state/store';
import { linkLabel } from './LinkRow';
import ListIcon from './ListIcon';

type Props = { task: Todo; subtaskCount?: number };

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export default function TaskRow({ task, subtaskCount = 0 }: Props) {
  const { colors, fs, spacing } = useTheme();
  const styles = useMemo(() => makeStyles(fs, spacing), [fs, spacing]);
  const settings = useAppSettings();
  const animStyle = useAnimatedStyle(() => ({
    opacity: settings.completionAnim
      ? withTiming(task.done ? 0.55 : 1, { duration: 220 })
      : (task.done ? 0.55 : 1),
  }));
  const openEditor = useStore(s => s.openEditor);
  const activeListId = useStore(s => s.activeListId);
  const lists = useStore(s => s.lists);
  const prio = task.priority ? PRIORITIES[task.priority] : null;
  // Yıldızlı view'de görevin hangi listeye ait olduğu chip ile gösterilsin
  // (web parity: STARRED_LIST_ID'de tib-listname chip)
  const showListChip = activeListId === STARRED_LIST_ID;
  const taskList = showListChip ? lists.find(l => l.id === task.category) : null;

  const dueText = task.due_at ? fmtDue(task.due_at) : null;
  const dueOverdue = task.due_at ? isPast(new Date(task.due_at)) && !task.done : false;
  const links = getTaskLinks(task);
  const linksShown = links.slice(0, 3);
  const linksOverflow = links.length - linksShown.length;
  const completedDate = task.done && task.completed_at ? new Date(task.completed_at) : null;

  // Web parity: alt görev N/M format (tamamlanan/toplam)
  // Selector primitive ID alır, hesaplama dışarıda — yeni obje her render'da
  // zustand'a dönerse infinite re-render olur.
  const allTasks = useStore(s => s.tasks);
  const subs = allTasks.filter(t => t.parent_id === task.id);
  const subStats = { total: subs.length, done: subs.filter(t => t.done).length };
  const notesPreview = task.notes ? task.notes.slice(0, 100).trim() : null;

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
    <AnimatedTouchable
      onPress={() => openEditor(task.id)}
      onLongPress={showDateMenu}
      delayLongPress={400}
      style={[
        styles.row,
        { backgroundColor: colors.surface, borderBottomColor: colors.border2 },
        prio && { borderLeftColor: prio.color, borderLeftWidth: 3 },
        animStyle,
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
        {(dueText || subStats.total > 0 || task.balance_category || links.length > 0 || completedDate || taskList || prio || (!task.balance_category && task.estimated_minutes)) && (
          <View style={styles.metaRow}>
            {taskList && (
              <View style={styles.chip}>
                <ListIcon icon={taskList.icon} size={12} color={colors.text3} />
                <Text style={[styles.chipText, { color: colors.text3 }]} numberOfLines={1}>
                  {taskList.name}
                </Text>
              </View>
            )}
            {/* Priority symbol chip (web parity: 5dk/!!!/!!/!/zzz renkli) */}
            {prio && (
              <View style={[styles.prioChip, { borderColor: prio.color }]}>
                <Text style={[styles.prioText, { color: prio.color }]}>{prio.symbol}</Text>
              </View>
            )}
            {completedDate && (
              <>
                <View style={styles.chip}>
                  <MaterialIcons name="task-alt" size={12} color={colors.text3} />
                  <Text style={[styles.chipText, { color: colors.text3 }]}>
                    {formatDateShort(completedDate)}
                  </Text>
                </View>
                <View style={styles.chip}>
                  <MaterialIcons name="schedule" size={12} color={colors.text3} />
                  <Text style={[styles.chipText, { color: colors.text3 }]}>
                    {formatTime(completedDate)}
                  </Text>
                </View>
              </>
            )}
            {task.balance_category && BALANCE_CATEGORIES[task.balance_category] && (
              <View style={styles.chip}>
                <MaterialIcons
                  name={BALANCE_CATEGORIES[task.balance_category].icon as any}
                  size={12}
                  color={BALANCE_CATEGORIES[task.balance_category].color}
                />
                <Text style={[styles.chipText, { color: BALANCE_CATEGORIES[task.balance_category].color }]}>
                  {BALANCE_CATEGORIES[task.balance_category].label}
                  {task.estimated_minutes ? ` · ${task.estimated_minutes}dk` : ''}
                </Text>
              </View>
            )}
            {/* Süre chip — balance yoksa standalone (web parity) */}
            {!task.balance_category && task.estimated_minutes ? (
              <View style={styles.chip}>
                <MaterialIcons name="schedule" size={12} color={colors.text3} />
                <Text style={[styles.chipText, { color: colors.text3 }]}>
                  {task.estimated_minutes}dk
                </Text>
              </View>
            ) : null}
            {dueText && (
              <View style={styles.chip}>
                <MaterialIcons name="event" size={12} color={dueOverdue ? colors.danger : colors.text3} />
                <Text style={[styles.chipText, { color: dueOverdue ? colors.danger : colors.text3 }]}>{dueText}</Text>
              </View>
            )}
            {linksShown.map((url) => (
              <TouchableOpacity
                key={url}
                onPress={(e) => {
                  e.stopPropagation?.();
                  Linking.openURL(url).catch(() => {});
                }}
                style={styles.chip}
              >
                <MaterialIcons name="link" size={12} color={colors.accent} />
                <Text numberOfLines={1} style={[styles.chipText, { color: colors.accent, maxWidth: 110 }]}>
                  {linkLabel(url)}
                </Text>
              </TouchableOpacity>
            ))}
            {linksOverflow > 0 && (
              <View style={styles.chip}>
                <Text style={[styles.chipText, { color: colors.text3 }]}>+{linksOverflow}</Text>
              </View>
            )}
            {/* Alt görev chip — N/M format (web parity) */}
            {subStats.total > 0 && (
              <View style={styles.chip}>
                <MaterialIcons name="checklist" size={12} color={colors.text3} />
                <Text style={[styles.chipText, { color: colors.text3 }]}>
                  {subStats.done}/{subStats.total}
                </Text>
              </View>
            )}
          </View>
        )}
        {/* Notes preview — alt satırda 100 char (web parity, kart genişletilmiş hâlde) */}
        {!!notesPreview && (
          <Text numberOfLines={2} style={[styles.notesPreview, { color: colors.text3 }]}>
            {notesPreview}
          </Text>
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
    </AnimatedTouchable>
  );
}

function fmtDue(iso: string): string {
  const d = new Date(iso);
  if (isToday(d))    return 'Bugün ' + formatTime(d);
  if (isTomorrow(d)) return 'Yarın ' + formatTime(d);
  return `${formatDateShort(d)} ${formatTime(d)}`;
}

type Fs = (n: number) => number;
type Spacing = ReturnType<typeof useTheme>['spacing'];
function makeStyles(fs: Fs, spacing: Spacing) {
  return StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.s12, paddingHorizontal: spacing.s16, paddingVertical: spacing.s12, borderBottomWidth: 1 },
    check: { width: 22, height: 22, borderWidth: 1.5, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
    title: { fontSize: fs(15), fontWeight: '500' },
    metaRow: { flexDirection: 'row', gap: spacing.s10, marginTop: spacing.s4, flexWrap: 'wrap' },
    chip: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    chipText: { fontSize: fs(11), fontWeight: '500' },
    prioChip: {
      borderWidth: 1, borderRadius: 4,
      paddingHorizontal: 5, paddingVertical: 1,
      minWidth: 26, alignItems: 'center', justifyContent: 'center',
    },
    prioText: { fontSize: fs(10), fontWeight: '700' },
    notesPreview: { fontSize: fs(12), marginTop: spacing.s4, lineHeight: fs(16) },
  });
}
