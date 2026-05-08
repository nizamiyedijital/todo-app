/**
 * AppSettings — kullanıcı tercihleri (font, locale, bildirim, görev varsayılan).
 *
 * Web parity: localStorage 'app_settings' JSON ile aynı key + alan adları
 * (index.html:12426 DEFAULT_SETTINGS). Mobile AsyncStorage backend.
 *
 * Profile (displayName) ProfileScreen tarafından, theme (themePref) zustand
 * store tarafından yönetilir; bu modül onları taşımaz, ama kayıt yaparken
 * AsyncStorage'daki aynı app_settings JSON içinde otururlar (parity).
 *
 * C3-C7 (zamanlı reminder'lar — reminders.*) bilinçli olarak Faz 5 server
 * automation'a bırakıldı, mobile'da lokal trigger yok.
 */
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const APP_SETTINGS_KEY = 'app_settings';

export type FontSize = 'small' | 'medium' | 'large';
export type DateFormat = 'DD/MM' | 'MM/DD' | 'YYYY-MM-DD';
export type TimeFormat = '24h' | '12h';
export type WeekStart = 'monday' | 'sunday';
export type DueReminder = 'none' | '30min' | '1hour' | '3hour' | '12hour' | '1day';
export type Priority = 'p1' | 'p2' | 'p3' | 'p4' | null;

export interface AppSettings {
  // Görünüm
  fontSize: FontSize;
  compact: boolean;
  // Görev davranışı
  autoHide: boolean;
  defaultPriority: Priority;
  completionAnim: boolean;
  // Bildirim
  notifEnabled: boolean;
  dueReminder: DueReminder;
  // Bölge
  dateFormat: DateFormat;
  timeFormat: TimeFormat;
  weekStart: WeekStart;
  // Profil (ProfileScreen tarafından yönetilir, burada sadece type için)
  displayName: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  fontSize: 'medium',
  compact: false,
  autoHide: false,
  defaultPriority: null,
  completionAnim: true,
  notifEnabled: false,
  dueReminder: 'none',
  dateFormat: 'DD/MM',
  timeFormat: '24h',
  weekStart: 'monday',
  displayName: '',
};

let _cache: AppSettings = { ...DEFAULT_SETTINGS };
let _loaded = false;
const _listeners = new Set<(s: AppSettings) => void>();

export async function loadAppSettings(): Promise<AppSettings> {
  try {
    const raw = await AsyncStorage.getItem(APP_SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      _cache = { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch { /* yoksay, default'la kal */ }
  _loaded = true;
  _listeners.forEach(fn => fn(_cache));
  return _cache;
}

export function getAppSettings(): AppSettings {
  return _cache;
}

export function isLoaded(): boolean {
  return _loaded;
}

export async function saveAppSetting<K extends keyof AppSettings>(
  key: K, value: AppSettings[K],
): Promise<void> {
  _cache = { ..._cache, [key]: value };
  try {
    await AsyncStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(_cache));
  } catch (e) {
    console.warn('[appSettings] save failed', e);
  }
  _listeners.forEach(fn => fn(_cache));
}

export async function saveAppSettings(patch: Partial<AppSettings>): Promise<void> {
  _cache = { ..._cache, ...patch };
  try {
    await AsyncStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(_cache));
  } catch (e) {
    console.warn('[appSettings] save failed', e);
  }
  _listeners.forEach(fn => fn(_cache));
}

export function subscribeAppSettings(fn: (s: AppSettings) => void): () => void {
  _listeners.add(fn);
  return () => { _listeners.delete(fn); };
}

/**
 * React hook — re-render eder appSettings değiştiğinde.
 * Genellikle PreferencesScreen, TaskRow, TaskEditor, format-bağımlı render
 * yerlerinde kullanılır.
 */
export function useAppSettings(): AppSettings {
  const [s, setS] = useState<AppSettings>(_cache);
  useEffect(() => subscribeAppSettings(setS), []);
  return s;
}
