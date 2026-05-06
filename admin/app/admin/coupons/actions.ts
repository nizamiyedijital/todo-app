'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit';

const CreateSchema = z.object({
  code: z.string().trim().min(2).max(50).regex(/^[A-Z0-9_-]+$/, { error: 'Sadece büyük harf, rakam, _, -' }),
  description: z.string().trim().max(500).optional(),
  discount_type: z.enum(['percentage', 'fixed_amount', 'trial_extension']),
  discount_value: z.preprocess((v) => Number(v), z.number().min(0).max(100000)),
  max_redemptions: z.preprocess((v) => v === '' ? null : Number(v), z.number().int().min(1).nullable()),
  per_user_limit: z.preprocess((v) => Number(v ?? 1), z.number().int().min(1).max(100)),
  expires_at: z.string().nullable().optional(),
});

export type CreateCouponState = { ok: boolean; error?: string };

export async function createCoupon(
  _prev: CreateCouponState | undefined,
  formData: FormData,
): Promise<CreateCouponState> {
  const parsed = CreateSchema.safeParse({
    code: formData.get('code'),
    description: formData.get('description'),
    discount_type: formData.get('discount_type'),
    discount_value: formData.get('discount_value'),
    max_redemptions: formData.get('max_redemptions'),
    per_user_limit: formData.get('per_user_limit'),
    expires_at: formData.get('expires_at') || null,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Geçersiz veri' };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: inserted, error } = await supabase
    .from('coupons')
    .insert({
      code: parsed.data.code.toUpperCase(),
      description: parsed.data.description || null,
      discount_type: parsed.data.discount_type,
      discount_value: parsed.data.discount_value,
      currency: 'TRY',
      max_redemptions: parsed.data.max_redemptions,
      per_user_limit: parsed.data.per_user_limit,
      expires_at: parsed.data.expires_at,
      status: 'active',
      created_by: user?.id ?? null,
    })
    .select('id, code')
    .single();

  if (error) {
    if (error.code === '23505') return { ok: false, error: 'Bu kod zaten var' };
    return { ok: false, error: error.message };
  }

  await logAudit('SETTINGS_UPDATED', {
    targetType: 'coupon',
    targetId: inserted.id,
    payload: { action: 'created', code: inserted.code },
  });

  revalidatePath('/admin/coupons');
  return { ok: true };
}

export async function setCouponStatus(
  id: string,
  status: 'active' | 'paused' | 'expired',
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from('coupons').update({ status }).eq('id', id);
  if (error) return { ok: false, error: error.message };

  await logAudit('SETTINGS_UPDATED', {
    targetType: 'coupon',
    targetId: id,
    payload: { action: 'status_change', new_status: status },
  });

  revalidatePath('/admin/coupons');
  return { ok: true };
}
