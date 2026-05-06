import Link from 'next/link';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { LifeBuoy, MessageSquare, AlertCircle } from 'lucide-react';
import { listTickets, getOpenTicketStats } from '@/lib/support';
import {
  TICKET_STATUS_LABELS,
  TICKET_CATEGORY_LABELS,
  TICKET_PRIORITY_LABELS,
  type TicketStatus,
  type TicketPriority,
} from '@/lib/support-shared';
import { logAudit } from '@/lib/audit';

const STATUS_TABS: Array<{ key: 'all' | 'open' | TicketStatus; label: string }> = [
  { key: 'open', label: 'Açık' },
  { key: 'all', label: 'Hepsi' },
  { key: 'new', label: 'Yeni' },
  { key: 'in_progress', label: 'İnceleniyor' },
  { key: 'awaiting_user', label: 'Cevap bekliyor' },
  { key: 'escalated', label: 'Yönlendirildi' },
  { key: 'resolved', label: 'Çözüldü' },
  { key: 'closed', label: 'Kapalı' },
];

export default async function SupportPage(props: {
  searchParams: Promise<{ status?: string; priority?: TicketPriority }>;
}) {
  const sp = await props.searchParams;
  const status = (sp.status as 'all' | 'open' | TicketStatus) ?? 'open';
  const priority = sp.priority;

  const [{ tickets }, stats] = await Promise.all([
    listTickets({ status, priority }),
    getOpenTicketStats(),
  ]);
  await logAudit('USER_VIEWED', { targetType: 'support_tickets_list' });

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <LifeBuoy className="w-6 h-6" />
          Destek Talepleri
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Kullanıcı destek talepleri, KVKK soruları, hata bildirimleri. Crisp entegrasyonu Faz 4.B'de.
        </p>
      </div>

      {/* KPI'lar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi label="Açık talep" value={stats.total} accent="blue" />
        <Kpi label="Acil" value={stats.by_priority.urgent} accent="red" hint="urgent priority" />
        <Kpi label="Yüksek" value={stats.by_priority.high} accent="amber" hint="high priority" />
        <Kpi label="Atanmamış" value={stats.unassigned} accent="slate" />
      </div>

      {/* Status tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
        {STATUS_TABS.map((tab) => (
          <Link
            key={tab.key}
            href={
              tab.key === 'open'
                ? '/admin/support'
                : `/admin/support?status=${tab.key}`
            }
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

      {/* Priority filter */}
      <div className="flex items-center gap-2 text-xs">
        <span className="text-slate-500 dark:text-slate-400">Öncelik:</span>
        <Link
          href={`/admin/support${status !== 'open' ? `?status=${status}` : ''}`}
          className={`px-2 py-1 rounded ${!priority ? 'bg-slate-200 dark:bg-slate-700 font-medium' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
        >
          Hepsi
        </Link>
        {(['urgent', 'high', 'normal', 'low'] as TicketPriority[]).map((p) => (
          <Link
            key={p}
            href={`/admin/support?status=${status}&priority=${p}`}
            className={`px-2 py-1 rounded ${priority === p ? 'bg-slate-200 dark:bg-slate-700 font-medium' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          >
            {TICKET_PRIORITY_LABELS[p].label}
          </Link>
        ))}
      </div>

      {tickets.length === 0 ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center">
          <LifeBuoy className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700" />
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-3">
            Bu kategoride talep yok.
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            Talepler iletişim formundan veya in-app destek butonundan açılır.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <tr>
                <th className="text-left p-3 font-medium">Talep</th>
                <th className="text-left p-3 font-medium">Kategori</th>
                <th className="text-left p-3 font-medium">Öncelik</th>
                <th className="text-left p-3 font-medium">Durum</th>
                <th className="text-left p-3 font-medium">Atandı</th>
                <th className="text-right p-3 font-medium">Mesaj</th>
                <th className="text-left p-3 font-medium whitespace-nowrap">Açıldı</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {tickets.map((t) => {
                const st = TICKET_STATUS_LABELS[t.status];
                const pr = TICKET_PRIORITY_LABELS[t.priority];
                return (
                  <tr
                    key={t.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/30"
                  >
                    <td className="p-3 max-w-md">
                      <Link
                        href={`/admin/support/${t.id}`}
                        className="block hover:text-[#12A3E3]"
                      >
                        <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                          {t.subject}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {t.user_email}
                        </div>
                      </Link>
                    </td>
                    <td className="p-3 text-xs text-slate-600 dark:text-slate-400">
                      {TICKET_CATEGORY_LABELS[t.category]}
                    </td>
                    <td className={`p-3 text-xs ${pr.cls}`}>
                      {t.priority === 'urgent' && <AlertCircle className="inline w-3 h-3 mr-0.5" />}
                      {pr.label}
                    </td>
                    <td className="p-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider ${st.cls}`}
                      >
                        {st.label}
                      </span>
                    </td>
                    <td className="p-3 text-xs text-slate-500 dark:text-slate-400">
                      {t.assigned_to_email ? (
                        <span className="truncate max-w-[160px] inline-block">
                          {t.assigned_to_email}
                        </span>
                      ) : (
                        <span className="text-amber-600 dark:text-amber-400">— atanmamış</span>
                      )}
                    </td>
                    <td className="p-3 text-right text-xs tabular-nums">
                      <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-400">
                        <MessageSquare className="w-3 h-3" />
                        {t.message_count ?? 0}
                      </span>
                    </td>
                    <td className="p-3 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {format(new Date(t.created_at), 'd MMM HH:mm', { locale: tr })}
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

function Kpi({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: number;
  hint?: string;
  accent: 'blue' | 'red' | 'amber' | 'slate';
}) {
  const colors = {
    blue: 'text-blue-600 dark:text-blue-400',
    red: 'text-red-600 dark:text-red-400',
    amber: 'text-amber-600 dark:text-amber-400',
    slate: 'text-slate-600 dark:text-slate-400',
  };
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
      <div className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {label}
      </div>
      <div className={`mt-1.5 text-2xl font-semibold ${colors[accent]}`}>{value}</div>
      {hint && (
        <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">{hint}</div>
      )}
    </div>
  );
}
