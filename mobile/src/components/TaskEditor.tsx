import React, { useEffect, useRef, useState } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, KeyboardAvoidingView, Platform, Alert, Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useStore } from '../state/store';
import { useTheme } from '../theme/ThemeProvider';
import { selectSubtasks } from '../state/selectors';
import type { Todo, PriorityKey } from '../types/db';
import { getTaskLinks } from '../types/db';
import { patchTask, deleteTask, createTask, toggleTaskDone, isTaskFullyEmpty } from '../lib/data';
import PrioritySelector from './PrioritySelector';
import DueRow from './DueRow';
import SubtaskRow from './SubtaskRow';
import BalancePicker from './BalancePicker';
import LinkRow from './LinkRow';
import ListIcon, { iconToEmoji } from './ListIcon';

export default function TaskEditor() {
  const editingTaskId = useStore(s => s.editingTaskId);
  const closeEditor = useStore(s => s.closeEditor);
  const tasks = useStore(s => s.tasks);
  const lists = useStore(s => s.lists);
  const { colors } = useTheme();

  const task = tasks.find(t => t.id === editingTaskId) ?? null;
  const visible = !!task;

  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [subInput, setSubInput] = useState('');
  const subInputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (task) {
      setTitle(task.text ?? '');
      setNotes(task.notes ?? '');
      setSubInput('');
    }
  }, [task?.id]);

  if (!task) return (
    <Modal visible={false} transparent animationType="slide" onRequestClose={closeEditor}>
      <View />
    </Modal>
  );

  const list = lists.find(l => l.id === task.category);
  const subtasks = selectSubtasks(tasks, task.id);

  const saveField = (patch: Partial<Todo>) => {
    patchTask(task.id, patch).catch((e) => console.warn('[editor] save', e));
  };

  const onClose = () => {
    const patch: Partial<Todo> = {};
    if (title !== task.text)          patch.text  = title.trim();
    if (notes !== (task.notes ?? '')) patch.notes = notes;
    if (Object.keys(patch).length) saveField(patch);
    Keyboard.dismiss();
    // Web parity: tüm alanlar boş + alt görev yoksa görevi otomatik sil
    if (isTaskFullyEmpty(task, { text: title, notes })) {
      deleteTask(task.id).catch((e) => console.warn('[editor] empty delete', e));
    }
    closeEditor();
  };

  const onDelete = () => {
    Alert.alert('Görevi sil', 'Bu görev ve alt görevleri silinecek. Devam?', [
      { text: 'İptal', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: async () => {
        try {
          for (const s of subtasks) await deleteTask(s.id);
          await deleteTask(task.id);
          closeEditor();
        } catch (e: any) { Alert.alert('Hata', e?.message || 'Silinemedi'); }
      } },
    ]);
  };

  const toggleStar = () => {
    Haptics.selectionAsync();
    saveField({ starred: !task.starred });
  };

  const showListPicker = () => {
    const others = lists.filter(l => l.id !== task.category);
    if (others.length === 0) {
      Alert.alert('Liste yok', 'Taşımak için başka liste yok.');
      return;
    }
    const opts: { text: string; style?: 'destructive' | 'cancel'; onPress?: () => void }[] = others.map(l => ({
      text: `${iconToEmoji(l.icon)}  ${l.name}`,
      onPress: () => saveField({ category: l.id }),
    }));
    opts.push({ text: 'İptal', style: 'cancel' });
    Alert.alert('Listeyi taşı', list ? `Şu an: ${list.name}` : undefined, opts);
  };

  const addSub = async () => {
    const t = subInput.trim();
    if (!t) return;
    setSubInput('');
    try {
      await createTask({ text: t, category: task.category, parent_id: task.id });
      subInputRef.current?.focus();
    } catch (e: any) { Alert.alert('Hata', e?.message || 'Alt görev eklenemedi'); }
  };

  const toggleDone = async () => {
    await toggleTaskDone(task).catch((e) => Alert.alert('Hata', e?.message));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    closeEditor();
  };

  // Web parity: header'da artık footer butonları yok; "more" menüsünden
  // Tamamlandı + Sil seçenekleri açılır (web'de sağ-tık menü; mobile'da Alert).
  const showActionMenu = () => {
    Haptics.selectionAsync();
    Alert.alert('Görev', undefined, [
      { text: task.done ? 'Tamamlandıyı geri al' : 'Tamamlandı işaretle', onPress: toggleDone },
      { text: 'Sil', style: 'destructive', onPress: onDelete },
      { text: 'İptal', style: 'cancel' },
    ]);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['bottom']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Meta bar (web parity: liste chip + yıldız + more menü; footer YOK) */}
          <View style={styles.metaBar}>
            {list && (
              <TouchableOpacity
                onPress={showListPicker}
                style={[styles.listChip, { borderColor: colors.border, backgroundColor: colors.surface }]}
              >
                <ListIcon icon={list.icon} size={16} color={colors.text2} />
                <Text style={{ color: colors.text2, fontSize: 13 }}>{list.name}</Text>
                <MaterialIcons name="arrow-drop-down" size={18} color={colors.text3} />
              </TouchableOpacity>
            )}
            <View style={styles.metaRight}>
              <TouchableOpacity
                onPress={toggleStar}
                style={[styles.starBtn, { borderColor: task.starred ? '#f59e0b' : colors.border }]}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <MaterialIcons
                  name={task.starred ? 'star' : 'star-outline'}
                  size={20}
                  color={task.starred ? '#f59e0b' : colors.text3}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={showActionMenu}
                style={styles.moreBtn}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <MaterialIcons name="more-vert" size={22} color={colors.text2} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
            {/* Title */}
            <TextInput
              value={title}
              onChangeText={setTitle}
              onBlur={() => title !== task.text && saveField({ text: title.trim() })}
              style={[styles.title, { color: colors.text, borderBottomColor: colors.border2 }]}
              multiline
              placeholder="Görev başlığı"
              placeholderTextColor={colors.text4}
            />

            {/* Notes */}
            <View style={styles.section}>
              <View style={styles.sectionLabel}>
                <MaterialIcons name="notes" size={16} color={colors.text3} />
                <Text style={[styles.sectionLabelText, { color: colors.text3 }]}>Notlar</Text>
              </View>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                onBlur={() => notes !== (task.notes ?? '') && saveField({ notes })}
                style={[styles.notes, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border2 }]}
                multiline
                placeholder="Not ekle…"
                placeholderTextColor={colors.text4}
              />
            </View>

            {/* Priority */}
            <View style={styles.section}>
              <View style={styles.sectionLabel}>
                <MaterialIcons name="flag" size={16} color={colors.text3} />
                <Text style={[styles.sectionLabelText, { color: colors.text3 }]}>Öncelik</Text>
              </View>
              <PrioritySelector value={task.priority} onChange={(p) => saveField({ priority: p })} />
            </View>

            {/* Balance category — Aktif Yaşam Dengesi */}
            <View style={styles.section}>
              <View style={styles.sectionLabel}>
                <MaterialIcons name="self-improvement" size={16} color={colors.text3} />
                <Text style={[styles.sectionLabelText, { color: colors.text3 }]}>Denge</Text>
              </View>
              <BalancePicker
                value={task.balance_category ?? null}
                onChange={(c) => saveField({ balance_category: c })}
              />
            </View>

            {/* Due date */}
            <View style={styles.section}>
              <View style={styles.sectionLabel}>
                <MaterialIcons name="event" size={16} color={colors.text3} />
                <Text style={[styles.sectionLabelText, { color: colors.text3 }]}>Tarih</Text>
              </View>
              <DueRow value={task.due_at} onChange={(iso) => saveField({ due_at: iso })} />
            </View>

            {/* Subtasks */}
            <View style={styles.section}>
              <View style={styles.sectionLabel}>
                <MaterialIcons name="check-box" size={16} color={colors.text3} />
                <Text style={[styles.sectionLabelText, { color: colors.text3 }]}>Alt görevler</Text>
              </View>
              {subtasks.map((s) => (
                <SubtaskRow key={s.id} task={s} />
              ))}
              <View style={[styles.subAddRow, { borderColor: colors.border2 }]}>
                <MaterialIcons name="add" size={18} color={colors.accent} />
                <TextInput
                  ref={subInputRef}
                  value={subInput}
                  onChangeText={setSubInput}
                  onSubmitEditing={addSub}
                  blurOnSubmit={false}
                  returnKeyType="done"
                  placeholder="Alt görev ekle"
                  placeholderTextColor={colors.text4}
                  style={[styles.subAddInput, { color: colors.text }]}
                />
              </View>
            </View>

            {/* Bağlantılar (web parity: links array + chip listesi) */}
            <View style={styles.section}>
              <View style={styles.sectionLabel}>
                <MaterialIcons name="link" size={16} color={colors.text3} />
                <Text style={[styles.sectionLabelText, { color: colors.text3 }]}>Bağlantılar</Text>
              </View>
              <LinkRow
                value={getTaskLinks(task)}
                onChange={(next) => saveField({ links: next, link: null })}
              />
            </View>
          </ScrollView>
          {/* Web parity: footer YOK. Kaydet otomatik (saveField onChange/onBlur);
              kapatma → swipe-down (iOS pageSheet) veya Android back tuşu;
              tamamlandı/sil → header sağ üstteki "more" menüden. */}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1,
  },
  headerBtn: { flexDirection: 'row', alignItems: 'center' },
  metaBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10, gap: 10,
  },
  listChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1 },
  listIcon: { fontSize: 14 },
  metaRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  starBtn: {
    width: 36, height: 36, borderRadius: 10, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  moreBtn: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 20, fontWeight: '600', paddingVertical: 8, borderBottomWidth: 1 },
  section: { marginTop: 18 },
  sectionLabel: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  sectionLabelText: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  notes: { minHeight: 70, borderWidth: 1, borderRadius: 10, padding: 10, textAlignVertical: 'top', fontSize: 14 },
  linkInput: { borderWidth: 1, borderRadius: 10, padding: 10, fontSize: 14 },
  subAddRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, marginTop: 6 },
  subAddInput: { flex: 1, fontSize: 14, paddingVertical: 8 },
  footer: { flexDirection: 'row', gap: 8, padding: 12, borderTopWidth: 1 },
  footBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  footBtnDanger: { backgroundColor: 'transparent' },
  footBtnText: { fontWeight: '600', fontSize: 14 },
});
