/**
 * İstatistikler — son 7g/30g/yıl basit metrikler.
 * Web tarafındaki openStats() modal'ının mobile parity'si (Faz 2.B).
 *
 * `balance_state_viewed` event'i de bu ekran açılınca tetiklenir
 * (PostHog dashboard'undaki "Onboarding funnel" insight'ı için kritik).
 *
 * Recharts mobil'de yok — pure RN ile basit number cards + bar segmentleri.
 * Sprint M3+'te react-native-svg-charts ile gerçek grafik eklenebilir.
 */
import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeProvider';
import { useStore } from '../state/store';
import { dpEvent } from '../lib/posthog';
import type { Todo } from '../types/db';

type Range = 'week' | 'month' | 'year' | 'all';

const RANGE_DAYS: Record<Range, number | null> = {
  week: 7, month: 30, year: 365, all: null,
};

const RANGE_LABELS: Record<Range, string> = {
  week: 'Hafta', month: 'Ay', year: 'Yıl', all: 'Tümü',
};

export default function StatsScreen() {
  const nav = useNavigation();
  const { colors } = useTheme();
  const tasks = useStore(s => s.tasks);
  const [range, setRange] = useState<Range>('month');

  const stats = useMemo(() => computeStats(tasks, range), [tasks, range]);

  useEffect(() => {
    dpEvent('balance_state_viewed', { state: stats.balanceState });
  }, [stats.balanceState]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.header, { borderBottomColor: colors.border2 }]}>
        <TouchableOpacity onPress={() => nav.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text2} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>İstatistikler</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Range tabs */}
      <View style={[styles.rangeTabs, { borderBottomColor: colors.border2 }]}>
        {(Object.keys(RANGE_DAYS) as Range[]).map(r => (
          <TouchableOpacity
            key={r}
            onPress={() => setRange(r)}
            style={[styles.rangeTab, range === r && { borderBottomColor: colors.accent }]}
          >
            <Text style={[styles.rangeText, { color: range === r ? colors.accent : colors.text3 }]}>
              {RANGE_LABELS[r]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 16 }}>
        {/* KPI grid */}
        <View style={styles.kpiGrid}>
          <Kpi colors={colors} label="Tamamlanan" value={stats.completedCount} />
          <Kpi colors={colors} label="Oluşturulan" value={stats.createdCount} />
          <Kpi colors={colors} label="Yıldızlanan" value={stats.starredCount} />
          <Kpi colors={colors} label="Tamamlama %" value={`${stats.completionRate}%`} />
        </View>

        {/* Balance breakdown — sadece Tümü/Ay'da kategori dağılımı anlamlı */}
        {stats.totalActiveTasks > 0 && (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Aktif Görevler</Text>
            <Text style={[styles.cardSubtitle, { color: colors.text3 }]}>
              {stats.totalActiveTasks} aktif görev · {stats.completedCount} tamamlanmış
            </Text>
            <View style={[styles.bar, { backgroundColor: colors.surface2 }]}>
              <View
                style={[
                  styles.barFill,
                  {
                    backgroundColor: colors.accent,
                    width: `${stats.completionRate}%`,
                  },
                ]}
              />
            </View>
            <Text style={[styles.barLabel, { color: colors.text3 }]}>
              %{stats.completionRate} tamamlandı
            </Text>
          </View>
        )}

        {/* Faz Aktif Yaşam Dengesi placeholder — Sprint M3'te gerçek balance card */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Aktif Yaşam Dengesi</Text>
          <Text style={[styles.cardSubtitle, { color: colors.text3 }]}>
            Zihin/Beden/Ruh detayı yakında — şu an web tarafında aktif.
          </Text>
        </View>

        {stats.totalActiveTasks === 0 && stats.completedCount === 0 && (
          <View style={[styles.empty, { borderColor: colors.border }]}>
            <MaterialIcons name="bar-chart" size={48} color={colors.text4} />
            <Text style={[styles.emptyText, { color: colors.text3 }]}>
              Bu zaman aralığında veri yok
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Kpi({ colors, label, value }: { colors: any; label: string; value: number | string }) {
  return (
    <View style={[styles.kpiCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.kpiLabel, { color: colors.text3 }]}>{label}</Text>
      <Text style={[styles.kpiValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

function computeStats(tasks: Todo[], range: Range) {
  const days = RANGE_DAYS[range];
  const cutoff = days ? Date.now() - days * 86400_000 : 0;
  const inRange = (d: string | null | undefined) => {
    if (!d) return false;
    return new Date(d).getTime() >= cutoff;
  };
  const roots = tasks.filter(t => !t.parent_id);
  const completed = roots.filter(t => t.done && inRange(t.created_at));
  const created = roots.filter(t => inRange(t.created_at));
  const starred = roots.filter(t => t.starred && inRange(t.created_at));
  const totalActive = roots.filter(t => !t.done).length;
  const completionRate = created.length > 0
    ? Math.round((completed.length / created.length) * 100)
    : 0;
  // balance_state_viewed event için durum string'i (web'deki gibi)
  let balanceState: 'empty' | 'balanced' | 'no_category' = 'empty';
  if (totalActive > 0) balanceState = 'no_category'; // mobil'de denge kategorisi yok henüz
  return {
    completedCount: completed.length,
    createdCount: created.length,
    starredCount: starred.length,
    totalActiveTasks: totalActive,
    completionRate,
    balanceState,
  };
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  title: { fontSize: 17, fontWeight: '600' },
  rangeTabs: { flexDirection: 'row', borderBottomWidth: 1 },
  rangeTab: { flex: 1, paddingVertical: 11, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  rangeText: { fontSize: 13, fontWeight: '600' },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  kpiCard: { flex: 1, minWidth: '45%', borderWidth: 1, borderRadius: 12, padding: 14 },
  kpiLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  kpiValue: { fontSize: 22, fontWeight: '700' },
  card: { borderWidth: 1, borderRadius: 12, padding: 14 },
  cardTitle: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  cardSubtitle: { fontSize: 12, marginBottom: 10 },
  bar: { height: 10, borderRadius: 5, overflow: 'hidden', marginTop: 4 },
  barFill: { height: '100%', borderRadius: 5 },
  barLabel: { fontSize: 11, marginTop: 6, textAlign: 'right' },
  empty: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 12, padding: 32, alignItems: 'center', gap: 8 },
  emptyText: { fontSize: 13 },
});
