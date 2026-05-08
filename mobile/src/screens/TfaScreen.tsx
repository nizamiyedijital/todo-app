/**
 * 2FA / İki Adımlı Doğrulama — TOTP setup + manage.
 *
 * Web parity (index.html:13866-13950 loadTfaStatus + startTfaEnroll +
 * verifyTfaEnroll + tfaAction). Akış:
 *   1. listFactors() → totp+verified varsa "Açık" durum + Kapat butonu
 *   2. Yoksa "Etkinleştir" → mfa.enroll → QR + secret + challenge
 *   3. Kullanıcı authenticator app'inde QR taratır + 6 haneli kod girer
 *   4. mfa.verify(factor_id, challenge_id, code) → aktif
 *   5. Kapatma: mfa.unenroll(factor_id)
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, ScrollView, Alert, Image, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeProvider';
import { supabase } from '../lib/supabase';

type EnrollState = {
  factorId: string;
  challengeId: string;
  qrCode: string;       // data:image/png;base64,... veya SVG data URL
  secret: string;
};

export default function TfaScreen() {
  const nav = useNavigation();
  const { colors } = useTheme();

  const [loading, setLoading] = useState(true);
  const [activeFactorId, setActiveFactorId] = useState<string | null>(null);
  const [enroll, setEnroll] = useState<EnrollState | null>(null);
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      const verified = (data?.all ?? []).find(
        (f: any) => f.factor_type === 'totp' && f.status === 'verified',
      );
      setActiveFactorId(verified?.id ?? null);
      setEnroll(null);
      setCode('');
    } catch (e: any) {
      Alert.alert('Hata', e?.message || 'Durum alınamadı');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadStatus(); }, [loadStatus]);

  async function startEnroll() {
    setLoading(true);
    try {
      const { data: enrollData, error: enrollErr } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Disiplan Mobile',
      });
      if (enrollErr) throw enrollErr;
      const factorId = enrollData!.id;
      const { data: chData, error: chErr } = await supabase.auth.mfa.challenge({ factorId });
      if (chErr) throw chErr;
      setEnroll({
        factorId,
        challengeId: chData!.id,
        qrCode: enrollData!.totp.qr_code,
        secret: enrollData!.totp.secret,
      });
    } catch (e: any) {
      Alert.alert('Hata', e?.message || 'Etkinleştirme başlatılamadı');
    } finally {
      setLoading(false);
    }
  }

  async function verifyEnroll() {
    if (!enroll) return;
    if (code.trim().length !== 6) { Alert.alert('Hata', '6 haneli kodu gir'); return; }
    setVerifying(true);
    try {
      const { error } = await supabase.auth.mfa.verify({
        factorId: enroll.factorId,
        challengeId: enroll.challengeId,
        code: code.trim(),
      });
      if (error) throw error;
      Alert.alert('Başarılı', '2FA etkinleştirildi.');
      await loadStatus();
    } catch (e: any) {
      const msg = (e?.message || '').includes('Invalid')
        ? 'Kod hatalı, tekrar dene'
        : (e?.message || 'Doğrulanamadı');
      Alert.alert('Hata', msg);
      setCode('');
    } finally {
      setVerifying(false);
    }
  }

  async function unenroll() {
    if (!activeFactorId) return;
    Alert.alert(
      '2FA\'yı kapat',
      '2FA\'yı devre dışı bırakmak istediğinden emin misin?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Kapat', style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const { error } = await supabase.auth.mfa.unenroll({ factorId: activeFactorId });
              if (error) throw error;
              await loadStatus();
            } catch (e: any) {
              Alert.alert('Hata', e?.message || 'Kapatılamadı');
              setLoading(false);
            }
          },
        },
      ],
    );
  }

  const cancelEnroll = () => { setEnroll(null); setCode(''); };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.header, { borderBottomColor: colors.border2 }]}>
        <TouchableOpacity onPress={() => nav.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text2} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>İki Adımlı Doğrulama</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {loading ? (
            <ActivityIndicator color={colors.accent} style={{ marginTop: 32 }} />
          ) : enroll ? (
            <View>
              <Text style={[styles.heading, { color: colors.text }]}>Authenticator app ile bağla</Text>
              <Text style={[styles.body, { color: colors.text3 }]}>
                Google Authenticator, Authy veya 1Password gibi bir uygulama aç,
                aşağıdaki QR kodu tarat (veya secret'i kopyala). Sonra 6 haneli kodu gir.
              </Text>

              <View style={[styles.qrWrap, { backgroundColor: '#fff' }]}>
                <Image source={{ uri: enroll.qrCode }} style={styles.qr} />
              </View>

              <Text style={[styles.label, { color: colors.text3 }]}>Secret (manuel ekleme)</Text>
              <View style={[styles.secretBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.secretText, { color: colors.text }]} selectable>
                  {enroll.secret}
                </Text>
              </View>

              <Text style={[styles.label, { color: colors.text3, marginTop: 18 }]}>Doğrulama Kodu</Text>
              <TextInput
                value={code}
                onChangeText={t => setCode(t.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                placeholderTextColor={colors.text4}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
                textContentType="oneTimeCode"
                style={[styles.codeInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              />

              <View style={styles.btnRow}>
                <TouchableOpacity onPress={cancelEnroll} style={[styles.btn, { borderColor: colors.border, borderWidth: 1 }]}>
                  <Text style={[styles.btnText, { color: colors.text2 }]}>Vazgeç</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={verifyEnroll}
                  disabled={verifying || code.length !== 6}
                  style={[styles.btn, { backgroundColor: colors.accent, opacity: verifying || code.length !== 6 ? 0.5 : 1 }]}
                >
                  {verifying
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={[styles.btnText, { color: '#fff' }]}>Doğrula</Text>}
                </TouchableOpacity>
              </View>
            </View>
          ) : activeFactorId ? (
            <View>
              <View style={[styles.statusCard, { borderColor: '#16a34a', backgroundColor: '#f0fdf4' }]}>
                <MaterialIcons name="verified-user" size={32} color="#16a34a" />
                <Text style={[styles.statusTitle, { color: '#065f46' }]}>2FA Açık</Text>
                <Text style={[styles.statusBody, { color: '#065f46' }]}>
                  Hesabın iki adımlı doğrulama ile korunuyor. Yeni cihazlarda
                  giriş yaparken authenticator app'inden 6 haneli kod istenecek.
                </Text>
              </View>
              <TouchableOpacity
                onPress={unenroll}
                style={[styles.btn, { borderWidth: 1, borderColor: colors.danger, marginTop: 24 }]}
              >
                <Text style={[styles.btnText, { color: colors.danger }]}>2FA'yı Kapat</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <View style={[styles.statusCard, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <MaterialIcons name="shield" size={32} color={colors.text3} />
                <Text style={[styles.statusTitle, { color: colors.text }]}>2FA Kapalı</Text>
                <Text style={[styles.statusBody, { color: colors.text3 }]}>
                  İki adımlı doğrulama hesabını şifren çalınsa bile korur.
                  Authenticator app gerek (Google Authenticator, Authy, 1Password vb.).
                </Text>
              </View>
              <TouchableOpacity
                onPress={startEnroll}
                style={[styles.btn, { backgroundColor: colors.accent, marginTop: 24 }]}
              >
                <Text style={[styles.btnText, { color: '#fff' }]}>Etkinleştir</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1,
  },
  title: { fontSize: 17, fontWeight: '600' },
  heading: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  body: { fontSize: 13, lineHeight: 20, marginBottom: 16 },
  qrWrap: {
    width: 220, height: 220, alignSelf: 'center',
    borderRadius: 12, padding: 12, marginVertical: 16,
  },
  qr: { width: '100%', height: '100%' },
  label: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  secretBox: {
    borderWidth: 1, borderRadius: 8, padding: 10,
  },
  secretText: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 13, letterSpacing: 1 },
  codeInput: {
    borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 14,
    fontSize: 22, fontWeight: '700', letterSpacing: 8, textAlign: 'center',
  },
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 18 },
  btn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  btnText: { fontSize: 15, fontWeight: '600' },
  statusCard: {
    borderWidth: 1, borderRadius: 12, padding: 20, alignItems: 'center', gap: 10,
  },
  statusTitle: { fontSize: 18, fontWeight: '700' },
  statusBody: { fontSize: 13, lineHeight: 20, textAlign: 'center' },
});
