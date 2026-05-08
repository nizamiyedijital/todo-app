/**
 * Profil — kullanıcının görünen ad düzenlemesi (web app_settings.displayName parity).
 *
 * Web (index.html:13726): displayName localStorage'da app_settings JSON içinde.
 * Mobile'da AsyncStorage aynı key ile uyumlu — Crisp identify, profil
 * menüsü, support_tickets.user_name vb. yerlerde okunur.
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, ScrollView, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../theme/ThemeProvider';
import { useStore } from '../state/store';

const APP_SETTINGS_KEY = 'app_settings';

export default function ProfileScreen() {
  const nav = useNavigation();
  const { colors } = useTheme();
  const session = useStore(s => s.session);

  const [displayName, setDisplayName] = useState('');
  const [original, setOriginal] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(APP_SETTINGS_KEY);
        const s = raw ? JSON.parse(raw) : {};
        const name = (s.displayName ?? '').toString();
        setDisplayName(name);
        setOriginal(name);
      } catch {
        // sessizce boş
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const dirty = displayName.trim() !== original.trim();

  async function save() {
    setSaving(true);
    try {
      const raw = await AsyncStorage.getItem(APP_SETTINGS_KEY);
      const s = raw ? JSON.parse(raw) : {};
      s.displayName = displayName.trim();
      await AsyncStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(s));
      setOriginal(displayName.trim());
      Alert.alert('Kaydedildi', 'Profil bilgilerin güncellendi.');
    } catch (e: any) {
      Alert.alert('Hata', e?.message || 'Kaydedilemedi');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.header, { borderBottomColor: colors.border2 }]}>
        <TouchableOpacity onPress={() => nav.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text2} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Profil</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {loading ? (
            <ActivityIndicator color={colors.accent} style={{ marginTop: 32 }} />
          ) : (
            <>
              <Text style={[styles.label, { color: colors.text3 }]}>E-posta</Text>
              <View style={[styles.readonly, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.readonlyText, { color: colors.text2 }]}>
                  {session?.user?.email ?? '—'}
                </Text>
              </View>
              <Text style={[styles.helper, { color: colors.text4 }]}>
                E-postanı değiştirmek için destek ile iletişime geç.
              </Text>

              <Text style={[styles.label, { color: colors.text3, marginTop: 18 }]}>Görünen Ad</Text>
              <TextInput
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Adın"
                placeholderTextColor={colors.text4}
                maxLength={60}
                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              />
              <Text style={[styles.helper, { color: colors.text4 }]}>
                Profil menüsünde, destek taleplerinde ve canlı sohbette gösterilir.
              </Text>

              <TouchableOpacity
                onPress={save}
                disabled={!dirty || saving}
                style={[
                  styles.saveBtn,
                  { backgroundColor: dirty ? colors.accent : colors.surface2, opacity: saving ? 0.6 : 1 },
                ]}
              >
                {saving
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={[styles.saveText, { color: dirty ? '#fff' : colors.text3 }]}>
                      Kaydet
                    </Text>}
              </TouchableOpacity>
            </>
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
  label: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  readonly: {
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
  },
  readonlyText: { fontSize: 15 },
  input: {
    borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15,
  },
  helper: { fontSize: 11, marginTop: 6 },
  saveBtn: {
    marginTop: 24, paddingVertical: 14, borderRadius: 12, alignItems: 'center',
  },
  saveText: { fontSize: 15, fontWeight: '600' },
});
