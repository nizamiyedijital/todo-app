import type { Todo, List } from '../types/db';
import { STARRED_LIST_ID, BOARD_LIST_ID, WEEKLY_LIST_ID } from '../types/db';

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
