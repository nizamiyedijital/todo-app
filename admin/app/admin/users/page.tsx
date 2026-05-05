import Link from 'next/link';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { listUsers, type UserFilters } from '@/lib/users';
import { logAudit } from '@/lib/audit';
import { UsersFilterBar } from '@/components/admin/users-filter-bar';
import { NoServiceRoleNotice } from '@/components/admin/no-service-role';
import { ShieldCheck, Crown } from 'lucide-react';

export default async function UsersPage(props: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await props.searchParams;
  const filters: UserFilters = {
    q: sp.q,
    status: (sp.status as UserFilters['status']) ?? 'all',
    plan: (sp.plan as UserFilters['plan']) ?? 'all',
    page: sp.page ? Number(sp.page) : 1,
    perPage: 50,
  };

  await logAudit('USER_VIEWED', { targetType: 'users_list', payload: { ...filters } });

  const { users, total, hasServiceRole } = await listUsers(filters);

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          Kullanıcılar
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Toplam <strong>{total}</strong> kullanıcı kayıtlı.
        </p>
      </div>

      {!hasServiceRole ? (
        <NoServiceRoleNotice feature="Kullanıcı listesi" />
      ) : (
        <>
          <UsersFilterBar />

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="text-left p-3 font-medium">Kullanıcı</th>
                  <th className="text-left p-3 font-medium">Plan</th>
                  <th className="text-left p-3 font-medium">Durum</th>
                  <th className="text-right p-3 font-medium">Görev</th>
                  <th className="text-left p-3 font-medium">Son giriş</th>
                  <th className="text-left p-3 font-medium">Kayıt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-sm text-slate-400">
                      Filtreyle eşleşen kullanıcı yok
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <td className="p-3">
                        <Link
                          href={`/admin/users/${u.id}`}
                          className="flex items-center gap-2.5 group"
                        >
                          <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-semibold text-slate-600 dark:text-slate-300">
                            {u.email?.[0]?.toUpperCase() ?? '?'}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-slate-900 dark:text-slate-100 group-hover:text-[#12A3E3] truncate">
                              {u.email ?? '(email yok)'}
                            </div>
                            <div className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1.5 mt-0.5">
                              {u.isAdmin && (
                                <span className="inline-flex items-center gap-0.5 text-[#12A3E3]">
                                  <ShieldCheck className="w-3 h-3" /> admin
                                </span>
                              )}
                              {!u.emailConfirmed && (
                                <span className="text-amber-600">⚠ doğrulanmamış</span>
                              )}
                            </div>
                          </div>
                        </Link>
                      </td>
                      <td className="p-3">
                        {u.subscriptionPlan ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-[#12A3E3]/10 text-[#12A3E3]">
                            <Crown className="w-3 h-3" />
                            {u.subscriptionPlan}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500 dark:text-slate-400">Free</span>
                        )}
                      </td>
                      <td className="p-3">
                        {u.subscriptionStatus ? (
                          <span
                            className={
                              u.subscriptionStatus === 'active' || u.subscriptionStatus === 'trialing'
                                ? 'text-xs text-emerald-600'
                                : 'text-xs text-slate-500'
                            }
                          >
                            {u.subscriptionStatus}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="p-3 text-right text-xs text-slate-700 dark:text-slate-300 tabular-nums">
                        <span className="font-medium">{u.completedTaskCount}</span>
                        <span className="text-slate-400 mx-0.5">/</span>
                        <span>{u.taskCount}</span>
                      </td>
                      <td className="p-3 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {u.lastSignInAt
                          ? format(new Date(u.lastSignInAt), 'd MMM yy', { locale: tr })
                          : '—'}
                      </td>
                      <td className="p-3 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {format(new Date(u.createdAt), 'd MMM yy', { locale: tr })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400">
            Sayfa {filters.page} · {users.length} kullanıcı görünüyor (toplamdan filtrelenmiş)
          </div>
        </>
      )}
    </div>
  );
}
