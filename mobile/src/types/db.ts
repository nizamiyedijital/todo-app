export type PriorityKey = 'p0' | 'p1' | 'p2' | 'p3' | 'p4';
export type BalanceCategory = 'mental' | 'physical' | 'spiritual';

export type Todo = {
  id: string;
  text: string;
  done: boolean;
  category: string;
  parent_id: string | null;
  due_at: string | null;
  priority: PriorityKey | null;
  starred: boolean | null;
  notes: string | null;
  /** @deprecated Web'de `links` array'ine migrate edildi; eski kayıtlar için okuma fallback'i */
  link: string | null;
  /** Web ile birebir: jsonb/text[] array. Yeni kayıtlarda bu alan kullanılır. */
  links: string[] | null;
  balance_category: BalanceCategory | null;
  estimated_minutes: number | null;
  completed_at: string | null;
  sort_order: number;
  created_at: string;
  user_id?: string;
};

/**
 * Bir görevin link'lerini normalize edip okuma — `links` array'i varsa onu,
 * yoksa eski tek `link` text'ini tek-eleman array gibi döner. Web'in
 * `_taskLinkArr` helper'ıyla aynı kontrat.
 */
export function getTaskLinks(task: Pick<Todo, 'links' | 'link'>): string[] {
  if (Array.isArray(task.links) && task.links.length > 0) {
    // Dedupe — eski kayıtlarda aynı URL 2 kez yazılmış olabilir
    // (link → links migration artığı). React duplicate key warning'i
    // önlemek için Set ile uniq.
    return Array.from(new Set(task.links.filter(Boolean)));
  }
  if (task.link) return [task.link];
  return [];
}

export type List = {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  sort_order: number;
  created_at: string;
  user_id?: string;
};

export const STARRED_LIST_ID = '__starred__';
export const BOARD_LIST_ID   = '__board__';
export const WEEKLY_LIST_ID  = '__weekly__';

/**
 * TaskEditor "yeni görev" modu için özel id (Sprint X).
 * useStore.openEditor(NEW_TASK_ID) çağrılırsa editor boş alanlarla açılır;
 * kullanıcı text girip blur edince first-save → createTask çalışır,
 * ardından editingTaskId gerçek id ile değişir (düzenleme moduna geçer).
 */
export const NEW_TASK_ID = '__new__';

/**
 * Web parity (index.html:8906): day_meta — günün teması (liste) ve günün
 * odağı (görev). Haftalık planda gün başlığında pill olarak gösterilir.
 */
export type DayMeta = {
  date: string;                       // 'YYYY-MM-DD'
  theme_list_id: string | null;
  focus_task_id: string | null;
  user_id?: string;
};

export function isSpecialListId(id: string): boolean {
  return id === STARRED_LIST_ID || id === BOARD_LIST_ID || id === WEEKLY_LIST_ID;
}
