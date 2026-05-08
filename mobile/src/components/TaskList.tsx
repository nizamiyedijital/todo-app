import React, { useState, useCallback } from 'react';
import { FlatList, RefreshControl, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import TaskRow from './TaskRow';
import { useStore } from '../state/store';
import { selectVisibleTasks, selectSubtasks } from '../state/selectors';
import { loadAll } from '../lib/data';
import { useTheme } from '../theme/ThemeProvider';
import { useAppSettings } from '../lib/appSettings';

export default function TaskList() {
  const { colors } = useTheme();
  const tasks = useStore(s => s.tasks);
  const activeListId = useStore(s => s.activeListId);
  const settings = useAppSettings();
  const [refreshing, setRefreshing] = useState(false);
  // autoHide=true → tamamlananlar başlangıçta gizli (toggle ile açılır)
  const [doneOpen, setDoneOpen] = useState(!settings.autoHide);

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
    ...(doneOpen ? done : []),
  ];

  return (
    <FlatList
      data={data}
      keyExtractor={(item: any) => item.__divider ? 'divider' : item.id}
      renderItem={({ item }: { item: any }) => {
        if (item.__divider) return (
          <TouchableOpacity
            onPress={() => setDoneOpen(o => !o)}
            style={styles.divRow}
            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
          >
            <Text style={[styles.section, { color: colors.text4 }]}>
              Tamamlananlar ({done.length})
            </Text>
            <MaterialIcons
              name={doneOpen ? 'expand-less' : 'expand-more'}
              size={20}
              color={colors.text3}
            />
          </TouchableOpacity>
        );
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
  section: { flex: 1, fontSize: 11, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },
  divRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6 },
});
