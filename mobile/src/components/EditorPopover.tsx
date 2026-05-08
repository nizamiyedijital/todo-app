/**
 * EditorPopover — TaskEditor icon-row üstünde pop-out card.
 *
 * Eski versiyonu Modal+full-screen backdrop+bottom-sheet idi; kullanıcı
 * "ikonun üzerinde açılsın" istedi. Şimdi inline overlay: icon-row'un
 * hemen üstünde, ekran genişliğinin tamamı yerine kenarlardan boşluklu
 * dar bir kart. Backdrop tıklayınca kapanır.
 *
 * Modal değil → KeyboardAvoidingView içinde TaskEditor'la birlikte
 * yerleşir; TextInput'lar focus aldığında klavye ile birlikte yukarı kayar.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider';

type Props = {
  visible: boolean;
  title: string;
  onClose: () => void;
  /** İkon-row'un üst kenarına olan boşluk (default 60). */
  bottomOffset?: number;
  children: React.ReactNode;
};

export default function EditorPopover({
  visible,
  title,
  onClose,
  bottomOffset = 60,
  children,
}: Props) {
  const { colors } = useTheme();
  if (!visible) return null;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Backdrop — tıklayınca kapatır */}
      <Pressable style={[StyleSheet.absoluteFill, styles.backdrop]} onPress={onClose} />
      {/* Popover card — icon-row üstünde */}
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border2,
            bottom: bottomOffset,
          },
        ]}
      >
        <View style={[styles.header, { borderBottomColor: colors.border2 }]}>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialIcons name="close" size={20} color={colors.text3} />
          </TouchableOpacity>
        </View>
        <View style={styles.body}>{children}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: 'rgba(0,0,0,0.18)' },
  card: {
    position: 'absolute',
    left: 12,
    right: 12,
    borderRadius: 14,
    borderWidth: 1,
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -2 },
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  title: { fontSize: 14, fontWeight: '700' },
  body: { padding: 12 },
});
