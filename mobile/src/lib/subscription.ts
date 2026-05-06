/**
 * Subscription state — login + initApp'te fetch edilir.
 *
 * Web'deki `dpSubscription` global state'inin RN equivalent'ı (Faz 3.A.4).
 * Web ile aynı plan kodu kontratını korur: pro_monthly_try / pro_yearly_try.
 *
 * Faz 3.B'de Iyzico webhook subscription_started emit etmeye başlayınca
 * `is_pro: true` mobil kullanıcılar için akmaya başlar.
 */
import { supabase } from './supabase';
import { useStore } from '../state/store';
import { dpIdentify } from './posthog';
import type { SubscriptionStatus, PlanCode } from '../state/store';

export function isProPlanCode(code: string | null | undefined): boolean {
  return code === 'pro_monthly_try' || code === 'pro_yearly_try';
}

export async function fetchAndApplySubscription(userId: string): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('status, subscription_plans(code)')
      .eq('user_id', userId)
      .in('status', ['active', 'trialing', 'past_due'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    const sub = data as { status?: string; subscription_plans?: { code?: string } } | null;
    const planCode = (sub?.subscription_plans?.code || 'free') as PlanCode;
    const isPro = isProPlanCode(planCode);
    let status: SubscriptionStatus = 'free';
    if (sub) {
      if (sub.status === 'active' && isPro) status = 'active';
      else if (sub.status === 'trialing') status = 'trialing';
      else if (sub.status === 'past_due') status = 'past_due';
    }
    const subscription = {
      plan_code: planCode,
      status,
      is_pro: isPro && (status === 'active' || status === 'trialing'),
    };
    useStore.getState().setSubscription(subscription);
    dpIdentify(userId, {
      plan_code: planCode,
      subscription_status: status,
    });
  } catch {
    // Sessizce free varsay
    useStore.getState().setSubscription({ plan_code: 'free', status: 'free', is_pro: false });
    dpIdentify(userId, { plan_code: 'free', subscription_status: 'free' });
  }
}
