/**
 * Liste icon render — web pattern'ine birebir port (index.html:6258, 8434).
 *
 * Web'de `mi('icon_name', size)` Material Icons font ile **tek renk**
 * (theme'e bağlı: aktif → accent, pasif → text3) render ediyor; emoji yok.
 * Mobile'da emoji fallback kullanmayız — sadece MaterialIcons + tema rengi.
 *
 * Bazı icon adları (`menu_book`, `soup_kitchen`) RN MaterialIcons setinde
 * yok; underscore→tire normalize ile resolve edilir; o da yoksa varsayılan
 * 'folder' icon'u kullanılır (web'in default'u).
 */
import React from 'react';
import { MaterialIcons } from '@expo/vector-icons';

type Props = {
  icon: string | null | undefined;
  size: number;
  color: string;
};

const ICON_NAME_RE = /^[a-z][a-z0-9_]*$/;
const GLYPH_MAP = (MaterialIcons as any).glyphMap as Record<string, number> | undefined;
const FALLBACK_ICON = 'folder';

/**
 * RN MaterialIcons setinde olmayan adlar için yakın eşdeğer.
 * Web'de Material Symbols font tüm adları destekliyor; vector-icons
 * bir subset. Burada admin'in seçtiği adın görsel anlamını koruyan
 * MaterialIcons name'i mapliyoruz.
 */
const ALIASES: Record<string, string> = {
  menu_book: 'menu-book',
  soup_kitchen: 'restaurant',
  yard: 'yard',
  draw: 'draw',
};

function resolveIconName(s: string): string | null {
  if (!ICON_NAME_RE.test(s)) return null;
  if (!GLYPH_MAP) return s;

  // 1. Direkt eşleşme
  if (GLYPH_MAP[s] !== undefined) return s;

  // 2. Underscore → tire varyantı (snake → kebab)
  const dashed = s.replace(/_/g, '-');
  if (GLYPH_MAP[dashed] !== undefined) return dashed;

  // 3. Alias map
  const alias = ALIASES[s];
  if (alias && GLYPH_MAP[alias] !== undefined) return alias;

  return null;
}

export default function ListIcon({ icon, size, color }: Props) {
  const resolved = icon ? resolveIconName(icon) : null;
  const finalName = (resolved ?? FALLBACK_ICON) as never;
  return <MaterialIcons name={finalName} size={size} color={color} />;
}

/**
 * String-only icon temsili — Alert.alert gibi React component render
 * edemeyen yerler için. Web'in `mi()` helper'ı yok, mobile'da Alert
 * native UI; emoji string en iyi gösterim. Yine de kullanıcının ham icon
 * adını yazmasını istemiyoruz.
 */
const EMOJI_FOR_ICON: Record<string, string> = {
  menu_book: '📚',
  soup_kitchen: '🍲',
  notifications: '🔔',
  label: '🏷️',
  checklist: '✅',
  yard: '🌿',
  draw: '✏️',
  book: '📖',
  folder: '📁',
};

export function iconToEmoji(icon: string | null | undefined): string {
  if (!icon) return '📁';
  if (!ICON_NAME_RE.test(icon)) return icon; // zaten emoji
  return EMOJI_FOR_ICON[icon] ?? '📁';
}
