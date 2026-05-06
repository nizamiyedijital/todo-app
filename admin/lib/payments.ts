import 'server-only';
import { createClient } from './supabase/server';
import { createAdminClient } from './supabase/admin';
import type { Payment, PaymentStatus } from './payments-shared';

export type { Payment, PaymentStatus } from './payments-shared';

export async function listPayments(filters: { status?: 'all' | PaymentStatus } = {}): Promise<{
  payments: Payment[];
  hasServiceRole: boolean;
}> {
  const supabase = await createClient();
  const hasServiceRole = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

  let query = supabase
    .from('payments')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);

  if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[payments] list:', error.message);
    return { payments: [], hasServiceRole };
  }

  const payments = (data ?? []) as Payment[];

  // user_email join (service-role gerekli)
  if (hasServiceRole && payments.length) {
    const ids = [...new Set(payments.map((p) => p.user_id))];
    try {
      const adminDb = createAdminClient();
      const { data: usersResp } = await adminDb.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const emails = new Map<string, string>();
      for (const u of usersResp?.users ?? []) {
        if (ids.includes(u.id) && u.email) emails.set(u.id, u.email);
      }
      for (const p of payments) p.user_email = emails.get(p.user_id) ?? null;
    } catch (e) {
      console.error('[payments] email lookup:', e);
    }
  }

  return { payments, hasServiceRole };
}

export async function getPaymentStats(): Promise<{
  succeeded_count_30d: number;
  succeeded_amount_30d: number;
  failed_count_30d: number;
  refunded_amount_30d: number;
}> {
  const supabase = await createClient();
  const since = new Date(Date.now() - 30 * 86400_000).toISOString();

  const { data, error } = await supabase
    .from('payments')
    .select('status, amount, refund_amount')
    .gte('created_at', since);

  if (error || !data) {
    return {
      succeeded_count_30d: 0,
      succeeded_amount_30d: 0,
      failed_count_30d: 0,
      refunded_amount_30d: 0,
    };
  }

  const stats = {
    succeeded_count_30d: 0,
    succeeded_amount_30d: 0,
    failed_count_30d: 0,
    refunded_amount_30d: 0,
  };
  for (const r of data as Array<{ status: PaymentStatus; amount: number; refund_amount: number | null }>) {
    if (r.status === 'succeeded') {
      stats.succeeded_count_30d += 1;
      stats.succeeded_amount_30d += Number(r.amount);
    } else if (r.status === 'failed') {
      stats.failed_count_30d += 1;
    } else if (r.status === 'refunded' || r.status === 'partially_refunded') {
      stats.refunded_amount_30d += Number(r.refund_amount ?? r.amount);
    }
  }
  return stats;
}
