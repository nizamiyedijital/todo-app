import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format, isToday, isTomorrow, isPast } from 'date-fns';
import { useTheme } from '../theme/ThemeProvider';

type Props = {
  value: string | null;
  onChange: (iso: string | null) => void;
};

export default function DueRow({ value, onChange }: Props) {
  const { colors } = useTheme();
  const [showDate, setShowDate] = useState(false);
  const [showTime, setShowTime] = useState(false);
  const [pending, setPending] = useState<Date | null>(null);

  const setTodayAt = (h: number, m: number) => {
    const d = new Date();
    d.setHours(h, m, 0, 0);
    onChange(d.toISOString());
  };
  const setTomorrow = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    onChange(d.toISOString());
  };

  const current = value ? new Date(value) : null;
  const overdue = current ? isPast(current) : false;
  const label = current ? fmt(current) : null;

  const openPicker = () => {
    setPending(current ?? new Date());
    setShowDate(true);
  };

  const onDate = (_: unknown, d?: Date) => {
    if (Platform.OS === 'android') setShowDate(false);
    if (d) {
      setPending(d);
      if (Platform.OS === 'android') setShowTime(true);
    }
  };
  const onTime = (_: unknown, d?: Date) => {
    if (Platform.OS === 'android') setShowTime(false);
    if (d && pending) {
      const combined = new Date(pending);
      combined.setHours(d.getHours(), d.getMinutes(), 0, 0);
      onChange(combined.toISOString());
      setPending(null);
    }
  };
  const onIosConfirm = () => {
    if (pending) onChange(pending.toISOString());
    setShowDate(false);
    setPending(null);
  };

  return (
    <View>
      <View style={styles.row}>
        <TouchableOpacity style={[styles.chip, { borderColor: colors.border }]} onPress={() => setTodayAt(9, 0)}>
          <Text style={[styles.chipText, { color: colors.text2 }]}>Bugün</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.chip, { borderColor: colors.border }]} onPress={setTomorrow}>
          <Text style={[styles.chipText, { color: colors.text2 }]}>Yarın</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.iconBtn, { borderColor: colors.border }]} onPress={openPicker}>
          <MaterialIcons name="event" size={18} color={colors.text2} />
        </TouchableOpacity>
        {label && (
          <View style={[styles.chip, { borderColor: overdue ? colors.danger : colors.accent, backgroundColor: overdue ? '#fef2f2' : colors.accentBg }]}>
            <Text style={[styles.chipText, { color: overdue ? colors.danger : colors.accent, fontWeight: '600' }]}>{label}</Text>
            <TouchableOpacity onPress={() => onChange(null)} hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}>
              <MaterialIcons name="close" size={14} color={overdue ? colors.danger : colors.accent} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {showDate && Platform.OS === 'android' && (
        <DateTimePicker value={pending ?? new Date()} mode="date" onChange={onDate} />
      )}
      {showTime && Platform.OS === 'android' && (
        <DateTimePicker value={pending ?? new Date()} mode="time" onChange={onTime} />
      )}
      {showDate && Platform.OS === 'ios' && (
        <View style={styles.iosPicker}>
          <DateTimePicker
            value={pending ?? new Date()}
            mode="datetime"
            display="inline"
            onChange={(_, d) => d && setPending(d)}
          />
          <View style={styles.iosBtnRow}>
            <TouchableOpacity onPress={() => { setShowDate(false); setPending(null); }}>
              <Text style={{ color: colors.text3, padding: 8 }}>İptal</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onIosConfirm}>
              <Text style={{ color: colors.accent, padding: 8, fontWeight: '600' }}>Tamam</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

function fmt(d: Date): string {
  if (isToday(d))    return 'Bugün ' + format(d, 'HH:mm');
  if (isTomorrow(d)) return 'Yarın ' + format(d, 'HH:mm');
  return format(d, 'd MMM HH:mm');
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1 },
  chipText: { fontSize: 13 },
  iconBtn: { width: 32, height: 32, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  iosPicker: { marginTop: 8, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#e0e4ef' },
  iosBtnRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, paddingHorizontal: 12 },
});
