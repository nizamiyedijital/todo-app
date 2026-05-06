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
  link: string | null;
  balance_category: BalanceCategory | null;
  estimated_minutes: number | null;
  completed_at: string | null;
  sort_order: number;
  created_at: string;
  user_id?: string;
};

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

export function isSpecialListId(id: string): boolean {
  return id === STARRED_LIST_ID || id === BOARD_LIST_ID || id === WEEKLY_LIST_ID;
}
