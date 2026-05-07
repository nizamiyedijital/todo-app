/**
 * Faz 5.B.1 — Event-based in-app automation runner (mobile).
 *
 * Web'in `window.dpAutomations` namespace'inin mobile parity'si.
 * Belirli bir event tetiklendiğinde (login, pomo_completed) admin'in
 * tanımladığı `automation_presets` kayıtlarını çeker, koşulları evalue
 * eder, uygun olanları zustand store'da `automationsPending`'e yazar.
 * UI bunu üst banner olarak render eder.
 *
 * Idempotency: AsyncStorage `dp_auto_${preset_id}_${userId}_${YYYY-MM-DD}`
 * → günde 1 kere fire (Faz 5.B.2'de server-side log ile değiştirilecek).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { useStore } from '../state/store';
import type { Todo } from '../types/db';

export type AutomationActionConfig = {
  title: string;
  body: string;
  cta?: string | null;
  deeplink?: string | null;
};

export type AutomationPreset = {
  id: string;
  name: string;
  trigger_type: 'cron' | 'event';
  trigger_config: Record<string, unknown>;
  conditions: Record<string, unknown>;
  action_config: AutomationActionConfig;
  audience: 'all' | 'pro' | 'free';
};

export type PendingAutomation = {
  preset: AutomationPreset;
  title: string;
  body: string;
  cta: string | null;
  deeplink: string | null;
};

export type AutomationContext = {
  userId?: string | null;
  tasks?: Todo[];
  pomo_minutes_today?: number;
  tasks_completed_today?: number;
  starred_count?: number;
  total_count?: number;
  priority_count?: number;
  lists_count?: number;
};

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function idemKey(presetId: string, userId: string | null | undefined): string {
  return `dp_auto_${presetId}_${userId ?? 'anon'}_${todayStr()}`;
}

async function alreadyShown(presetId: string, userId: string | null | undefined): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(idemKey(presetId, userId));
    return !!v;
  } catch {
    return false;
  }
}

async function markShown(presetId: string, userId: string | null | undefined): Promise<void> {
  try {
    await AsyncStorage.setItem(idemKey(presetId, userId), '1');
  } catch {
    // sessizce atla
  }
}

function evaluateCondition(key: string, ctx: AutomationContext): boolean {
  if (key === 'incomplete_tasks_yesterday') {
    const tasks = ctx.tasks ?? [];
    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startYesterday = new Date(startToday.getTime() - 86_400_000);
    return tasks.some(
      t =>
        !t.parent_id &&
        !t.done &&
        t.due_at &&
        new Date(t.due_at) >= startYesterday &&
        new Date(t.due_at) < startToday,
    );
  }
  if (key === 'balance_zero_category_today') {
    // Bu sprintte cron koşul evalue desteklenmiyor — Faz 5.B.2'de
    return true;
  }
  if (key === 'daily_pomo_minutes_gt') {
    // Pomo event geldi → implicit true
    return true;
  }
  return true; // bilinmeyen koşul → engelleme
}

function evaluateConditions(
  conditions: Record<string, unknown> | null | undefined,
  ctx: AutomationContext,
): boolean {
  if (!conditions || typeof conditions !== 'object') return true;
  const keys = Object.keys(conditions).filter(k => Boolean(conditions[k]));
  if (keys.length === 0) return true;
  return keys.every(k => evaluateCondition(k, ctx));
}

function interpolate(template: string | null | undefined, ctx: AutomationContext): string {
  if (!template) return '';
  return String(template).replace(/\{(\w+)\}/g, (_, k: string) => {
    const v = (ctx as Record<string, unknown>)[k];
    return v == null ? `{${k}}` : String(v);
  });
}

/**
 * Verilen event için preset'leri çek, koşulları evalue et, uygun olanları
 * zustand store'a yaz. UI banner component'i bu listeden render edecek.
 */
export async function runEventAutomations(
  eventName: string,
  ctx: AutomationContext = {},
): Promise<void> {
  try {
    const userId = ctx.userId ?? useStore.getState().session?.user?.id ?? null;
    const safeCtx: AutomationContext = {
      ...ctx,
      tasks: ctx.tasks ?? useStore.getState().tasks,
      userId,
    };

    const { data, error } = await supabase
      .from('automation_presets')
      .select('id, name, trigger_type, trigger_config, conditions, action_config, audience')
      .eq('is_enabled', true)
      .eq('trigger_type', 'event');
    if (error) {
      console.warn('[automations] fetch:', error.message);
      return;
    }
    const presets = (data ?? []) as AutomationPreset[];

    const newPending: PendingAutomation[] = [];
    for (const p of presets) {
      const evt = (p.trigger_config as { event?: string })?.event;
      if (evt !== eventName) continue;
      if (await alreadyShown(p.id, userId)) continue;
      if (!evaluateConditions(p.conditions, safeCtx)) continue;
      const ac = p.action_config ?? { title: '', body: '' };
      newPending.push({
        preset: p,
        title: interpolate(ac.title, safeCtx),
        body: interpolate(ac.body, safeCtx),
        cta: ac.cta ?? null,
        deeplink: ac.deeplink ?? null,
      });
      await markShown(p.id, userId);
    }
    if (newPending.length > 0) {
      useStore.getState().pushAutomations(newPending);
    }
  } catch (e) {
    console.warn('[automations] runEventAutomations error:', (e as Error).message);
  }
}
