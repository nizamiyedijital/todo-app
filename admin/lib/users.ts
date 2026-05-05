/**
 * Kullanıcı yönetimi data layer — service-role gerektirir (auth.users sorguları).
 * Service-role yoksa null döner, UI bunu uyarı olarak gösterir.
 */
import { createAdminClient } from './supabase/admin';
import type { DbTask, DbSubscription, DbAdminUser, DbAdminUserNote } from './supabase/db-types';

export interface AppUser {
  id: string;
  email: string | undefined;
  name: string | null;
  createdAt: string;
  lastSignInAt: string | null;
  emailConfirmed: boolean;
  isAdmin: boolean;
  // İstatistikler
  taskCount: number;
  completedTaskCount: number;
  // Abonelik
  subscriptionStatus: string | null;
  subscriptionPlan: string | null;
}

export interface UserFilters {
  q?: string; // email araması
  status?: 'all' | 'active' | 'inactive' | 'unconfirmed';
  plan?: 'all' | 'free' | 'pro';
  page?: number;
  perPage?: number;
}

export interface UserListResult {
  users: AppUser[];
  total: number;
  hasServiceRole: boolean;
}

/**
 * Kullanıcı listesi — Supabase auth.users + tasks + subscriptions join.
 * Service-role yoksa boş liste + flag.
 */
export async function listUsers(filters: UserFilters = {}): Promise<UserListResult> {
  const hasServiceRole = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!hasServiceRole) {
    return { users: [], total: 0, hasServiceRole: false };
  }

  const adminDb = createAdminClient();
  const page = filters.page ?? 1;
  const perPage = filters.perPage ?? 50;

  // 1) auth.users — perPage sınırı, Supabase'in limit'i
  const { data: authResp, error: authErr } = await adminDb.auth.admin.listUsers({
    page,
    perPage,
  });
  if (authErr) {
    console.error('[users] listUsers:', authErr.message);
    return { users: [], total: 0, hasServiceRole: true };
  }

  let authUsers = authResp.users ?? [];
  const total = authResp.total ?? authUsers.length;

  // 2) Email araması (client-side filter — listUsers query desteklemiyor)
  if (filters.q?.trim()) {
    const q = filters.q.trim().toLowerCase();
    authUsers = authUsers.filter((u) => u.email?.toLowerCase().includes(q));
  }

  // 3) Durum filtresi
  if (filters.status && filters.status !== 'all') {
    if (filters.status === 'unconfirmed') {
      authUsers = authUsers.filter((u) => !u.email_confirmed_at);
    } else if (filters.status === 'active') {
      authUsers = authUsers.filter((u) => u.email_confirmed_at && u.last_sign_in_at);
    } else if (filters.status === 'inactive') {
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      authUsers = authUsers.filter(
        (u) =>
          !u.last_sign_in_at ||
          new Date(u.last_sign_in_at).getTime() < thirtyDaysAgo,
      );
    }
  }

  if (authUsers.length === 0) {
    return { users: [], total, hasServiceRole: true };
  }

  const userIds = authUsers.map((u) => u.id);

  // 4) Görev sayıları — toplu sorgu (her user için ayrı RPC patlatmamak için)
  const tasksRes = await adminDb
    .from('tasks')
    .select('user_id, done')
    .in('user_id', userIds);
  const tasksData = (tasksRes.data ?? []) as Pick<DbTask, 'user_id' | 'done'>[];

  const taskCounts = new Map<string, { total: number; done: number }>();
  for (const t of tasksData) {
    const cur = taskCounts.get(t.user_id) ?? { total: 0, done: 0 };
    cur.total += 1;
    if (t.done) cur.done += 1;
    taskCounts.set(t.user_id, cur);
  }

  // 5) Abonelikler
  const subsRes = await adminDb
    .from('subscriptions')
    .select('user_id, status, plan_id, subscription_plans(code, name)')
    .in('user_id', userIds)
    .in('status', ['trialing', 'active', 'past_due', 'cancelled']);
  const subsData = (subsRes.data ?? []) as Array<
    Pick<DbSubscription, 'user_id' | 'status' | 'plan_id'> & {
      subscription_plans?: { code?: string; name?: string } | null;
    }
  >;

  const subsMap = new Map<string, { status: string; plan: string | null }>();
  for (const s of subsData) {
    subsMap.set(s.user_id, {
      status: s.status,
      plan: s.subscription_plans?.name ?? s.subscription_plans?.code ?? null,
    });
  }

  // 6) Admin kontrolü — toplu
  const adminsRes = await adminDb
    .from('admin_users')
    .select('user_id')
    .in('user_id', userIds);
  const adminsData = (adminsRes.data ?? []) as Pick<DbAdminUser, 'user_id'>[];
  const adminIds = new Set(adminsData.map((a) => a.user_id));

  // 7) Plan filtresi — sub'a bağlı
  const planFiltered = authUsers.filter((u) => {
    if (filters.plan === 'pro') {
      const sub = subsMap.get(u.id);
      return sub && (sub.status === 'active' || sub.status === 'trialing');
    }
    if (filters.plan === 'free') {
      const sub = subsMap.get(u.id);
      return !sub || (sub.status !== 'active' && sub.status !== 'trialing');
    }
    return true;
  });

  const users: AppUser[] = planFiltered.map((u) => {
    const stats = taskCounts.get(u.id) ?? { total: 0, done: 0 };
    const sub = subsMap.get(u.id);
    return {
      id: u.id,
      email: u.email,
      name: (u.user_metadata?.name as string | undefined) ?? null,
      createdAt: u.created_at,
      lastSignInAt: u.last_sign_in_at ?? null,
      emailConfirmed: !!u.email_confirmed_at,
      isAdmin: adminIds.has(u.id),
      taskCount: stats.total,
      completedTaskCount: stats.done,
      subscriptionStatus: sub?.status ?? null,
      subscriptionPlan: sub?.plan ?? null,
    };
  });

  return { users, total, hasServiceRole: true };
}

/**
 * Tek kullanıcı detay — auth.users + tasks summary + subscription + notes
 */
export async function getUserDetail(userId: string) {
  const hasServiceRole = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!hasServiceRole) return null;

  const adminDb = createAdminClient();

  const { data: authUser, error } = await adminDb.auth.admin.getUserById(userId);
  if (error || !authUser?.user) return null;
  const u = authUser.user;

  // Görev özeti
  const [tasksRes, subsRes, notesRes, adminRes] = await Promise.all([
    adminDb.from('tasks').select('id, done, created_at').eq('user_id', userId),
    adminDb
      .from('subscriptions')
      .select(
        'id, status, plan_id, current_period_start, current_period_end, subscription_plans(code, name, amount)',
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    adminDb
      .from('admin_user_notes')
      .select('id, body, pinned, author_id, created_at, user_id')
      .eq('user_id', userId)
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false }),
    adminDb.from('admin_users').select('id, status').eq('user_id', userId).maybeSingle(),
  ]);

  const tasks = (tasksRes.data ?? []) as Pick<DbTask, 'id' | 'done' | 'created_at'>[];
  const subscription = subsRes.data as
    | (Pick<
        DbSubscription,
        'id' | 'status' | 'plan_id' | 'current_period_start' | 'current_period_end'
      > & {
        subscription_plans?: { code?: string; name?: string; amount?: number } | null;
      })
    | null;
  const notesData = (notesRes.data ?? []) as DbAdminUserNote[];
  const adminCheck = adminRes.data as Pick<DbAdminUser, 'id' | 'status'> | null;

  const completed = tasks.filter((t) => t.done).length;

  return {
    user: {
      id: u.id,
      email: u.email,
      name: (u.user_metadata?.name as string | undefined) ?? null,
      createdAt: u.created_at,
      lastSignInAt: u.last_sign_in_at ?? null,
      emailConfirmed: !!u.email_confirmed_at,
      provider: (u.app_metadata?.provider as string | undefined) ?? 'email',
    },
    stats: {
      taskCount: tasks.length,
      completedTaskCount: completed,
      completionRate: tasks.length ? Math.round((completed / tasks.length) * 100) : 0,
      firstTaskAt:
        tasks.length > 0
          ? tasks
              .map((t) => t.created_at)
              .filter(Boolean)
              .sort()[0]
          : null,
    },
    subscription,
    notes: notesData,
    isAdmin: !!adminCheck,
    adminStatus: adminCheck?.status ?? null,
  };
}
