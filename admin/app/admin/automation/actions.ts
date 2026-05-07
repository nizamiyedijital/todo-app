'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit';

// ----------------------------------------------------------------------------
// Şema — formdan gelen ham değerleri doğrular
// ----------------------------------------------------------------------------
const WeekdayEnum = z.enum(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']);

const PresetSchema = z
  .object({
    id: z.string().uuid().optional(),
    name: z.string().trim().min(2, { error: 'Ad en az 2 karakter' }).max(120),
    description: z.string().trim().max(500).optional().or(z.literal('')),

    trigger_type: z.enum(['cron', 'event']),
    // Cron alanları
    cron_days: z.array(WeekdayEnum).optional(),
    cron_hour: z.coerce.number().int().min(0).max(23).optional(),
    cron_minute: z.coerce.number().int().min(0).max(59).optional(),
    // Event
    event_name: z.string().trim().max(60).optional(),

    conditions: z.array(z.string().trim().max(60)).optional(),

    action_title: z.string().trim().min(2).max(140),
    action_body: z.string().trim().min(2).max(500),
    action_cta: z.string().trim().max(60).optional().or(z.literal('')),
    action_deeplink: z.string().trim().max(200).optional().or(z.literal('')),

    audience: z.enum(['all', 'pro', 'free']),
    is_enabled: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (v.trigger_type === 'cron') {
      if (!v.cron_days || v.cron_days.length === 0) {
        ctx.addIssue({
          code: 'custom',
          message: 'Cron tetikleyicide en az bir gün seç',
          path: ['cron_days'],
        });
      }
      if (v.cron_hour === undefined || v.cron_minute === undefined) {
        ctx.addIssue({
          code: 'custom',
          message: 'Saat ve dakika gerekli',
          path: ['cron_hour'],
        });
      }
    } else if (v.trigger_type === 'event') {
      if (!v.event_name) {
        ctx.addIssue({
          code: 'custom',
          message: 'Event adı gerekli',
          path: ['event_name'],
        });
      }
    }
  });

export type PresetFormState = {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function savePreset(
  _prev: PresetFormState | undefined,
  formData: FormData,
): Promise<PresetFormState> {
  // Form alanlarını topla
  const conditions = formData.getAll('conditions').map(String).filter(Boolean);
  const cronDays = formData.getAll('cron_days').map(String).filter(Boolean);

  const raw = {
    id: (formData.get('id') as string) || undefined,
    name: formData.get('name'),
    description: (formData.get('description') as string) || '',

    trigger_type: formData.get('trigger_type'),
    cron_days: cronDays,
    cron_hour: formData.get('cron_hour') || undefined,
    cron_minute: formData.get('cron_minute') || undefined,
    event_name: (formData.get('event_name') as string) || undefined,

    conditions,

    action_title: formData.get('action_title'),
    action_body: formData.get('action_body'),
    action_cta: (formData.get('action_cta') as string) || '',
    action_deeplink: (formData.get('action_deeplink') as string) || '',

    audience: formData.get('audience') ?? 'all',
    is_enabled: formData.get('is_enabled') === 'on',
  };

  const parsed = PresetSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: z.flattenError(parsed.error).fieldErrors as Record<string, string[]>,
    };
  }

  const data = parsed.data;
  const supabase = await createClient();

  const triggerConfig =
    data.trigger_type === 'cron'
      ? {
          days: data.cron_days,
          hour: data.cron_hour,
          minute: data.cron_minute,
          timezone: 'Europe/Istanbul',
        }
      : { event: data.event_name };

  const conditionsObj: Record<string, true> = {};
  for (const k of data.conditions ?? []) conditionsObj[k] = true;

  const payload: Record<string, unknown> = {
    name: data.name,
    description: data.description || null,
    trigger_type: data.trigger_type,
    trigger_config: triggerConfig,
    conditions: conditionsObj,
    action_type: 'notification',
    action_config: {
      title: data.action_title,
      body: data.action_body,
      cta: data.action_cta || null,
      deeplink: data.action_deeplink || null,
    },
    audience: data.audience,
    is_enabled: data.is_enabled,
  };

  if (data.id) {
    const { error } = await supabase
      .from('automation_presets')
      .update(payload)
      .eq('id', data.id);
    if (error) return { ok: false, error: error.message };
    await logAudit('AUTOMATION_UPDATED', {
      targetType: 'automation_preset',
      targetId: data.id,
      payload: { name: data.name, is_enabled: data.is_enabled },
    });
  } else {
    const { data: inserted, error } = await supabase
      .from('automation_presets')
      .insert(payload)
      .select('id')
      .single();
    if (error) return { ok: false, error: error.message };
    await logAudit('AUTOMATION_CREATED', {
      targetType: 'automation_preset',
      targetId: (inserted as { id: string }).id,
      payload: { name: data.name },
    });
  }

  revalidatePath('/admin/automation');
  redirect('/admin/automation');
}

export async function togglePreset(id: string, nextEnabled: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('automation_presets')
    .update({ is_enabled: nextEnabled })
    .eq('id', id);
  if (!error) {
    await logAudit('AUTOMATION_TOGGLED', {
      targetType: 'automation_preset',
      targetId: id,
      payload: { is_enabled: nextEnabled },
    });
    revalidatePath('/admin/automation');
  }
  return { ok: !error, error: error?.message };
}

export async function deletePreset(id: string) {
  const supabase = await createClient();
  // Built-in preset'leri silmeye izin verme
  const { data: row } = await supabase
    .from('automation_presets')
    .select('is_built_in, name')
    .eq('id', id)
    .maybeSingle();
  if (!row) return { ok: false, error: 'Bulunamadı' };
  if ((row as { is_built_in: boolean }).is_built_in) {
    return { ok: false, error: 'Built-in preset silinemez. Devre dışı bırakabilirsin.' };
  }

  const { error } = await supabase.from('automation_presets').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };

  await logAudit('AUTOMATION_DELETED', {
    targetType: 'automation_preset',
    targetId: id,
    payload: { name: (row as { name: string }).name },
  });
  revalidatePath('/admin/automation');
  return { ok: true };
}
