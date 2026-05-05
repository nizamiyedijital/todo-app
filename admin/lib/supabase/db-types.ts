/**
 * Manuel-yazılmış DB tipleri.
 * İdeal yol: Supabase CLI ile auto-generate (`supabase gen types typescript`).
 * Şimdilik kullandığımız kolonları el ile yazıyoruz.
 */

export interface DbTask {
  id: string;
  user_id: string;
  done: boolean;
  created_at: string;
  completed_at?: string | null;
}

export interface DbSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  created_at: string;
  subscription_plans?: DbSubscriptionPlan | null;
}

export interface DbSubscriptionPlan {
  code: string;
  name: string;
  amount?: number;
  currency?: string;
  interval?: string;
}

export interface DbAdminUser {
  id: string;
  user_id: string;
  status: 'active' | 'suspended' | 'invited';
  created_at: string;
}

export interface DbAdminUserNote {
  id: string;
  user_id: string;
  author_id: string | null;
  body: string;
  pinned: boolean;
  created_at: string;
}

export interface DbAuditLog {
  id: number;
  actor_id: string | null;
  actor_email: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  payload: Record<string, unknown>;
  created_at: string;
}
