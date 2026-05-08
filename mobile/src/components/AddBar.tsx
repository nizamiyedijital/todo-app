/**
 * AddBar — yeni görev hızlı ekleme. Web parity (index.html "+ Yeni görev"):
 *   1. Kullanıcı text yazar
 *   2. Enter → createTask (DB'de draft) + openEditor(newId) → TaskEditor
 *      açılır, kullanıcı detayları (öncelik/tarih/denge/link/alt görevler)
 *      orada editler. Web'in `createDraftAndSwitchToEdit` pattern'i.
 *   3. Editor kapanırken empty silme (4.D) zaten var; boş görev DB'de kalmaz.
 *
 * AddBar artık priority/due/star detay alanları içermez — bunlar TaskEditor'a
 * taşındı (web'de aynı popover'da set ediliyor). Hızlı ekleme + editor draft
 * akışı tek pattern altında.
 */
import React, { useRef, useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme/ThemeProvider';
import { useStore } from '../state/store';
import { isSpecialListId } from '../types/db';
import { createTask } from '../lib/data';

export default function AddBar() {
  const { colors } = useTheme();
  const activeListId = useStore(s => s.activeListId);
  const boardColumnId = useStore(s => s.boardColumnId);
  const lists = useStore(s => s.lists);
  const openEditor = useStore(s => s.openEditor);
  const [text, setText] = useState('');
  const inputRef = useRef<TextInput>(null);

  const targetListId = isSpecialListId(activeListId)
    ? (boardColumnId ?? lists[0]?.id ?? null)
    : activeListId;

  const submit = async () => {
    const t = text.trim();
    if (!t) return;
    if (!targetListId) {
      Alert.alert('Liste yok', 'Önce yan panelden bir liste oluştur.');
      return;
    }
    setText('');
    try {
      const created = await createTask({ text: t, category: targetListId });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      // Web parity: yeni görev draft olarak DB'ye yazıldı, hemen editor'da
      // aç ki kullanıcı detayları (öncelik/tarih/link/alt) editleyebilsin.
      if (created?.id) openEditor(created.id);
    } catch (e: any) {
      Alert.alert('Hata', e?.message || 'Görev eklenemedi');
    }
  };

  return (
    <View style={[styles.wrap, { backgroundColor: colors.surface, borderTopColor: colors.border2 }]}>
      <View style={styles.bar}>
        <TouchableOpacity
          onPress={() => inputRef.current?.focus()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialIcons name="add" size={22} color={colors.accent} />
        </TouchableOpacity>
        <TextInput
          ref={inputRef}
          value={text}
          onChangeText={setText}
          onSubmitEditing={submit}
          placeholder="Görev ekle"
          placeholderTextColor={colors.text4}
          returnKeyType="done"
          blurOnSubmit={false}
          style={[styles.input, { color: colors.text }]}
        />
        {!!text.trim() && (
          <TouchableOpacity
            onPress={submit}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialIcons name="arrow-upward" size={22} color={colors.accent} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderTopWidth: 1 },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 10 },
  input: { flex: 1, fontSize: 15, paddingVertical: 6 },
});
