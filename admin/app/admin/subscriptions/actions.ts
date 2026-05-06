'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit';

/**
 * Manuel subscription oluştur — Iyzico-bypass.
 * Kullanım: comp'lanan hesap, erken erişim manuel onay, support case.
 * Iyzico ref code'ları boş kalır → Faz 3.B'de gerçek ödeme akışı bunları doldurur.
 */
const CreateSchema = z.object({
  user_id: z.string().uuid({ error: 'Geçerli bir kullanıcı UUID\'si gir' }),
  plan_id: z.string().uuid({ error: 'Plan seç' }),
  period_days: z
    .preprocess((v) => Number(v), z.number().int().min(1).max(3650))
    .default(30),
  trial_days: z
    .preprocess((v) => Number(v ?? 0), z.number().int().min(0).max(365))
    .default(0),
});

export type CreateSubscriptionState = {
  ok: boolean;
  error?: string;
};

export async function createManualSubscription(
  _prev: CreateSubscriptionState | undefined,
  formData: FormData,
): Promise<CreateSubscriptionState> {
  const parsed = CreateSchema.safeParse({
    user_id: formData.get('user_id'),
    plan_id: formData.get('plan_id'),
    period_days: formData.get('period_days'),
    trial_days: formData.get('trial_days'),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Geçersiz veri' };
  }

  // RLS bypass — admin başka kullanıcı adına insert yapacağı için service-role
  // gerekir. Tickets/articles gibi user-owned tablolar service-role olmadan
  // çalışmaz; subscriptions de aynı pattern.
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: false, error: 'Service-role key gerekli (.env.local)' };
  }
  const supabase = createAdminClient();

  // Plan'ı al — amount snapshot için
  const { data: planRaw, error: planErr } = await supabase
    .from('subscription_plans')
    .select('id, amount, currency, code')
    .eq('id', parsed.data.plan_id)
    .maybeSingle();
  if (planErr || !planRaw) {
    return { ok: false, error: 'Plan bulunamadı' };
  }
  const plan = planRaw as { id: string; amount: number; currency: string; code: string };

  const now = new Date();
  const trialEnd =
    parsed.data.trial_days > 0
      ? new Date(now.getTime() + parsed.data.trial_days * 86400_000)
      : null;
  const periodStart = trialEnd ?? now;
  const periodEnd = new Date(
    periodStart.getTime() + parsed.data.period_days * 86400_000,
  );

  const status = trialEnd ? 'trialing' : 'active';

  // Type cast — admin client untyped (lib/users.ts ile aynı pattern)
  const { data: insertedRaw, error } = await (
    supabase.from('subscriptions') as unknown as {
      insert: (row: Record<string, unknown>) => {
        select: (cols: string) => { single: () => Promise<{ data: { id: string } | null; error: { code?: string; message: string } | null }> };
      };
    }
  )
    .insert({
      user_id: parsed.data.user_id,
      plan_id: parsed.data.plan_id,
      status,
      current_period_start: periodStart.toISOString(),
      current_period_end: periodEnd.toISOString(),
      trial_ends_at: trialEnd?.toISOString() ?? null,
      amount_at_signup: plan.amount,
      currency_at_signup: plan.currency,
      metadata: { source: 'admin_manual' },
    })
    .select('id')
    .single();
  const inserted = insertedRaw;

  if (error) {
    if (error.code === '23505') {
      return {
        ok: false,
        error: 'Bu kullanıcının zaten aktif aboneliği var (cancel/expire et önce).',
      };
    }
    return { ok: false, error: error.message };
  }

  await logAudit('SUBSCRIPTION_CREATED', {
    targetType: 'subscription',
    targetId: inserted?.id,
    payload: {
      user_id: parsed.data.user_id,
      plan_code: plan.code,
      status,
      source: 'admin_manual',
    },
  });

  revalidatePath('/admin/subscriptions');
  return { ok: true };
}

/**
 * Subscription'ı iptal et — period sonuna kadar aktif kalır (cancel != expire).
 * Iyzico tarafında karşılığı yok şu an; Faz 3.B'de gerçek iptal API'si eklenecek.
 */
export async function cancelSubscription(
  subscriptionId: string,
  reason?: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!subscriptionId) return { ok: false, error: 'Subscription ID gerekli' };

  // RLS bypass — admin user-owned satırı update ediyor
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: false, error: 'Service-role key gerekli' };
  }
  const supabase = createAdminClient();
  const { error } = await (
    supabase.from('subscriptions') as unknown as {
      update: (row: Record<string, unknown>) => { eq: (col: string, val: string) => Promise<{ error: { message: string } | null }> };
    }
  )
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancel_reason: reason ?? 'admin_manual',
    })
    .eq('id', subscriptionId);

  if (error) return { ok: false, error: error.message };

  await logAudit('SUBSCRIPTION_CANCELLED', {
    targetType: 'subscription',
    targetId: subscriptionId,
    payload: { reason: reason ?? 'admin_manual' },
  });

  revalidatePath('/admin/subscriptions');
  return { ok: true };
}
