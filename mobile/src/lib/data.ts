import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { useStore } from '../state/store';
import { dpEvent } from './posthog';
import type { Todo, List } from '../types/db';
import { getTaskLinks } from '../types/db';

/**
 * Görev tamamen boş mu — web'in `isTaskFullyEmpty` (index.html:9427) ile
 * birebir uyumlu, sadece JS'in `tasks` global'i yerine zustand store
 * kullanır. `formOverrides` parametresi TaskEditor onClose'ta henüz
 * patch edilmemiş text/notes değerlerini geçici olarak kontrole katar
 * (kullanıcı son anda silip kapatırsa boş kabul edilir).
 */
export function isTaskFullyEmpty(
  task: Todo,
  formOverrides?: { text?: string; notes?: string },
): boolean {
  const text = (formOverrides?.text ?? task.text ?? '').trim();
  const notes = (formOverrides?.notes ?? task.notes ?? '').trim();
  if (text || notes) return false;
  if (task.priority || task.balance_category) return false;
  if (task.estimated_minutes || task.due_at) return false;
  if (task.starred) return false;
  if (getTaskLinks(task).length > 0) return false;
  const tasks = useStore.getState().tasks;
  if (tasks.some(t => t.parent_id === task.id)) return false;
  return true;
}

/**
 * Bir kullanıcı için "ilk görev" event'i ömür boyu bir kez ateşlensin diye
 * AsyncStorage flag — web'deki localStorage pattern'iyle aynı (Faz 2.B).
 */
async function maybeFireFirstTask(taskId: string, userId: string | null | undefined) {
  if (!userId) return;
  const key = `dp_first_task_fired_${userId}`;
  try {
    const fired = await AsyncStorage.getItem(key);
    if (fired) return;
    dpEvent('first_task_created', { task_id: taskId });
    await AsyncStorage.setItem(key, '1');
  } catch {
    // sessizce atla
  }
}

export async function loadLists() {
  const { data, error } = await supabase
    .from('lists')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  useStore.getState().setLists((data ?? []) as List[]);
}

export async function loadTasks() {
  const { data, error } = await supabase
    .from('todos')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw error;
  useStore.getState().setTasks((data ?? []) as Todo[]);
}

export async function loadAll() {
  useStore.getState().setLoading(true);
  try {
    await Promise.all([loadLists(), loadTasks()]);
  } finally {
    useStore.getState().setLoading(false);
  }
}

export async function toggleTaskDone(task: Todo) {
  const nowDone = !task.done;
  const completedAt = nowDone ? new Date().toISOString() : null;
  useStore.getState().upsertTask({ ...task, done: nowDone });
  const { error } = await supabase
    .from('todos')
    .update({ done: nowDone, completed_at: completedAt })
    .eq('id', task.id);
  if (error) {
    useStore.getState().upsertTask(task);
    throw error;
  }
  if (nowDone) {
    let ttc: number | undefined;
    if (task.created_at && completedAt) {
      ttc = Math.round((new Date(completedAt).getTime() - new Date(task.created_at).getTime()) / 60000);
    }
    dpEvent('task_completed', {
      task_id: task.id,
      list_id: task.category,
      was_starred: !!task.starred,
      time_to_complete_min: ttc,
    });
  } else {
    dpEvent('task_uncompleted', { task_id: task.id, list_id: task.category });
  }
}

/**
 * Yıldız toggle — task_starred / task_unstarred + (yıldızlanan için)
 * daily_focus_selected event'i. Web tarafıyla event eşit.
 */
export async function toggleTaskStar(task: Todo) {
  const next = !task.starred;
  useStore.getState().upsertTask({ ...task, starred: next });
  const { error } = await supabase.from('todos').update({ starred: next }).eq('id', task.id);
  if (error) {
    useStore.getState().upsertTask(task);
    throw error;
  }
  dpEvent(next ? 'task_starred' : 'task_unstarred', { task_id: task.id });
  if (next) dpEvent('daily_focus_selected', { task_id: task.id });
}

export async function deleteTask(id: string) {
  const prev = useStore.getState().tasks.find(t => t.id === id);
  useStore.getState().removeTask(id);
  const { error } = await supabase.from('todos').delete().eq('id', id);
  if (error && prev) {
    useStore.getState().upsertTask(prev);
    throw error;
  }
  dpEvent('task_deleted', { task_id: id, was_completed: !!prev?.done });
}

export async function patchTask(id: string, patch: Partial<Todo>) {
  const prev = useStore.getState().tasks.find(t => t.id === id);
  if (!prev) return;
  useStore.getState().upsertTask({ ...prev, ...patch });
  const { error } = await supabase.from('todos').update(patch).eq('id', id);
  if (error) {
    useStore.getState().upsertTask(prev);
    throw error;
  }
  // task_postponed: due_at ileri taşındıysa (web'deki ile aynı kontrat)
  if (
    patch.due_at &&
    prev.due_at &&
    new Date(patch.due_at as string).getTime() > new Date(prev.due_at).getTime()
  ) {
    dpEvent('task_postponed', { task_id: id });
  }
}

export async function createTask(payload: Partial<Todo> & { text: string; category: string }) {
  const wasFirstTask = !useStore.getState().tasks.some(x => !x.parent_id);
  const body = {
    done: false,
    sort_order: Date.now(),
    ...payload,
  };
  const { data, error } = await supabase.from('todos').insert(body).select().single();
  if (error) throw error;
  if (data) {
    const t = data as Todo;
    useStore.getState().upsertTask(t);
    dpEvent(payload.parent_id ? 'subtask_added' : 'task_created', {
      task_id: t.id,
      list_id: t.category,
      has_due_date: !!payload.due_at,
      has_duration: !!(payload as { estimated_minutes?: number }).estimated_minutes,
      is_subtask: !!payload.parent_id,
      starred: !!payload.starred,
      priority: payload.priority || null,
      parent_task_id: payload.parent_id || null,
    });
    if (wasFirstTask && !payload.parent_id) {
      const userId = useStore.getState().session?.user?.id ?? t.user_id ?? null;
      void maybeFireFirstTask(t.id, userId);
    }
  }
  return data as Todo;
}

export async function createList(payload: Partial<List> & { name: string }) {
  // Web pattern (index.html:5840): id manuel olarak gönderilir.
  // lists.id kolonunda DB-level default yok; client tarafı zorunlu.
  const body = {
    id: 'list_' + Date.now(),
    icon: 'folder',
    color: '#718096',
    sort_order: Date.now(),
    ...payload,
  };
  const { data, error } = await supabase.from('lists').insert(body).select().single();
  if (error) throw error;
  if (data) {
    useStore.getState().upsertList(data as List);
    dpEvent('list_created', {
      list_id: (data as List).id,
      icon: (data as List).icon,
      color: (data as List).color,
    });
  }
  return data as List;
}

export async function renameList(id: string, name: string) {
  const prev = useStore.getState().lists.find(l => l.id === id);
  if (!prev) return;
  useStore.getState().upsertList({ ...prev, name });
  const { error } = await supabase.from('lists').update({ name }).eq('id', id);
  if (error) {
    useStore.getState().upsertList(prev);
    throw error;
  }
  dpEvent('list_renamed', { list_id: id });
}

export async function deleteList(id: string) {
  const taskCount = useStore.getState().tasks.filter(t => t.category === id).length;
  // Önce listenin görevlerini sil (cascade), sonra liste
  await supabase.from('todos').delete().eq('category', id);
  const { error } = await supabase.from('lists').delete().eq('id', id);
  if (error) throw error;
  useStore.getState().removeList(id);
  // Store'dan da görevleri çıkar (realtime gelmeden önce UI temiz olsun)
  useStore.setState((st) => ({ tasks: st.tasks.filter(t => t.category !== id) }));
  dpEvent('list_deleted', { list_id: id, task_count: taskCount });
}
