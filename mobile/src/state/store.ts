import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import type { Todo, List } from '../types/db';
import { BOARD_LIST_ID } from '../types/db';
import type { PendingAutomation } from '../lib/automations';

export type ThemePref = 'light' | 'dark' | 'system';

export type SubscriptionStatus = 'free' | 'active' | 'trialing' | 'past_due' | 'cancelled' | 'expired';
export type PlanCode = 'free' | 'pro_monthly_try' | 'pro_yearly_try' | string;
export type SubscriptionState = {
  plan_code: PlanCode;
  status: SubscriptionStatus;
  is_pro: boolean;
};

export type PomoPhase = 'work' | 'break' | 'idle';
export type PomoState = {
  status: 'idle' | 'running';
  phase: PomoPhase;
  taskId: string | null;
  endMs: number;       // bu fazın sona ereceği epoch ms
  startMs: number;     // bu fazın başladığı epoch ms (elapsed_min hesabı için)
  durationMin: number; // bu fazın toplam dakikası
};

type State = {
  session: Session | null;
  subscription: SubscriptionState;
  lists: List[];
  tasks: Todo[];
  activeListId: string;
  boardColumnId: string | null;
  editingTaskId: string | null;
  themePref: ThemePref;
  loading: boolean;
  pomo: PomoState;
  automationsPending: PendingAutomation[];

  setSession: (s: Session | null) => void;
  setSubscription: (sub: SubscriptionState) => void;
  setPomo: (p: PomoState) => void;
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
  pushAutomations: (items: PendingAutomation[]) => void;
  dismissAutomation: (presetId: string) => void;
};

export const useStore = create<State>((set) => ({
  session: null,
  subscription: { plan_code: 'free', status: 'free', is_pro: false },
  lists: [],
  tasks: [],
  activeListId: BOARD_LIST_ID,
  boardColumnId: null,
  editingTaskId: null,
  themePref: 'system',
  loading: false,
  pomo: { status: 'idle', phase: 'idle', taskId: null, endMs: 0, startMs: 0, durationMin: 0 },
  automationsPending: [],

  setSession: (s) => set({ session: s }),
  setSubscription: (sub) => set({ subscription: sub }),
  setPomo: (p) => set({ pomo: p }),
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
  pushAutomations: (items) => set((st) => ({
    // Aynı preset_id zaten varsa tekrar ekleme — idempotent push
    automationsPending: [
      ...st.automationsPending,
      ...items.filter(it => !st.automationsPending.some(p => p.preset.id === it.preset.id)),
    ],
  })),
  dismissAutomation: (presetId) => set((st) => ({
    automationsPending: st.automationsPending.filter(p => p.preset.id !== presetId),
  })),
}));
