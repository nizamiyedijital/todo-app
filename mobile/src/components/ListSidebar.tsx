import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import type { DrawerContentComponentProps } from '@react-navigation/drawer';
import { useStore } from '../state/store';
import { useTheme } from '../theme/ThemeProvider';
import { STARRED_LIST_ID, BOARD_LIST_ID, WEEKLY_LIST_ID } from '../types/db';
import { selectListCounts, selectStarredCount } from '../state/selectors';
import { createList } from '../lib/data';
import { signOut } from '../lib/auth';

export default function ListSidebar(props: DrawerContentComponentProps) {
  const { colors } = useTheme();
  const lists = useStore(s => s.lists);
  const tasks = useStore(s => s.tasks);
  const activeListId = useStore(s => s.activeListId);
  const setActiveListId = useStore(s => s.setActiveListId);

  const [newListName, setNewListName] = useState('');

  const counts = selectListCounts(tasks, lists);
  const starredCount = selectStarredCount(tasks);

  function pick(id: string) {
    setActiveListId(id);
    props.navigation.closeDrawer();
    props.navigation.navigate('App' as never, { screen: 'Tasks' } as never);
  }

  async function addList() {
    const name = newListName.trim();
    if (!name) return;
    try {
      await createList({ name, icon: '📋', color: colors.accent });
      setNewListName('');
    } catch (e: any) {
      Alert.alert('Hata', e?.message || 'Liste oluşturulamadı');
    }
  }

  const Row = ({ id, icon, label, badge, active }: { id: string; icon: string; label: string; badge?: number; active?: boolean }) => (
    <TouchableOpacity
      onPress={() => pick(id)}
      style={[styles.row, active && { backgroundColor: colors.accentBg }]}
    >
      <MaterialIcons name={icon as any} size={20} color={active ? colors.accent : colors.text3} />
      <Text style={[styles.rowLabel, { color: active ? colors.accent : colors.text2 }]} numberOfLines={1}>{label}</Text>
      {!!badge && badge > 0 && (
        <View style={[styles.badge, { backgroundColor: active ? colors.accent : colors.surface2 }]}>
          <Text style={[styles.badgeText, { color: active ? '#fff' : colors.text3 }]}>{badge}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.surface }]}>
      <View style={styles.header}>
        <Text style={[styles.appTitle, { color: colors.text }]}>Yapılacaklar</Text>
      </View>

      <ScrollView style={{ flex: 1 }}>
        <Row id={BOARD_LIST_ID}   icon="dashboard"   label="Tümü"     active={activeListId === BOARD_LIST_ID} />
        <Row id={STARRED_LIST_ID} icon="star-border" label="Yıldızlı" badge={starredCount} active={activeListId === STARRED_LIST_ID} />

        <View style={[styles.divider, { backgroundColor: colors.border2 }]} />

        {lists.map(l => (
          <Row
            key={l.id}
            id={l.id}
            icon="list"
            label={`${l.icon || '📋'}  ${l.name}`}
            badge={counts[l.id] || 0}
            active={activeListId === l.id}
          />
        ))}

        <View style={styles.addListWrap}>
          <TextInput
            value={newListName} onChangeText={setNewListName}
            placeholder="+ Yeni liste" placeholderTextColor={colors.text4}
            onSubmitEditing={addList} returnKeyType="done"
            style={[styles.addListInput, { color: colors.text, borderColor: colors.border }]}
          />
        </View>
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: colors.border2 }]}>
        <TouchableOpacity
          style={styles.footBtn}
          onPress={() => { props.navigation.closeDrawer(); props.navigation.navigate('App' as never, { screen: 'Settings' } as never); }}
        >
          <MaterialIcons name="settings" size={18} color={colors.text3} />
          <Text style={[styles.footText, { color: colors.text2 }]}>Ayarlar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.footBtn}
          onPress={() => {
            Alert.alert('Çıkış', 'Çıkış yapmak istiyor musun?', [
              { text: 'İptal', style: 'cancel' },
              { text: 'Çıkış', style: 'destructive', onPress: () => signOut() },
            ]);
          }}
        >
          <MaterialIcons name="logout" size={18} color={colors.text3} />
          <Text style={[styles.footText, { color: colors.text2 }]}>Çıkış</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 16, paddingVertical: 18 },
  appTitle: { fontSize: 20, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 16 },
  rowLabel: { flex: 1, fontSize: 15, fontWeight: '500' },
  badge: { minWidth: 22, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, alignItems: 'center' },
  badgeText: { fontSize: 11, fontWeight: '700' },
  divider: { height: 1, marginVertical: 8, marginHorizontal: 16 },
  addListWrap: { paddingHorizontal: 16, paddingTop: 8 },
  addListInput: { borderBottomWidth: 1, paddingVertical: 10, fontSize: 14 },
  footer: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderTopWidth: 1 },
  footBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingRight: 12 },
  footText: { fontSize: 14, fontWeight: '500' },
});
