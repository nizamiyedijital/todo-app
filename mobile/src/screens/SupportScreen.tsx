import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useTheme } from '../theme/ThemeProvider';
import { useStore } from '../state/store';
import { supabase } from '../lib/supabase';
import { dpEvent } from '../lib/posthog';
import { crispOpen } from '../lib/crisp';

type TicketStatus = 'new' | 'in_progress' | 'awaiting_user' | 'escalated' | 'resolved' | 'closed';
type Category = 'bug' | 'feature_request' | 'account' | 'billing' | 'data' | 'other';

const STATUS_LABELS: Record<TicketStatus, { label: string; color: string }> = {
  new: { label: 'Yeni', color: '#3b82f6' },
  in_progress: { label: 'İnceleniyor', color: '#a855f7' },
  awaiting_user: { label: 'Cevap bekliyor', color: '#f59e0b' },
  escalated: { label: 'Yönlendirildi', color: '#fb923c' },
  resolved: { label: 'Çözüldü', color: '#10b981' },
  closed: { label: 'Kapalı', color: '#94a3b8' },
};

const CATEGORIES: { key: Category; label: string }[] = [
  { key: 'bug', label: 'Hata' },
  { key: 'feature_request', label: 'Özellik isteği' },
  { key: 'account', label: 'Hesap' },
  { key: 'billing', label: 'Faturalandırma' },
  { key: 'data', label: 'Veri / KVKK' },
  { key: 'other', label: 'Diğer' },
];

interface Ticket {
  id: string;
  subject: string;
  status: TicketStatus;
  category: Category;
  created_at: string;
}

interface Message {
  id: number;
  ticket_id: string;
  author_type: 'user' | 'admin' | 'system';
  body: string;
  created_at: string;
}

export default function SupportScreen() {
  const nav = useNavigation();
  const { colors } = useTheme();
  const session = useStore(s => s.session);

  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<Category>('other');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [threads, setThreads] = useState<Record<string, Message[]>>({});

  const loadTickets = useCallback(async () => {
    if (!session?.user?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from('support_tickets')
      .select('id, subject, status, category, created_at')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(20);
    setTickets((data ?? []) as Ticket[]);
    setLoading(false);
  }, [session]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  async function loadThread(ticketId: string) {
    if (threads[ticketId]) return;
    const { data } = await supabase
      .from('support_messages')
      .select('id, ticket_id, author_type, body, created_at')
      .eq('ticket_id', ticketId)
      .eq('is_internal_note', false)
      .order('created_at', { ascending: true });
    setThreads(prev => ({ ...prev, [ticketId]: (data ?? []) as Message[] }));
  }

  async function submit() {
    const subj = subject.trim();
    const msg = body.trim();
    if (!subj || !msg) {
      Alert.alert('Eksik', 'Konu ve mesaj zorunlu');
      return;
    }
    if (!session?.user?.id) return;
    setSubmitting(true);
    try {
      const { data: ticket, error: tErr } = await supabase
        .from('support_tickets')
        .insert({
          user_id: session.user.id,
          user_email: session.user.email ?? 'bilinmiyor',
          subject: subj,
          category,
          priority: 'normal',
          status: 'new',
          source: 'in_app',
          platform: Platform.OS === 'ios' ? 'mobile_ios' : 'mobile_android',
          app_version: '1.0.0',
        })
        .select('id')
        .single();
      if (tErr || !ticket) throw tErr ?? new Error('Ticket oluşturulamadı');

      const { error: mErr } = await supabase.from('support_messages').insert({
        ticket_id: ticket.id,
        author_id: session.user.id,
        author_type: 'user',
        author_email: session.user.email,
        body: msg,
        is_internal_note: false,
      });
      if (mErr) throw mErr;

      dpEvent('support_ticket_created', { category, from_screen: 'mobile_app' });
      setSubject(''); setBody(''); setCategory('other');
      Alert.alert('Talep alındı', 'En kısa sürede dönüş yapacağız');
      await loadTickets();
    } catch (e: any) {
      Alert.alert('Hata', e?.message || 'Gönderilemedi');
    } finally {
      setSubmitting(false);
    }
  }

  function toggleExpand(id: string) {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      void loadThread(id);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.header, { borderBottomColor: colors.border2 }]}>
        <TouchableOpacity onPress={() => nav.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text2} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Destek</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          {/* Canlı chat (Crisp) — hızlı yanıt */}
          <TouchableOpacity
            onPress={crispOpen}
            style={[styles.chatBtn, { backgroundColor: colors.accent }]}
          >
            <MaterialIcons name="chat" size={18} color="#fff" />
            <View style={{ flex: 1 }}>
              <Text style={styles.chatBtnTitle}>Canlı sohbet aç</Text>
              <Text style={styles.chatBtnDesc}>Anında cevap için chat ile yaz</Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color="#fff" />
          </TouchableOpacity>

          {/* Önceki taleplerim */}
          {tickets.length > 0 && (
            <>
              <Text style={[styles.section, { color: colors.text3 }]}>Önceki Taleplerim</Text>
              <View style={{ marginBottom: 24 }}>
                {tickets.map(t => {
                  const st = STATUS_LABELS[t.status];
                  const expanded = expandedId === t.id;
                  const thread = threads[t.id];
                  return (
                    <View
                      key={t.id}
                      style={[styles.ticketCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    >
                      <TouchableOpacity onPress={() => toggleExpand(t.id)} style={styles.ticketHeader}>
                        <View style={[styles.statusPill, { backgroundColor: st.color + '22' }]}>
                          <Text style={[styles.statusText, { color: st.color }]}>{st.label}</Text>
                        </View>
                        <Text style={[styles.ticketSubj, { color: colors.text }]} numberOfLines={1}>
                          {t.subject}
                        </Text>
                        <Text style={[styles.ticketDate, { color: colors.text3 }]}>
                          {format(new Date(t.created_at), 'd MMM', { locale: tr })}
                        </Text>
                        <MaterialIcons
                          name={expanded ? 'expand-less' : 'expand-more'}
                          size={18}
                          color={colors.text3}
                        />
                      </TouchableOpacity>
                      {expanded && (
                        <View style={[styles.threadWrap, { borderTopColor: colors.border2 }]}>
                          {!thread ? (
                            <ActivityIndicator color={colors.accent} style={{ paddingVertical: 12 }} />
                          ) : thread.length === 0 ? (
                            <Text style={[styles.empty, { color: colors.text3 }]}>Mesaj yok</Text>
                          ) : (
                            thread.map(m => {
                              const isAdmin = m.author_type === 'admin';
                              const isSystem = m.author_type === 'system';
                              return (
                                <View
                                  key={m.id}
                                  style={[
                                    styles.message,
                                    { backgroundColor: isAdmin ? '#12A3E314' : colors.surface2 },
                                    { borderLeftColor: isAdmin ? '#12A3E3' : isSystem ? colors.text3 : colors.border },
                                  ]}
                                >
                                  <View style={styles.msgHeader}>
                                    <Text style={[styles.msgAuthor, { color: isAdmin ? '#12A3E3' : colors.text2 }]}>
                                      {isAdmin ? 'Disiplan Ekibi' : isSystem ? 'Sistem' : 'Sen'}
                                    </Text>
                                    <Text style={[styles.msgDate, { color: colors.text3 }]}>
                                      {format(new Date(m.created_at), 'd MMM HH:mm', { locale: tr })}
                                    </Text>
                                  </View>
                                  <Text style={[styles.msgBody, { color: colors.text }]}>{m.body}</Text>
                                </View>
                              );
                            })
                          )}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            </>
          )}

          {/* Yeni talep formu */}
          <Text style={[styles.section, { color: colors.text3 }]}>Yeni Talep</Text>
          <View style={[styles.formCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.label, { color: colors.text2 }]}>Konu</Text>
            <TextInput
              value={subject}
              onChangeText={setSubject}
              placeholder="Kısa bir özet"
              placeholderTextColor={colors.text4}
              maxLength={200}
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
            />
            <Text style={[styles.label, { color: colors.text2, marginTop: 12 }]}>Kategori</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
            >
              {CATEGORIES.map(c => (
                <TouchableOpacity
                  key={c.key}
                  onPress={() => setCategory(c.key)}
                  style={[
                    styles.catChip,
                    { borderColor: category === c.key ? colors.accent : colors.border, backgroundColor: category === c.key ? colors.accent : 'transparent' },
                  ]}
                >
                  <Text style={[styles.catText, { color: category === c.key ? '#fff' : colors.text2 }]}>
                    {c.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={[styles.label, { color: colors.text2, marginTop: 12 }]}>Mesaj</Text>
            <TextInput
              value={body}
              onChangeText={setBody}
              placeholder="Detayları paylaş…"
              placeholderTextColor={colors.text4}
              multiline
              numberOfLines={5}
              maxLength={5000}
              style={[styles.input, styles.textArea, { color: colors.text, borderColor: colors.border }]}
            />
            <TouchableOpacity
              onPress={submit}
              disabled={submitting}
              style={[styles.submitBtn, { backgroundColor: colors.accent }, submitting && { opacity: 0.6 }]}
            >
              <MaterialIcons name="send" size={16} color="#fff" />
              <Text style={styles.submitText}>{submitting ? 'Gönderiliyor…' : 'Gönder'}</Text>
            </TouchableOpacity>
          </View>

          {loading && tickets.length === 0 && (
            <ActivityIndicator color={colors.accent} style={{ marginTop: 16 }} />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  title: { fontSize: 17, fontWeight: '600' },
  section: { fontSize: 12, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 },
  ticketCard: { borderRadius: 10, borderWidth: 1, marginBottom: 8, overflow: 'hidden' },
  ticketHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12 },
  statusPill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  statusText: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  ticketSubj: { flex: 1, fontSize: 14, fontWeight: '500' },
  ticketDate: { fontSize: 11 },
  threadWrap: { borderTopWidth: 1, padding: 12, gap: 8 },
  message: { padding: 10, borderRadius: 8, borderLeftWidth: 3 },
  msgHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  msgAuthor: { fontSize: 11, fontWeight: '700' },
  msgDate: { fontSize: 10 },
  msgBody: { fontSize: 13, lineHeight: 18 },
  empty: { fontSize: 12, textAlign: 'center', paddingVertical: 12 },
  formCard: { padding: 14, borderRadius: 12, borderWidth: 1 },
  label: { fontSize: 12, fontWeight: '500', marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 11, paddingVertical: 9, fontSize: 14 },
  textArea: { minHeight: 110, textAlignVertical: 'top' },
  catChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 18, borderWidth: 1.5 },
  catText: { fontSize: 12, fontWeight: '500' },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 10, marginTop: 14 },
  submitText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  chatBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, marginBottom: 20 },
  chatBtnTitle: { color: '#fff', fontSize: 14, fontWeight: '600' },
  chatBtnDesc: { color: '#ffffffcc', fontSize: 11, marginTop: 1 },
});
