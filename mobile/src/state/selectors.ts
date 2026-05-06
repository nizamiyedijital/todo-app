import type { Todo, List, BalanceCategory } from '../types/db';
import { STARRED_LIST_ID, BOARD_LIST_ID, WEEKLY_LIST_ID } from '../types/db';
import {
  BALANCE_CATEGORIES, TARGET_RATIOS, BALANCE_RATIO_TOLERANCE,
  DEFAULT_TASK_MINUTES, type BalanceState,
} from '../theme/balance';

export function selectVisibleTasks(tasks: Todo[], activeListId: string): Todo[] {
  const roots = tasks.filter(t => !t.parent_id);
  if (activeListId === STARRED_LIST_ID) return roots.filter(t => t.starred);
  if (activeListId === BOARD_LIST_ID)   return roots;
  if (activeListId === WEEKLY_LIST_ID)  return roots;
  return roots.filter(t => t.category === activeListId);
}

export function selectSubtasks(tasks: Todo[], parentId: string): Todo[] {
  return tasks.filter(t => t.parent_id === parentId);
}

export function selectListCounts(tasks: Todo[], lists: List[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const l of lists) out[l.id] = 0;
  for (const t of tasks) {
    if (t.parent_id || t.done) continue;
    if (t.category in out) out[t.category]++;
  }
  return out;
}

export function selectStarredCount(tasks: Todo[]): number {
  return tasks.filter(t => !t.parent_id && t.starred && !t.done).length;
}

/**
 * Aktif liste için Aktif Yaşam Dengesi istatistikleri — web'in
 * calculateListStats() fonksiyonu ile birebir uyumlu.
 */
export interface BalanceStats {
  taskCount: number;
  totalMinutes: number;
  starredCount: number;
  minutes: Record<BalanceCategory, number>;
  ratios: Record<BalanceCategory, number>;
  total: number; // dakika toplamı (kategorize olanlar)
  state: BalanceState;
  stateLabel: string;
}

export function selectBalanceStats(tasks: Todo[], activeListId: string): BalanceStats {
  const items = tasks.filter(t => {
    if (t.parent_id) return false;
    if (activeListId === STARRED_LIST_ID) return !!t.starred;
    if (activeListId === BOARD_LIST_ID) return true;
    return t.category === activeListId;
  });
  const active = items.filter(t => !t.done);
  const totalMinutes = active.reduce((s, t) => {
    const m = t.estimated_minutes != null && t.estimated_minutes >= 0 ? t.estimated_minutes : 0;
    return s + m;
  }, 0);
  const starredCount = active.filter(t => t.starred).length;
  const sum: Record<BalanceCategory, number> = { mental: 0, physical: 0, spiritual: 0 };
  for (const t of active) {
    if (t.balance_category && BALANCE_CATEGORIES[t.balance_category]) {
      const m = t.estimated_minutes != null && t.estimated_minutes >= 0 ? t.estimated_minutes : DEFAULT_TASK_MINUTES;
      sum[t.balance_category] += m;
    }
  }
  const total = sum.mental + sum.physical + sum.spiritual;
  const ratios: Record<BalanceCategory, number> = total > 0
    ? {
        mental: (sum.mental / total) * 100,
        physical: (sum.physical / total) * 100,
        spiritual: (sum.spiritual / total) * 100,
      }
    : { mental: 0, physical: 0, spiritual: 0 };

  let state: BalanceState;
  let stateLabel: string;
  if (active.length === 0) {
    state = 'empty'; stateLabel = 'Boş Liste';
  } else if (total === 0) {
    state = 'no_category'; stateLabel = 'Kategori Atanmamış';
  } else {
    const inTol = (Object.keys(TARGET_RATIOS) as BalanceCategory[]).every(
      k => Math.abs(ratios[k] - TARGET_RATIOS[k]) <= BALANCE_RATIO_TOLERANCE[k],
    );
    if (inTol) {
      state = 'balanced'; stateLabel = 'Dengeli';
    } else {
      const sorted = (Object.entries(ratios) as [BalanceCategory, number][]).sort((a, b) => b[1] - a[1]);
      const dom = sorted[0][0];
      state = `${dom}_heavy` as BalanceState;
      stateLabel = `${BALANCE_CATEGORIES[dom].label} Ağırlıklı`;
    }
  }

  return {
    taskCount: active.length,
    totalMinutes,
    starredCount,
    minutes: sum,
    ratios,
    total,
    state,
    stateLabel,
  };
}
