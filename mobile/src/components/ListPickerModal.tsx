/**
 * ListPickerModal — kullanıcının liste seçeceği bottom-sheet stili Modal.
 * iOS native Alert.alert içinde React component render edemediğimiz için
 * (emoji string fallback'a düşüyor), web Material Icons parity'sini korumak
 * adına custom Modal yazılmıştır.
 *
 * Kullanım: TaskEditor "Listeyi taşı" akışı, ileride audience/diğer picker'lar.
 */
import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import ListIcon from './ListIcon';
import type { List } from '../types/db';

type Props = {
  visible: boolean;
  title: string;
  subtitle?: string;
  /** Seçenek listesi (ListIcon kullanılarak render edilir) */
  options: Array<{ id: string; label: string; icon: List['icon']; }>;
  onPick: (id: string) => void;
  onClose: () => void;
};

export default function ListPickerModal({
  visible,
  title,
  subtitle,
  options,
  onPick,
  onClose,
}: Props) {
  const { colors } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
            {!!subtitle && (
              <Text style={[styles.subtitle, { color: colors.text3 }]}>{subtitle}</Text>
            )}
          </View>
          <ScrollView style={{ maxHeight: 400 }}>
            {options.map(opt => (
              <TouchableOpacity
                key={opt.id}
                onPress={() => {
                  onPick(opt.id);
                  onClose();
                }}
                style={[styles.row, { borderBottomColor: colors.border2 }]}
              >
                <ListIcon icon={opt.icon} size={20} color={colors.text2} />
                <Text style={[styles.rowText, { color: colors.text }]} numberOfLines={1}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
            <Text style={[styles.cancelText, { color: colors.text3 }]}>İptal</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 24,
  },
  header: { padding: 16, paddingBottom: 8 },
  title: { fontSize: 16, fontWeight: '700' },
  subtitle: { fontSize: 13, marginTop: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  rowText: { fontSize: 15, flex: 1 },
  cancelBtn: { padding: 16, alignItems: 'center' },
  cancelText: { fontSize: 14, fontWeight: '600' },
});
