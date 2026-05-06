/**
 * Bildirim Merkezi — sistem makaleleri (Disiplan ekibi yayınları) + bildirim
 * kampanyaları (admin'in gönderdikleri).
 *
 * Web Faz 1B parity'si. Push notifications (expo-notifications) Sprint M3'te
 * eklenir; bu screen sadece in-app feed.
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Modal, SafeAreaView as RNSafeAreaView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useTheme } from '../theme/ThemeProvider';
import { supabase } from '../lib/supabase';

type Article = {
  id: string;
  title: string;
  body: string | null;
  excerpt: string | null;
  category: string | null;
  published_at: string | null;
};

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  'haftalik-disiplan': { label: 'Haftalık Disiplan', color: '#12A3E3' },
  ipucu: { label: 'İpucu', color: '#10b981' },
  duyuru: { label: 'Duyuru', color: '#E9731C' },
};

export default function NotificationsScreen() {
  const nav = useNavigation();
  const { colors } = useTheme();

  const [items, setItems] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [opened, setOpened] = useState<Article | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('articles')
      .select('id, title, body, excerpt, category, published_at')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(50);
    setItems((data ?? []) as Article[]);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.header, { borderBottomColor: colors.border2 }]}>
        <TouchableOpacity onPress={() => nav.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text2} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Bildirimler</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <MaterialIcons name="notifications-none" size={56} color={colors.text4} />
          <Text style={[styles.empty, { color: colors.text3 }]}>Henüz bildirim yok</Text>
          <Text style={[styles.emptyDesc, { color: colors.text4 }]}>Yeni içerik geldiğinde burada görünür.</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 12 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(); }}
              tintColor={colors.accent}
            />
          }
        >
          {items.map(a => {
            const cat = a.category ? CATEGORY_LABELS[a.category] : null;
            return (
              <TouchableOpacity
                key={a.id}
                onPress={() => setOpened(a)}
                style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <View style={styles.cardHeader}>
                  {cat && (
                    <View style={[styles.catPill, { backgroundColor: cat.color + '22' }]}>
                      <Text style={[styles.catText, { color: cat.color }]}>{cat.label}</Text>
                    </View>
                  )}
                  {a.published_at && (
                    <Text style={[styles.date, { color: colors.text4 }]}>
                      {format(new Date(a.published_at), 'd MMM', { locale: tr })}
                    </Text>
                  )}
                </View>
                <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>{a.title}</Text>
                {!!a.excerpt && (
                  <Text style={[styles.cardExcerpt, { color: colors.text3 }]} numberOfLines={3}>{a.excerpt}</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Detay modal */}
      <Modal visible={!!opened} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setOpened(null)}>
        <RNSafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
          <View style={[styles.header, { borderBottomColor: colors.border2 }]}>
            <TouchableOpacity onPress={() => setOpened(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <MaterialIcons name="close" size={24} color={colors.text2} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{opened?.title}</Text>
            <View style={{ width: 24 }} />
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
            {opened && (
              <>
                {opened.published_at && (
                  <Text style={[styles.detailDate, { color: colors.text3 }]}>
                    {format(new Date(opened.published_at), 'd MMMM yyyy, HH:mm', { locale: tr })}
                  </Text>
                )}
                <Text style={[styles.detailBody, { color: colors.text }]}>
                  {opened.body || opened.excerpt || ''}
                </Text>
              </>
            )}
          </ScrollView>
        </RNSafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  title: { fontSize: 17, fontWeight: '600', flex: 1, textAlign: 'center', marginHorizontal: 8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 },
  empty: { fontSize: 15, fontWeight: '500', marginTop: 8 },
  emptyDesc: { fontSize: 12, textAlign: 'center' },
  card: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  catPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  catText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  date: { fontSize: 11 },
  cardTitle: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  cardExcerpt: { fontSize: 13, lineHeight: 18 },
  detailDate: { fontSize: 12, marginBottom: 12 },
  detailBody: { fontSize: 15, lineHeight: 24 },
});
