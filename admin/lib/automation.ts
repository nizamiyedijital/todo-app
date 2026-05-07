import 'server-only';
import { createClient } from './supabase/server';

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------
export type TriggerType = 'cron' | 'event';
export type ActionType = 'notification' | 'banner' | 'email';
export type Audience = 'all' | 'pro' | 'free';

export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export type CronConfig = {
  days: Weekday[];
  hour: number;
  minute: number;
  timezone?: string;
};

export type EventConfig = {
  event: 'login' | 'pomo_completed' | 'task_completed' | string;
};

export type ActionConfig = {
  title: string;
  body: string;
  cta?: string | null;
  deeplink?: string | null;
};

export type AutomationPreset = {
  id: string;
  preset_key: string | null;
  name: string;
  description: string | null;
  trigger_type: TriggerType;
  trigger_config: CronConfig | EventConfig | Record<string, unknown>;
  conditions: Record<string, unknown>;
  action_type: ActionType;
  action_config: ActionConfig;
  audience: Audience;
  is_enabled: boolean;
  is_built_in: boolean;
  last_triggered_at: string | null;
  trigger_count: number;
  created_at: string;
  updated_at: string;
};

// ----------------------------------------------------------------------------
// Sabitler — UI seçenekleri
// ----------------------------------------------------------------------------
export const EVENT_OPTIONS: { value: string; label: string }[] = [
  { value: 'login', label: 'Oturum açma' },
  { value: 'pomo_completed', label: 'Pomodoro tamamlandı' },
  { value: 'task_completed', label: 'Görev tamamlandı' },
  { value: 'task_created', label: 'Görev oluşturuldu' },
  { value: 'first_task_created', label: 'İlk görev (yaşam boyu)' },
];

export const WEEKDAYS: { value: Weekday; label: string }[] = [
  { value: 'mon', label: 'Pzt' },
  { value: 'tue', label: 'Sal' },
  { value: 'wed', label: 'Çar' },
  { value: 'thu', label: 'Per' },
  { value: 'fri', label: 'Cum' },
  { value: 'sat', label: 'Cmt' },
  { value: 'sun', label: 'Paz' },
];

export const CONDITION_OPTIONS: { key: string; label: string; description: string }[] = [
  {
    key: 'incomplete_tasks_yesterday',
    label: 'Dünden tamamlanmamış görev var',
    description: 'Sadece kullanıcının dünkü tamamlanmamış görevi varsa preset çalışır.',
  },
  {
    key: 'balance_zero_category_today',
    label: 'Bugün denge kategorilerinden biri 0 dk',
    description: 'Zihin/Beden/Kalp kategorilerinden en az birinde 0 dk varsa preset çalışır.',
  },
  {
    key: 'daily_pomo_minutes_gt',
    label: 'Bugün pomodoro süresi > 0',
    description: 'Pomo geri bildirimleri için: o gün en az 1 pomo yapılmış olmalı.',
  },
];

export const AUDIENCE_LABELS: Record<Audience, string> = {
  all: 'Tüm kullanıcılar',
  pro: 'Sadece Pro',
  free: 'Sadece Free',
};

// ----------------------------------------------------------------------------
// Yardımcılar — UI özet metinleri
// ----------------------------------------------------------------------------
export function summarizeTrigger(p: Pick<AutomationPreset, 'trigger_type' | 'trigger_config'>): string {
  if (p.trigger_type === 'cron') {
    const cfg = p.trigger_config as CronConfig;
    const dayLabels = (cfg.days ?? []).map((d) =>
      WEEKDAYS.find((w) => w.value === d)?.label ?? d,
    );
    const hh = String(cfg.hour ?? 0).padStart(2, '0');
    const mm = String(cfg.minute ?? 0).padStart(2, '0');
    if (dayLabels.length === 0) return `${hh}:${mm}`;
    if (dayLabels.length === 7) return `Hergün ${hh}:${mm}`;
    return `${dayLabels.join(', ')} · ${hh}:${mm}`;
  }
  const cfg = p.trigger_config as EventConfig;
  const opt = EVENT_OPTIONS.find((e) => e.value === cfg.event);
  return `Event: ${opt?.label ?? cfg.event}`;
}

// ----------------------------------------------------------------------------
// Sorgular
// ----------------------------------------------------------------------------
export async function listAutomationPresets(): Promise<AutomationPreset[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('automation_presets')
    .select('*')
    .order('is_built_in', { ascending: false })
    .order('name', { ascending: true });
  if (error) {
    console.error('[automation] list:', error.message);
    return [];
  }
  return (data ?? []) as AutomationPreset[];
}

export async function getAutomationPreset(id: string): Promise<AutomationPreset | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('automation_presets')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) {
    console.error('[automation] get:', error.message);
    return null;
  }
  return (data as AutomationPreset | null) ?? null;
}
