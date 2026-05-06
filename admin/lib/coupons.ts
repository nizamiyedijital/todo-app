import 'server-only';
import { createClient } from './supabase/server';
import type { Coupon, CouponStatus } from './coupons-shared';

export type { Coupon, CouponStatus, CouponDiscountType } from './coupons-shared';

export async function listCoupons(filters: { status?: 'all' | CouponStatus } = {}): Promise<Coupon[]> {
  const supabase = await createClient();
  let query = supabase
    .from('coupons')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);

  if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[coupons] list:', error.message);
    return [];
  }
  return (data ?? []) as Coupon[];
}

export async function getCouponStats(): Promise<{
  active: number;
  total_redemptions: number;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('coupons')
    .select('status, redeemed_count');
  if (error || !data) return { active: 0, total_redemptions: 0 };
  return {
    active: data.filter((c) => c.status === 'active').length,
    total_redemptions: data.reduce((s, c) => s + (c.redeemed_count ?? 0), 0),
  };
}
