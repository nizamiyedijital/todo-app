import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import type { Todo, List } from '../types/db';
import { BOARD_LIST_ID } from '../types/db';

export type ThemePref = 'light' | 'dark' | 'system';

type State = {
  session: Session | null;
  lists: List[];
  tasks: Todo[];
  activeListId: string;
  boardColumnId: string | null;
  editingTaskId: string | null;
  themePref: ThemePref;
  loading: boolean;

  setSession: (s: Session | null) => void;
  setLists: (l: List[]) => void;
  setTasks: (t: Todo[]) => void;
  upsertTask: (t: Todo) => void;
  removeTask: (id: string) => void;
  upsertList: (l: List) => void;
  removeList: (id: string) => void;
  setActiveListId: (id: string) => void;
  setBoardColumnId: (id: string | null) => void;
  openEditor: (id: string) => void;
  closeEditor: () => void;
  setThemePref: (p: ThemePref) => void;
  setLoading: (b: boolean) => void;
};

export const useStore = create<State>((set) => ({
  session: null,
  lists: [],
  tasks: [],
  activeListId: BOARD_LIST_ID,
  boardColumnId: null,
  editingTaskId: null,
  themePref: 'system',
  loading: false,

  setSession: (s) => set({ session: s }),
  setLists:   (l) => set({ lists: l }),
  setTasks:   (t) => set({ tasks: t }),
  upsertTask: (t) => set((st) => {
    const i = st.tasks.findIndex((x) => x.id === t.id);
    if (i === -1) return { tasks: [t, ...st.tasks] };
    const copy = st.tasks.slice();
    copy[i] = t;
    return { tasks: copy };
  }),
  removeTask: (id) => set((st) => ({ tasks: st.tasks.filter((x) => x.id !== id) })),
  upsertList: (l) => set((st) => {
    const i = st.lists.findIndex((x) => x.id === l.id);
    if (i === -1) return { lists: [...st.lists, l].sort((a, b) => a.sort_order - b.sort_order) };
    const copy = st.lists.slice();
    copy[i] = l;
    return { lists: copy };
  }),
  removeList: (id) => set((st) => ({ lists: st.lists.filter((x) => x.id !== id) })),
  setActiveListId: (id) => set({ activeListId: id }),
  setBoardColumnId: (id) => set({ boardColumnId: id }),
  openEditor: (id) => set({ editingTaskId: id }),
  closeEditor: () => set({ editingTaskId: null }),
  setThemePref: (p) => set({ themePref: p }),
  setLoading: (b) => set({ loading: b }),
}));
