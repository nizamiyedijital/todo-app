import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';
import { signIn, hasVerifiedTotp } from '../lib/auth';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setErr(null); setLoading(true);
    try {
      await signIn(email.trim(), password);
      const mfa = await hasVerifiedTotp();
      if (mfa.has && mfa.factorId) {
        navigation.replace('MfaChallenge', { factorId: mfa.factorId });
      }
      // else: RootNavigator detects session and swaps to AppDrawer
    } catch (e: any) {
      setErr(e?.message || 'Giriş başarısız');
    } finally { setLoading(false); }
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.card}>
          <Text style={[styles.title, { color: colors.text }]}>Yapılacaklar</Text>
          <Text style={[styles.subtitle, { color: colors.text3 }]}>Görevlerini planla, takip et.</Text>
          <Text style={[styles.heading, { color: colors.text }]}>Giriş Yap</Text>

          {err && <Text style={[styles.err, { color: colors.danger }]}>{err}</Text>}

          <Text style={[styles.label, { color: colors.text2 }]}>E-posta</Text>
          <TextInput
            value={email} onChangeText={setEmail}
            placeholder="ornek@mail.com" placeholderTextColor={colors.text4}
            autoCapitalize="none" autoComplete="email" keyboardType="email-address"
            style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
          />

          <Text style={[styles.label, { color: colors.text2 }]}>Şifre</Text>
          <TextInput
            value={password} onChangeText={setPassword}
            placeholder="••••••••" placeholderTextColor={colors.text4}
            secureTextEntry autoComplete="password"
            style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
          />

          <TouchableOpacity
            onPress={submit} disabled={loading}
            style={[styles.btn, { backgroundColor: colors.accent, opacity: loading ? 0.7 : 1 }]}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>Giriş Yap</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('Signup')} style={styles.switch}>
            <Text style={{ color: colors.accent }}>Hesabın yok mu? Kayıt ol</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1 },
  card:    { flex: 1, padding: 24, justifyContent: 'center' },
  title:   { fontSize: 28, fontWeight: '700', textAlign: 'center' },
  subtitle:{ fontSize: 14, textAlign: 'center', marginTop: 6, marginBottom: 24 },
  heading: { fontSize: 18, fontWeight: '600', marginBottom: 16 },
  label:   { fontSize: 13, fontWeight: '500', marginBottom: 6, marginTop: 10 },
  input:   { borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  btn:     { marginTop: 20, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  err:     { fontSize: 13, marginBottom: 8 },
  switch:  { marginTop: 16, alignItems: 'center' },
});
