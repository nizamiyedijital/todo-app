import { supabase } from './supabase';
import { useStore } from '../state/store';
import { dpEvent } from './posthog';
import type { Todo, List } from '../types/db';

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
  useStore.getState().upsertTask({ ...task, done: nowDone });
  const { error } = await supabase
    .from('todos')
    .update({ done: nowDone })
    .eq('id', task.id);
  if (error) {
    useStore.getState().upsertTask(task);
    throw error;
  }
  dpEvent(nowDone ? 'task_completed' : 'task_uncompleted', {
    task_id: task.id,
    list_id: task.category,
    was_starred: !!task.starred,
  });
}

export async function deleteTask(id: string) {
  const prev = useStore.getState().tasks.find(t => t.id === id);
  useStore.getState().removeTask(id);
  const { error } = await supabase.from('todos').delete().eq('id', id);
  if (error && prev) {
    useStore.getState().upsertTask(prev);
    throw error;
  }
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
}

export async function createTask(payload: Partial<Todo> & { text: string; category: string }) {
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
  }
  return data as Todo;
}

export async function createList(payload: Partial<List> & { name: string }) {
  const body = { sort_order: Date.now(), ...payload };
  const { data, error } = await supabase.from('lists').insert(body).select().single();
  if (error) throw error;
  if (data) useStore.getState().upsertList(data as List);
  return data as List;
}
