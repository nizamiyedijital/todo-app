import Link from 'next/link';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { CreditCard, Settings as SettingsIcon } from 'lucide-react';
import { listSubscriptions, listPlans } from '@/lib/subscriptions';
import { STATUS_LABELS, type SubscriptionStatus } from '@/lib/subscriptions-shared';
import { logAudit } from '@/lib/audit';

export default async function SubscriptionsPage(props: {
  searchParams: Promise<{ status?: string }>;
}) {
  const sp = await props.searchParams;
  const status = (sp.status as 'all' | SubscriptionStatus) ?? 'all';

  const [{ subscriptions }, plans] = await Promise.all([
    listSubscriptions({ status }),
    listPlans(),
  ]);
  await logAudit('USER_VIEWED', { targetType: 'subscriptions_list' });

  // Aggregate stats
  const activeCount = subscriptions.filter((s) => s.status === 'active' || s.status === 'trialing').length;
  const mrr = subscriptions
    .filter((s) => s.status === 'active' && s.amount_at_signup)
    .reduce((sum, s) => sum + (s.amount_at_signup ?? 0), 0);

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
            Abonelikler
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Tüm aboneliklerin durumu. Iyzico entegrasyonu Faz 3'te.
          </p>
        </div>
        <Link
          href="/admin/plans"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          <SettingsIcon className="w-4 h-4" />
          Plan Yönetimi ({plans.length})
        </Link>
      </div>

      {/* Mini KPI'lar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SmallKpi label="Aktif Abonelik" value={activeCount} />
        <SmallKpi label="MRR (TL)" value={mrr.toFixed(2)} hint="aktif aboneliklerin sign-up tutarı toplamı" />
        <SmallKpi label="Toplam Abonelik" value={subscriptions.length} hint="iptal+expired dahil" />
      </div>

      {/* Status tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
        {[
          { key: 'all', label: 'Hepsi' },
          { key: 'active', label: 'Aktif' },
          { key: 'trialing', label: 'Deneme' },
          { key: 'past_due', label: 'Gecikmiş' },
          { key: 'cancelled', label: 'İptal' },
          { key: 'expired', label: 'Süresi doldu' },
        ].map((tab) => (
          <Link
            key={tab.key}
            href={tab.key === 'all' ? '/admin/subscriptions' : `/admin/subscriptions?status=${tab.key}`}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${
              status === tab.key
                ? 'border-[#12A3E3] text-[#12A3E3]'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {subscriptions.length === 0 ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center">
          <CreditCard className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700" />
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-3">
            Bu kategoride abonelik yok.
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            İlk abonelik Iyzico entegrasyonu (Faz 3) sonrası oluşacak.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <tr>
                <th className="text-left p-3 font-medium">Kullanıcı</th>
                <th className="text-left p-3 font-medium">Plan</th>
                <th className="text-left p-3 font-medium">Durum</th>
                <th className="text-right p-3 font-medium">Tutar</th>
                <th className="text-left p-3 font-medium">Dönem sonu</th>
                <th className="text-left p-3 font-medium">Başlangıç</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {subscriptions.map((s) => {
                const st = STATUS_LABELS[s.status];
                return (
                  <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <td className="p-3">
                      <Link
                        href={`/admin/users/${s.user_id}`}
                        className="text-sm text-slate-900 dark:text-slate-100 hover:text-[#12A3E3]"
                      >
                        {s.user_email ?? <code className="text-xs">{s.user_id.slice(0, 8)}…</code>}
                      </Link>
                    </td>
                    <td className="p-3 text-xs text-slate-700 dark:text-slate-300">
                      {s.plan_name ?? '—'}
                    </td>
                    <td className="p-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider ${st.cls}`}
                      >
                        {st.label}
                      </span>
                    </td>
                    <td className="p-3 text-right text-xs text-slate-700 dark:text-slate-300 tabular-nums">
                      {s.amount_at_signup
                        ? `${s.amount_at_signup} ${s.currency_at_signup ?? 'TRY'}`
                        : '—'}
                    </td>
                    <td className="p-3 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {format(new Date(s.current_period_end), 'd MMM yyyy', { locale: tr })}
                    </td>
                    <td className="p-3 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {format(new Date(s.created_at), 'd MMM yyyy', { locale: tr })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SmallKpi({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
      <div className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {label}
      </div>
      <div className="mt-1.5 text-xl font-semibold text-slate-900 dark:text-slate-100">{value}</div>
      {hint && (
        <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">{hint}</div>
      )}
    </div>
  );
}
