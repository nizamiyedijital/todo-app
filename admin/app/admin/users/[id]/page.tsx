import Link from 'next/link';
import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { ChevronLeft, Pin, ShieldCheck, Crown, Calendar, Mail, CheckCircle2 } from 'lucide-react';
import { getUserDetail } from '@/lib/users';
import { logAudit } from '@/lib/audit';
import { NoteForm } from './note-form';
import { NoServiceRoleNotice } from '@/components/admin/no-service-role';

export default async function UserDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const detail = await getUserDetail(id);

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return (
      <div className="space-y-6 max-w-3xl">
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
        >
          <ChevronLeft className="w-4 h-4" /> Kullanıcılara dön
        </Link>
        <NoServiceRoleNotice feature="Kullanıcı detayı" />
      </div>
    );
  }

  if (!detail) notFound();
  await logAudit('USER_VIEWED', { targetType: 'user', targetId: id });

  const { user, stats, subscription: sub, notes, isAdmin } = detail;
  const planName = sub?.subscription_plans?.name ?? sub?.subscription_plans?.code ?? null;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Üst nav */}
      <Link
        href="/admin/users"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <ChevronLeft className="w-4 h-4" /> Kullanıcılara dön
      </Link>

      {/* Profil özeti */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-full bg-[#12A3E3] text-white flex items-center justify-center text-xl font-semibold">
            {user.email?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100 truncate">
              {user.email ?? '(email yok)'}
            </h1>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-3 flex-wrap">
              <span className="inline-flex items-center gap-1">
                <Mail className="w-3 h-3" />
                {user.provider}
              </span>
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Kayıt: {format(new Date(user.createdAt), 'd MMM yyyy', { locale: tr })}
              </span>
              {user.emailConfirmed ? (
                <span className="inline-flex items-center gap-1 text-emerald-600">
                  <CheckCircle2 className="w-3 h-3" /> Doğrulandı
                </span>
              ) : (
                <span className="text-amber-600">⚠ Email doğrulanmamış</span>
              )}
              {isAdmin && (
                <span className="inline-flex items-center gap-1 text-[#12A3E3]">
                  <ShieldCheck className="w-3 h-3" /> Admin
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Toplam Görev" value={stats.taskCount} />
        <StatCard label="Tamamlanan" value={stats.completedTaskCount} />
        <StatCard label="Tamamlama %" value={`${stats.completionRate}%`} />
        <StatCard
          label="Son giriş"
          value={
            user.lastSignInAt
              ? format(new Date(user.lastSignInAt), 'd MMM', { locale: tr })
              : '—'
          }
        />
      </div>

      {/* İki sütun: Abonelik + Notlar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Abonelik */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-1.5">
            <Crown className="w-4 h-4 text-[#12A3E3]" />
            Abonelik
          </div>
          {sub ? (
            <dl className="space-y-2 text-sm">
              <Row label="Plan" value={planName ?? '—'} />
              <Row label="Durum" value={sub.status as string} highlight={sub.status === 'active'} />
              <Row
                label="Dönem başı"
                value={
                  sub.current_period_start
                    ? format(new Date(sub.current_period_start as string), 'd MMM yyyy', {
                        locale: tr,
                      })
                    : '—'
                }
              />
              <Row
                label="Dönem sonu"
                value={
                  sub.current_period_end
                    ? format(new Date(sub.current_period_end as string), 'd MMM yyyy', {
                        locale: tr,
                      })
                    : '—'
                }
              />
              <Row
                label="Tutar"
                value={
                  sub.subscription_plans?.amount
                    ? `${sub.subscription_plans.amount} TL`
                    : '—'
                }
              />
            </dl>
          ) : (
            <div className="text-sm text-slate-500 dark:text-slate-400">
              Free kullanıcı (aktif abonelik yok)
            </div>
          )}
        </div>

        {/* Notlar */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
            Admin Notları
          </div>
          <NoteForm userId={user.id} />
          <div className="mt-4 space-y-2">
            {notes.length === 0 && (
              <div className="text-xs text-slate-400 dark:text-slate-500 text-center py-4">
                Henüz not eklenmedi
              </div>
            )}
            {notes.map((n) => (
              <div
                key={n.id}
                className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 whitespace-pre-wrap text-slate-700 dark:text-slate-300">
                    {n.body}
                  </div>
                  {n.pinned && <Pin className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />}
                </div>
                <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5">
                  {format(new Date(n.created_at), 'd MMM yyyy HH:mm', { locale: tr })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Placeholder: Faz 1B+ aksiyonlar */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/30 p-4 text-xs text-slate-500 dark:text-slate-400">
        <strong>Yakında (Faz 1B+):</strong> Pasifleştirme, plan değiştirme,
        veri ihracı, hesap silme — Faz 3 ödeme bağlantısı tamamlanınca eklenecek.
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
      <div className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-medium">
        {label}
      </div>
      <div className="mt-1.5 text-xl font-semibold text-slate-900 dark:text-slate-100">
        {value}
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex justify-between items-center text-sm">
      <dt className="text-slate-500 dark:text-slate-400">{label}</dt>
      <dd
        className={
          highlight
            ? 'font-medium text-emerald-600'
            : 'text-slate-700 dark:text-slate-300'
        }
      >
        {value}
      </dd>
    </div>
  );
}
