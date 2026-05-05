import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { Colors, getColors, ColorScheme } from './colors';
import { useStore } from '../state/store';

type ThemeCtx = { scheme: ColorScheme; colors: Colors };

const Ctx = createContext<ThemeCtx>({ scheme: 'light', colors: getColors('light') });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const sys = useColorScheme();
  const pref = useStore(s => s.themePref);
  const scheme: ColorScheme = pref === 'system' ? (sys === 'dark' ? 'dark' : 'light') : pref;
  const colors = useMemo(() => getColors(scheme), [scheme]);
  return <Ctx.Provider value={{ scheme, colors }}>{children}</Ctx.Provider>;
}

export function useTheme(): ThemeCtx { return useContext(Ctx); }
