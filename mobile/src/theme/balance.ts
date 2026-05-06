/**
 * Aktif Yaşam Dengesi sabitleri — web index.html ile birebir uyumlu.
 * Hedef oranlar: 480/120/40 dk (mental/physical/spiritual) = %75/%19/%6.
 *
 * Web'in BALANCE_CATEGORIES + TARGET_RATIOS + BALANCE_RATIO_TOLERANCE +
 * BALANCE_STATUS + MIN_THRESHOLDS sabitleri buraya mirror edildi.
 */
import type { BalanceCategory } from '../types/db';

export const BALANCE_CATEGORIES: Record<BalanceCategory, {
  key: BalanceCategory;
  label: string;
  color: string;
  soft: string;
  icon: string;
}> = {
  mental:    { key: 'mental',    label: 'Zihin', color: '#5B9BD5', soft: '#dceaf6', icon: 'psychology' },
  physical:  { key: 'physical',  label: 'Beden', color: '#22c55e', soft: '#d4f4e0', icon: 'directions-run' },
  spiritual: { key: 'spiritual', label: 'Kalp',  color: '#a855f7', soft: '#ede0fa', icon: 'favorite' },
};

export const DEFAULT_TASK_MINUTES = 30;

export const TARGET_RATIOS: Record<BalanceCategory, number> = {
  mental: 75, physical: 19, spiritual: 6,
};

export const BALANCE_RATIO_TOLERANCE: Record<BalanceCategory, number> = {
  mental: 15, physical: 10, spiritual: 5,
};

export const MIN_THRESHOLDS: Record<BalanceCategory, number> = {
  mental: 25, physical: 20, spiritual: 10,
};

export type BalanceState =
  | 'empty'
  | 'no_category'
  | 'balanced'
  | 'mental_heavy'
  | 'physical_heavy'
  | 'spiritual_heavy';

export const BALANCE_STATE_LABELS: Record<BalanceState, { label: string; color: string }> = {
  empty:           { label: 'Boş Liste',         color: '#94a3b8' },
  no_category:     { label: 'Kategori Atanmamış', color: '#94a3b8' },
  balanced:        { label: 'Dengeli',           color: '#22c55e' },
  mental_heavy:    { label: 'Zihin Ağırlıklı',   color: '#5B9BD5' },
  physical_heavy:  { label: 'Beden Ağırlıklı',   color: '#22c55e' },
  spiritual_heavy: { label: 'Kalp Ağırlıklı',    color: '#a855f7' },
};
