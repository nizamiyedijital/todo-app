/**
 * Aktif Yaşam Dengesi kartı — TasksScreen'de TaskList üstünde gösterilir.
 * Web'in #balanceCard div'inin mobile parity'si.
 *
 * 3 satır:
 *   1) Liste adı + denge durumu rozeti
 *   2) Stat row (görev sayısı, toplam dakika, yıldızlı sayısı)
 *   3) Kategori stack-bar (Zihin/Beden/Kalp oranları)
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useStore } from '../state/store';
import { useTheme } from '../theme/ThemeProvider';
import { selectBalanceStats } from '../state/selectors';
import { BALANCE_CATEGORIES } from '../theme/balance';
import { STARRED_LIST_ID, BOARD_LIST_ID } from '../types/db';

export default function BalanceCard() {
  const { colors } = useTheme();
  const tasks = useStore(s => s.tasks);
  const lists = useStore(s => s.lists);
  const activeListId = useStore(s => s.activeListId);

  const stats = selectBalanceStats(tasks, activeListId);

  let title = 'Liste';
  if (activeListId === BOARD_LIST_ID)        title = 'Tümü';
  else if (activeListId === STARRED_LIST_ID) title = 'Günün Odağı';
  else {
    const l = lists.find(x => x.id === activeListId);
    if (l?.name) title = l.name;
  }

  if (stats.taskCount === 0) return null; // Boşken göstermek gereksiz; ListTask zaten kendi empty state'i çiziyor

  const chips: { key: 'mental' | 'physical' | 'spiritual'; ratio: number }[] = [
    { key: 'mental', ratio: stats.ratios.mental },
    { key: 'physical', ratio: stats.ratios.physical },
    { key: 'spiritual', ratio: stats.ratios.spiritual },
  ].filter(c => c.ratio > 0) as { key: 'mental' | 'physical' | 'spiritual'; ratio: number }[];

  const stateColor = (() => {
    if (stats.state === 'balanced') return '#22c55e';
    if (stats.state === 'no_category') return '#94a3b8';
    if (stats.state.endsWith('_heavy')) {
      const cat = stats.state.replace('_heavy', '') as 'mental' | 'physical' | 'spiritual';
      return BALANCE_CATEGORIES[cat].color;
    }
    return colors.text3;
  })();

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, borderLeftColor: stateColor }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{title}</Text>
        <View style={[styles.statePill, { backgroundColor: stateColor + '22' }]}>
          <Text style={[styles.stateText, { color: stateColor }]}>{stats.stateLabel}</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <Stat label="Görev" value={String(stats.taskCount)} colors={colors} />
        <Stat
          label="Süre"
          value={stats.totalMinutes > 0 ? formatMinutes(stats.totalMinutes) : '—'}
          colors={colors}
        />
        <Stat label="Yıldızlı" value={String(stats.starredCount)} colors={colors} />
      </View>

      {/* Stack bar */}
      {stats.total > 0 && (
        <>
          <View style={[styles.stackBar, { backgroundColor: colors.surface2 }]}>
            {chips.map(c => (
              <View
                key={c.key}
                style={{
                  width: `${c.ratio}%`,
                  backgroundColor: BALANCE_CATEGORIES[c.key].color,
                  height: '100%',
                }}
              />
            ))}
          </View>
          <View style={styles.legendRow}>
            {(['spiritual', 'physical', 'mental'] as const).map(k => (
              <View key={k} style={styles.legendItem}>
                <MaterialIcons
                  name={BALANCE_CATEGORIES[k].icon as any}
                  size={11}
                  color={BALANCE_CATEGORIES[k].color}
                />
                <Text style={[styles.legendText, { color: colors.text3 }]}>
                  %{Math.round(stats.ratios[k])}
                </Text>
              </View>
            ))}
          </View>
        </>
      )}

      {/* Faz 12 web parity (index.html:8754-8781): bugün tamamlanan görevlerin
          balance kategori bazında dakika toplamı */}
      {stats.completedTodayTotal > 0 && (
        <View style={[styles.completedRow, { borderTopColor: colors.border2 }]}>
          <Text style={[styles.completedLabel, { color: colors.text3 }]}>Bugün tamamlandı</Text>
          <View style={styles.completedVals}>
            {(['spiritual', 'physical', 'mental'] as const).map(k => (
              stats.completedToday[k] > 0 ? (
                <View key={k} style={styles.completedItem}>
                  <MaterialIcons
                    name={BALANCE_CATEGORIES[k].icon as any}
                    size={11}
                    color={BALANCE_CATEGORIES[k].color}
                  />
                  <Text style={[styles.completedValText, { color: BALANCE_CATEGORIES[k].color }]}>
                    {stats.completedToday[k]}dk
                  </Text>
                </View>
              ) : null
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

function Stat({ label, value, colors }: { label: string; value: string; colors: any }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.text3 }]}>{label}</Text>
    </View>
  );
}

function formatMinutes(min: number): string {
  if (min < 60) return `${min} dk`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}sa` : `${h}sa ${m}dk`;
}

const styles = StyleSheet.create({
  card: {
    margin: 12, marginBottom: 4,
    padding: 12,
    borderWidth: 1,
    borderLeftWidth: 4,
    borderRadius: 12,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  title: { fontSize: 14, fontWeight: '700', flex: 1, marginRight: 8 },
  statePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  stateText: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10 },
  stat: { alignItems: 'center', minWidth: 0 },
  statValue: { fontSize: 17, fontWeight: '700' },
  statLabel: { fontSize: 10, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 2 },
  stackBar: { height: 8, borderRadius: 4, overflow: 'hidden', flexDirection: 'row' },
  legendRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  legendText: { fontSize: 10, fontWeight: '600' },
  completedRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 10, paddingTop: 8, borderTopWidth: 1,
  },
  completedLabel: {
    fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4,
  },
  completedVals: { flexDirection: 'row', gap: 10 },
  completedItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  completedValText: { fontSize: 11, fontWeight: '700' },
});
