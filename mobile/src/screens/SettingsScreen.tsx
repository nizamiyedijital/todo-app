import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeProvider';
import { useStore } from '../state/store';
import type { ThemePref } from '../state/store';

const PRO_CHECKOUT_URL = 'https://nizamiyedijital.github.io/todo-app/landing/checkout.html?plan=pro_monthly_try';

export default function SettingsScreen() {
  const nav = useNavigation();
  const { colors } = useTheme();
  const themePref = useStore(s => s.themePref);
  const setThemePref = useStore(s => s.setThemePref);
  const subscription = useStore(s => s.subscription);
  const session = useStore(s => s.session);

  const prefs: { key: ThemePref; label: string }[] = [
    { key: 'system', label: 'Sistem' },
    { key: 'light',  label: 'Açık' },
    { key: 'dark',   label: 'Koyu' },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.header, { borderBottomColor: colors.border2 }]}>
        <TouchableOpacity onPress={() => nav.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text2} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Ayarlar</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={{ padding: 16 }}>
        {/* Hesap kartı + Pro rozeti / "Pro'ya Geç" */}
        <View style={[styles.accountCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={[styles.email, { color: colors.text }]} numberOfLines={1}>
                {session?.user?.email ?? '—'}
              </Text>
              {subscription.is_pro && (
                <View style={styles.proBadge}>
                  <Text style={styles.proBadgeText}>PRO</Text>
                </View>
              )}
            </View>
            <Text style={[styles.planLabel, { color: colors.text3 }]}>
              {subscription.is_pro
                ? `${subscription.plan_code === 'pro_yearly_try' ? 'Pro Yıllık' : 'Pro Aylık'} · ${subscription.status}`
                : 'Bireysel (Ücretsiz)'}
            </Text>
          </View>
          {!subscription.is_pro && (
            <TouchableOpacity
              style={styles.upgradeBtn}
              onPress={() => Linking.openURL(PRO_CHECKOUT_URL)}
            >
              <MaterialIcons name="workspace-premium" size={16} color="#fff" />
              <Text style={styles.upgradeBtnText}>Pro'ya Geç</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={[styles.section, { color: colors.text3, marginTop: 24 }]}>Tema</Text>
        <View style={[styles.segment, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
          {prefs.map(p => (
            <TouchableOpacity
              key={p.key}
              onPress={() => setThemePref(p.key)}
              style={[
                styles.segBtn,
                themePref === p.key && { backgroundColor: colors.accent },
              ]}
            >
              <Text style={[styles.segText, { color: themePref === p.key ? '#fff' : colors.text2 }]}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  title: { fontSize: 17, fontWeight: '600' },
  section: { fontSize: 12, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 },
  segment: { flexDirection: 'row', borderRadius: 10, borderWidth: 1.5, padding: 3 },
  segBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  segText: { fontSize: 14, fontWeight: '500' },
  accountCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, borderWidth: 1 },
  email: { fontSize: 15, fontWeight: '600' },
  planLabel: { fontSize: 12, marginTop: 2 },
  proBadge: { backgroundColor: '#E9731C', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
  proBadgeText: { color: '#fff', fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  upgradeBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#E9731C', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  upgradeBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
});
