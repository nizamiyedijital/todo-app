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

/** MaterialIcons name pattern: lowercase + alt-tire/alt-çizgi */
function isMaterialIconName(s: string | null | undefined): s is string {
  return !!s && /^[a-z][a-z0-9_]*$/.test(s);
}

export default function ListIcon({ icon, size, color, emojiStyle }: Props) {
  if (isMaterialIconName(icon)) {
    return <MaterialIcons name={icon as any} size={size} color={color} />;
  }
  return (
    <Text style={[{ fontSize: size * 0.85, color }, emojiStyle]}>
      {icon || '📋'}
    </Text>
  );
}
