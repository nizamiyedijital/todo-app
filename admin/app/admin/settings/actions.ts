'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit';

export async function updateSetting(key: string, rawValue: string) {
  const supabase = await createClient();

  // JSON parse dene; başarısızsa düz string
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawValue);
  } catch {
    parsed = rawValue;
  }

  const { error } = await supabase
    .from('app_settings')
    .update({ value: parsed })
    .eq('key', key);

  if (error) return { ok: false, error: error.message };

  await logAudit('SETTINGS_UPDATED', {
    targetType: 'app_setting',
    targetId: key,
    payload: { key, new_value: parsed },
  });

  revalidatePath('/admin/settings');
  return { ok: true };
}

export async function toggleFlag(key: string, enabled: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('feature_flags')
    .update({ enabled })
    .eq('key', key);

  if (error) return { ok: false, error: error.message };

  await logAudit('FEATURE_FLAG_CHANGED', {
    targetType: 'feature_flag',
    targetId: key,
    payload: { key, enabled },
  });

  revalidatePath('/admin/settings');
  return { ok: true };
}

export async function updateFlagRollout(key: string, rollout: number) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('feature_flags')
    .update({ rollout_percent: rollout })
    .eq('key', key);

  if (error) return { ok: false, error: error.message };

  await logAudit('FEATURE_FLAG_CHANGED', {
    targetType: 'feature_flag',
    targetId: key,
    payload: { key, rollout_percent: rollout },
  });

  revalidatePath('/admin/settings');
  return { ok: true };
}
