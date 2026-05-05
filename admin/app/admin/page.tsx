import Link from 'next/link';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { getAdminUser } from '@/lib/auth';
import { getKpiSnapshot, getGrowthData, getRecentAuditLog } from '@/lib/dashboard';
import { KpiCard } from '@/components/admin/kpi-card';
import { GrowthChart } from '@/components/admin/growth-chart';

export default async function AdminHome() {
  const admin = await getAdminUser();
  const [kpi, growth, audit] = await Promise.all([
    getKpiSnapshot(),
    getGrowthData(),
    getRecentAuditLog(8),
  ]);

  const hasServiceRole = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Page header */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
            Genel Bakış
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Hoş geldin, {admin?.email}. Bugünün özeti aşağıda.
          </p>
        </div>
        <div className="text-xs text-slate-400 dark:text-slate-500">
          {format(new Date(), 'd MMMM yyyy, EEEE', { locale: tr })}
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard label="Toplam Kullanıcı" value={kpi.totalUsers} hint="auth.users" />
        <KpiCard label="Yeni (7 gün)" value={kpi.newUsers7d} hint="son 7 gün" />
        <KpiCard label="Toplam Görev" value={kpi.totalTasks} hint="tüm zaman" />
        <KpiCard
          label="Bugün Tamamlanan"
          value={kpi.tasksCompletedToday}
          hint="00:00'dan itibaren"
        />
        <KpiCard label="Pro Aboneler" value={kpi.proSubscribers} hint="active+trial" />
        <KpiCard label="Açık Ticket" value={kpi.openTickets} hint="resolved/closed hariç" />
      </div>

      {/* Service-role uyarısı */}
      {!hasServiceRole && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-900/20 p-4 text-sm">
          <div className="font-medium text-amber-900 dark:text-amber-200">
            ⓘ Bazı KPI'lar boş — service-role key eksik
          </div>
          <div className="text-amber-700 dark:text-amber-300 mt-1 text-xs">
            <code className="px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40">
              SUPABASE_SERVICE_ROLE_KEY
            </code>{' '}
            <code>.env.local</code>'a eklenince auth.users + tasks sayımları gerçek değerlerle dolar.
            Supabase Dashboard → Project Settings → API → "service_role" key.
          </div>
        </div>
      )}

      {/* Growth chart + Recent audit */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Son 30 Gün Büyüme
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Günlük yeni kayıt sayıları
              </div>
            </div>
          </div>
          <GrowthChart data={growth} />
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Son Aktivite
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Audit log</div>
            </div>
            <Link
              href="/admin/audit-log"
              className="text-xs text-[#12A3E3] hover:underline"
            >
              Tümü
            </Link>
          </div>
          {audit.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-xs text-slate-400">
              Henüz audit kaydı yok
            </div>
          ) : (
            <ul className="space-y-2">
              {audit.map((row) => (
                <li
                  key={row.id}
                  className="text-xs border-l-2 border-[#12A3E3]/30 pl-2 py-1"
                >
                  <div className="font-medium text-slate-700 dark:text-slate-300">
                    {row.action}
                  </div>
                  <div className="text-slate-500 dark:text-slate-400 truncate">
                    {row.actor_email ?? 'sistem'} ·{' '}
                    {format(new Date(row.created_at), 'd MMM HH:mm', { locale: tr })}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
