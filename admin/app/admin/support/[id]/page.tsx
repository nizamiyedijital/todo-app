import Link from 'next/link';
import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import {
  ArrowLeft,
  User as UserIcon,
  Lock,
  Globe,
  Smartphone,
  ExternalLink,
} from 'lucide-react';
import { getTicket } from '@/lib/support';
import { getAdminUser } from '@/lib/auth';
import {
  TICKET_STATUS_LABELS,
  TICKET_CATEGORY_LABELS,
} from '@/lib/support-shared';
import { logAudit } from '@/lib/audit';
import { ReplyForm } from './reply-form';
import { StatusControls } from './status-controls';

export default async function TicketDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const [{ ticket, messages }, admin] = await Promise.all([
    getTicket(id),
    getAdminUser(),
  ]);

  if (!ticket) notFound();
  if (!admin) notFound();

  await logAudit('USER_VIEWED', {
    targetType: 'support_ticket',
    targetId: id,
  });

  const st = TICKET_STATUS_LABELS[ticket.status];

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <Link
          href="/admin/support"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-[#12A3E3]"
        >
          <ArrowLeft className="w-4 h-4" />
          Tüm talepler
        </Link>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mt-2">
          {ticket.subject}
        </h1>
        <div className="flex items-center gap-2 flex-wrap mt-1.5 text-xs text-slate-500 dark:text-slate-400">
          <span
            className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider ${st.cls}`}
          >
            {st.label}
          </span>
          <span>·</span>
          <span>{TICKET_CATEGORY_LABELS[ticket.category]}</span>
          <span>·</span>
          <span>
            Açıldı: {format(new Date(ticket.created_at), 'd MMM yyyy HH:mm', { locale: tr })}
          </span>
          {ticket.first_response_at && (
            <>
              <span>·</span>
              <span>
                İlk cevap: {format(new Date(ticket.first_response_at), 'd MMM HH:mm', { locale: tr })}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr,280px] gap-6">
        {/* Sol — mesaj zinciri + cevap formu */}
        <div className="space-y-4">
          {/* User context kartı */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0">
                <UserIcon className="w-4 h-4 text-slate-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {ticket.user_name || ticket.user_email}
                </div>
                {ticket.user_id ? (
                  <Link
                    href={`/admin/users/${ticket.user_id}`}
                    className="text-xs text-[#12A3E3] hover:underline inline-flex items-center gap-1"
                  >
                    Kullanıcı detayı
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                ) : (
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {ticket.user_email}
                  </span>
                )}
              </div>
              <div className="text-right text-[10px] text-slate-400 dark:text-slate-500 space-y-0.5">
                {ticket.platform && (
                  <div className="flex items-center gap-1 justify-end">
                    {ticket.platform === 'web' ? (
                      <Globe className="w-3 h-3" />
                    ) : (
                      <Smartphone className="w-3 h-3" />
                    )}
                    {ticket.platform}
                  </div>
                )}
                {ticket.app_version && <div>v{ticket.app_version}</div>}
                {ticket.related_url && (
                  <a
                    href={ticket.related_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#12A3E3] hover:underline truncate block max-w-[200px]"
                  >
                    {ticket.related_url}
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Mesaj zinciri */}
          <div className="space-y-3">
            {messages.length === 0 ? (
              <div className="text-sm text-slate-500 dark:text-slate-400 text-center py-8 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                Bu talep için henüz mesaj yok. İlk cevabı sen yaz.
              </div>
            ) : (
              messages.map((m) => {
                const isAdmin = m.author_type === 'admin';
                const isSystem = m.author_type === 'system';
                return (
                  <div
                    key={m.id}
                    className={`rounded-xl border p-4 ${
                      m.is_internal_note
                        ? 'border-amber-300 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-900/20'
                        : isAdmin
                          ? 'border-blue-200 bg-blue-50/60 dark:border-blue-900/40 dark:bg-blue-900/10'
                          : isSystem
                            ? 'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/40'
                            : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2 text-xs">
                      <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                        {m.is_internal_note && <Lock className="w-3 h-3" />}
                        <span>
                          {isAdmin ? 'Admin' : isSystem ? 'Sistem' : 'Kullanıcı'}
                        </span>
                        {m.author_email && (
                          <span className="text-slate-400 dark:text-slate-500 font-normal">
                            · {m.author_email}
                          </span>
                        )}
                        {m.is_internal_note && (
                          <span className="text-[10px] uppercase tracking-wider text-amber-700 dark:text-amber-400 font-semibold">
                            İç not
                          </span>
                        )}
                      </div>
                      <span className="text-slate-400 dark:text-slate-500">
                        {format(new Date(m.created_at), 'd MMM HH:mm', { locale: tr })}
                      </span>
                    </div>
                    <div className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap break-words">
                      {m.body}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Cevap formu */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-3">
              Cevap yaz
            </h3>
            <ReplyForm ticketId={ticket.id} />
          </div>
        </div>

        {/* Sağ — kontroller */}
        <aside className="space-y-4">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-3">
              Kontroller
            </h3>
            <StatusControls
              ticketId={ticket.id}
              currentStatus={ticket.status}
              currentPriority={ticket.priority}
              currentAssignee={ticket.assigned_to}
              currentUserId={admin.userId}
              currentUserEmail={admin.email}
            />
          </div>

          {/* Meta */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 text-xs space-y-1.5">
            <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
              Detay
            </h3>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Kaynak</span>
              <span className="text-slate-700 dark:text-slate-300">{ticket.source}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">ID</span>
              <code className="text-[10px] text-slate-700 dark:text-slate-300">{ticket.id.slice(0, 8)}…</code>
            </div>
            {ticket.resolved_at && (
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Çözüldü</span>
                <span className="text-slate-700 dark:text-slate-300">
                  {format(new Date(ticket.resolved_at), 'd MMM', { locale: tr })}
                </span>
              </div>
            )}
            {ticket.satisfaction_rating != null && (
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Memnuniyet</span>
                <span className="text-slate-700 dark:text-slate-300">
                  {'★'.repeat(ticket.satisfaction_rating)}
                  {'☆'.repeat(5 - ticket.satisfaction_rating)}
                </span>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
