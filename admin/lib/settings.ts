import 'server-only';
import { createClient } from './supabase/server';

export interface AppSetting {
  key: string;
  value: unknown;
  description: string | null;
  updated_at: string;
}

export interface FeatureFlag {
  key: string;
  enabled: boolean;
  description: string | null;
  rollout_percent: number;
  target_segments: string[];
  updated_at: string;
}

export async function listSettings(): Promise<AppSetting[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('app_settings')
    .select('key, value, description, updated_at')
    .order('key', { ascending: true });
  if (error) {
    console.error('[settings] list:', error.message);
    return [];
  }
  return (data ?? []) as AppSetting[];
}

export async function listFlags(): Promise<FeatureFlag[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('feature_flags')
    .select('key, enabled, description, rollout_percent, target_segments, updated_at')
    .order('key', { ascending: true });
  if (error) {
    console.error('[flags] list:', error.message);
    return [];
  }
  return (data ?? []) as FeatureFlag[];
}
