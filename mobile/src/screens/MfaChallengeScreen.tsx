import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';
import { mfaChallenge, mfaVerify, signOut } from '../lib/auth';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'MfaChallenge'>;

export default function MfaChallengeScreen({ route }: Props) {
  const { colors } = useTheme();
  const factorId = route.params.factorId;
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await mfaChallenge(factorId);
        setChallengeId(res.id);
      } catch (e: any) {
        setErr(e?.message || 'MFA challenge başarısız');
      }
    })();
  }, [factorId]);

  async function submit() {
    if (!challengeId) return;
    setErr(null); setLoading(true);
    try {
      await mfaVerify(factorId, challengeId, code);
    } catch (e: any) {
      setErr(e?.message || 'Doğrulama başarısız');
    } finally { setLoading(false); }
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]}>
      <View style={styles.card}>
        <Text style={[styles.title, { color: colors.text }]}>İki Adımlı Doğrulama</Text>
        <Text style={[styles.subtitle, { color: colors.text3 }]}>
          Authenticator uygulamandan 6 haneli kodu gir.
        </Text>

        {err && <Text style={[styles.err, { color: colors.danger }]}>{err}</Text>}

        <TextInput
          value={code} onChangeText={setCode}
          placeholder="000000" placeholderTextColor={colors.text4}
          keyboardType="number-pad" maxLength={6} autoFocus
          style={[styles.codeInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
        />

        <TouchableOpacity onPress={submit} disabled={loading || code.length !== 6}
          style={[styles.btn, { backgroundColor: colors.accent, opacity: loading || code.length !== 6 ? 0.5 : 1 }]}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Doğrula</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => signOut()} style={styles.switch}>
          <Text style={{ color: colors.text3 }}>İptal (Çıkış yap)</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  card: { flex: 1, padding: 24, justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '700', textAlign: 'center' },
  subtitle: { fontSize: 14, textAlign: 'center', marginTop: 8, marginBottom: 24 },
  codeInput: { fontSize: 28, letterSpacing: 8, textAlign: 'center', borderWidth: 1.5, borderRadius: 12, paddingVertical: 16 },
  btn: { marginTop: 20, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  err: { fontSize: 13, marginBottom: 8 },
  switch: { marginTop: 20, alignItems: 'center' },
});
