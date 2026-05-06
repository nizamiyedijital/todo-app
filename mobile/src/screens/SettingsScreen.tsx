import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeProvider';
import { useStore } from '../state/store';
import { supabase } from '../lib/supabase';
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

  const [exportRequested, setExportRequested] = useState(false);
  const [deleteRequested, setDeleteRequested] = useState(false);

  async function requestKvkkExport() {
    if (!session?.user?.id) return;
    Alert.alert(
      'Verilerimi resmî talep et',
      'KVKK Madde 11 — 30 gün içinde JSON paketi e-postanla iletilecek. Devam edilsin mi?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Talep et',
          onPress: async () => {
            setExportRequested(true);
            const { error } = await supabase.from('data_export_requests').insert({
              user_id: session.user.id,
              user_email: session.user.email,
              format: 'json',
              status: 'pending',
            });
            if (error) {
              setExportRequested(false);
              Alert.alert('Hata', error.message);
            }
          },
        },
      ],
    );
  }

  async function requestKvkkDeletion() {
    if (!session?.user?.id) return;
    Alert.alert(
      'Hesabımı sil',
      '7 gün cayma süresi var. Bu süre içinde iptal edebilirsin. Devam edilsin mi?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Talep et', style: 'destructive',
          onPress: async () => {
            setDeleteRequested(true);
            const { error } = await supabase.from('data_deletion_requests').insert({
              user_id: session.user.id,
              user_email: session.user.email,
              status: 'pending',
            });
            if (error) {
              setDeleteRequested(false);
              Alert.alert('Hata', error.message);
            }
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.header, { borderBottomColor: colors.border2 }]}>
        <TouchableOpacity onPress={() => nav.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text2} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Ayarlar</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
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

        {/* Genel — Bildirimler + İstatistikler + Destek */}
        <Text style={[styles.section, { color: colors.text3, marginTop: 24 }]}>Genel</Text>
        <View style={[styles.kvkkCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TouchableOpacity
            onPress={() => nav.navigate('Notifications' as never)}
            style={styles.kvkkRow}
          >
            <MaterialIcons name="notifications" size={20} color={colors.accent} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.kvkkLabel, { color: colors.text }]}>Bildirimler</Text>
              <Text style={[styles.kvkkDesc, { color: colors.text3 }]}>Sistem makaleleri ve duyurular</Text>
            </View>
            <MaterialIcons name="chevron-right" size={22} color={colors.text3} />
          </TouchableOpacity>
          <View style={[styles.divider, { backgroundColor: colors.border2 }]} />
          <TouchableOpacity
            onPress={() => nav.navigate('Stats' as never)}
            style={styles.kvkkRow}
          >
            <MaterialIcons name="bar-chart" size={20} color={colors.accent} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.kvkkLabel, { color: colors.text }]}>İstatistikler</Text>
              <Text style={[styles.kvkkDesc, { color: colors.text3 }]}>Tamamlama oranı, son aktiviteler</Text>
            </View>
            <MaterialIcons name="chevron-right" size={22} color={colors.text3} />
          </TouchableOpacity>
          <View style={[styles.divider, { backgroundColor: colors.border2 }]} />
          <TouchableOpacity
            onPress={() => nav.navigate('Support' as never)}
            style={styles.kvkkRow}
          >
            <MaterialIcons name="support-agent" size={20} color={colors.accent} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.kvkkLabel, { color: colors.text }]}>Destek</Text>
              <Text style={[styles.kvkkDesc, { color: colors.text3 }]}>Sorun bildir, canlı sohbet, geçmiş</Text>
            </View>
            <MaterialIcons name="chevron-right" size={22} color={colors.text3} />
          </TouchableOpacity>
        </View>

        {/* KVKK Hakları */}
        <Text style={[styles.section, { color: colors.text3, marginTop: 24 }]}>KVKK Hakları</Text>
        <View style={[styles.kvkkCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.kvkkRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.kvkkLabel, { color: colors.text }]}>Verilerimi resmî talep et</Text>
              <Text style={[styles.kvkkDesc, { color: colors.text3 }]}>KVKK Madde 11 — 30 gün içinde JSON</Text>
            </View>
            <TouchableOpacity
              onPress={requestKvkkExport}
              disabled={exportRequested}
              style={[styles.kvkkBtn, { borderColor: colors.border }, exportRequested && { opacity: 0.5 }]}
            >
              <Text style={[styles.kvkkBtnText, { color: colors.text2 }]}>
                {exportRequested ? 'Talep edildi' : 'Talep et'}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border2 }]} />
          <View style={styles.kvkkRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.kvkkLabel, { color: colors.text }]}>Hesabımı sil</Text>
              <Text style={[styles.kvkkDesc, { color: colors.text3 }]}>7 gün cayma süresi, sonra kalıcı</Text>
            </View>
            <TouchableOpacity
              onPress={requestKvkkDeletion}
              disabled={deleteRequested}
              style={[styles.kvkkBtn, { borderColor: '#dc2626' }, deleteRequested && { opacity: 0.5 }]}
            >
              <Text style={[styles.kvkkBtnText, { color: '#dc2626' }]}>
                {deleteRequested ? 'Talep edildi' : 'Sil'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
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
  kvkkCard: { borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  kvkkRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  kvkkLabel: { fontSize: 14, fontWeight: '600' },
  kvkkDesc: { fontSize: 11, marginTop: 2 },
  kvkkBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1 },
  kvkkBtnText: { fontSize: 12, fontWeight: '600' },
  divider: { height: 1, marginHorizontal: 14 },
});
