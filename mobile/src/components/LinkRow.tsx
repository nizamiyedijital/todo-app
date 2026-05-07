/**
 * Bir görev üzerindeki bağlantı listesi editörü — web'in
 * #addLinkInput + chip listesi UX'inin mobile parity'si.
 *
 * Davranış:
 * - Üstte TextInput + "Ekle" butonu (Enter de ekler)
 * - Altta chip listesi: her URL için link-ikon + label + ✕
 * - URL boşsa veya geçersizse Toast/Alert ile uyar
 * - Geriye uyumlu: TaskEditor `getTaskLinks(task)` ile çağırır,
 *   onChange yeni `links` array'ini döner; üst component patchTask
 *   ile `{ links: [...], link: null }` yazar.
 */
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Linking, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider';

type Props = {
  value: string[];
  onChange: (next: string[]) => void;
};

export default function LinkRow({ value, onChange }: Props) {
  const { colors } = useTheme();
  const [draft, setDraft] = useState('');

  const add = () => {
    const url = draft.trim();
    if (!url) return;
    const norm = normalizeUrl(url);
    if (!norm) {
      Alert.alert('Geçersiz bağlantı', 'Geçerli bir URL gir (örn. https://...).');
      return;
    }
    if (value.includes(norm)) {
      setDraft('');
      return;
    }
    onChange([...value, norm]);
    setDraft('');
  };

  const remove = (url: string) => {
    onChange(value.filter(u => u !== url));
  };

  const open = (url: string) => {
    Linking.openURL(url).catch(() => Alert.alert('Açılamadı', 'Bu bağlantı açılamadı.'));
  };

  return (
    <View>
      <View style={[styles.inputRow, { borderColor: colors.border2, backgroundColor: colors.surface }]}>
        <MaterialIcons name="link" size={16} color={colors.text3} />
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={add}
          onBlur={() => { if (draft.trim()) add(); }}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          returnKeyType="done"
          placeholder="https://…"
          placeholderTextColor={colors.text4}
          style={[styles.input, { color: colors.text }]}
        />
        {!!draft.trim() && (
          <TouchableOpacity onPress={add} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
            <MaterialIcons name="add-circle" size={22} color={colors.accent} />
          </TouchableOpacity>
        )}
      </View>

      {value.length > 0 && (
        <View style={styles.chipsWrap}>
          {value.map((url) => (
            <View
              key={url}
              style={[styles.chip, { borderColor: colors.border, backgroundColor: colors.surface }]}
            >
              <TouchableOpacity onPress={() => open(url)} style={styles.chipTouch}>
                <MaterialIcons name="link" size={14} color={colors.accent} />
                <Text numberOfLines={1} style={[styles.chipText, { color: colors.accent }]}>
                  {linkLabel(url)}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => remove(url)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                <MaterialIcons name="close" size={14} color={colors.text3} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function normalizeUrl(input: string): string | null {
  let u = input.trim();
  if (!u) return null;
  if (!/^https?:\/\//i.test(u)) {
    if (!u.includes('.')) return null;
    u = 'https://' + u;
  }
  try {
    const parsed = new URL(u);
    if (!parsed.hostname.includes('.')) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

export function linkLabel(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '') + (u.pathname !== '/' ? u.pathname : '');
  } catch {
    return url;
  }
}

const styles = StyleSheet.create({
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  input: { flex: 1, fontSize: 14, paddingVertical: 8 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    maxWidth: '100%',
  },
  chipTouch: { flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: 220 },
  chipText: { fontSize: 12, fontWeight: '500' },
});
