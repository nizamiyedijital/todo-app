import { supabase } from './supabase';
import { useStore } from '../state/store';
import type { Todo, List } from '../types/db';

let channel: ReturnType<typeof supabase.channel> | null = null;

export function startRealtime() {
  if (channel) return () => stopRealtime();

  channel = supabase
    .channel('db-sync')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'todos' }, (payload) => {
      const ev = payload.eventType;
      const editingId = useStore.getState().editingTaskId;
      const newRow = payload.new as Todo | undefined;
      const oldRow = payload.old as Todo | undefined;
      if (ev === 'INSERT' && newRow) {
        useStore.getState().upsertTask(newRow);
      } else if (ev === 'UPDATE' && newRow) {
        if (editingId === newRow.id) return; // do not clobber edit in progress
        useStore.getState().upsertTask(newRow);
      } else if (ev === 'DELETE' && oldRow) {
        useStore.getState().removeTask(oldRow.id);
      }
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'lists' }, (payload) => {
      const ev = payload.eventType;
      const newRow = payload.new as List | undefined;
      const oldRow = payload.old as List | undefined;
      if ((ev === 'INSERT' || ev === 'UPDATE') && newRow) {
        useStore.getState().upsertList(newRow);
      } else if (ev === 'DELETE' && oldRow) {
        useStore.getState().removeList(oldRow.id);
      }
    })
    .subscribe();

  supabase.auth.onAuthStateChange((event, session) => {
    if ((event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') && session) {
      try { supabase.realtime.setAuth(session.access_token); } catch {}
    }
  });

  return () => stopRealtime();
}

export function stopRealtime() {
  if (channel) {
    supabase.removeChannel(channel);
    channel = null;
  }
}
