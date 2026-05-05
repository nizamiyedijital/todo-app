import React, { useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme/ThemeProvider';
import { useStore } from '../state/store';
import { isSpecialListId } from '../types/db';
import type { PriorityKey } from '../types/db';
import { createTask } from '../lib/data';
import PrioritySelector from './PrioritySelector';
import DueRow from './DueRow';

export default function AddBar() {
  const { colors } = useTheme();
  const activeListId = useStore(s => s.activeListId);
  const boardColumnId = useStore(s => s.boardColumnId);
  const lists = useStore(s => s.lists);
  const [text, setText] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [starred, setStarred] = useState(false);
  const [priority, setPriority] = useState<PriorityKey | null>(null);
  const [dueAt, setDueAt] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);

  const targetListId = isSpecialListId(activeListId) ? (boardColumnId ?? lists[0]?.id ?? null) : activeListId;
  const targetList = lists.find(l => l.id === targetListId);

  const resolveCategory = (): string | null => targetListId;

  const reset = () => {
    setText('');
    setStarred(false);
    setPriority(null);
    setDueAt(null);
  };

  const submit = async () => {
    const t = text.trim();
    if (!t) return;
    const category = resolveCategory();
    if (!category) {
      Alert.alert('Liste yok', 'Önce yan panelden bir liste oluşturun.');
      return;
    }
    const payload = { text: t, category, starred, priority, due_at: dueAt };
    reset();
    try {
      await createTask(payload);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      inputRef.current?.focus();
    } catch (e: any) {
      Alert.alert('Hata', e?.message || 'Görev eklenemedi');
    }
  };

  const hasDraft = text.trim().length > 0 || starred || priority !== null || dueAt !== null;

  const showListChip = isSpecialListId(activeListId) && !!targetList;

  return (
    <View style={[styles.wrap, { backgroundColor: colors.surface, borderTopColor: colors.border2 }]}>
      {expanded && showListChip && (
        <View style={styles.listHint}>
          <Text style={{ color: colors.text3, fontSize: 11 }}>→</Text>
          <Text style={styles.listHintIcon}>{targetList?.icon ?? '📋'}</Text>
          <Text style={[styles.listHintText, { color: colors.text3 }]}>{targetList?.name}</Text>
        </View>
      )}
      <View style={styles.bar}>
        <TouchableOpacity onPress={() => inputRef.current?.focus()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialIcons name="add" size={22} color={colors.accent} />
        </TouchableOpacity>
        <TextInput
          ref={inputRef}
          value={text}
          onChangeText={setText}
          onFocus={() => setExpanded(true)}
          onSubmitEditing={submit}
          placeholder="Görev ekle"
          placeholderTextColor={colors.text4}
          returnKeyType="done"
          blurOnSubmit={false}
          style={[styles.input, { color: colors.text }]}
        />
        {hasDraft && (
          <TouchableOpacity onPress={submit} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialIcons name="arrow-upward" size={22} color={colors.accent} />
          </TouchableOpacity>
        )}
      </View>

      {expanded && (
        <View style={[styles.detail, { borderTopColor: colors.border2 }]}>
          <View style={styles.detailRow}>
            <TouchableOpacity
              onPress={() => { Haptics.selectionAsync(); setStarred(!starred); }}
              style={[styles.starBtn, starred && { borderColor: '#f59e0b', backgroundColor: '#fffbeb' }, !starred && { borderColor: colors.border }]}
              hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
            >
              <MaterialIcons name={starred ? 'star' : 'star-outline'} size={20} color={starred ? '#f59e0b' : colors.text3} />
            </TouchableOpacity>
            <PrioritySelector value={priority} onChange={setPriority} size={32} />
          </View>
          <View style={styles.detailRow}>
            <DueRow value={dueAt} onChange={setDueAt} />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderTopWidth: 1 },
  listHint: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingTop: 8 },
  listHintIcon: { fontSize: 13 },
  listHintText: { fontSize: 12, fontWeight: '500' },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 10 },
  input: { flex: 1, fontSize: 15, paddingVertical: 6 },
  detail: { paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1, gap: 12 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  starBtn: {
    width: 32, height: 32, borderRadius: 10, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
});
