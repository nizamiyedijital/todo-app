/**
 * Liste icon render — l.icon ya MaterialIcons name ('notifications',
 * 'menu_book', 'soup_kitchen') ya da emoji ('📋', '⭐') olabilir.
 *
 * Web tarafında material-icons font ile her ikisi de doğal render edilir;
 * mobile RN'de MaterialIcons component vs Text ayrı yollar gerektiriyor.
 * Bu component string'i regex ile tespit edip uygun render eder.
 *
 * Reuse: ListSidebar (drawer + liste başlık card'ı), TaskEditor (liste chip).
 */
import React from 'react';
import { Text, StyleProp, TextStyle } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

type Props = {
  icon: string | null | undefined;
  size: number;
  color: string;
  emojiStyle?: StyleProp<TextStyle>;
};

/**
 * MaterialIcons paketinin tanıdığı icon adlarının glyph map'i.
 * Web'in Material Symbols font'undaki bazı isimler (örn. "menu_book",
 * "soup_kitchen") burada yok → emoji fallback'e düş.
 */
const ICON_NAME_RE = /^[a-z][a-z0-9_]*$/;
const GLYPH_MAP = (MaterialIcons as any).glyphMap as Record<string, number> | undefined;

function resolveIconName(s: string): string | null {
  if (!ICON_NAME_RE.test(s)) return null;
  if (GLYPH_MAP) {
    if (GLYPH_MAP[s] !== undefined) return s;
    // Bazı icon'lar vector-icons'ta tire ile: "menu_book" → "menu-book"
    const dashed = s.replace(/_/g, '-');
    if (GLYPH_MAP[dashed] !== undefined) return dashed;
    return null;
  }
  return s;
}

/**
 * Web tarafındaki Material Symbols font'una karşılık olarak hangi
 * emoji'nin gösterileceğine dair eşleme — RN MaterialIcons setinde
 * olmayan ikon adları için fallback. Eksik kalırsa 📋 gösterilir.
 */
const EMOJI_FALLBACK: Record<string, string> = {
  menu_book: '📚',
  soup_kitchen: '🍲',
  notifications: '🔔',
  label: '🏷️',
  checklist: '✅',
  yard: '🌿',
  draw: '✏️',
  book: '📖',
};

/**
 * String-only icon temsili — `Alert.alert` gibi React component
 * render edemeyen yerler için. Emoji ya da varsayılan 📋 döner.
 * Web'in `notifications`/`menu_book` gibi MaterialIcons name'lerini
 * görsel emoji'ye çevirir; zaten emoji ise olduğu gibi.
 */
export function iconToEmoji(icon: string | null | undefined): string {
  if (!icon) return '📋';
  if (!ICON_NAME_RE.test(icon)) return icon; // zaten emoji
  return EMOJI_FALLBACK[icon] ?? '📋';
}

export default function ListIcon({ icon, size, color, emojiStyle }: Props) {
  if (icon) {
    const resolved = resolveIconName(icon);
    if (resolved) {
      return <MaterialIcons name={resolved as any} size={size} color={color} />;
    }
    if (EMOJI_FALLBACK[icon]) {
      return (
        <Text style={[{ fontSize: size * 0.85, color }, emojiStyle]}>
          {EMOJI_FALLBACK[icon]}
        </Text>
      );
    }
  }
  return (
    <Text style={[{ fontSize: size * 0.85, color }, emojiStyle]}>
      {icon && !ICON_NAME_RE.test(icon) ? icon : '📋'}
    </Text>
  );
}
