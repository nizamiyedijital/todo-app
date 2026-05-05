'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit';

const CampaignSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(3, { error: 'Başlık en az 3 karakter' }).max(140),
  message: z.string().trim().min(5, { error: 'Mesaj en az 5 karakter' }).max(500),
  link_url: z.union([z.url(), z.literal('')]).optional(),
  icon: z.string().max(40).optional(),
  delivery_method: z.enum(['in_app', 'push', 'email', 'all']),
  target_audience: z.enum([
    'all',
    'free',
    'pro',
    'inactive_7d',
    'inactive_30d',
    'no_first_task',
    'high_completion',
    'payment_failed',
    'segment',
  ]),
  status: z.enum(['draft', 'scheduled', 'cancelled']),
  scheduled_for: z.string().optional(),
});

export type CampaignFormState = {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function saveCampaign(
  _prev: CampaignFormState | undefined,
  formData: FormData,
): Promise<CampaignFormState> {
  const raw = {
    id: (formData.get('id') as string) || undefined,
    title: formData.get('title'),
    message: formData.get('message'),
    link_url: formData.get('link_url') || '',
    icon: (formData.get('icon') as string) || undefined,
    delivery_method: formData.get('delivery_method'),
    target_audience: formData.get('target_audience'),
    status: formData.get('status'),
    scheduled_for: (formData.get('scheduled_for') as string) || undefined,
  };

  const parsed = CampaignSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: z.flattenError(parsed.error).fieldErrors as Record<string, string[]>,
    };
  }

  const data = parsed.data;
  const supabase = await createClient();

  const payload: Record<string, unknown> = {
    title: data.title,
    message: data.message,
    link_url: data.link_url || null,
    icon: data.icon ?? null,
    delivery_method: data.delivery_method,
    target_audience: data.target_audience,
    status: data.status,
    scheduled_for:
      data.status === 'scheduled' && data.scheduled_for ? data.scheduled_for : null,
  };

  if (data.id) {
    const { error } = await supabase
      .from('notification_campaigns')
      .update(payload)
      .eq('id', data.id);
    if (error) return { ok: false, error: error.message };
    await logAudit(
      data.status === 'scheduled' ? 'NOTIFICATION_SCHEDULED' : 'NOTIFICATION_CREATED',
      {
        targetType: 'notification_campaign',
        targetId: data.id,
        payload: { title: data.title, status: data.status },
      },
    );
  } else {
    const { data: inserted, error } = await supabase
      .from('notification_campaigns')
      .insert(payload)
      .select('id')
      .single();
    if (error) return { ok: false, error: error.message };
    await logAudit(
      data.status === 'scheduled' ? 'NOTIFICATION_SCHEDULED' : 'NOTIFICATION_CREATED',
      {
        targetType: 'notification_campaign',
        targetId: (inserted as { id: string }).id,
        payload: { title: data.title, status: data.status },
      },
    );
  }

  revalidatePath('/admin/notifications');
  redirect('/admin/notifications');
}

export async function cancelCampaign(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('notification_campaigns')
    .update({ status: 'cancelled' })
    .eq('id', id);
  if (!error) {
    await logAudit('NOTIFICATION_CANCELLED', { targetType: 'notification_campaign', targetId: id });
    revalidatePath('/admin/notifications');
  }
  return { ok: !error, error: error?.message };
}
