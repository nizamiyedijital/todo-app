import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { Colors, getColors, ColorScheme } from './colors';
import { useStore } from '../state/store';
import { useAppSettings, FontSize } from '../lib/appSettings';

const FONT_SCALE: Record<FontSize, number> = { small: 0.9, medium: 1, large: 1.1 };

/**
 * Spacing tokens — TaskRow + BoardView gibi en yoğun padding kullanan
 * yerlerin compact moda tepki vermesi için. Compact'ta ~%75'e düşer.
 */
export interface Spacing {
  s2: number; s4: number; s6: number; s8: number; s10: number;
  s12: number; s14: number; s16: number;
}

function getSpacing(compact: boolean): Spacing {
  const m = compact ? 0.75 : 1;
  return {
    s2:  Math.round(2  * m),
    s4:  Math.round(4  * m),
    s6:  Math.round(6  * m),
    s8:  Math.round(8  * m),
    s10: Math.round(10 * m),
    s12: Math.round(12 * m),
    s14: Math.round(14 * m),
    s16: Math.round(16 * m),
  };
}

type ThemeCtx = {
  scheme: ColorScheme;
  colors: Colors;
  fontScale: number;
  compact: boolean;
  spacing: Spacing;
  /** fontScale'i mevcut fontSize değerine uygulama yardımcısı */
  fs: (size: number) => number;
};

const _defaultCtx: ThemeCtx = {
  scheme: 'light',
  colors: getColors('light'),
  fontScale: 1,
  compact: false,
  spacing: getSpacing(false),
  fs: (n) => n,
};

const Ctx = createContext<ThemeCtx>(_defaultCtx);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const sys = useColorScheme();
  const pref = useStore(s => s.themePref);
  const settings = useAppSettings();
  const scheme: ColorScheme = pref === 'system' ? (sys === 'dark' ? 'dark' : 'light') : pref;
  const colors = useMemo(() => getColors(scheme), [scheme]);
  const fontScale = FONT_SCALE[settings.fontSize] ?? 1;
  const compact = !!settings.compact;
  const spacing = useMemo(() => getSpacing(compact), [compact]);
  const value = useMemo<ThemeCtx>(() => ({
    scheme, colors, fontScale, compact, spacing,
    fs: (n: number) => Math.round(n * fontScale),
  }), [scheme, colors, fontScale, compact, spacing]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme(): ThemeCtx { return useContext(Ctx); }
