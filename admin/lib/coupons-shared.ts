/**
 * Client + server safe — kupon tipleri ve durum yardımcıları.
 */

export type CouponDiscountType = 'percentage' | 'fixed_amount' | 'trial_extension';
export type CouponStatus = 'active' | 'paused' | 'expired';

export interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discount_type: CouponDiscountType;
  discount_value: number;
  currency: string;
  applies_to_plan_ids: string[];
  max_redemptions: number | null;
  redeemed_count: number;
  per_user_limit: number;
  starts_at: string;
  expires_at: string | null;
  status: CouponStatus;
  created_at: string;
  created_by: string | null;
}

export const COUPON_STATUS_LABELS: Record<CouponStatus, { label: string; cls: string }> = {
  active: { label: 'Aktif', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  paused: { label: 'Duraklatıldı', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  expired: { label: 'Süresi Doldu', cls: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300' },
};

export const DISCOUNT_TYPE_LABELS: Record<CouponDiscountType, string> = {
  percentage: 'Yüzde',
  fixed_amount: 'Sabit tutar',
  trial_extension: 'Deneme uzatma (gün)',
};

export function formatDiscount(c: Pick<Coupon, 'discount_type' | 'discount_value' | 'currency'>): string {
  if (c.discount_type === 'percentage') return `%${Math.round(c.discount_value)}`;
  if (c.discount_type === 'fixed_amount')
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: c.currency || 'TRY', maximumFractionDigits: 0 }).format(c.discount_value);
  return `${c.discount_value} gün`;
}

export function isCurrentlyValid(c: Pick<Coupon, 'status' | 'starts_at' | 'expires_at'>): boolean {
  if (c.status !== 'active') return false;
  const now = Date.now();
  if (new Date(c.starts_at).getTime() > now) return false;
  if (c.expires_at && new Date(c.expires_at).getTime() < now) return false;
  return true;
}
