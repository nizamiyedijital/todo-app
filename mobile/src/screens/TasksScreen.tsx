import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeProvider';
import { useStore } from '../state/store';
import { STARRED_LIST_ID, BOARD_LIST_ID } from '../types/db';
import TaskList from '../components/TaskList';
import AddBar from '../components/AddBar';
import TaskEditor from '../components/TaskEditor';
import BoardView from '../components/BoardView';
import BalanceCard from '../components/BalanceCard';

export default function TasksScreen() {
  const nav = useNavigation();
  const { colors } = useTheme();
  const activeListId = useStore(s => s.activeListId);
  const lists = useStore(s => s.lists);
  const pomo = useStore(s => s.pomo);

  const title = (() => {
    if (activeListId === BOARD_LIST_ID) return 'Tümü';
    if (activeListId === STARRED_LIST_ID) return 'Yıldızlı';
    const l = lists.find(x => x.id === activeListId);
    return l?.name ?? 'Liste';
  })();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'left', 'right']}>
      <View style={[styles.header, { borderBottomColor: colors.border2 }]}>
        <TouchableOpacity
          onPress={() => nav.dispatch(DrawerActions.openDrawer())}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialIcons name="menu" size={24} color={colors.text2} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        <TouchableOpacity
          onPress={() => nav.navigate('Pomodoro' as never)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialIcons
            name="timer"
            size={24}
            color={pomo.status === 'running' ? '#E9731C' : colors.text2}
          />
        </TouchableOpacity>
      </View>

      {/* Çalışan pomo banner — running'ken görünür */}
      {pomo.status === 'running' && (
        <TouchableOpacity
          onPress={() => nav.navigate('Pomodoro' as never)}
          style={[styles.pomoRunBanner, { backgroundColor: pomo.phase === 'work' ? '#E9731C' : '#22c55e' }]}
        >
          <MaterialIcons name="timer" size={14} color="#fff" />
          <Text style={styles.pomoRunText}>
            {pomo.phase === 'work' ? 'Çalışma' : 'Mola'} sürüyor — kalan süre için aç
          </Text>
        </TouchableOpacity>
      )}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <View style={{ flex: 1 }}>
          {activeListId === BOARD_LIST_ID ? (
            <BoardView />
          ) : (
            <>
              <BalanceCard />
              <View style={{ flex: 1 }}>
                <TaskList />
              </View>
            </>
          )}
        </View>
        <AddBar />
      </KeyboardAvoidingView>
      <TaskEditor />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1,
  },
  title: { fontSize: 17, fontWeight: '600' },
  pomoRunBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8 },
  pomoRunText: { color: '#fff', fontSize: 12, fontWeight: '600' },
});
