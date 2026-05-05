import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { PriorityKey } from '../types/db';
import { PRIORITIES, PRIORITY_KEYS } from '../theme/priority';
import { useTheme } from '../theme/ThemeProvider';

type Props = {
  value: PriorityKey | null;
  onChange: (v: PriorityKey | null) => void;
  size?: number;
};

export default function PrioritySelector({ value, onChange, size = 36 }: Props) {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      {PRIORITY_KEYS.map((k) => {
        const p = PRIORITIES[k];
        const active = value === k;
        return (
          <TouchableOpacity
            key={k}
            onPress={() => onChange(active ? null : k)}
            style={[
              styles.btn,
              { width: size, height: size, borderColor: colors.border },
              active && { backgroundColor: p.color, borderColor: p.color, shadowColor: p.color },
            ]}
            hitSlop={{ top: 4, bottom: 4, left: 2, right: 2 }}
          >
            <Text
              style={[
                styles.sym,
                { color: active ? '#fff' : p.color, fontSize: k === 'p0' ? 10 : k === 'p4' ? 11 : 14 },
              ]}
            >
              {p.symbol}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  btn: {
    borderWidth: 1.5,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  sym: { fontWeight: '800', letterSpacing: -0.5 },
});
