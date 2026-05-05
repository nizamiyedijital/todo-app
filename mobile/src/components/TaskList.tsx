import React, { useState, useCallback } from 'react';
import { FlatList, RefreshControl, View, Text, StyleSheet } from 'react-native';
import TaskRow from './TaskRow';
import { useStore } from '../state/store';
import { selectVisibleTasks, selectSubtasks } from '../state/selectors';
import { loadAll } from '../lib/data';
import { useTheme } from '../theme/ThemeProvider';

export default function TaskList() {
  const { colors } = useTheme();
  const tasks = useStore(s => s.tasks);
  const activeListId = useStore(s => s.activeListId);
  const [refreshing, setRefreshing] = useState(false);

  const visible = selectVisibleTasks(tasks, activeListId);
  const pending = visible.filter(t => !t.done);
  const done = visible.filter(t => t.done);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await loadAll(); } finally { setRefreshing(false); }
  }, []);

  if (visible.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={[styles.emptyText, { color: colors.text3 }]}>Bu listede henüz görev yok.</Text>
      </View>
    );
  }

  const data = [
    ...pending,
    ...(done.length > 0 ? [{ __divider: true } as any] : []),
    ...done,
  ];

  return (
    <FlatList
      data={data}
      keyExtractor={(item: any) => item.__divider ? 'divider' : item.id}
      renderItem={({ item }: { item: any }) => {
        if (item.__divider) return <Text style={[styles.section, { color: colors.text4 }]}>Tamamlananlar</Text>;
        return <TaskRow task={item} subtaskCount={selectSubtasks(tasks, item.id).length} />;
      }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      contentContainerStyle={{ paddingBottom: 80 }}
    />
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 14 },
  section: { fontSize: 11, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6 },
});
