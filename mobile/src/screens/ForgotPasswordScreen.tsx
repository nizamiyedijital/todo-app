/**
 * Şifremi unuttum — Supabase auth.resetPasswordForEmail çağrısı.
 * Email'deki link kullanıcıyı web app reset-password sayfasına götürür
 * (web'de yeni şifre set edilir, sonra kullanıcı geri dönüp giriş yapar).
 *
 * Mobile'da deep-link tabanlı reset karmaşık (universal links + token
 * exchange); şu an web fallback yeterli.
 */
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider';
import { supabase } from '../lib/supabase';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

const RESET_REDIRECT = 'https://nizamiyedijital.github.io/gun3/reset-password.html';

export default function ForgotPasswordScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    const trimmed = email.trim();
    if (!trimmed) { setErr('E-posta gerekli'); return; }
    setErr(null); setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo: RESET_REDIRECT,
      });
      if (error) throw error;
      setSent(true);
    } catch (e: any) {
      setErr(e?.message || 'Bir sorun oluştu');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.card}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
            <MaterialIcons name="arrow-back" size={22} color={colors.text2} />
            <Text style={{ color: colors.text2, fontSize: 14 }}>Geri</Text>
          </TouchableOpacity>

          <Text style={[styles.heading, { color: colors.text }]}>Şifremi Unuttum</Text>

          {sent ? (
            <View>
              <View style={[styles.successBox, { borderColor: colors.accent, backgroundColor: colors.accentBg }]}>
                <MaterialIcons name="mark-email-read" size={32} color={colors.accent} />
                <Text style={[styles.successTitle, { color: colors.text }]}>E-posta gönderildi</Text>
                <Text style={[styles.successBody, { color: colors.text2 }]}>
                  {email.trim()} adresine şifre sıfırlama bağlantısı gönderdik. Tarayıcıda
                  açıp yeni şifreni belirle, sonra buraya dönüp giriş yap.
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => navigation.navigate('Login')}
                style={[styles.btn, { backgroundColor: colors.accent }]}
              >
                <Text style={styles.btnText}>Giriş Ekranına Dön</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={[styles.body, { color: colors.text3 }]}>
                Hesabına bağlı e-posta adresini gir; şifreni sıfırlama bağlantısı yollayalım.
              </Text>

              {err && <Text style={[styles.err, { color: colors.danger }]}>{err}</Text>}

              <Text style={[styles.label, { color: colors.text2 }]}>E-posta</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="ornek@mail.com"
                placeholderTextColor={colors.text4}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
              />

              <TouchableOpacity
                onPress={submit}
                disabled={loading}
                style={[styles.btn, { backgroundColor: colors.accent, opacity: loading ? 0.7 : 1 }]}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.btnText}>Sıfırlama Bağlantısı Gönder</Text>}
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  card: { flex: 1, padding: 24, justifyContent: 'center' },
  back: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 20 },
  heading: { fontSize: 22, fontWeight: '700', marginBottom: 12 },
  body: { fontSize: 14, lineHeight: 20, marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '500', marginBottom: 6, marginTop: 10 },
  input: { borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  btn: { marginTop: 20, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  err: { fontSize: 13, marginBottom: 8 },
  successBox: {
    borderWidth: 1, borderRadius: 12, padding: 20, alignItems: 'center', gap: 12,
  },
  successTitle: { fontSize: 16, fontWeight: '700' },
  successBody: { fontSize: 13, lineHeight: 20, textAlign: 'center' },
});
