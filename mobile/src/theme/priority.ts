import type { PriorityKey } from '../types/db';

export type PriorityMeta = {
  symbol: string;
  color: string;
  shadow: string;
  tooltip: string;
  label: string;
};

export const PRIORITIES: Record<PriorityKey, PriorityMeta> = {
  p0: { symbol: '5dk', color: '#0ea5e9', shadow: '#bae6fd', tooltip: 'Çok Kısa\nHemen Yap',                label: 'Çok Kısa — Hemen Yap' },
  p1: { symbol: '!!!', color: '#dc2626', shadow: '#fca5a5', tooltip: 'Önemli · Acil\nHemen Yap',            label: 'Önemli · Acil — Hemen Yap' },
  p2: { symbol: '!!',  color: '#f97316', shadow: '#fed7aa', tooltip: 'Önemli, Acil Değil\nGün-Saat Planla', label: 'Önemli, Acil Değil — Gün-Saat Planla' },
  p3: { symbol: '!',   color: '#eab308', shadow: '#fef08a', tooltip: 'Acil, Önemsiz\nHızlı Yönet, Devret',  label: 'Acil, Önemsiz — Hızlı Yönet, Devret' },
  p4: { symbol: 'zzz', color: '#94a3b8', shadow: '#e2e8f0', tooltip: 'Acil Değil, Önemsiz\nErtele, Sil',    label: 'Acil Değil, Önemsiz — Ertele, Sil' },
};

export const PRIORITY_KEYS: PriorityKey[] = ['p0', 'p1', 'p2', 'p3', 'p4'];
