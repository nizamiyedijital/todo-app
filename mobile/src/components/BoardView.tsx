import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, FlatList, Dimensions, TouchableOpacity,
  StyleSheet, NativeSyntheticEvent, NativeScrollEvent,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme/ThemeProvider';
import { useStore } from '../state/store';
import type { List, Todo } from '../types/db';
import { NEW_TASK_ID } from '../types/db';
import TaskRow from './TaskRow';
import { selectSubtasks, isVisibleRootTask } from '../state/selectors';
import ListIcon from './ListIcon';
import { useAppSettings } from '../lib/appSettings';

const { width: SCREEN_W } = Dimensions.get('window');
const COL_W  = Math.round(SCREEN_W * 0.88);
const COL_GAP = 10;
const STEP = COL_W + COL_GAP;
const SIDE_PAD = (SCREEN_W - COL_W) / 2;

export default function BoardView() {
  const { colors, fs, spacing } = useTheme();
  const styles = useMemo(() => makeStyles(fs, spacing), [fs, spacing]);
  const lists = useStore(s => s.lists);
  const tasks = useStore(s => s.tasks);
  const setBoardColumnId = useStore(s => s.setBoardColumnId);
  const [page, setPage] = useState(0);
  const listRef = useRef<FlatList<List>>(null);

  useEffect(() => {
    setBoardColumnId(lists[0]?.id ?? null);
    return () => setBoardColumnId(null);
  }, [lists[0]?.id]);

  if (lists.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={[styles.emptyText, { color: colors.text3 }]}>Henüz liste yok. Yan panelden liste ekleyin.</Text>
      </View>
    );
  }

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const p = Math.round(x / STEP);
    if (p !== page) {
      setPage(p);
      setBoardColumnId(lists[p]?.id ?? null);
      Haptics.selectionAsync();
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        ref={listRef}
        data={lists}
        keyExtractor={(l) => l.id}
        horizontal
        decelerationRate="fast"
        snapToInterval={STEP}
        snapToAlignment="start"
        disableIntervalMomentum
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: SIDE_PAD }}
        ItemSeparatorComponent={() => <View style={{ width: COL_GAP }} />}
        onMomentumScrollEnd={onMomentumEnd}
        renderItem={({ item }) => <Column list={item} tasks={tasks} />}
      />

      <View style={styles.dots}>
        {lists.map((l, i) => (
          <View
            key={l.id}
            style={[
              styles.dot,
              { backgroundColor: i === page ? colors.accent : colors.border },
              i === page && { width: 16 },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

function Column({ list, tasks }: { list: List; tasks: Todo[] }) {
  const { colors, fs, spacing } = useTheme();
  const styles = useMemo(() => makeStyles(fs, spacing), [fs, spacing]);
  const openEditor = useStore(s => s.openEditor);
  const setBoardColumnId = useStore(s => s.setBoardColumnId);
  const settings = useAppSettings();
  // autoHide=true → tamamlananlar default kapalı; false → default açık.
  // Kullanıcı manuel toggle'ladıktan sonra autoHide ayarını değiştirirse
  // mevcut state korunur — ayar gelecekteki sütunları etkiler.
  const [doneOpen, setDoneOpen] = useState(!settings.autoHide);

  const colTasks = tasks.filter(t => isVisibleRootTask(t) && t.category === list.id);
  const pending  = colTasks.filter(t => !t.done);
  const done     = colTasks.filter(t => t.done);

  const data = [
    ...pending,
    ...(done.length > 0 ? [{ __divider: true } as any] : []),
    ...(doneOpen ? done : []),
  ];

  const onAddPress = () => {
    Haptics.selectionAsync();
    setBoardColumnId(list.id);
    openEditor(NEW_TASK_ID);
  };

  return (
    <View style={[styles.col, { width: COL_W, backgroundColor: colors.surface2, borderColor: colors.border }]}>
      <View style={[styles.hdr, { borderBottomColor: colors.border2 }]}>
        <ListIcon icon={list.icon} size={18} color={colors.text} />
        <Text numberOfLines={1} style={[styles.title, { color: colors.text }]}>{list.name}</Text>
        <View style={[styles.count, { backgroundColor: colors.accentBg }]}>
          <Text style={[styles.countText, { color: colors.accent }]}>{pending.length}</Text>
        </View>
        {/* Web parity (index.html:12194-12200): sütun başlığında "+" butonu */}
        <TouchableOpacity
          onPress={onAddPress}
          style={styles.addBtn}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <MaterialIcons name="add" size={20} color={colors.accent} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={data}
        keyExtractor={(item: any) => item.__divider ? 'div' : item.id}
        renderItem={({ item }: { item: any }) => {
          if (item.__divider) {
            // Web parity: tıklanabilir başlık + chevron + sayı
            return (
              <TouchableOpacity
                onPress={() => setDoneOpen(o => !o)}
                style={[styles.doneHeader, { borderTopColor: colors.border2 }]}
                hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
              >
                <Text style={[styles.sectionLabel, { color: colors.text4 }]}>
                  Tamamlananlar ({done.length})
                </Text>
                <MaterialIcons
                  name={doneOpen ? 'expand-less' : 'expand-more'}
                  size={20}
                  color={colors.text3}
                />
              </TouchableOpacity>
            );
          }
          return <TaskRow task={item} subtaskCount={selectSubtasks(tasks, item.id).length} />;
        }}
        ListEmptyComponent={
          <View style={styles.colEmpty}>
            <Text style={{ color: colors.text4, fontSize: 13 }}>Boş</Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </View>
  );
}

type Fs = (n: number) => number;
type Spacing = ReturnType<typeof useTheme>['spacing'];
function makeStyles(fs: Fs, spacing: Spacing) {
  return StyleSheet.create({
    col: { borderWidth: 1, borderRadius: 14, overflow: 'hidden' },
    hdr: { flexDirection: 'row', alignItems: 'center', gap: spacing.s8, paddingHorizontal: spacing.s12, paddingVertical: spacing.s10, borderBottomWidth: 1 },
    icon: { fontSize: fs(16) },
    title: { flex: 1, fontSize: fs(14), fontWeight: '700' },
    count: { paddingHorizontal: spacing.s8, paddingVertical: 2, borderRadius: 10 },
    countText: { fontSize: fs(11), fontWeight: '700' },
    addRow: { paddingHorizontal: spacing.s10, paddingVertical: spacing.s6, borderBottomWidth: 1 },
    addInput: { fontSize: fs(13), paddingVertical: spacing.s6 },
    sectionLabel: { fontSize: fs(10), fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, flex: 1 },
    doneHeader: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: spacing.s12, paddingVertical: spacing.s10,
      borderTopWidth: 1, marginTop: spacing.s4,
    },
    addBtn: { padding: spacing.s4 },
    colEmpty: { paddingVertical: 30, alignItems: 'center' },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.s16 + spacing.s8 },
    emptyText: { fontSize: fs(14), textAlign: 'center' },
    dots: {
      flexDirection: 'row', justifyContent: 'center', gap: spacing.s6,
      paddingVertical: spacing.s10,
    },
    dot: { width: 6, height: 6, borderRadius: 3 },
  });
}
