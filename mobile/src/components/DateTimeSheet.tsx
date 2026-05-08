/**
 * DateTimeSheet — web dtp (date-time-picker) pattern'inin mobile parity'si.
 *
 * Web (index.html:11962+, dtpOpen): takvim + saat slider + dakika slider +
 * süre slider. Mobile'da @react-native-community/slider ile aynı yapı:
 *   1. Yatay 14 gün picker (bugün + sonraki 13 gün, scrollable)
 *   2. Saat slider (0–23, step 1)
 *   3. Dakika slider (0–55, step 5)
 *   4. Süre slider (0–180dk, step 5; 'Yok' özel değer 0)
 *   5. Footer: "Temizle" + "Tamam"
 *
 * EditorPopover (wide=true) içinde render edilir.
 */
import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { format, addDays, isToday, isTomorrow, isSameDay } from 'date-fns';
import { tr } from 'date-fns/locale';
import Slider from '@react-native-community/slider';
import { useTheme } from '../theme/ThemeProvider';

type Props = {
  /** Mevcut due_at ISO string */
  value: string | null;
  /** Mevcut estimated_minutes (varsa) */
  durationValue: number | null;
  /** Tamam tıklandığında { iso, durationMinutes } veya iso=null/temizle */
  onConfirm: (iso: string | null, durationMinutes: number | null) => void;
  onClose: () => void;
};

export default function DateTimeSheet({ value, durationValue, onConfirm, onClose }: Props) {
  const { colors } = useTheme();

  // Initial state
  const initialDate = value ? new Date(value) : new Date();
  const [selectedDate, setSelectedDate] = useState<Date>(initialDate);
  const [hour, setHour] = useState<number>(value ? new Date(value).getHours() : 9);
  const [minute, setMinute] = useState<number>(value ? Math.floor(new Date(value).getMinutes() / 5) * 5 : 0);
  const [duration, setDuration] = useState<number>(durationValue ?? 0);

  // 14 gün listesi
  const days = useMemo(() => Array.from({ length: 14 }, (_, i) => addDays(new Date(), i)), []);

  const buildIso = (): string => {
    const d = new Date(selectedDate);
    d.setHours(hour, minute, 0, 0);
    return d.toISOString();
  };

  const fmtDayLabel = (d: Date) => {
    if (isToday(d)) return 'Bugün';
    if (isTomorrow(d)) return 'Yarın';
    return format(d, 'EEE', { locale: tr });
  };

  return (
    <View>
      {/* Day picker — yatay scroll, 14 gün */}
      <Text style={[styles.label, { color: colors.text3 }]}>Tarih</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.daysRow}
      >
        {days.map((d) => {
          const sel = isSameDay(d, selectedDate);
          return (
            <TouchableOpacity
              key={d.toISOString()}
              onPress={() => setSelectedDate(d)}
              style={[
                styles.dayChip,
                {
                  borderColor: sel ? colors.accent : colors.border,
                  backgroundColor: sel ? colors.accent : 'transparent',
                },
              ]}
            >
              <Text style={[styles.dayLabel, { color: sel ? '#fff' : colors.text3 }]}>
                {fmtDayLabel(d)}
              </Text>
              <Text style={[styles.dayDate, { color: sel ? '#fff' : colors.text }]}>
                {format(d, 'd MMM', { locale: tr })}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Hour slider */}
      <View style={styles.sliderBlock}>
        <View style={styles.sliderHead}>
          <Text style={[styles.label, { color: colors.text3 }]}>Saat</Text>
          <Text style={[styles.value, { color: colors.text }]}>
            {String(hour).padStart(2, '0')}:00
          </Text>
        </View>
        <Slider
          minimumValue={0}
          maximumValue={23}
          step={1}
          value={hour}
          onValueChange={setHour}
          minimumTrackTintColor={colors.accent}
          maximumTrackTintColor={colors.border}
          thumbTintColor={colors.accent}
        />
      </View>

      {/* Minute slider */}
      <View style={styles.sliderBlock}>
        <View style={styles.sliderHead}>
          <Text style={[styles.label, { color: colors.text3 }]}>Dakika</Text>
          <Text style={[styles.value, { color: colors.text }]}>
            :{String(minute).padStart(2, '0')}
          </Text>
        </View>
        <Slider
          minimumValue={0}
          maximumValue={55}
          step={5}
          value={minute}
          onValueChange={setMinute}
          minimumTrackTintColor={colors.accent}
          maximumTrackTintColor={colors.border}
          thumbTintColor={colors.accent}
        />
      </View>

      {/* Duration slider */}
      <View style={styles.sliderBlock}>
        <View style={styles.sliderHead}>
          <Text style={[styles.label, { color: colors.text3 }]}>Süre</Text>
          <Text style={[styles.value, { color: colors.text }]}>
            {duration === 0 ? 'Yok' : duration < 60 ? `${duration}dk` : `${Math.floor(duration / 60)}sa ${duration % 60}dk`}
          </Text>
        </View>
        <Slider
          minimumValue={0}
          maximumValue={180}
          step={5}
          value={duration}
          onValueChange={setDuration}
          minimumTrackTintColor={colors.accent}
          maximumTrackTintColor={colors.border}
          thumbTintColor={colors.accent}
        />
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          onPress={() => { onConfirm(null, null); onClose(); }}
          style={styles.footerBtn}
        >
          <Text style={[styles.footerText, { color: colors.text3 }]}>Temizle</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => { onConfirm(buildIso(), duration > 0 ? duration : null); onClose(); }}
          style={[styles.footerBtn, { backgroundColor: colors.accent }]}
        >
          <Text style={[styles.footerText, { color: '#fff', fontWeight: '700' }]}>Tamam</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  value: { fontSize: 14, fontWeight: '700', tabularNums: true } as any,
  daysRow: { gap: 8, paddingVertical: 4 },
  dayChip: {
    minWidth: 56,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  dayLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  dayDate: { fontSize: 13, fontWeight: '700', marginTop: 2 },
  sliderBlock: { marginTop: 14 },
  sliderHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  footer: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 16, gap: 8,
  },
  footerBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  footerText: { fontSize: 14, fontWeight: '600' },
});
