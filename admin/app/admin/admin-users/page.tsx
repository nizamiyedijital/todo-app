import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { ShieldCheck, AlertCircle } from 'lucide-react';
import { listAdminUsers } from '@/lib/admin-users';
import { getAdminUser } from '@/lib/auth';
import { hasRole } from '@/lib/rbac';
import { logAudit } from '@/lib/audit';
import { RoleControls } from './role-controls';
import { StatusToggle } from './status-toggle';
import { NoServiceRoleNotice } from '@/components/admin/no-service-role';

const STATUS_LABELS: Record<string, string> = {
  active: 'Aktif',
  suspended: 'Askıda',
  invited: 'Davetli',
};

export default async function AdminUsersPage() {
  const me = await getAdminUser();
  const isOwner = me ? hasRole(me.roles, 'owner') : false;
  const { admins, hasServiceRole } = await listAdminUsers();
  await logAudit('USER_VIEWED', { targetType: 'admin_users_list' });

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          Admin Kullanıcıları
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Admin paneline erişim yetkisi olan kullanıcılar — toplam {admins.length}
        </p>
      </div>

      {!hasServiceRole && (
        <NoServiceRoleNotice feature="Admin email gösterimi" />
      )}

      {!isOwner && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-900/20 p-4 text-sm">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-medium text-amber-900 dark:text-amber-200">
                Sadece görüntüleme
              </div>
              <p className="text-amber-700 dark:text-amber-300 text-xs mt-1">
                Rol verme/kaldırma sadece <strong>owner</strong> rolüne sahip kullanıcılar tarafından
                yapılabilir.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <tr>
              <th className="text-left p-3 font-medium">Admin</th>
              <th className="text-left p-3 font-medium">Roller</th>
              <th className="text-left p-3 font-medium">Durum</th>
              <th className="text-left p-3 font-medium">Eklendi</th>
              <th className="text-left p-3 font-medium">Son giriş</th>
              <th className="text-right p-3 font-medium">Aksiyon</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {admins.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-sm text-slate-400">
                  Henüz admin yok
                </td>
              </tr>
            ) : (
              admins.map((a) => {
                const isSelf = me?.adminUserId === a.id;
                return (
                  <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <td className="p-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-[#12A3E3] text-white flex items-center justify-center text-xs font-semibold">
                          {(a.email ?? '?')[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                            {a.email ?? <code className="text-xs">{a.user_id.slice(0, 8)}…</code>}
                            {isSelf && (
                              <span className="ml-2 text-[10px] text-emerald-600">(siz)</span>
                            )}
                          </div>
                          {a.notes && (
                            <div className="text-[10px] text-slate-400 mt-0.5 truncate max-w-xs">
                              {a.notes}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <RoleControls
                        adminUserId={a.id}
                        currentRoles={a.roles}
                        isOwnerSelf={isSelf && a.roles.includes('owner')}
                        canManage={isOwner}
                      />
                    </td>
                    <td className="p-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded font-medium ${
                          a.status === 'active'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                            : a.status === 'suspended'
                              ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                        }`}
                      >
                        {STATUS_LABELS[a.status]}
                      </span>
                    </td>
                    <td className="p-3 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {format(new Date(a.created_at), 'd MMM yyyy', { locale: tr })}
                    </td>
                    <td className="p-3 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {a.last_login_at
                        ? format(new Date(a.last_login_at), 'd MMM HH:mm', { locale: tr })
                        : '—'}
                    </td>
                    <td className="p-3 text-right">
                      {isOwner && (
                        <StatusToggle adminUserId={a.id} status={a.status} disabled={isSelf} />
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {isOwner && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/30 p-4 text-xs text-slate-600 dark:text-slate-400">
          <strong>Yeni admin eklemek için:</strong> Kullanıcı önce uygulamadan kayıt olmalı.
          Sonra Supabase SQL Editor'da:
          <pre className="mt-2 p-2 rounded bg-slate-100 dark:bg-slate-800 overflow-x-auto text-[10px]">
{`insert into public.admin_users (user_id, status, created_by)
values ((select id from auth.users where email = 'YENI_ADMIN_EMAIL'), 'active', auth.uid());`}
          </pre>
          Sonra burada o admin'e rol verebilirsin.
          (Faz 2'de davet sistemi UI eklenecek.)
        </div>
      )}
    </div>
  );
}
