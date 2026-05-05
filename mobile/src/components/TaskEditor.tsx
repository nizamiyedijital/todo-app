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
import { patchTask, deleteTask, createTask, toggleTaskDone } from '../lib/data';
import PrioritySelector from './PrioritySelector';
import DueRow from './DueRow';
import SubtaskRow from './SubtaskRow';

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
  const [link, setLink] = useState('');
  const [subInput, setSubInput] = useState('');
  const subInputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (task) {
      setTitle(task.text ?? '');
      setNotes(task.notes ?? '');
      setLink(task.link ?? '');
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
    if (title !== task.text)   patch.text  = title.trim();
    if (notes !== (task.notes ?? ''))  patch.notes = notes;
    if (link  !== (task.link ?? ''))   patch.link  = link;
    if (Object.keys(patch).length) saveField(patch);
    Keyboard.dismiss();
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

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border2 }]}>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={styles.headerBtn}>
              <MaterialIcons name="chevron-left" size={26} color={colors.text2} />
              <Text style={{ color: colors.text2, fontSize: 15 }}>Geri</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onDelete} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <MaterialIcons name="delete-outline" size={22} color={colors.text3} />
            </TouchableOpacity>
          </View>

          {/* Meta bar */}
          <View style={styles.metaBar}>
            {list && (
              <View style={[styles.listChip, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <Text style={styles.listIcon}>{list.icon ?? '📋'}</Text>
                <Text style={{ color: colors.text2, fontSize: 13 }}>{list.name}</Text>
              </View>
            )}
            <TouchableOpacity onPress={toggleStar} style={[styles.mitBtn, { borderColor: task.starred ? '#f59e0b' : colors.border }]}>
              <MaterialIcons name={task.starred ? 'star' : 'star-outline'} size={18} color={task.starred ? '#f59e0b' : colors.text3} />
              <Text style={{ color: task.starred ? '#f59e0b' : colors.text3, fontSize: 13, fontWeight: '600' }}>
                Günün En Önemli Görevi
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
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

            {/* Link */}
            <View style={styles.section}>
              <View style={styles.sectionLabel}>
                <MaterialIcons name="link" size={16} color={colors.text3} />
                <Text style={[styles.sectionLabelText, { color: colors.text3 }]}>Bağlantı</Text>
              </View>
              <TextInput
                value={link}
                onChangeText={setLink}
                onBlur={() => link !== (task.link ?? '') && saveField({ link })}
                autoCapitalize="none"
                keyboardType="url"
                placeholder="https://…"
                placeholderTextColor={colors.text4}
                style={[styles.linkInput, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border2 }]}
              />
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={[styles.footer, { borderTopColor: colors.border2, backgroundColor: colors.surface }]}>
            <TouchableOpacity
              onPress={toggleDone}
              style={[styles.doneBtn, { backgroundColor: task.done ? colors.surface2 : colors.accent, borderColor: task.done ? colors.border : colors.accent }]}
            >
              <MaterialIcons name={task.done ? 'replay' : 'check'} size={18} color={task.done ? colors.text2 : '#fff'} />
              <Text style={{ color: task.done ? colors.text2 : '#fff', fontWeight: '600', fontSize: 15 }}>
                {task.done ? 'Geri Al' : 'Tamamlandı'}
              </Text>
            </TouchableOpacity>
          </View>
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
    paddingHorizontal: 16, paddingVertical: 10, gap: 10,
  },
  listChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1 },
  listIcon: { fontSize: 14 },
  mitBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1 },
  title: { fontSize: 20, fontWeight: '600', paddingVertical: 8, borderBottomWidth: 1 },
  section: { marginTop: 18 },
  sectionLabel: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  sectionLabelText: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  notes: { minHeight: 70, borderWidth: 1, borderRadius: 10, padding: 10, textAlignVertical: 'top', fontSize: 14 },
  linkInput: { borderWidth: 1, borderRadius: 10, padding: 10, fontSize: 14 },
  subAddRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, marginTop: 6 },
  subAddInput: { flex: 1, fontSize: 14, paddingVertical: 8 },
  footer: { padding: 12, borderTopWidth: 1 },
  doneBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, borderWidth: 1 },
});
