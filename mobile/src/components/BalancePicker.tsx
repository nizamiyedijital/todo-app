import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import type { BalanceCategory } from '../types/db';
import { BALANCE_CATEGORIES } from '../theme/balance';
import { useTheme } from '../theme/ThemeProvider';

type Props = {
  value: BalanceCategory | null;
  onChange: (v: BalanceCategory | null) => void;
};

const ORDER: BalanceCategory[] = ['mental', 'physical', 'spiritual'];

export default function BalancePicker({ value, onChange }: Props) {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      {ORDER.map(k => {
        const cat = BALANCE_CATEGORIES[k];
        const active = value === k;
        return (
          <TouchableOpacity
            key={k}
            onPress={() => onChange(active ? null : k)}
            hitSlop={{ top: 4, bottom: 4, left: 2, right: 2 }}
            style={[
              styles.chip,
              { borderColor: colors.border },
              active && { backgroundColor: cat.color, borderColor: cat.color },
            ]}
          >
            <MaterialIcons
              name={cat.icon as any}
              size={14}
              color={active ? '#fff' : cat.color}
            />
            <Text style={[styles.label, { color: active ? '#fff' : colors.text2 }]}>{cat.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 7,
    borderWidth: 1.5, borderRadius: 18,
  },
  label: { fontSize: 12, fontWeight: '600' },
});
