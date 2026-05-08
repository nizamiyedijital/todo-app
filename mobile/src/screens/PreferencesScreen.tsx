/**
 * Tercihler ekranı — Görünüm + Görevler + Bildirimler + Bölge.
 *
 * Web parity (index.html:5191 s-appearance, 5221 s-tasks, 5258 s-notif,
 * 5322 s-locale). Mobile'da tek scroll'da gruplandırılmış. Tüm değerler
 * AsyncStorage 'app_settings' JSON'a yazılır (web localStorage parity).
 *
 * Atlanan parity (bilinçli):
 *  - reminders.* (5 zamanlı): Faz 5 server automation'a bırakıldı, mobile
 *    lokal trigger çakışma yaratır.
 *  - defaultSort: order_index manuel sürüklemeyle çelişir.
 */
import React, { useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, Switch, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeProvider';
import {
  useAppSettings, saveAppSetting,
  FontSize, DateFormat, TimeFormat, WeekStart, DueReminder, Priority,
} from '../lib/appSettings';
import { useStore } from '../state/store';
import { registerPushToken, unregisterPushToken } from '../lib/push';
import { rescheduleAllDueReminders } from '../lib/dueReminders';

type Opt<T extends string | null> = { value: T; label: string };

const FONT_OPTS: Opt<FontSize>[] = [
  { value: 'small',  label: 'Küçük' },
  { value: 'medium', label: 'Orta' },
  { value: 'large',  label: 'Büyük' },
];
const DATE_OPTS: Opt<DateFormat>[] = [
  { value: 'DD/MM',      label: 'GG/AA' },
  { value: 'MM/DD',      label: 'AA/GG' },
  { value: 'YYYY-MM-DD', label: 'YYYY-AA-GG' },
];
const TIME_OPTS: Opt<TimeFormat>[] = [
  { value: '24h', label: '24 saat' },
  { value: '12h', label: '12 saat' },
];
const WEEK_OPTS: Opt<WeekStart>[] = [
  { value: 'monday', label: 'Pazartesi' },
  { value: 'sunday', label: 'Pazar' },
];
const DUE_OPTS: Opt<DueReminder>[] = [
  { value: 'none',   label: 'Kapalı' },
  { value: '30min',  label: '30 dk önce' },
  { value: '1hour',  label: '1 saat önce' },
  { value: '3hour',  label: '3 saat önce' },
  { value: '12hour', label: '12 saat önce' },
  { value: '1day',   label: '1 gün önce' },
];
const PRIO_OPTS: Opt<Priority>[] = [
  { value: null, label: 'Yok' },
  { value: 'p1', label: 'P1 — Acil & Önemli' },
  { value: 'p2', label: 'P2 — Önemli' },
  { value: 'p3', label: 'P3 — Acil değil' },
  { value: 'p4', label: 'P4 — Ertelenebilir' },
];

export default function PreferencesScreen() {
  const nav = useNavigation();
  const { colors } = useTheme();
  const s = useAppSettings();
  const session = useStore(st => st.session);

  /**
   * notifEnabled değişimi — yan etki:
   *  - ON: permission iste + push_tokens'a yeni token upsert (registerPushToken)
   *  - OFF: bu cihazın token'ını sil (unregisterPushToken). Görev hatırlatıcı
   *    schedule edilenler de PreferencesScreen scope'unda değil — C2 ayrıca
   *    görev lifecycle'ında temizlenir.
   */
  const toggleNotifEnabled = useCallback(async (next: boolean) => {
    await saveAppSetting('notifEnabled', next);
    try {
      if (next) {
        await registerPushToken(session?.user?.id);
      } else {
        await unregisterPushToken();
      }
      // Tüm görevlerin due hatırlatıcılarını yeniden senkronla
      const tasks = useStore.getState().tasks.map(t => ({
        id: t.id, due_at: t.due_at, done: !!t.done, text: t.text,
      }));
      await rescheduleAllDueReminders(tasks);
    } catch (e: any) {
      Alert.alert('Hata', e?.message || 'Bildirim ayarı uygulanamadı');
    }
  }, [session?.user?.id]);

  /**
   * dueReminder offset değişti — tüm görevler için yeniden schedule.
   */
  const setDueReminder = useCallback(async (next: DueReminder) => {
    await saveAppSetting('dueReminder', next);
    const tasks = useStore.getState().tasks.map(t => ({
      id: t.id, due_at: t.due_at, done: !!t.done, text: t.text,
    }));
    await rescheduleAllDueReminders(tasks);
  }, []);

  const pickOption = useCallback(<T extends string | null>(
    title: string, options: Opt<T>[], onPick: (v: T) => void,
  ) => {
    Alert.alert(title, undefined, [
      ...options.map(o => ({
        text: o.label,
        onPress: () => onPick(o.value),
      })),
      { text: 'İptal', style: 'cancel' as const },
    ]);
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.header, { borderBottomColor: colors.border2 }]}>
        <TouchableOpacity onPress={() => nav.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text2} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Tercihler</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* GÖRÜNÜM */}
        <Text style={[styles.section, { color: colors.text3 }]}>Görünüm</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SelectRow
            label="Yazı Boyutu"
            valueLabel={FONT_OPTS.find(o => o.value === s.fontSize)?.label ?? '—'}
            onPress={() => pickOption('Yazı Boyutu', FONT_OPTS, v => saveAppSetting('fontSize', v))}
          />
          <Divider />
          <ToggleRow
            label="Kompakt Mod"
            desc="Kart aralıkları daha sık"
            value={s.compact}
            onChange={v => saveAppSetting('compact', v)}
          />
        </View>

        {/* GÖREVLER */}
        <Text style={[styles.section, { color: colors.text3, marginTop: 24 }]}>Görevler</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SelectRow
            label="Varsayılan Öncelik"
            desc="Yeni göreve otomatik atanır"
            valueLabel={PRIO_OPTS.find(o => o.value === s.defaultPriority)?.label ?? 'Yok'}
            onPress={() => pickOption('Varsayılan Öncelik', PRIO_OPTS, v => saveAppSetting('defaultPriority', v))}
          />
          <Divider />
          <ToggleRow
            label="Tamamlananları Otomatik Gizle"
            desc="Tamamlanmış görevler default olarak gizlenir"
            value={s.autoHide}
            onChange={v => saveAppSetting('autoHide', v)}
          />
          <Divider />
          <ToggleRow
            label="Tamamlanma Animasyonu"
            desc="Görev tamamlandığında fade-out"
            value={s.completionAnim}
            onChange={v => saveAppSetting('completionAnim', v)}
          />
        </View>

        {/* BİLDİRİMLER */}
        <Text style={[styles.section, { color: colors.text3, marginTop: 24 }]}>Bildirimler</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <ToggleRow
            label="Push Bildirimleri"
            desc="Otomasyon ve hatırlatma push'ları"
            value={s.notifEnabled}
            onChange={toggleNotifEnabled}
          />
          <Divider />
          <SelectRow
            label="Bitiş Tarihi Hatırlatıcı"
            desc="due_at olan görevlerden önce uyar"
            valueLabel={DUE_OPTS.find(o => o.value === s.dueReminder)?.label ?? '—'}
            onPress={() => pickOption('Bitiş Tarihi Hatırlatıcı', DUE_OPTS, setDueReminder)}
            disabled={!s.notifEnabled}
          />
        </View>

        {/* BÖLGE */}
        <Text style={[styles.section, { color: colors.text3, marginTop: 24 }]}>Dil & Bölge</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SelectRow
            label="Tarih Formatı"
            valueLabel={DATE_OPTS.find(o => o.value === s.dateFormat)?.label ?? '—'}
            onPress={() => pickOption('Tarih Formatı', DATE_OPTS, v => saveAppSetting('dateFormat', v))}
          />
          <Divider />
          <SelectRow
            label="Saat Formatı"
            valueLabel={TIME_OPTS.find(o => o.value === s.timeFormat)?.label ?? '—'}
            onPress={() => pickOption('Saat Formatı', TIME_OPTS, v => saveAppSetting('timeFormat', v))}
          />
          <Divider />
          <SelectRow
            label="Haftanın Başlangıcı"
            valueLabel={WEEK_OPTS.find(o => o.value === s.weekStart)?.label ?? '—'}
            onPress={() => pickOption('Haftanın Başlangıcı', WEEK_OPTS, v => saveAppSetting('weekStart', v))}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ToggleRow({ label, desc, value, onChange }: {
  label: string; desc?: string; value: boolean; onChange: (v: boolean) => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Text style={[styles.rowLabel, { color: colors.text }]}>{label}</Text>
        {desc && <Text style={[styles.rowDesc, { color: colors.text3 }]}>{desc}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: colors.accent, false: colors.border }}
        thumbColor="#fff"
      />
    </View>
  );
}

function SelectRow({ label, desc, valueLabel, onPress, disabled }: {
  label: string; desc?: string; valueLabel: string; onPress: () => void; disabled?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      style={[styles.row, disabled && { opacity: 0.4 }]}
      onPress={onPress}
      disabled={disabled}
    >
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Text style={[styles.rowLabel, { color: colors.text }]}>{label}</Text>
        {desc && <Text style={[styles.rowDesc, { color: colors.text3 }]}>{desc}</Text>}
      </View>
      <Text style={[styles.rowValue, { color: colors.text2 }]}>{valueLabel}</Text>
      <MaterialIcons name="chevron-right" size={22} color={colors.text3} style={{ marginLeft: 4 }} />
    </TouchableOpacity>
  );
}

function Divider() {
  const { colors } = useTheme();
  return <View style={{ height: 1, backgroundColor: colors.border2, marginHorizontal: 14 }} />;
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1,
  },
  title: { fontSize: 17, fontWeight: '600' },
  section: { fontSize: 12, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 },
  card: { borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  row: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12,
  },
  rowLabel: { fontSize: 14, fontWeight: '600' },
  rowDesc: { fontSize: 11, marginTop: 2 },
  rowValue: { fontSize: 13, fontWeight: '500' },
});
