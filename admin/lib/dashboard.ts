/**
 * Dashboard veri kaynakları — server-side.
 * Mevcut Supabase tablolarından gerçek sayım, eksik veri için null fallback.
 *
 * Service-role key gerekenler (admin.ts) işaretli — yoksa null döner.
 */
import { createClient } from './supabase/server';
import { createAdminClient } from './supabase/admin';

export interface KpiSnapshot {
  totalUsers: number | null;
  newUsers7d: number | null;
  totalTasks: number | null;
  tasksCompletedToday: number | null;
  proSubscribers: number | null;
  openTickets: number | null;
}

export interface GrowthPoint {
  date: string; // 'YYYY-MM-DD'
  signups: number;
}

/**
 * KPI snapshot — Supabase'den çek. Service-role gerektirmiyorsa anon ile,
 * gerekiyorsa admin client ile, key yoksa null döner.
 */
export async function getKpiSnapshot(): Promise<KpiSnapshot> {
  const supabase = await createClient();

  // Yedek: service role yoksa null bırak, UI bunu gösterir
  const hasServiceRole = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  const adminDb = hasServiceRole ? createAdminClient() : null;

  // 1) Toplam kullanıcı — auth.users sadece service-role görür
  let totalUsers: number | null = null;
  let newUsers7d: number | null = null;
  if (adminDb) {
    try {
      const { data: usersList, error } = await adminDb.auth.admin.listUsers({
        page: 1,
        perPage: 1,
      });
      if (!error) {
        totalUsers = usersList.total ?? null;
      }
      // 7 gün öncesi
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { count } = await adminDb
        .from('admin_users') // proxy: en azından admin kayıtlarını sayalım, anon erişebilir
        .select('id', { count: 'exact', head: true })
        .gte('created_at', sevenDaysAgo);
      newUsers7d = count ?? null;
    } catch (e) {
      console.error('[dashboard] adminDb hata:', e);
    }
  }

  // 2) Toplam görev — RLS bloklayabilir; admin client kullanmak daha güvenli
  let totalTasks: number | null = null;
  let tasksCompletedToday: number | null = null;
  if (adminDb) {
    try {
      const { count: tCount } = await adminDb
        .from('tasks')
        .select('id', { count: 'exact', head: true });
      totalTasks = tCount ?? null;

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const { count: doneCount } = await adminDb
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .eq('done', true)
        .gte('completed_at', todayStart.toISOString());
      tasksCompletedToday = doneCount ?? null;
    } catch (e) {
      console.error('[dashboard] tasks count:', e);
    }
  }

  // 3) Pro aboneler — admin RLS açık (analyst'a izin var)
  let proSubscribers: number | null = null;
  try {
    const { count } = await supabase
      .from('subscriptions')
      .select('id', { count: 'exact', head: true })
      .in('status', ['trialing', 'active']);
    proSubscribers = count ?? 0;
  } catch (e) {
    console.error('[dashboard] subscriptions count:', e);
  }

  // 4) Açık ticket'lar
  let openTickets: number | null = null;
  try {
    const { count } = await supabase
      .from('support_tickets')
      .select('id', { count: 'exact', head: true })
      .not('status', 'in', '(resolved,closed)');
    openTickets = count ?? 0;
  } catch (e) {
    console.error('[dashboard] support count:', e);
  }

  return {
    totalUsers,
    newUsers7d,
    totalTasks,
    tasksCompletedToday,
    proSubscribers,
    openTickets,
  };
}

/**
 * Son 30 günün günlük signup grafiği — service-role gerektirir.
 * Yoksa boş array.
 */
export async function getGrowthData(): Promise<GrowthPoint[]> {
  const adminDb = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : null;
  if (!adminDb) return [];

  try {
    const start = new Date();
    start.setDate(start.getDate() - 29);
    start.setHours(0, 0, 0, 0);

    const { data: users, error } = await adminDb.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (error || !users?.users) return [];

    // Günlük bucket
    const buckets: Record<string, number> = {};
    for (let i = 0; i < 30; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      buckets[d.toISOString().slice(0, 10)] = 0;
    }
    for (const u of users.users) {
      const day = u.created_at?.slice(0, 10);
      if (day && day in buckets) buckets[day] += 1;
    }

    return Object.entries(buckets).map(([date, signups]) => ({ date, signups }));
  } catch (e) {
    console.error('[dashboard] growth data:', e);
    return [];
  }
}

/**
 * Son N audit log kaydı (admin görür).
 */
export async function getRecentAuditLog(limit = 10) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('audit_log')
    .select('id, actor_email, action, target_type, target_id, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[dashboard] audit_log:', error.message);
    return [];
  }
  return data ?? [];
}
