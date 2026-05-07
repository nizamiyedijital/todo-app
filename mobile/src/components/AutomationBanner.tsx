/**
 * Faz 5.B.1 — Otomasyon banner'ları (event-based in-app bildirim).
 * TasksScreen üstünde görünür; her pending automation için bir kart.
 * Web'in #automationBannerHost div'inin mobile parity'si.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeProvider';
import { useStore } from '../state/store';
import { markAutomationSeen } from '../lib/automations';

export default function AutomationBanner() {
  const { colors } = useTheme();
  const items = useStore(s => s.automationsPending);
  const dismiss = useStore(s => s.dismissAutomation);
  const nav = useNavigation();

  if (items.length === 0) return null;

  const handleDismiss = (presetId: string, executionId?: number) => {
    if (executionId) {
      // Faz 5.B.2: cron banner — server'a "görüldü" işaretle
      void markAutomationSeen(executionId);
    }
    dismiss(presetId);
  };

  const handleCta = (deeplink: string | null, presetId: string, executionId?: number) => {
    if (deeplink) {
      if (deeplink.startsWith('/weekly')) {
        nav.navigate('Weekly' as never);
      } else if (deeplink.startsWith('/stats')) {
        nav.navigate('Stats' as never);
      } else if (deeplink.startsWith('/')) {
        // İç deeplink — şimdilik sadece /weekly ve /stats native; diğerleri TasksScreen
        // (kullanıcı zaten orada)
      } else {
        Linking.openURL(deeplink).catch(() => {});
      }
    }
    handleDismiss(presetId, executionId);
  };

  return (
    <View style={styles.host}>
      {items.map(it => (
        <View
          key={it.preset.id}
          style={[styles.banner, { backgroundColor: colors.accentBg, borderLeftColor: colors.accent }]}
        >
          <MaterialIcons name="campaign" size={20} color={colors.accent} style={styles.icon} />
          <View style={styles.body}>
            <Text style={[styles.title, { color: colors.text }]}>{it.title}</Text>
            <Text style={[styles.text, { color: colors.text2 }]}>{it.body}</Text>
            {!!it.cta && (
              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.cta, { backgroundColor: colors.accent }]}
                  onPress={() => handleCta(it.deeplink, it.preset.id, it.executionId)}
                >
                  <Text style={styles.ctaText}>{it.cta}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
          <TouchableOpacity
            onPress={() => handleDismiss(it.preset.id, it.executionId)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.dismiss}
          >
            <MaterialIcons name="close" size={18} color={colors.text3} />
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  host: { paddingHorizontal: 12, paddingTop: 8, gap: 8 },
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderLeftWidth: 3,
    borderRadius: 10,
    padding: 12,
  },
  icon: { marginTop: 2 },
  body: { flex: 1 },
  title: { fontSize: 14, fontWeight: '700', lineHeight: 18 },
  text: { fontSize: 12.5, marginTop: 3, lineHeight: 18 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10, alignItems: 'center', flexWrap: 'wrap' },
  cta: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  ctaText: { color: '#fff', fontWeight: '600', fontSize: 12 },
  dismiss: { padding: 2 },
});
