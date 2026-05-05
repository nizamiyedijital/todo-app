import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, FlatList, Dimensions,
  StyleSheet, NativeSyntheticEvent, NativeScrollEvent,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme/ThemeProvider';
import { useStore } from '../state/store';
import type { List, Todo } from '../types/db';
import TaskRow from './TaskRow';
import { selectSubtasks } from '../state/selectors';

const { width: SCREEN_W } = Dimensions.get('window');
const COL_W  = Math.round(SCREEN_W * 0.88);
const COL_GAP = 10;
const STEP = COL_W + COL_GAP;
const SIDE_PAD = (SCREEN_W - COL_W) / 2;

export default function BoardView() {
  const { colors } = useTheme();
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
  const { colors } = useTheme();
  const colTasks = tasks.filter(t => !t.parent_id && t.category === list.id);
  const pending  = colTasks.filter(t => !t.done);
  const done     = colTasks.filter(t => t.done);

  const data = [
    ...pending,
    ...(done.length > 0 ? [{ __divider: true } as any] : []),
    ...done,
  ];

  return (
    <View style={[styles.col, { width: COL_W, backgroundColor: colors.surface2, borderColor: colors.border }]}>
      <View style={[styles.hdr, { borderBottomColor: colors.border2 }]}>
        <Text style={styles.icon}>{list.icon ?? '📋'}</Text>
        <Text numberOfLines={1} style={[styles.title, { color: colors.text }]}>{list.name}</Text>
        <View style={[styles.count, { backgroundColor: colors.accentBg }]}>
          <Text style={[styles.countText, { color: colors.accent }]}>{pending.length}</Text>
        </View>
      </View>

      <FlatList
        data={data}
        keyExtractor={(item: any) => item.__divider ? 'div' : item.id}
        renderItem={({ item }: { item: any }) => {
          if (item.__divider) return <Text style={[styles.sectionLabel, { color: colors.text4 }]}>Tamamlananlar</Text>;
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

const styles = StyleSheet.create({
  col: { borderWidth: 1, borderRadius: 14, overflow: 'hidden' },
  hdr: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1 },
  icon: { fontSize: 16 },
  title: { flex: 1, fontSize: 14, fontWeight: '700' },
  count: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  countText: { fontSize: 11, fontWeight: '700' },
  addRow: { paddingHorizontal: 10, paddingVertical: 6, borderBottomWidth: 1 },
  addInput: { fontSize: 13, paddingVertical: 6 },
  sectionLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, paddingHorizontal: 12, paddingVertical: 8 },
  colEmpty: { paddingVertical: 30, alignItems: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  emptyText: { fontSize: 14, textAlign: 'center' },
  dots: {
    flexDirection: 'row', justifyContent: 'center', gap: 6,
    paddingVertical: 10,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
