/**
 * AddBar — alt sırada "+ Görev ekle" tıklanabilir bar (Google Tasks stili).
 * Web parity (header "+ Yeni görev" butonu) için: tıklayınca TaskEditor
 * "yeni görev" modunda açılır; tüm detaylar (öncelik/tarih/denge/link/alt)
 * editor içinde set edilir.
 *
 * Eskiden TextInput + Enter → createTask + openEditor; şimdi tek tıklama:
 * openEditor(NEW_TASK_ID) → TaskEditor draft hazırlar.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme/ThemeProvider';
import { useStore } from '../state/store';
import { NEW_TASK_ID } from '../types/db';

export default function AddBar() {
  const { colors } = useTheme();
  const openEditor = useStore(s => s.openEditor);

  const onPress = () => {
    Haptics.selectionAsync();
    openEditor(NEW_TASK_ID);
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.wrap, { backgroundColor: colors.surface, borderTopColor: colors.border2 }]}
    >
      <MaterialIcons name="add" size={22} color={colors.accent} />
      <Text style={[styles.placeholder, { color: colors.text3 }]}>Görev ekle</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
  },
  placeholder: { fontSize: 15 },
});
