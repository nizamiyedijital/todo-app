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
  onClose: () => void;
  /** İkon-row'un üst kenarına olan boşluk (default 60). */
  bottomOffset?: number;
  /** Daha geniş içerik (link/subtask) için kart genişlik kısıtını kaldır */
  wide?: boolean;
  children: React.ReactNode;
};

export default function EditorPopover({
  visible,
  onClose,
  bottomOffset = 60,
  wide = false,
  children,
}: Props) {
  const { colors } = useTheme();
  if (!visible) return null;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Backdrop — tıklayınca kapatır */}
      <Pressable style={[StyleSheet.absoluteFill, styles.backdrop]} onPress={onClose} />
      {/* Pill-shaped pop-out card (web parity: icon-row üstünde compact) */}
      <View
        style={[
          wide ? styles.cardWide : styles.cardPill,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border2,
            bottom: bottomOffset,
          },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: 'rgba(0,0,0,0.12)' },
  // Pill — yatay icon-group (priority, balance) için kompakt
  cardPill: {
    position: 'absolute',
    alignSelf: 'center',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },
  // Wide — link/subtask gibi input + liste için
  cardWide: {
    position: 'absolute',
    left: 12,
    right: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    maxHeight: '60%',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },
});
