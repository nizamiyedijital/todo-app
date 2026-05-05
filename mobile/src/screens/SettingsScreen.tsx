import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeProvider';
import { useStore } from '../state/store';
import type { ThemePref } from '../state/store';

export default function SettingsScreen() {
  const nav = useNavigation();
  const { colors } = useTheme();
  const themePref = useStore(s => s.themePref);
  const setThemePref = useStore(s => s.setThemePref);

  const prefs: { key: ThemePref; label: string }[] = [
    { key: 'system', label: 'Sistem' },
    { key: 'light',  label: 'Açık' },
    { key: 'dark',   label: 'Koyu' },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.header, { borderBottomColor: colors.border2 }]}>
        <TouchableOpacity onPress={() => nav.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text2} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Ayarlar</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={{ padding: 16 }}>
        <Text style={[styles.section, { color: colors.text3 }]}>Tema</Text>
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
      </View>
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
});
