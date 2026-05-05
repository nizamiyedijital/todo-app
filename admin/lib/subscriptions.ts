import 'server-only';
import { createClient } from './supabase/server';
import { createAdminClient } from './supabase/admin';
import type {
  SubscriptionPlan,
  SubscriptionRow,
  SubscriptionStatus,
} from './subscriptions-shared';

export type { SubscriptionPlan, SubscriptionRow, SubscriptionStatus } from './subscriptions-shared';

export async function listPlans(): Promise<SubscriptionPlan[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('subscription_plans')
    .select('*')
    .order('display_order', { ascending: true });

  if (error) {
    console.error('[plans] list:', error.message);
    return [];
  }
  return (data ?? []) as SubscriptionPlan[];
}

export async function getPlan(id: string): Promise<SubscriptionPlan | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('subscription_plans').select('*').eq('id', id).maybeSingle();
  if (error) return null;
  return data as SubscriptionPlan | null;
}

export interface SubscriptionFilters {
  status?: 'all' | SubscriptionStatus;
  plan_id?: string;
}

export async function listSubscriptions(filters: SubscriptionFilters = {}): Promise<{
  subscriptions: SubscriptionRow[];
  hasServiceRole: boolean;
}> {
  const supabase = await createClient();
  const hasServiceRole = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

  let query = supabase
    .from('subscriptions')
    .select(
      'id, user_id, plan_id, status, current_period_start, current_period_end, trial_ends_at, cancelled_at, amount_at_signup, currency_at_signup, created_at, subscription_plans(name)',
    )
    .order('created_at', { ascending: false })
    .limit(200);

  if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }
  if (filters.plan_id) {
    query = query.eq('plan_id', filters.plan_id);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[subscriptions] list:', error.message);
    return { subscriptions: [], hasServiceRole };
  }

  const rows = (data ?? []) as Array<
    Omit<SubscriptionRow, 'plan_name' | 'user_email'> & {
      subscription_plans?: { name?: string } | null;
    }
  >;

  // Email lookup — service-role gerekli
  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const emails = new Map<string, string>();
  if (hasServiceRole && userIds.length) {
    try {
      const adminDb = createAdminClient();
      const { data: usersResp } = await adminDb.auth.admin.listUsers({ page: 1, perPage: 1000 });
      for (const u of usersResp?.users ?? []) {
        if (userIds.includes(u.id) && u.email) emails.set(u.id, u.email);
      }
    } catch (e) {
      console.error('[subscriptions] email lookup:', e);
    }
  }

  const subscriptions: SubscriptionRow[] = rows.map((r) => ({
    id: r.id,
    user_id: r.user_id,
    user_email: emails.get(r.user_id) ?? null,
    plan_id: r.plan_id,
    plan_name: r.subscription_plans?.name ?? null,
    status: r.status,
    current_period_start: r.current_period_start,
    current_period_end: r.current_period_end,
    trial_ends_at: r.trial_ends_at,
    cancelled_at: r.cancelled_at,
    amount_at_signup: r.amount_at_signup,
    currency_at_signup: r.currency_at_signup,
    created_at: r.created_at,
  }));

  return { subscriptions, hasServiceRole };
}
