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
import { getTaskLinks, NEW_TASK_ID, isSpecialListId } from '../types/db';
import { patchTask, deleteTask, createTask, toggleTaskDone, isTaskFullyEmpty } from '../lib/data';
import PrioritySelector from './PrioritySelector';
import DueRow from './DueRow';
import SubtaskRow from './SubtaskRow';
import BalancePicker from './BalancePicker';
import LinkRow from './LinkRow';
import ListIcon from './ListIcon';
import ListPickerModal from './ListPickerModal';
import EditorPopover from './EditorPopover';
import { BALANCE_CATEGORIES } from '../theme/balance';
import { PRIORITIES } from '../theme/priority';

export default function TaskEditor() {
  const editingTaskId = useStore(s => s.editingTaskId);
  const closeEditor = useStore(s => s.closeEditor);
  const tasks = useStore(s => s.tasks);
  const lists = useStore(s => s.lists);
  const activeListId = useStore(s => s.activeListId);
  const boardColumnId = useStore(s => s.boardColumnId);
  const { colors } = useTheme();

  const isNew = editingTaskId === NEW_TASK_ID;
  const task = tasks.find(t => t.id === editingTaskId) ?? null;
  const visible = isNew || !!task;

  // Yeni mod için hedef liste — aktif liste meta ise ilk gerçek liste / board col
  const newTargetListId = isSpecialListId(activeListId)
    ? (boardColumnId ?? lists[0]?.id ?? null)
    : activeListId;

  /**
   * "Yeni görev" modu açılınca bir defalık boş taslak oluştur ve
   * editingTaskId'yi gerçek id ile değiştir. Sonrası mevcut düzenleme akışı:
   * patchTask onChange/onBlur, empty silme onClose'da. Web'in
   * createDraftAndSwitchToEdit pattern'i.
   */
  useEffect(() => {
    if (!isNew) return;
    if (!newTargetListId) {
      Alert.alert('Liste yok', 'Önce yan panelden bir liste oluştur.');
      closeEditor();
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const created = await createTask({ text: '', category: newTargetListId });
        if (!cancelled && created?.id) {
          useStore.setState({ editingTaskId: created.id });
        }
      } catch (e) {
        console.warn('[editor] new draft', e);
        if (!cancelled) closeEditor();
      }
    })();
    return () => { cancelled = true; };
  }, [isNew, newTargetListId]);

  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [subInput, setSubInput] = useState('');
  const [listPickerOpen, setListPickerOpen] = useState(false);
  const [openPopover, setOpenPopover] = useState<
    'priority' | 'date' | 'balance' | 'link' | 'subtask' | null
  >(null);
  const subInputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (task) {
      setTitle(task.text ?? '');
      setNotes(task.notes ?? '');
      setSubInput('');
    }
  }, [task?.id]);

  if (!visible || !task) {
    return (
      <Modal visible={false} transparent animationType="slide" onRequestClose={closeEditor}>
        <View />
      </Modal>
    );
  }

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
    setListPickerOpen(true);
  };

  const listOptions = lists
    .filter(l => l.id !== task.category)
    .map(l => ({ id: l.id, label: l.name, icon: l.icon }));

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
            {/* Title — borderless input, görev başlığı */}
            <TextInput
              value={title}
              onChangeText={setTitle}
              onBlur={() => title !== task.text && saveField({ text: title.trim() })}
              style={[styles.title, { color: colors.text }]}
              multiline
              placeholder="Yeni görev…"
              placeholderTextColor={colors.text4}
              autoFocus={isNew}
            />

            {/* Notes — borderless, başlığın altında */}
            <View style={styles.notesRow}>
              <MaterialIcons name="notes" size={16} color={colors.text3} style={{ marginTop: 10 }} />
              <TextInput
                value={notes}
                onChangeText={setNotes}
                onBlur={() => notes !== (task.notes ?? '') && saveField({ notes })}
                style={[styles.notesInput, { color: colors.text }]}
                multiline
                placeholder="Notlar…"
                placeholderTextColor={colors.text4}
              />
            </View>

            {/* Icon row — web addDetail icon-row parity (priority/date/balance/link/subtask) */}
            <View style={[styles.iconRow, { borderTopColor: colors.border2 }]}>
              <IconRowBtn
                icon="flag"
                active={!!task.priority}
                activeColor={task.priority ? PRIORITIES[task.priority]?.color : undefined}
                onPress={() => setOpenPopover('priority')}
                colors={colors}
              />
              <IconRowBtn
                icon="event"
                active={!!task.due_at}
                onPress={() => setOpenPopover('date')}
                colors={colors}
              />
              <IconRowBtn
                icon="self-improvement"
                active={!!task.balance_category}
                activeColor={
                  task.balance_category
                    ? BALANCE_CATEGORIES[task.balance_category].color
                    : undefined
                }
                onPress={() => setOpenPopover('balance')}
                colors={colors}
              />
              <IconRowBtn
                icon="link"
                active={getTaskLinks(task).length > 0}
                badge={getTaskLinks(task).length}
                onPress={() => setOpenPopover('link')}
                colors={colors}
              />
              <IconRowBtn
                icon="checklist"
                active={subtasks.length > 0}
                badge={subtasks.length}
                onPress={() => setOpenPopover('subtask')}
                colors={colors}
              />
            </View>
          </ScrollView>
          {/* Web parity: footer YOK. Kaydet otomatik (saveField onChange/onBlur);
              kapatma → swipe-down (iOS pageSheet) veya Android back tuşu;
              tamamlandı/sil → header sağ üstteki "more" menüden. */}
        </KeyboardAvoidingView>

        {/* Liste seçim picker — Alert yerine custom Modal (web Material Icons parity) */}
        <ListPickerModal
          visible={listPickerOpen}
          title="Listeyi taşı"
          subtitle={list ? `Şu an: ${list.name}` : undefined}
          options={listOptions}
          onPick={(id) => saveField({ category: id })}
          onClose={() => setListPickerOpen(false)}
        />

        {/* Icon-row alt popover'ları (web addDetail içindeki sub-popup parity) */}
        <EditorPopover
          visible={openPopover === 'priority'}
          title="Öncelik"
          onClose={() => setOpenPopover(null)}
        >
          <PrioritySelector
            value={task.priority}
            onChange={(p) => { saveField({ priority: p }); setOpenPopover(null); }}
          />
        </EditorPopover>

        <EditorPopover
          visible={openPopover === 'date'}
          title="Tarih"
          onClose={() => setOpenPopover(null)}
        >
          <DueRow
            value={task.due_at}
            onChange={(iso) => saveField({ due_at: iso })}
          />
        </EditorPopover>

        <EditorPopover
          visible={openPopover === 'balance'}
          title="Aktif Yaşam Dengesi"
          onClose={() => setOpenPopover(null)}
        >
          <BalancePicker
            value={task.balance_category ?? null}
            onChange={(c) => { saveField({ balance_category: c }); setOpenPopover(null); }}
          />
        </EditorPopover>

        <EditorPopover
          visible={openPopover === 'link'}
          title="Bağlantılar"
          onClose={() => setOpenPopover(null)}
        >
          <LinkRow
            value={getTaskLinks(task)}
            onChange={(next) => saveField({ links: next, link: null })}
          />
        </EditorPopover>

        <EditorPopover
          visible={openPopover === 'subtask'}
          title="Alt görevler"
          onClose={() => setOpenPopover(null)}
        >
          <View>
            {subtasks.map((s) => (
              <SubtaskRow key={s.id} task={s} />
            ))}
            <View style={[styles.subAddRow, { borderColor: colors.border2, marginTop: 8 }]}>
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
        </EditorPopover>
      </SafeAreaView>
    </Modal>
  );
}

/**
 * Icon row buton — TaskEditor'da priority/date/balance/link/subtask ikonları.
 * Aktif state göstergesi: başka renk + light bg dolgu (web stili).
 */
function IconRowBtn({
  icon,
  active,
  activeColor,
  onPress,
  badge,
  colors,
}: {
  icon: string;
  active?: boolean;
  activeColor?: string;
  onPress: () => void;
  badge?: number;
  colors: any;
}) {
  const tint = active ? (activeColor ?? colors.accent) : colors.text3;
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.iconBtn,
        active && { backgroundColor: (activeColor ?? colors.accent) + '22' },
      ]}
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
    >
      <MaterialIcons name={icon as any} size={22} color={tint} />
      {!!badge && badge > 0 && (
        <View style={[styles.badge, { backgroundColor: tint }]}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
    </TouchableOpacity>
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
  title: { fontSize: 20, fontWeight: '600', paddingVertical: 6 },
  notesRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 8 },
  notesInput: { flex: 1, fontSize: 14, paddingVertical: 8, lineHeight: 20 },
  iconRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    paddingVertical: 16, marginTop: 16, borderTopWidth: 1, gap: 4,
  },
  iconBtn: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center', position: 'relative',
  },
  badge: {
    position: 'absolute', top: 0, right: 0,
    minWidth: 18, height: 18, borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center', justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
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
