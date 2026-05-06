/**
 * Client + server safe — subscription tipleri ve durum yardımcıları.
 * Plan kataloğu için bkz: `plans-shared.ts`.
 */

import { isProPlanCode } from './plans-shared';

export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'cancelled'
  | 'expired'
  | 'pending';

export interface SubscriptionPlan {
  id: string;
  code: string;
  name: string;
  description: string | null;
  amount: number;
  currency: 'TRY' | 'USD' | 'EUR';
  interval: 'monthly' | 'yearly' | 'lifetime';
  trial_period_days: number;
  features: string[];
  status: 'active' | 'archived';
  display_order: number;
  iyzico_pricing_plan_reference_code: string | null;
  iyzico_product_reference_code: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionRow {
  id: string;
  user_id: string;
  user_email?: string | null;
  plan_id: string;
  plan_name?: string | null;
  status: SubscriptionStatus;
  current_period_start: string;
  current_period_end: string;
  trial_ends_at: string | null;
  cancelled_at: string | null;
  amount_at_signup: number | null;
  currency_at_signup: string | null;
  created_at: string;
}

/**
 * Bir kullanıcı "Pro" sayılır mı?
 *   - Aktif veya deneme süresinde olmalı (status ∈ {active, trialing})
 *   - Plan kodu pro_monthly_try / pro_yearly_try olmalı
 * `cancelled` ama period bitmemişse hâlâ Pro — current_period_end kontrolü ayrı yapılır.
 */
export function isProUser(
  sub: { status: SubscriptionStatus; plan_code?: string | null } | null,
): boolean {
  if (!sub) return false;
  if (sub.status !== 'active' && sub.status !== 'trialing') return false;
  if (!sub.plan_code) return false;
  return isProPlanCode(sub.plan_code);
}

/**
 * Kullanıcının PostHog için subscription_status değeri.
 * `posthog.identify(uid, { subscription_status })` ile gönderilir.
 */
export function getPosthogSubscriptionStatus(
  sub: { status: SubscriptionStatus; plan_code?: string | null } | null,
): 'free' | 'active' | 'trialing' | 'past_due' | 'cancelled' | 'expired' {
  if (!sub) return 'free';
  if (sub.status === 'active' && sub.plan_code && isProPlanCode(sub.plan_code)) return 'active';
  if (sub.status === 'trialing') return 'trialing';
  if (sub.status === 'past_due') return 'past_due';
  if (sub.status === 'cancelled') return 'cancelled';
  if (sub.status === 'expired') return 'expired';
  return 'free';
}

export const STATUS_LABELS: Record<SubscriptionStatus, { label: string; cls: string }> = {
  trialing: { label: 'Deneme', cls: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' },
  active: { label: 'Aktif', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  past_due: { label: 'Ödeme bekliyor', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  cancelled: { label: 'İptal', cls: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300' },
  expired: { label: 'Süresi doldu', cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
  pending: { label: 'Beklemede', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
};
