import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeProvider';
import { useStore } from '../state/store';
import { supabase } from '../lib/supabase';
import type { ThemePref } from '../state/store';

// KVKK status enum → UI label + renk (web parity için aynı renk paleti)
const STATUS_PILLS: Record<string, { label: string; bg: string; fg: string }> = {
  pending:    { label: 'Beklemede',     bg: '#FEF3C7', fg: '#92400E' },
  processing: { label: 'Hazırlanıyor',  bg: '#DBEAFE', fg: '#1E40AF' },
  ready:      { label: 'Hazır',         bg: '#D1FAE5', fg: '#065F46' },
  delivered:  { label: 'Teslim edildi', bg: '#E5E7EB', fg: '#374151' },
  expired:    { label: 'Süresi doldu',  bg: '#FEE2E2', fg: '#991B1B' },
  cancelled:  { label: 'İptal',         bg: '#E5E7EB', fg: '#374151' },
  review:     { label: 'İnceleniyor',   bg: '#EDE9FE', fg: '#5B21B6' },
  approved:   { label: 'Onaylandı',     bg: '#D1FAE5', fg: '#065F46' },
  completed:  { label: 'Tamamlandı',    bg: '#E5E7EB', fg: '#374151' },
  rejected:   { label: 'Reddedildi',    bg: '#FEE2E2', fg: '#991B1B' },
};

const ACTIVE_EXPORT_STATUSES   = ['pending', 'processing', 'ready'];
const ACTIVE_DELETION_STATUSES = ['pending', 'review', 'approved'];

type ExportRow = {
  id: string;
  status: string;
  requested_at: string;
  due_at: string;
  delivered_at: string | null;
  download_url: string | null;
  format: string;
};
type DeletionRow = {
  id: string;
  status: string;
  requested_at: string;
  due_at: string;
  cooling_off_until: string | null;
};

function daysLeft(iso: string): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000));
}

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

  const [exportRow, setExportRow] = useState<ExportRow | null>(null);
  const [deletionRow, setDeletionRow] = useState<DeletionRow | null>(null);

  // Web parity: kullanıcının en son export + deletion taleplerini çek; aktif
  // talep varsa "Talep et" butonu disabled, status pill ve countdown göster.
  const loadKvkkRequests = useCallback(async () => {
    if (!session?.user?.id) return;
    const [{ data: exp }, { data: del }] = await Promise.all([
      supabase
        .from('data_export_requests')
        .select('id, status, requested_at, due_at, delivered_at, download_url, format')
        .eq('user_id', session.user.id)
        .order('requested_at', { ascending: false })
        .limit(1),
      supabase
        .from('data_deletion_requests')
        .select('id, status, requested_at, due_at, cooling_off_until')
        .eq('user_id', session.user.id)
        .order('requested_at', { ascending: false })
        .limit(1),
    ]);
    setExportRow(((exp ?? []) as ExportRow[])[0] ?? null);
    setDeletionRow(((del ?? []) as DeletionRow[])[0] ?? null);
  }, [session?.user?.id]);

  useEffect(() => {
    void loadKvkkRequests();
  }, [loadKvkkRequests]);

  const exportActive   = !!exportRow   && ACTIVE_EXPORT_STATUSES.includes(exportRow.status);
  const deletionActive = !!deletionRow && ACTIVE_DELETION_STATUSES.includes(deletionRow.status);

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
            const { error } = await supabase.from('data_export_requests').insert({
              user_id: session.user.id,
              user_email: session.user.email,
              format: 'json',
              status: 'pending',
            });
            if (error) {
              Alert.alert('Hata', error.message);
            } else {
              await loadKvkkRequests();
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
            const { error } = await supabase.from('data_deletion_requests').insert({
              user_id: session.user.id,
              user_email: session.user.email,
              status: 'pending',
            });
            if (error) {
              Alert.alert('Hata', error.message);
            } else {
              await loadKvkkRequests();
            }
          },
        },
      ],
    );
  }

  async function cancelKvkkDeletion() {
    if (!deletionRow) return;
    Alert.alert(
      'Silme talebini iptal et',
      'Cayma süresinde silme talebini iptal edebilirsin. Devam?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'İptal et',
          onPress: async () => {
            const { error } = await supabase
              .from('data_deletion_requests')
              .update({ status: 'cancelled' })
              .eq('id', deletionRow.id);
            if (error) Alert.alert('Hata', error.message);
            else await loadKvkkRequests();
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

        {/* Hesap & Güvenlik — Profil + 2FA (web parity: app_settings.displayName + auth.mfa) */}
        <Text style={[styles.section, { color: colors.text3, marginTop: 24 }]}>Hesap & Güvenlik</Text>
        <View style={[styles.kvkkCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TouchableOpacity
            onPress={() => nav.navigate('Profile' as never)}
            style={styles.kvkkRow}
          >
            <MaterialIcons name="person" size={20} color={colors.accent} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.kvkkLabel, { color: colors.text }]}>Profil</Text>
              <Text style={[styles.kvkkDesc, { color: colors.text3 }]}>Görünen ad, e-posta</Text>
            </View>
            <MaterialIcons name="chevron-right" size={22} color={colors.text3} />
          </TouchableOpacity>
          <View style={[styles.divider, { backgroundColor: colors.border2 }]} />
          <TouchableOpacity
            onPress={() => nav.navigate('Tfa' as never)}
            style={styles.kvkkRow}
          >
            <MaterialIcons name="security" size={20} color={colors.accent} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.kvkkLabel, { color: colors.text }]}>İki Adımlı Doğrulama</Text>
              <Text style={[styles.kvkkDesc, { color: colors.text3 }]}>TOTP authenticator app ile koru</Text>
            </View>
            <MaterialIcons name="chevron-right" size={22} color={colors.text3} />
          </TouchableOpacity>
          <View style={[styles.divider, { backgroundColor: colors.border2 }]} />
          <TouchableOpacity
            onPress={() => nav.navigate('Preferences' as never)}
            style={styles.kvkkRow}
          >
            <MaterialIcons name="tune" size={20} color={colors.accent} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.kvkkLabel, { color: colors.text }]}>Tercihler</Text>
              <Text style={[styles.kvkkDesc, { color: colors.text3 }]}>Görünüm, görev varsayılanları, bildirim, bölge</Text>
            </View>
            <MaterialIcons name="chevron-right" size={22} color={colors.text3} />
          </TouchableOpacity>
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

        {/* KVKK Hakları + status dashboard (web parity Faz 4.C) */}
        <Text style={[styles.section, { color: colors.text3, marginTop: 24 }]}>KVKK Hakları</Text>
        <View style={[styles.kvkkCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* VERI IHRACI */}
          <View style={styles.kvkkRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.kvkkLabel, { color: colors.text }]}>Verilerimi resmî talep et</Text>
              <Text style={[styles.kvkkDesc, { color: colors.text3 }]}>KVKK Madde 11 — 30 gün içinde JSON</Text>
            </View>
            <TouchableOpacity
              onPress={requestKvkkExport}
              disabled={exportActive}
              style={[styles.kvkkBtn, { borderColor: colors.border }, exportActive && { opacity: 0.5 }]}
            >
              <Text style={[styles.kvkkBtnText, { color: colors.text2 }]}>
                {exportActive ? 'Aktif talep var' : 'Talep et'}
              </Text>
            </TouchableOpacity>
          </View>
          {exportRow && (
            <View style={[styles.statusBox, { borderTopColor: colors.border2 }]}>
              <View style={styles.statusRow}>
                <View style={[styles.pill, { backgroundColor: STATUS_PILLS[exportRow.status]?.bg ?? colors.surface2 }]}>
                  <Text style={[styles.pillText, { color: STATUS_PILLS[exportRow.status]?.fg ?? colors.text2 }]}>
                    {STATUS_PILLS[exportRow.status]?.label ?? exportRow.status}
                  </Text>
                </View>
                {exportActive && (
                  <Text style={[styles.statusMeta, { color: colors.text3 }]}>
                    Yasal süre: {daysLeft(exportRow.due_at)} gün kaldı
                  </Text>
                )}
              </View>
              {exportRow.status === 'ready' && exportRow.download_url && (
                <TouchableOpacity onPress={() => Linking.openURL(exportRow.download_url!)} style={styles.dlLink}>
                  <MaterialIcons name="download" size={14} color={colors.accent} />
                  <Text style={[styles.dlText, { color: colors.accent }]}>İndir ({exportRow.format})</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          <View style={[styles.divider, { backgroundColor: colors.border2 }]} />

          {/* HESAP SILME */}
          <View style={styles.kvkkRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.kvkkLabel, { color: colors.text }]}>Hesabımı sil</Text>
              <Text style={[styles.kvkkDesc, { color: colors.text3 }]}>7 gün cayma süresi, sonra kalıcı</Text>
            </View>
            <TouchableOpacity
              onPress={requestKvkkDeletion}
              disabled={deletionActive}
              style={[styles.kvkkBtn, { borderColor: '#dc2626' }, deletionActive && { opacity: 0.5 }]}
            >
              <Text style={[styles.kvkkBtnText, { color: '#dc2626' }]}>
                {deletionActive ? 'Aktif talep var' : 'Sil'}
              </Text>
            </TouchableOpacity>
          </View>
          {deletionRow && (
            <View style={[styles.statusBox, { borderTopColor: colors.border2 }]}>
              <View style={styles.statusRow}>
                <View style={[styles.pill, { backgroundColor: STATUS_PILLS[deletionRow.status]?.bg ?? colors.surface2 }]}>
                  <Text style={[styles.pillText, { color: STATUS_PILLS[deletionRow.status]?.fg ?? colors.text2 }]}>
                    {STATUS_PILLS[deletionRow.status]?.label ?? deletionRow.status}
                  </Text>
                </View>
                {deletionActive && deletionRow.cooling_off_until && (
                  <Text style={[styles.statusMeta, { color: colors.text3 }]}>
                    Cayma süresi: {daysLeft(deletionRow.cooling_off_until)} gün kaldı
                  </Text>
                )}
              </View>
              {deletionActive && (
                <TouchableOpacity onPress={cancelKvkkDeletion} style={styles.cancelLink}>
                  <MaterialIcons name="undo" size={14} color={colors.text3} />
                  <Text style={[styles.cancelText, { color: colors.text3 }]}>Talebi iptal et</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
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
  // KVKK status dashboard
  statusBox: { paddingHorizontal: 14, paddingTop: 8, paddingBottom: 12, borderTopWidth: 1, gap: 8 },
  statusRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  pill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  pillText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  statusMeta: { fontSize: 11, fontWeight: '500' },
  dlLink: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  dlText: { fontSize: 13, fontWeight: '600' },
  cancelLink: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cancelText: { fontSize: 12, fontWeight: '500' },
});
